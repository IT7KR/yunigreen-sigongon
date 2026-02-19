"""세금계산서 API 라우터 - Popbill 연동."""
from datetime import datetime, date
from typing import Annotated, Optional, List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.core.database import get_async_db
from app.core.permissions import get_project_for_user
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException
from app.models.user import User, Organization
from app.models.tax_invoice import (
    TaxInvoice,
    TaxInvoiceStatus,
    TaxInvoiceType,
    TaxInvoiceCreate,
    TaxInvoiceRead,
    TaxInvoiceUpdate,
)
from app.schemas.response import APIResponse, PaginatedResponse

router = APIRouter()

# Type aliases
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


async def _get_invoice_for_user(
    db: DBSession,
    invoice_id: int,
    current_user: User,
) -> TaxInvoice:
    invoice = (
        await db.execute(select(TaxInvoice).where(TaxInvoice.id == invoice_id))
    ).scalar_one_or_none()
    if not invoice:
        raise NotFoundException("tax_invoice", invoice_id)

    if current_user.organization_id is not None and invoice.organization_id != current_user.organization_id:
        raise NotFoundException("tax_invoice", invoice_id)

    await get_project_for_user(db, invoice.project_id, current_user)
    return invoice


# Response Schemas
class TaxInvoiceListItem(BaseModel):
    """세금계산서 목록 아이템."""
    id: int
    project_id: int
    mgtkey: str
    invoice_type: str
    status: str
    supply_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    buyer_name: str
    issue_date: Optional[date]
    created_at: datetime
    issued_at: Optional[datetime]


class TaxInvoiceDetail(BaseModel):
    """세금계산서 상세 정보."""
    id: int
    project_id: int
    organization_id: int
    mgtkey: str
    issue_id: Optional[str]

    # Invoice details
    invoice_type: str
    supply_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal

    # Supplier info
    supplier_corp_num: str
    supplier_name: str
    supplier_ceo: Optional[str]
    supplier_address: Optional[str]
    supplier_email: Optional[str]

    # Buyer info
    buyer_corp_num: str
    buyer_name: str
    buyer_ceo: Optional[str]
    buyer_address: Optional[str]
    buyer_email: Optional[str]

    # Description
    description: Optional[str]
    remark: Optional[str]
    issue_date: Optional[date]

    # Status
    status: str

    # Timestamps
    created_at: datetime
    updated_at: datetime
    issued_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    created_by: int


class CreateTaxInvoiceRequest(BaseModel):
    """세금계산서 생성 요청."""
    mgtkey: str

    # Invoice details
    invoice_type: TaxInvoiceType = TaxInvoiceType.REGULAR
    supply_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal

    # Buyer info (공급받는자) - Supplier info will be auto-filled from organization
    buyer_corp_num: str
    buyer_name: str
    buyer_ceo: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_email: Optional[str] = None

    # Description
    description: Optional[str] = None
    remark: Optional[str] = None
    issue_date: Optional[date] = None


class UpdateTaxInvoiceRequest(BaseModel):
    """세금계산서 수정 요청."""
    mgtkey: Optional[str] = None
    invoice_type: Optional[TaxInvoiceType] = None
    supply_amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    buyer_corp_num: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_ceo: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_email: Optional[str] = None
    description: Optional[str] = None
    remark: Optional[str] = None
    issue_date: Optional[date] = None


class IssueTaxInvoiceRequest(BaseModel):
    """세금계산서 발행 요청."""
    memo: Optional[str] = None
    force_issue: bool = False


class PopbillUrlResponse(BaseModel):
    """Popbill 팝업 URL 응답."""
    url: str
    expires_at: datetime


