"""유니그린 API 메인 애플리케이션."""
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.exceptions import SigongOnException
from app.core.snowflake import set_snowflake_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 라이프사이클 관리."""
    # Startup
    print(f"🚀 {settings.app_name} v{settings.app_version} 시작...")
    set_snowflake_worker(settings.snowflake_worker_id)
    
    if settings.debug:
        # 개발 환경에서만 테이블 자동 생성
        await init_db()
        print("📦 데이터베이스 테이블 초기화 완료")
    
    yield
    
    # Shutdown
    await close_db()
    print("👋 서버 종료")


# FastAPI 앱 생성
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI 기반 누수 진단 및 건설 관리 SaaS API",
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
    lifespan=lifespan,
)

# CORS 미들웨어
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 전역 예외 핸들러
@app.exception_handler(SigongOnException)
async def sigongon_exception_handler(
    request: Request,
    exc: SigongOnException,
) -> JSONResponse:
    """커스텀 예외 핸들러."""
    return JSONResponse(
        status_code=_get_status_code(exc.code),
        content={
            "success": False,
            "data": None,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


def _get_status_code(code: str) -> int:
    """에러 코드에 따른 HTTP 상태 코드 반환."""
    status_map = {
        "NOT_FOUND": 404,
        "VALIDATION_ERROR": 422,
        "UNAUTHORIZED": 401,
        "FORBIDDEN": 403,
        "PRICEBOOK_INACTIVE": 400,
        "ESTIMATE_LOCKED": 400,
        "AI_SERVICE_ERROR": 503,
        "FILE_UPLOAD_ERROR": 400,
    }
    return status_map.get(code, 500)


# 기본 엔드포인트
@app.get("/")
async def root():
    """루트 엔드포인트."""
    return {
        "message": f"{settings.app_name}이(가) 실행 중입니다.",
        "version": settings.app_version,
    }


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "database": "connected",
        "ai_service": "available" if settings.gemini_api_key else "not_configured",
    }


from app.routers import (
    auth_router,
    customers_router,
    projects_router,
    site_visits_router,
    diagnoses_router,
    estimates_router,
    pricebooks_router,
    rag_router,
    cases_router,
    harness_router,
)
from app.routers.licenses import router as licenses_router
from app.routers.contracts import router as contracts_router, project_contracts_router
from app.routers.labor_contracts import router as labor_contracts_router, project_labor_router
from app.routers.materials import router as materials_router
from app.routers.operations import router as operations_router
from app.routers.users import router as users_router
from app.routers.photo_albums import router as photo_albums_router
from app.routers.construction_reports import router as construction_reports_router
from app.routers.billing import router as billing_router
from app.routers.tax_invoices import router as tax_invoices_router
from app.routers.field_representatives import router as field_representatives_router
from app.routers.consent import router as consent_router
from app.routers.documents import router as documents_router
from app.routers.notifications import router as notifications_router
from app.routers.dashboard import router as dashboard_router
from app.routers.device_tokens import router as device_tokens_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["인증"])
app.include_router(users_router, prefix="/api/v1/users", tags=["사용자 관리"])
app.include_router(customers_router, prefix="/api/v1/customers", tags=["발주처"])
app.include_router(projects_router, prefix="/api/v1/projects", tags=["프로젝트"])
app.include_router(site_visits_router, prefix="/api/v1", tags=["현장 방문"])
app.include_router(diagnoses_router, prefix="/api/v1", tags=["AI 진단"])
app.include_router(estimates_router, prefix="/api/v1", tags=["견적서"])
app.include_router(pricebooks_router, prefix="/api/v1/pricebooks", tags=["단가표"])
app.include_router(rag_router, prefix="/api/v1/rag", tags=["RAG 검색"])
app.include_router(harness_router, prefix="/api/v1/harness", tags=["Harness 운영"])
app.include_router(cases_router, prefix="/api/v1", tags=["시즌/케이스 견적"])
app.include_router(licenses_router, prefix="/api/v1/licenses", tags=["면허"])
app.include_router(contracts_router, prefix="/api/v1", tags=["계약"])
app.include_router(project_contracts_router, prefix="/api/v1", tags=["계약"])
app.include_router(labor_contracts_router, prefix="/api/v1", tags=["노무비"])
app.include_router(project_labor_router, prefix="/api/v1", tags=["노무비"])
app.include_router(materials_router, prefix="/api/v1/materials", tags=["자재 매칭"])
app.include_router(photo_albums_router, prefix="/api/v1", tags=["준공사진첩"])
app.include_router(construction_reports_router, prefix="/api/v1", tags=["착공계/준공계"])
app.include_router(billing_router, prefix="/api/v1", tags=["결제 및 구독"])
app.include_router(tax_invoices_router, prefix="/api/v1", tags=["세금계산서"])
app.include_router(operations_router, prefix="/api/v1", tags=["운영 확장"])
app.include_router(field_representatives_router, prefix="/api/v1", tags=["현장대리인"])
app.include_router(consent_router, prefix="/api/v1", tags=["동의 기록"])
app.include_router(documents_router, prefix="/api/v1", tags=["문서 생성"])
app.include_router(notifications_router, prefix="/api/v1", tags=["알림"])
app.include_router(dashboard_router, prefix="/api/v1", tags=["대시보드"])
app.include_router(device_tokens_router, prefix="/api/v1", tags=["FCM 디바이스 토큰"])
