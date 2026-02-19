"""Harness 운영 API.

Tenant isolation note: Harness endpoints access global operational data
(code quality checks, system health metrics) stored in file-backed JSON.
No organization-specific business data is exposed, so tenant filtering
is not required here.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.response import APIResponse
from app.services.harness import (
    HarnessMetrics,
    HarnessRunRecord,
    HarnessRunRequest,
    HarnessService,
)

router = APIRouter()

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post(
    "/runs",
    response_model=APIResponse[HarnessRunRecord],
)
async def create_harness_run(
    request: HarnessRunRequest,
    _current_user: CurrentUser,
):
    """Harness 실행."""
    service = HarnessService()
    record = await service.run(request)
    return APIResponse.ok(record)


@router.get(
    "/runs/{run_id}",
    response_model=APIResponse[HarnessRunRecord],
)
async def get_harness_run(
    run_id: str,
    _current_user: CurrentUser,
):
    """Harness 실행 결과 조회."""
    service = HarnessService()
    record = await service.get_run(run_id)
    if record is None:
        return APIResponse.fail("NOT_FOUND", "Harness 실행 이력을 찾을 수 없어요.")
    return APIResponse.ok(record)


@router.get(
    "/metrics",
    response_model=APIResponse[HarnessMetrics],
)
async def get_harness_metrics(
    _current_user: CurrentUser,
    window_days: Annotated[int, Query(ge=1, le=90)] = 7,
):
    """Harness 최근 지표 조회."""
    service = HarnessService()
    metrics = await service.get_metrics(window_days=window_days)
    return APIResponse.ok(metrics)