@router.get("/projects/{project_id}/tax-invoices", response_model=PaginatedResponse[TaxInvoiceListItem])
async def list_project_tax_invoices(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
):
    """프로젝트의 세금계산서 목록 조회.

    프로젝트에 발행된 세금계산서 목록을 조회해요.
    """
    await get_project_for_user(db, project_id, current_user)

    # Build query
    query = select(TaxInvoice).where(TaxInvoice.project_id == project_id)

    # Filter by status
    if status_filter:
        query = query.where(TaxInvoice.status == status_filter)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Apply pagination
    query = query.order_by(TaxInvoice.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    invoices = result.scalars().all()

    # Convert to response items
    items = [
        TaxInvoiceListItem(
            id=invoice.id,
            project_id=invoice.project_id,
            mgtkey=invoice.mgtkey,
            invoice_type=invoice.invoice_type.value,
            status=invoice.status.value,
            supply_amount=invoice.supply_amount,
            tax_amount=invoice.tax_amount,
            total_amount=invoice.total_amount,
            buyer_name=invoice.buyer_name,
            issue_date=invoice.issue_date,
            created_at=invoice.created_at,
            issued_at=invoice.issued_at,
        )
        for invoice in invoices
    ]

    return PaginatedResponse.create(
        items=items,
        page=page,
        per_page=per_page,
        total=total,
    )


@router.post("/projects/{project_id}/tax-invoices", response_model=APIResponse[TaxInvoiceDetail], status_code=status.HTTP_201_CREATED)
async def create_tax_invoice(
    project_id: int,
    invoice_data: CreateTaxInvoiceRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """세금계산서 초안 생성.

    프로젝트의 세금계산서 초안을 생성해요. 공급자 정보는 조직 정보에서 자동으로 채워져요.
    """
    await get_project_for_user(db, project_id, current_user)

    # Get organization for supplier info
    org_result = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    organization = org_result.scalar_one_or_none()

    if not organization:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="조직 정보를 찾을 수 없어요",
        )

    # Check if mgtkey already exists for this organization
    existing_result = await db.execute(
        select(TaxInvoice)
        .where(TaxInvoice.mgtkey == invoice_data.mgtkey)
        .where(TaxInvoice.organization_id == current_user.organization_id)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 관리번호예요",
        )

    # Create invoice with auto-filled supplier info from organization
    invoice = TaxInvoice(
        project_id=project_id,
        organization_id=current_user.organization_id,
        mgtkey=invoice_data.mgtkey,
        # Invoice details
        invoice_type=invoice_data.invoice_type,
        supply_amount=invoice_data.supply_amount,
        tax_amount=invoice_data.tax_amount,
        total_amount=invoice_data.total_amount,
        # Supplier info (from organization)
        supplier_corp_num=organization.business_number or "",
        supplier_name=organization.name,
        supplier_ceo=organization.ceo_name,
        supplier_address=organization.address,
        supplier_email=organization.email,
        # Buyer info (from request)
        buyer_corp_num=invoice_data.buyer_corp_num,
        buyer_name=invoice_data.buyer_name,
        buyer_ceo=invoice_data.buyer_ceo,
        buyer_address=invoice_data.buyer_address,
        buyer_email=invoice_data.buyer_email,
        # Description
        description=invoice_data.description,
        remark=invoice_data.remark,
        issue_date=invoice_data.issue_date,
        # Audit
        created_by=current_user.id,
    )

    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)

    return APIResponse.ok(_to_detail(invoice))


@router.get("/tax-invoices/{invoice_id}", response_model=APIResponse[TaxInvoiceDetail])
async def get_tax_invoice(
    invoice_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """세금계산서 상세 조회.

    세금계산서의 상세 정보를 확인해요.
    """
    invoice = await _get_invoice_for_user(db, invoice_id, current_user)

    return APIResponse.ok(_to_detail(invoice))


@router.put("/tax-invoices/{invoice_id}", response_model=APIResponse[TaxInvoiceDetail])
async def update_tax_invoice(
    invoice_id: int,
    invoice_data: UpdateTaxInvoiceRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """세금계산서 수정.

    세금계산서 정보를 수정해요. 초안(draft) 상태에서만 수정할 수 있어요.
    """
    invoice = await _get_invoice_for_user(db, invoice_id, current_user)

    # Only allow editing draft invoices
    if invoice.status != TaxInvoiceStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="초안 상태의 세금계산서만 수정할 수 있어요",
        )

    # Update fields
    update_data = invoice_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(invoice, field, value)

    invoice.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(invoice)

    return APIResponse.ok(_to_detail(invoice))


@router.post("/tax-invoices/{invoice_id}/issue", response_model=APIResponse[TaxInvoiceDetail])
async def issue_tax_invoice(
    invoice_id: int,
    issue_data: IssueTaxInvoiceRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """세금계산서 발행.

    세금계산서를 팝빌을 통해 발행해요. 발행 후에는 수정할 수 없어요.
    """
    invoice = await _get_invoice_for_user(db, invoice_id, current_user)

    # Only draft invoices can be issued
    if invoice.status != TaxInvoiceStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="초안 상태의 세금계산서만 발행할 수 있어요",
        )

    # Validate required fields
    validation_errors = []

    if not invoice.supplier_corp_num:
        validation_errors.append("공급자 사업자번호가 필요해요")
    if not invoice.buyer_corp_num:
        validation_errors.append("공급받는자 사업자번호가 필요해요")
    if not invoice.issue_date:
        validation_errors.append("작성일자가 필요해요")
    if invoice.supply_amount < 0 or invoice.tax_amount < 0:
        validation_errors.append("공급가액과 세액은 0 이상이어야 해요")

    if validation_errors and not issue_data.force_issue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=", ".join(validation_errors),
        )

    # Call Popbill service to issue invoice
    from app.services.popbill_service import get_tax_invoice_service
    svc = get_tax_invoice_service()
    result = await svc.issue(
        tax_invoice_id=invoice.id,
        write_date=invoice.issue_date.strftime("%Y%m%d") if invoice.issue_date else datetime.utcnow().strftime("%Y%m%d"),
        memo=issue_data.memo,
    )

    invoice.issue_id = result.issue_id
    invoice.status = TaxInvoiceStatus.ISSUED
    invoice.issued_at = datetime.utcnow()
    invoice.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(invoice)

    return APIResponse.ok(_to_detail(invoice))


