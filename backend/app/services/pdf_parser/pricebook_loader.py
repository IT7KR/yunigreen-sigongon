"""단가표 DB 로더."""
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.snowflake import generate_snowflake_id
from app.models.pricebook import (
    Pricebook,
    PricebookRevision,
    CatalogItem,
    CatalogItemPrice,
)
from app.models.rag import DocumentChunk

from .table_extractor import TableExtractor, PriceItem
from .text_extractor import TextExtractor, TextChunk


class PricebookLoader:
    """PDF에서 추출한 데이터를 DB에 적재."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def load_from_pdf(
        self,
        pdf_paths: list[str],
        pricebook_name: str,
        revision_code: str,
        effective_from: datetime,
        effective_until: Optional[datetime] = None,
    ) -> dict:
        """PDF에서 단가표 데이터 추출 및 DB 적재."""
        
        pricebook = await self._get_or_create_pricebook(pricebook_name)
        
        revision = await self._create_revision(
            pricebook_id=pricebook.id,
            revision_code=revision_code,
            effective_from=effective_from,
            effective_until=effective_until,
            source_files=pdf_paths,
        )
        
        total_items = 0
        total_chunks = 0
        
        for pdf_path in pdf_paths:
            items_count = await self._load_price_items(pdf_path, revision.id)
            total_items += items_count
            
            chunks_count = await self._load_text_chunks(pdf_path, revision.id)
            total_chunks += chunks_count
        
        await self.db.commit()
        
        return {
            "pricebook_id": str(pricebook.id),
            "revision_id": str(revision.id),
            "revision_code": revision_code,
            "items_loaded": total_items,
            "chunks_loaded": total_chunks,
            "source_files": pdf_paths,
        }
    
    async def _get_or_create_pricebook(self, name: str) -> Pricebook:
        """단가표 조회 또는 생성."""
        result = await self.db.execute(
            select(Pricebook).where(Pricebook.name == name)
        )
        pricebook = result.scalar_one_or_none()
        
        if pricebook is None:
            pricebook = Pricebook(
                id=generate_snowflake_id(),
                name=name,
                description=f"{name} 단가표",
                is_active=True,
            )
            self.db.add(pricebook)
            await self.db.flush()
        
        return pricebook
    
    async def _create_revision(
        self,
        pricebook_id: int,
        revision_code: str,
        effective_from: datetime,
        effective_until: Optional[datetime],
        source_files: list[str],
    ) -> PricebookRevision:
        revision = PricebookRevision(
            id=generate_snowflake_id(),
            pricebook_id=pricebook_id,
            version_label=revision_code,
            effective_from=effective_from.date() if isinstance(effective_from, datetime) else effective_from,
            effective_to=effective_until.date() if effective_until and isinstance(effective_until, datetime) else effective_until,
            source_files=source_files,
        )
        self.db.add(revision)
        await self.db.flush()
        return revision
    
    async def _load_price_items(
        self,
        pdf_path: str,
        revision_id: int,
    ) -> int:
        """단가 항목 DB 적재."""
        try:
            extractor = TableExtractor(pdf_path)
            items = extractor.extract_price_items()
        except Exception as e:
            print(f"표 추출 실패 ({pdf_path}): {e}")
            return 0
        
        count = 0
        for item in items:
            catalog_item = await self._get_or_create_catalog_item(item)
            
            price = CatalogItemPrice(
                id=generate_snowflake_id(),
                catalog_item_id=catalog_item.id,
                pricebook_revision_id=revision_id,
                unit_price=item.unit_price,
            )
            self.db.add(price)
            count += 1
        
        await self.db.flush()
        return count
    
    async def _get_or_create_catalog_item(self, item: PriceItem) -> CatalogItem:
        """카탈로그 항목 조회 또는 생성."""
        result = await self.db.execute(
            select(CatalogItem).where(
                CatalogItem.name_ko == item.item_name,
                CatalogItem.specification == item.specification,
            )
        )
        catalog_item = result.scalar_one_or_none()
        
        if catalog_item is None:
            catalog_item = CatalogItem(
                id=generate_snowflake_id(),
                code=self._generate_item_code(item),
                name_ko=item.item_name,
                specification=item.specification,
                unit=item.unit,
                category=item.category,
            )
            self.db.add(catalog_item)
            await self.db.flush()
        
        return catalog_item
    
    def _generate_item_code(self, item: PriceItem) -> str:
        """항목 코드 생성."""
        category_prefix = {
            "material": "MAT",
            "labor": "LAB",
            "equipment": "EQP",
        }
        prefix = category_prefix.get(item.category, "ETC")
        unique_id = uuid.uuid4().hex[:8].upper()
        return f"{prefix}-{unique_id}"
    
    async def _load_text_chunks(
        self,
        pdf_path: str,
        revision_id: int,
    ) -> int:
        """텍스트 청크 DB 적재 (RAG용)."""
        try:
            extractor = TextExtractor(pdf_path)
            chunks = extractor.extract_chunks()
        except Exception as e:
            print(f"텍스트 추출 실패 ({pdf_path}): {e}")
            return 0
        
        count = 0
        for chunk in chunks:
            doc_chunk = DocumentChunk(
                id=generate_snowflake_id(),
                pricebook_revision_id=revision_id,
                chunk_text=chunk.content,
                source_file=chunk.source_file,
                source_page=chunk.page_number,
                chapter=chunk.chapter,
                section=chunk.section,
                category=chunk.chunk_type,
            )
            self.db.add(doc_chunk)
            count += 1
        
        await self.db.flush()
        return count
