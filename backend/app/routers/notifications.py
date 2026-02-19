"""알림톡/SMS 알림 API."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.response import APIResponse
from app.services.audit_log import write_activity_log
from app.services.sms import get_sms_service

router = APIRouter(prefix="/notifications", tags=["알림"])

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class AlimTalkRequest(BaseModel):
    """알림톡 발송 요청."""
    phone: str
    template_code: str
    variables: dict


class AlimTalkStatusResponse(BaseModel):
    """알림톡 발송 상태 응답."""
    message_id: str
    status: str


@router.post("/alimtalk", response_model=APIResponse[dict], status_code=status.HTTP_200_OK)
async def send_alimtalk(
    payload: AlimTalkRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """알림톡 발송.

    카카오 알림톡을 발송해요. mock 모드에서는 콘솔에 출력해요.
    """
    sms_service = get_sms_service()
    try:
        result = await sms_service.send_alimtalk(
            phone=payload.phone,
            template_code=payload.template_code,
            variables=payload.variables,
        )
        await write_activity_log(
            db,
            user_id=current_user.id,
            action="notification_send_success",
            description=f"알림톡 발송 성공: template={payload.template_code}",
        )
        return APIResponse.ok(result)
    except Exception as exc:
        await write_activity_log(
            db,
            user_id=current_user.id,
            action="notification_send_failure",
            description=f"알림톡 발송 실패: template={payload.template_code}",
        )
        # HTTPException을 올리면 get_async_db 의존성에서 롤백되므로
        # 실패 감사로그는 예외 전 명시적으로 커밋해 보존한다.
        await db.commit()
        raise HTTPException(status_code=500, detail=f"알림톡 발송 실패: {exc}") from exc


@router.get("/alimtalk/{message_id}/status", response_model=APIResponse[AlimTalkStatusResponse])
async def get_alimtalk_status(
    message_id: str,
    current_user: CurrentUser,
):
    """알림톡 발송 상태 조회.

    발송된 알림톡의 상태를 조회해요.
    """
    # TODO: 알리고 API에서 상태 조회 (현재 mock은 상태 조회 미지원)
    return APIResponse.ok(AlimTalkStatusResponse(
        message_id=message_id,
        status="sent",
    ))