@router.post("/tax-invoices/{invoice_id}/cancel", response_model=APIResponse[TaxInvoiceDetail])
async def cancel_tax_invoice(
    invoice_id: int,
    db: DBSession,
    current_user: CurrentUser,
    reason: Optional[str] = Query(default=None),
):
    """세금계산서 취소.

    발행된 세금계산서를 취소해요. 국세청 규정에 따라 발행 당일에만 취소할 수 있어요.
    """
    invoice = await _get_invoice_for_user(db, invoice_id, current_user)

    # Only issued invoices can be cancelled
    if invoice.status != TaxInvoiceStatus.ISSUED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="발행된 세금계산서만 취소할 수 있어요",
        )

    # Check if issued today (국세청 규정: 당일 취소만 가능)
    if invoice.issued_at:
        issued_date = invoice.issued_at.date()
        today = datetime.utcnow().date()

        if issued_date != today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="세금계산서는 발행 당일에만 취소할 수 있어요",
            )

    # Call Popbill service to cancel invoice
    from app.services.popbill_service import get_tax_invoice_service
    svc = get_tax_invoice_service()
    await svc.cancel_issue(invoice.issue_id, memo=reason)

    invoice.status = TaxInvoiceStatus.CANCELLED
    invoice.cancelled_at = datetime.utcnow()
    invoice.updated_at = datetime.utcnow()

    if reason:
        invoice.remark = f"{invoice.remark or ''}\n[취소 사유] {reason}".strip()

    await db.commit()
    await db.refresh(invoice)

    return APIResponse.ok(_to_detail(invoice))


@router.post("/tax-invoices/{invoice_id}/retry", response_model=APIResponse[TaxInvoiceDetail])
async def retry_tax_invoice(
    invoice_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """세금계산서 재시도.

    발행 실패한 세금계산서를 다시 시도할 수 있도록 초안 상태로 되돌려요.
    """
    invoice = await _get_invoice_for_user(db, invoice_id, current_user)

    # Only failed invoices can be retried
    if invoice.status != TaxInvoiceStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="실패한 세금계산서만 재시도할 수 있어요",
        )

    invoice.status = TaxInvoiceStatus.DRAFT
    invoice.issue_id = None
    invoice.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(invoice)

    return APIResponse.ok(_to_detail(invoice))


@router.get("/tax-invoices/{invoice_id}/popup-url", response_model=APIResponse[PopbillUrlResponse])
async def get_popbill_popup_url(
    invoice_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """팝빌 팝업 URL 조회.

    세금계산서를 팝빌 팝업에서 확인할 수 있는 URL을 제공해요.
    """
    invoice = await _get_invoice_for_user(db, invoice_id, current_user)

    # Only issued invoices have popup URL
    if invoice.status != TaxInvoiceStatus.ISSUED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="발행된 세금계산서만 팝업에서 확인할 수 있어요",
        )

    # Call Popbill service to get popup URL
    from app.services.popbill_service import get_tax_invoice_service
    svc = get_tax_invoice_service()
    popup_url = await svc.get_popup_url(invoice.issue_id, str(current_user.id))
    expires_at = datetime.utcnow().replace(hour=23, minute=59, second=59)

    return APIResponse.ok(
        PopbillUrlResponse(
            url=popup_url,
            expires_at=expires_at,
        )
    )


def _to_detail(invoice: TaxInvoice) -> TaxInvoiceDetail:
    """Convert invoice model to detail response."""
    return TaxInvoiceDetail(
        id=invoice.id,
        project_id=invoice.project_id,
        organization_id=invoice.organization_id,
        mgtkey=invoice.mgtkey,
        issue_id=invoice.issue_id,
        invoice_type=invoice.invoice_type.value,
        supply_amount=invoice.supply_amount,
        tax_amount=invoice.tax_amount,
        total_amount=invoice.total_amount,
        supplier_corp_num=invoice.supplier_corp_num,
        supplier_name=invoice.supplier_name,
        supplier_ceo=invoice.supplier_ceo,
        supplier_address=invoice.supplier_address,
        supplier_email=invoice.supplier_email,
        buyer_corp_num=invoice.buyer_corp_num,
        buyer_name=invoice.buyer_name,
        buyer_ceo=invoice.buyer_ceo,
        buyer_address=invoice.buyer_address,
        buyer_email=invoice.buyer_email,
        description=invoice.description,
        remark=invoice.remark,
        issue_date=invoice.issue_date,
        status=invoice.status.value,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        issued_at=invoice.issued_at,
        cancelled_at=invoice.cancelled_at,
        created_by=invoice.created_by,
    )
