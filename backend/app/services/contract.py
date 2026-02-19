import base64
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import NotFoundException
from app.core.snowflake import generate_snowflake_id
from app.models.contract import (
    Contract,
    ContractStatus,
    ContractTemplateType,
    ContractCreate,
    ContractUpdate,
)
from app.models.estimate import Estimate, EstimateStatus
from app.services.storage import storage_service


class ContractService:
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, contract_id: int) -> Contract:
        result = await self.db.execute(
            select(Contract).where(Contract.id == contract_id)
        )
        contract = result.scalar_one_or_none()
        if not contract:
            raise NotFoundException("계약서를 찾을 수 없어요")
        return contract
    
    async def get_by_project(self, project_id: int) -> list[Contract]:
        result = await self.db.execute(
            select(Contract)
            .where(Contract.project_id == project_id)
            .order_by(Contract.created_at.desc())
        )
        return list(result.scalars().all())
    
    async def create(
        self,
        project_id: int,
        estimate_id: int,
        template_type: ContractTemplateType = ContractTemplateType.PUBLIC_OFFICE,
        start_date: Optional[date] = None,
        expected_end_date: Optional[date] = None,
        notes: Optional[str] = None,
    ) -> Contract:
        estimate_result = await self.db.execute(
            select(Estimate).where(Estimate.id == estimate_id)
        )
        estimate = estimate_result.scalar_one_or_none()
        if not estimate:
            raise NotFoundException("견적서를 찾을 수 없어요")
        if estimate.project_id != project_id:
            raise ValueError("선택한 견적서가 해당 프로젝트에 속하지 않아요")
        if estimate.status != EstimateStatus.ACCEPTED:
            raise ValueError("고객 수락된 견적서만 계약서를 생성할 수 있어요")
        
        contract_number = await self._generate_contract_number()
        
        contract = Contract(
            id=generate_snowflake_id(),
            project_id=project_id,
            estimate_id=estimate_id,
            contract_number=contract_number,
            contract_amount=estimate.total_amount,
            template_type=template_type,
            status=ContractStatus.DRAFT,
            start_date=start_date,
            expected_end_date=expected_end_date,
            notes=notes,
        )
        
        self.db.add(contract)
        await self.db.commit()
        await self.db.refresh(contract)
        
        return contract
    
    async def update(
        self,
        contract_id: int,
        update_data: ContractUpdate,
    ) -> Contract:
        contract = await self.get_by_id(contract_id)
        
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(contract, key, value)
        
        await self.db.commit()
        await self.db.refresh(contract)
        
        return contract
    
    async def send_for_signature(self, contract_id: int) -> Contract:
        contract = await self.get_by_id(contract_id)
        
        if contract.status != ContractStatus.DRAFT:
            raise ValueError("초안 상태의 계약서만 발송할 수 있어요")
        
        contract.status = ContractStatus.SENT
        contract.sent_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(contract)
        
        return contract
    
    async def sign(
        self,
        contract_id: int,
        signature_data: str,
        signer_type: str,
    ) -> Contract:
        contract = await self.get_by_id(contract_id)
        
        if contract.status not in [ContractStatus.SENT, ContractStatus.DRAFT]:
            raise ValueError("서명 대기 상태의 계약서만 서명할 수 있어요")
        
        signature_bytes = base64.b64decode(signature_data)
        filename = f"{signer_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png"
        
        signature_path = await storage_service.save_bytes(
            data=signature_bytes,
            category="signatures",
            subfolder=str(contract_id),
            filename=filename,
        )
        
        if signer_type == "client":
            contract.client_signature_path = signature_path
        elif signer_type == "company":
            contract.company_signature_path = signature_path
        
        if contract.client_signature_path and contract.company_signature_path:
            contract.status = ContractStatus.SIGNED
            contract.signed_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(contract)
        
        return contract
    
    async def _generate_contract_number(self) -> str:
        year = datetime.now().year
        prefix = f"YG-{year}"
        
        result = await self.db.execute(
            select(Contract)
            .where(Contract.contract_number.like(f"{prefix}-%"))
            .order_by(Contract.contract_number.desc())
            .limit(1)
        )
        last_contract = result.scalar_one_or_none()
        
        if last_contract and last_contract.contract_number:
            try:
                last_num = int(last_contract.contract_number.split("-")[-1])
                next_num = last_num + 1
            except ValueError:
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}-{next_num:04d}"
