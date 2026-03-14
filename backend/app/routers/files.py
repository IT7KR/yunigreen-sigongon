"""파일 서빙 전용 라우터."""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.core.security import get_current_user
from app.models.user import User
from app.services.storage import storage_service

logger = logging.getLogger(__name__)

router = APIRouter()

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/{category}/{file_path:path}")
async def serve_file(
    category: str,
    file_path: str,
    current_user: CurrentUser,
):
    """인증된 사용자에게 파일 서빙.

    - JWT 인증 필수
    - 경로 순회 공격 방지
    - Cache-Control: private, max-age=3600
    """
    # 경로 순회 방지 검증
    relative_path = f"{category}/{file_path}"
    try:
        safe_path = storage_service.sanitize_path(relative_path)  # type: ignore[attr-defined]
    except ValueError:
        raise HTTPException(status_code=403, detail="잘못된 파일 경로예요.")

    if not safe_path.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없어요.")

    return FileResponse(
        path=safe_path,
        headers={
            "Cache-Control": "private, max-age=3600",
        },
    )
