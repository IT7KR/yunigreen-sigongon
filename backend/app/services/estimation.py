"""견적 계산 서비스.

CRITICAL: 모든 금액 계산은 이 서비스에서 RDB 기반으로 수행.
AI는 절대 금액 계산에 관여하지 않음.
"""
import uuid
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import NoPricebookActiveException, NotFoundException
from app.models.pricebook import (
    PricebookRevision,
    RevisionStatus,
    CatalogItem,
    CatalogItemPrice,
)
from app.models.estimate import Estimate, EstimateLine


class EstimationService:
    """견적 계산 서비스.
    
    모든 금액 계산은 RDB에서 조회한 단가를 기반으로 수행함.
    AI가 수량을 추천하더라도, 단가와 금액은 항상 이 서비스가 계산함.
    """
    
    VAT_RATE = Decimal("0.1")
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_active_revision(self) -> PricebookRevision:
        """현재 활성화된 단가표 버전 조회."""
        result = await self.db.execute(
            select(PricebookRevision)
            .where(PricebookRevision.status == RevisionStatus.ACTIVE)
            .order_by(PricebookRevision.effective_from.desc())
            .limit(1)
        )
        revision = result.scalar_one_or_none()
        
        if not revision:
            raise NoPricebookActiveException()
        
        return revision
    
    async def get_item_price(
        self,
        catalog_item_id: uuid.UUID,
        revision_id: uuid.UUID,
    ) -> Decimal:
        """품목의 단가 조회.
        
        Args:
            catalog_item_id: 카탈로그 품목 ID
            revision_id: 단가표 버전 ID
            
        Returns:
            단가 (원)
        """
        result = await self.db.execute(
            select(CatalogItemPrice)
            .where(
                CatalogItemPrice.catalog_item_id == catalog_item_id,
                CatalogItemPrice.pricebook_revision_id == revision_id,
            )
        )
        price = result.scalar_one_or_none()
        
        if not price:
            return Decimal("0")
        
        return price.unit_price
    
    def calculate_line_amount(
        self,
        quantity: Decimal,
        unit_price: Decimal,
    ) -> Decimal:
        """항목 금액 계산.
        
        금액 = 수량 × 단가
        반올림하여 원 단위로 반환
        """
        amount = quantity * unit_price
        return amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    
    def calculate_subtotal(self, lines: list[EstimateLine]) -> Decimal:
        """소계 계산.
        
        소계 = 모든 항목 금액의 합
        """
        return sum(line.amount for line in lines)
    
    def calculate_vat(self, subtotal: Decimal) -> Decimal:
        """부가세 계산.
        
        부가세 = 소계 × 10%
        반올림하여 원 단위로 반환
        """
        vat = subtotal * self.VAT_RATE
        return vat.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    
    def calculate_total(self, subtotal: Decimal, vat: Decimal) -> Decimal:
        """총액 계산.
        
        총액 = 소계 + 부가세
        """
        return subtotal + vat
    
    async def recalculate_estimate(self, estimate: Estimate) -> Estimate:
        """견적서 전체 재계산."""
        await self.db.refresh(estimate, ["lines"])
        
        for line in estimate.lines or []:
            line.amount = self.calculate_line_amount(
                line.quantity,
                line.unit_price_snapshot,
            )
        
        subtotal = self.calculate_subtotal(estimate.lines or [])
        vat = self.calculate_vat(subtotal)
        total = self.calculate_total(subtotal, vat)
        
        estimate.subtotal = subtotal
        estimate.vat_amount = vat
        estimate.total_amount = total
        estimate.updated_at = datetime.utcnow()
        
        return estimate
    
    async def apply_surcharge(
        self,
        base_amount: Decimal,
        surcharge_type: str,
        surcharge_value: Decimal,
    ) -> Decimal:
        """할증 적용.
        
        Args:
            base_amount: 기본 금액
            surcharge_type: 할증 유형 ('percent' 또는 'fixed')
            surcharge_value: 할증 값 (퍼센트 또는 고정 금액)
            
        Returns:
            할증 적용된 금액
        """
        if surcharge_type == "percent":
            multiplier = Decimal("1") + (surcharge_value / Decimal("100"))
            return (base_amount * multiplier).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
        elif surcharge_type == "fixed":
            return base_amount + surcharge_value
        else:
            return base_amount
    
    def format_currency(self, amount: Decimal) -> str:
        """금액을 한국 원화 형식으로 포맷.
        
        예: 1500000 -> "1,500,000원"
        """
        return f"{amount:,.0f}원"
