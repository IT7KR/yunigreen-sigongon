"""Price Staging models - 추출된 단가의 임시 저장 및 검증용."""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import BigInteger, JSON

from app.core.snowflake import generate_snowflake_id


class StagingStatus(str, Enum):
    """Staging item status."""
    PENDING = "pending"            # 검토 대기
    APPROVED = "approved"          # 승인됨 → DB 저장 가능
    REJECTED = "rejected"          # 거부됨
    NEEDS_REVIEW = "needs_review"  # 수동 검토 필요 (이상치/저신뢰도)


class ConfidenceLevel(str, Enum):
    """Extraction confidence level."""
    HIGH = "high"      # 90%+ - 자동 승인 가능
    MEDIUM = "medium"  # 70-90% - 확인 권장
    LOW = "low"        # <70% - 수동 검토 필수


# ============================================================
# Price Staging Table Model
# ============================================================
class PriceStaging(SQLModel, table=True):
    """추출된 단가 임시 저장 테이블.
    
    워크플로우:
    1. PDF 업로드 → Gemini가 가격 추출 → 이 테이블에 저장
    2. Grounding 검증 (추출된 가격이 원본 텍스트에 존재하는지)
    3. 이상치 감지 (가격 급변, 필수 필드 누락 등)
    4. 관리자 검토/승인
    5. 승인 시 CatalogItemPrice로 이동 (promote)
    """
    __tablename__ = "price_staging"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    pricebook_revision_id: int = Field(sa_type=BigInteger, index=True)
    
    # 추출된 데이터
    item_name: str = Field(max_length=255, index=True)
    specification: Optional[str] = Field(default=None, max_length=500)
    unit: str = Field(max_length=20)
    unit_price_extracted: Decimal = Field(max_digits=15, decimal_places=2)
    
    # 출처 정보 (Grounding 검증용) - 환각 방지 핵심
    source_file: str = Field(max_length=255)
    source_page: int
    source_text_snippet: str  # 가격이 포함된 원본 텍스트 조각
    
    # 신뢰도 및 검증 결과
    confidence_level: ConfidenceLevel = Field(default=ConfidenceLevel.MEDIUM)
    confidence_score: Decimal = Field(default=Decimal("0.0"), max_digits=4, decimal_places=3)
    is_grounded: bool = Field(default=False)  # 가격이 source_text에 실제로 존재
    grounding_match: Optional[str] = Field(default=None)  # 매칭된 원본 문자열
    
    # 이상치 플래그
    anomaly_flags: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    # 예: ["price_increase_30%", "missing_spec", "duplicate_item"]
    
    # 상태 관리
    status: StagingStatus = Field(default=StagingStatus.PENDING, index=True)
    
    # 기존 카탈로그 매칭 (선택)
    matched_catalog_item_id: Optional[int] = Field(
        default=None, sa_type=BigInteger, index=True
    )
    
    # 감사 추적
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = Field(default=None)
    reviewed_by: Optional[int] = Field(default=None, sa_type=BigInteger)
    review_note: Optional[str] = Field(default=None)
    
    # 승인 후 생성된 정식 가격 레코드 ID
    promoted_price_id: Optional[int] = Field(default=None)


# ============================================================
# API Schemas
# ============================================================
class PriceStagingCreate(SQLModel):
    """Price staging 생성 스키마 (내부용)."""
    pricebook_revision_id: int
    item_name: str
    specification: Optional[str] = None
    unit: str
    unit_price_extracted: Decimal
    source_file: str
    source_page: int
    source_text_snippet: str
    confidence_score: Decimal = Decimal("0.0")
    is_grounded: bool = False


class PriceStagingRead(SQLModel):
    """Price staging 조회 스키마."""
    id: int
    pricebook_revision_id: int
    item_name: str
    specification: Optional[str]
    unit: str
    unit_price_extracted: Decimal
    source_file: str
    source_page: int
    source_text_snippet: str
    confidence_level: ConfidenceLevel
    confidence_score: Decimal
    is_grounded: bool
    anomaly_flags: Optional[List[str]]
    status: StagingStatus
    matched_catalog_item_id: Optional[int]
    created_at: datetime
    reviewed_at: Optional[datetime]


class PriceStagingReviewRequest(SQLModel):
    """관리자 검토 요청 스키마."""
    action: StagingStatus  # approved, rejected, needs_review
    review_note: Optional[str] = None
    # 수정이 필요한 경우
    corrected_price: Optional[Decimal] = None
    corrected_item_name: Optional[str] = None
    corrected_unit: Optional[str] = None


class PriceStagingBulkReviewRequest(SQLModel):
    """일괄 검토 요청 스키마."""
    staging_ids: List[int]
    action: StagingStatus
    review_note: Optional[str] = None


class PriceStagingSummary(SQLModel):
    """Revision별 staging 요약."""
    revision_id: int
    total_items: int
    pending_count: int
    approved_count: int
    rejected_count: int
    needs_review_count: int
    high_confidence_count: int
    grounded_count: int
    anomaly_count: int
