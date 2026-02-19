"""범용 문서 생성 API (HWPX)."""
import io
import tempfile
from pathlib import Path
from typing import Annotated, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/documents", tags=["문서 생성"])

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

# HWPX 템플릿 저장소 경로들
# backend/app/routers/ → backend/app/ → backend/ → repo-root/ → sample/...
_SAMPLE_ROOT = Path(__file__).parent.parent.parent.parent / "sample"
TEMPLATE_DIRS = {
    "generated": _SAMPLE_ROOT / "generated",
    "contract": _SAMPLE_ROOT / "1. 관공서 계약서류",
    "start": _SAMPLE_ROOT / "2. 관공서 착공서류",
    "completion": _SAMPLE_ROOT / "3. 관공서 준공서류",
    "school": _SAMPLE_ROOT / "9. 학교 서류",
}

# 하위 호환성을 위해 기존 변수 유지
TEMPLATE_BASE_PATH = TEMPLATE_DIRS["generated"]


class GenerateHwpxRequest(BaseModel):
    """HWPX 문서 생성 요청."""

    template_id: str  # 템플릿 파일명 (확장자 제외)
    context: dict  # 템플릿 변수
    category: Optional[str] = "generated"  # 템플릿 카테고리 (기본: generated)


@router.get("/templates")
async def list_templates(current_user: CurrentUser):
    """사용 가능한 HWPX 템플릿 목록 조회 (모든 카테고리)."""
    templates = []
    for category, dir_path in TEMPLATE_DIRS.items():
        if not dir_path.exists():
            continue
        for f in sorted(dir_path.glob("*.hwpx")):
            templates.append(
                {
                    "id": f.stem,
                    "name": f.stem,
                    "filename": f.name,
                    "category": category,
                }
            )

    return {"templates": templates}


@router.post("/generate-hwpx")
async def generate_hwpx(
    payload: GenerateHwpxRequest,
    current_user: CurrentUser,
):
    """HWPX 문서 생성 및 다운로드.

    template_id: 템플릿 파일명 (확장자 제외, 예: '시방서_토큰템플릿')
    context: 템플릿 변수 딕셔너리
    category: 템플릿 카테고리 (generated/contract/start/completion/school, 기본: generated)
    """
    category = payload.category or "generated"
    template_dir = TEMPLATE_DIRS.get(category)
    if template_dir is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"알 수 없는 카테고리: {category}. 가능한 값: {list(TEMPLATE_DIRS.keys())}",
        )

    template_path = template_dir / f"{payload.template_id}.hwpx"

    if not template_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"템플릿을 찾을 수 없어요: {payload.template_id}",
        )

    try:
        from app.services.hwpx_template_engine import HwpxTemplateEngine

        engine = HwpxTemplateEngine(strict=False)

        with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        try:
            engine.render(
                template_path=template_path,
                output_path=tmp_path,
                context=payload.context,
            )
            output_bytes = tmp_path.read_bytes()
        finally:
            tmp_path.unlink(missing_ok=True)

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"템플릿 파일 오류: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"HWPX 생성 실패: {str(e)}",
        )

    filename = f"{payload.template_id}.hwpx"
    encoded_filename = quote(filename, safe="")

    return StreamingResponse(
        io.BytesIO(output_bytes),
        media_type="application/vnd.hancom.hwpx",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
        },
    )
