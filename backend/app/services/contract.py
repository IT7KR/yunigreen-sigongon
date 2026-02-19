import base64
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import delete, select

from app.core.exceptions import NotFoundException
from app.core.snowflake import generate_snowflake_id
from app.models.contract import (
    Contract,
    ContractExecutionMode,
    ContractKind,
    ContractStatus,
    ContractTemplateType,
    ContractUpdate,
    ContractWarrantyItem,
    ContractWarrantyItemCreate,
    PublicPlatformType,
)
from app.models.customer import CustomerMaster
from app.models.estimate import Estimate, EstimateStatus
from app.models.project import Project
from app.models.user import Organization
from app.services.storage import storage_service


class ContractService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, contract_id: int) -> Contract:
        result = await self.db.execute(select(Contract).where(Contract.id == contract_id))
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

    async def get_warranty_items(self, contract_id: int) -> list[ContractWarrantyItem]:
        result = await self.db.execute(
            select(ContractWarrantyItem)
            .where(ContractWarrantyItem.contract_id == contract_id)
            .order_by(ContractWarrantyItem.created_at.asc())
        )
        return list(result.scalars().all())

    async def create(self, project_id: int, payload: dict[str, Any]) -> Contract:
        estimate_id_raw = payload.get("estimate_id")
        if estimate_id_raw is None:
            raise ValueError("estimate_id는 필수예요")

        estimate_id = int(estimate_id_raw)
        estimate = (
            await self.db.execute(select(Estimate).where(Estimate.id == estimate_id))
        ).scalar_one_or_none()
        if not estimate:
            raise NotFoundException("견적서를 찾을 수 없어요")
        if estimate.project_id != project_id:
            raise ValueError("선택한 견적서가 해당 프로젝트에 속하지 않아요")
        if estimate.status != EstimateStatus.ACCEPTED:
            raise ValueError("고객 수락된 견적서만 계약서를 생성할 수 있어요")

        project = (
            await self.db.execute(select(Project).where(Project.id == project_id))
        ).scalar_one_or_none()
        if not project:
            raise NotFoundException("project", project_id)

        org = (
            await self.db.execute(
                select(Organization).where(Organization.id == project.organization_id)
            )
        ).scalar_one_or_none()

        customer: Optional[CustomerMaster] = None
        if project.customer_master_id is not None:
            customer = (
                await self.db.execute(
                    select(CustomerMaster).where(CustomerMaster.id == project.customer_master_id)
                )
            ).scalar_one_or_none()

        template_type = self._coerce_enum(
            payload.get("template_type"),
            ContractTemplateType,
            default=ContractTemplateType.PUBLIC_OFFICE,
        )
        contract_kind = self._resolve_contract_kind(payload.get("contract_kind"), template_type)
        execution_mode = self._resolve_execution_mode(payload.get("execution_mode"), contract_kind)

        supply_amount = self._coerce_decimal(payload.get("supply_amount"), estimate.subtotal)
        vat_amount = self._coerce_decimal(payload.get("vat_amount"), estimate.vat_amount)
        total_amount = self._coerce_decimal(payload.get("total_amount"), estimate.total_amount)

        contract_amount = self._coerce_decimal(
            payload.get("contract_amount"),
            total_amount or estimate.total_amount,
        )

        owner_name = payload.get("owner_name") or (customer.name if customer else project.client_name)
        owner_business_number = payload.get("owner_business_number") or (
            customer.business_number if customer else None
        )
        owner_representative_name = payload.get("owner_representative_name") or (
            customer.representative_name if customer else None
        )
        owner_address = payload.get("owner_address") or project.address
        owner_phone = payload.get("owner_phone") or (
            (customer.representative_phone if customer else None)
            or (customer.contact_phone if customer else None)
            or (customer.phone if customer else None)
            or project.client_phone
        )

        contractor_name = payload.get("contractor_name") or (org.name if org else None)
        contractor_business_number = payload.get("contractor_business_number") or (
            org.business_number if org else None
        )
        contractor_representative_name = payload.get("contractor_representative_name") or (
            org.rep_name if org else None
        )
        contractor_address = payload.get("contractor_address") or (org.address if org else None)
        contractor_phone = payload.get("contractor_phone") or (
            (org.phone if org else None) or (org.rep_phone if org else None)
        )

        public_platform_type = self._coerce_enum(
            payload.get("public_platform_type"),
            PublicPlatformType,
            default=None,
        )

        contract_number = await self._generate_contract_number()
        contract = Contract(
            id=generate_snowflake_id(),
            project_id=project_id,
            estimate_id=estimate_id,
            contract_number=contract_number,
            contract_amount=contract_amount,
            template_type=template_type,
            contract_kind=contract_kind,
            execution_mode=execution_mode,
            status=ContractStatus.DRAFT,
            notes=payload.get("notes"),
            special_terms=payload.get("special_terms"),
            start_date=payload.get("start_date") or payload.get("work_start_date"),
            expected_end_date=payload.get("expected_end_date") or payload.get("work_end_date"),
            contract_date=payload.get("contract_date"),
            work_start_date=payload.get("work_start_date") or payload.get("start_date"),
            work_end_date=payload.get("work_end_date") or payload.get("expected_end_date"),
            supply_amount=supply_amount,
            vat_amount=vat_amount,
            total_amount=total_amount,
            delay_penalty_rate=payload.get("delay_penalty_rate"),
            retention_rate=payload.get("retention_rate"),
            performance_bond_required=bool(payload.get("performance_bond_required", False)),
            performance_bond_rate=payload.get("performance_bond_rate"),
            performance_bond_amount=payload.get("performance_bond_amount"),
            defect_warranty_required=bool(payload.get("defect_warranty_required", False)),
            defect_warranty_rate=payload.get("defect_warranty_rate"),
            defect_warranty_period_months=payload.get("defect_warranty_period_months"),
            owner_name=owner_name,
            owner_business_number=owner_business_number,
            owner_representative_name=owner_representative_name,
            owner_address=owner_address,
            owner_phone=owner_phone,
            contractor_name=contractor_name,
            contractor_business_number=contractor_business_number,
            contractor_representative_name=contractor_representative_name,
            contractor_address=contractor_address,
            contractor_phone=contractor_phone,
            public_platform_type=public_platform_type,
            public_notice_number=payload.get("public_notice_number"),
            public_bid_number=payload.get("public_bid_number"),
            public_contract_reference=payload.get("public_contract_reference"),
            source_document_path=payload.get("source_document_path"),
            generated_document_path=payload.get("generated_document_path"),
        )

        self.db.add(contract)
        await self.db.flush()

        for item in self._parse_warranty_items(payload.get("warranty_items") or []):
            self.db.add(
                ContractWarrantyItem(
                    id=generate_snowflake_id(),
                    contract_id=contract.id,
                    work_type=item.work_type,
                    warranty_rate=item.warranty_rate,
                    warranty_period_months=item.warranty_period_months,
                    notes=item.notes,
                )
            )

        await self.db.commit()
        await self.db.refresh(contract)
        return contract

    async def update(self, contract_id: int, update_data: ContractUpdate) -> Contract:
        contract = await self.get_by_id(contract_id)

        update_dict = update_data.model_dump(exclude_unset=True)
        warranty_payload = update_dict.pop("warranty_items", None)

        if "template_type" in update_dict:
            update_dict["template_type"] = self._coerce_enum(
                update_dict["template_type"],
                ContractTemplateType,
                default=contract.template_type,
            )
        if "contract_kind" in update_dict:
            update_dict["contract_kind"] = self._coerce_enum(
                update_dict["contract_kind"],
                ContractKind,
                default=contract.contract_kind,
            )
        if "execution_mode" in update_dict:
            update_dict["execution_mode"] = self._coerce_enum(
                update_dict["execution_mode"],
                ContractExecutionMode,
                default=contract.execution_mode,
            )
        if "public_platform_type" in update_dict:
            update_dict["public_platform_type"] = self._coerce_enum(
                update_dict["public_platform_type"],
                PublicPlatformType,
                default=contract.public_platform_type,
            )

        for key, value in update_dict.items():
            setattr(contract, key, value)

        if contract.work_start_date:
            contract.start_date = contract.work_start_date
        if contract.work_end_date:
            contract.expected_end_date = contract.work_end_date

        if contract.total_amount is not None:
            contract.contract_amount = contract.total_amount
        elif contract.contract_amount is not None:
            contract.total_amount = contract.contract_amount

        if warranty_payload is not None:
            await self.db.execute(
                delete(ContractWarrantyItem).where(
                    ContractWarrantyItem.contract_id == contract_id
                )
            )
            for item in self._parse_warranty_items(warranty_payload):
                self.db.add(
                    ContractWarrantyItem(
                        id=generate_snowflake_id(),
                        contract_id=contract.id,
                        work_type=item.work_type,
                        warranty_rate=item.warranty_rate,
                        warranty_period_months=item.warranty_period_months,
                        notes=item.notes,
                    )
                )

        await self.db.commit()
        await self.db.refresh(contract)
        return contract

    async def send_for_signature(self, contract_id: int) -> Contract:
        contract = await self.get_by_id(contract_id)

        if contract.status != ContractStatus.DRAFT:
            raise ValueError("초안 상태의 계약서만 발송할 수 있어요")
        if contract.contract_kind != ContractKind.PRIVATE_STANDARD:
            raise ValueError("민간 계약서만 서명 요청을 보낼 수 있어요")
        if contract.execution_mode != ContractExecutionMode.MODUSIGN:
            raise ValueError("모두싸인 모드가 아닌 계약서는 발송할 수 없어요")

        completeness = await self.compute_completeness(contract)
        if not completeness["is_complete"]:
            missing = ", ".join(completeness["missing_fields"])
            raise ValueError(f"필수 항목이 누락되어 있어요: {missing}")

        contract.status = ContractStatus.SENT
        contract.sent_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(contract)
        return contract

    async def sign(self, contract_id: int, signature_data: str, signer_type: str) -> Contract:
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

    async def finalize(self, contract_id: int) -> tuple[Contract, dict[str, Any]]:
        contract = await self.get_by_id(contract_id)
        completeness = await self.compute_completeness(contract)
        if not completeness["is_complete"]:
            missing = ", ".join(completeness["missing_fields"])
            raise ValueError(f"필수 항목이 누락되어 있어요: {missing}")

        if contract.status in [ContractStatus.CANCELLED, ContractStatus.COMPLETED]:
            raise ValueError("완료/취소된 계약서는 확정할 수 없어요")

        if contract.status != ContractStatus.ACTIVE:
            contract.status = ContractStatus.ACTIVE

        await self.db.commit()
        await self.db.refresh(contract)
        return contract, completeness

    async def attach_source_document(
        self,
        contract_id: int,
        source_document_path: str,
        public_platform_type: Optional[PublicPlatformType] = None,
        public_contract_reference: Optional[str] = None,
        public_notice_number: Optional[str] = None,
        public_bid_number: Optional[str] = None,
    ) -> Contract:
        contract = await self.get_by_id(contract_id)
        contract.source_document_path = source_document_path
        contract.contract_kind = ContractKind.PUBLIC_PLATFORM
        contract.execution_mode = ContractExecutionMode.UPLOAD_ONLY
        contract.template_type = ContractTemplateType.PUBLIC_OFFICE

        if public_platform_type is not None:
            contract.public_platform_type = public_platform_type
        if public_contract_reference is not None:
            contract.public_contract_reference = public_contract_reference
        if public_notice_number is not None:
            contract.public_notice_number = public_notice_number
        if public_bid_number is not None:
            contract.public_bid_number = public_bid_number

        await self.db.commit()
        await self.db.refresh(contract)
        return contract

    async def compute_completeness(self, contract_or_id: Contract | int) -> dict[str, Any]:
        if isinstance(contract_or_id, int):
            contract = await self.get_by_id(contract_or_id)
        else:
            contract = contract_or_id

        warranty_items = await self.get_warranty_items(contract.id)

        checks: list[tuple[str, str, bool]] = [
            ("owner_name", "발주자명", bool(contract.owner_name)),
            ("contractor_name", "수급자명", bool(contract.contractor_name)),
            (
                "total_amount",
                "총 계약금액",
                bool(contract.total_amount is not None or contract.contract_amount is not None),
            ),
        ]

        if contract.contract_kind == ContractKind.PRIVATE_STANDARD:
            checks.extend(
                [
                    ("contract_date", "계약일", bool(contract.contract_date)),
                    ("work_start_date", "착공일", bool(contract.work_start_date or contract.start_date)),
                    ("work_end_date", "준공예정일", bool(contract.work_end_date or contract.expected_end_date)),
                    (
                        "owner_representative_name",
                        "발주자 대표자",
                        bool(contract.owner_representative_name),
                    ),
                    (
                        "contractor_representative_name",
                        "수급자 대표자",
                        bool(contract.contractor_representative_name),
                    ),
                ]
            )
        else:
            checks.extend(
                [
                    ("public_platform_type", "관공서 플랫폼 유형", bool(contract.public_platform_type)),
                    ("source_document_path", "관공서 원본 문서", bool(contract.source_document_path)),
                ]
            )

        if contract.performance_bond_required:
            checks.extend(
                [
                    (
                        "performance_bond_rate",
                        "계약보증금 비율",
                        bool(contract.performance_bond_rate is not None),
                    ),
                    (
                        "performance_bond_amount",
                        "계약보증금 금액",
                        bool(contract.performance_bond_amount is not None),
                    ),
                ]
            )

        if contract.defect_warranty_required:
            checks.extend(
                [
                    (
                        "defect_warranty_rate",
                        "하자담보 비율",
                        bool(
                            contract.defect_warranty_rate is not None
                            or any(item.warranty_rate is not None for item in warranty_items)
                        ),
                    ),
                    (
                        "defect_warranty_period_months",
                        "하자담보 기간",
                        bool(
                            contract.defect_warranty_period_months is not None
                            or any(item.warranty_period_months is not None for item in warranty_items)
                        ),
                    ),
                ]
            )

        required_count = len(checks)
        filled_count = len([item for item in checks if item[2]])
        completion_rate = 100 if required_count == 0 else int(round((filled_count / required_count) * 100))

        missing = [(key, label) for key, label, passed in checks if not passed]
        return {
            "is_complete": len(missing) == 0,
            "completion_rate": completion_rate,
            "required_field_count": required_count,
            "filled_field_count": filled_count,
            "missing_fields": [label for _, label in missing],
            "missing_field_keys": [key for key, _ in missing],
        }

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

    def _resolve_contract_kind(
        self,
        raw_kind: Any,
        template_type: ContractTemplateType,
    ) -> ContractKind:
        if raw_kind is not None:
            return self._coerce_enum(raw_kind, ContractKind, default=ContractKind.PUBLIC_PLATFORM)
        if template_type == ContractTemplateType.PRIVATE_STANDARD:
            return ContractKind.PRIVATE_STANDARD
        return ContractKind.PUBLIC_PLATFORM

    def _resolve_execution_mode(
        self,
        raw_mode: Any,
        contract_kind: ContractKind,
    ) -> ContractExecutionMode:
        if raw_mode is not None:
            return self._coerce_enum(raw_mode, ContractExecutionMode, default=ContractExecutionMode.UPLOAD_ONLY)
        if contract_kind == ContractKind.PRIVATE_STANDARD:
            return ContractExecutionMode.MODUSIGN
        return ContractExecutionMode.UPLOAD_ONLY

    def _coerce_enum(self, raw: Any, enum_cls, default):
        if raw is None:
            return default
        if isinstance(raw, enum_cls):
            return raw
        try:
            return enum_cls(raw)
        except Exception as exc:
            raise ValueError(f"{enum_cls.__name__} 값이 올바르지 않아요: {raw}") from exc

    def _coerce_decimal(self, raw: Any, default: Optional[Decimal]) -> Optional[Decimal]:
        if raw is None:
            return default
        if isinstance(raw, Decimal):
            return raw
        return Decimal(str(raw))

    def _parse_warranty_items(self, raw_items: list[Any]) -> list[ContractWarrantyItemCreate]:
        parsed: list[ContractWarrantyItemCreate] = []
        for raw in raw_items:
            if isinstance(raw, ContractWarrantyItemCreate):
                parsed.append(raw)
            elif isinstance(raw, dict):
                parsed.append(ContractWarrantyItemCreate.model_validate(raw))
        return parsed
