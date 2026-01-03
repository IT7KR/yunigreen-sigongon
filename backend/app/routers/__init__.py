"""API 라우터 패키지."""
from app.routers.auth import router as auth_router
from app.routers.projects import router as projects_router
from app.routers.site_visits import router as site_visits_router
from app.routers.diagnoses import router as diagnoses_router
from app.routers.estimates import router as estimates_router
from app.routers.pricebooks import router as pricebooks_router
from app.routers.rag import router as rag_router

__all__ = [
    "auth_router",
    "projects_router",
    "site_visits_router",
    "diagnoses_router",
    "estimates_router",
    "pricebooks_router",
    "rag_router",
]
