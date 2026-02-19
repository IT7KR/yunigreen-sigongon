"""Daily report API tests for read and HWPX download flows."""

from __future__ import annotations

import io
import zipfile
from datetime import date
from pathlib import Path

import pytest
from httpx import AsyncClient

import app.routers.operations as operations_router_module
from app.core.database import get_async_db
from app.core.security import get_current_user
from app.main import app
from app.models.operations import DailyReport
from app.models.project import Project
from app.models.user import Organization, User, UserRole


def _write_minimal_hwpx(template_path: Path, section_xml: str) -> None:
    template_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(template_path, "w") as zf:
        zf.writestr("mimetype", "application/hwp+zip", compress_type=zipfile.ZIP_STORED)
        zf.writestr("version.xml", '<?xml version="1.0" encoding="UTF-8"?><version/>')
        zf.writestr("Contents/content.hpf", "<hpf/>")
        zf.writestr("Contents/section0.xml", section_xml)


@pytest.fixture
async def daily_report_api_context(test_db):
    org = Organization(name="유니그린개발")
    test_db.add(org)
    await test_db.flush()

    user = User(
        username="daily_report_admin",
        name="현장소장",
        role=UserRole.COMPANY_ADMIN,
        organization_id=org.id,
        password_hash="test_hash",
        is_active=True,
    )
    test_db.add(user)
    await test_db.flush()

    project = Project(
        name="방배중 외1교(역삼중) 균열보수공사",
        address="서울시 서초구",
        organization_id=org.id,
        created_by=user.id,
    )
    test_db.add(project)
    await test_db.flush()

    report = DailyReport(
        project_id=project.id,
        work_date=date(2026, 2, 19),
        weather="sunny",
        temperature="3",
        work_description="균열부위 보수 후 페인트 칠 작업",
        tomorrow_plan="전체 부위 점검 및 미비사항 보완",
        photos=["photo-1.jpg", "photo-2.jpg"],
        created_by=user.id,
    )
    test_db.add(report)
    await test_db.commit()

    async def _fake_user():
        return user

    async def _override_db():
        try:
            yield test_db
            await test_db.commit()
        except Exception:
            await test_db.rollback()
            raise

    app.dependency_overrides[get_current_user] = _fake_user
    app.dependency_overrides[get_async_db] = _override_db

    yield {"org": org, "user": user, "project": project, "report": report}

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_async_db, None)


@pytest.mark.asyncio
async def test_get_daily_report(async_client: AsyncClient, daily_report_api_context):
    project = daily_report_api_context["project"]
    report = daily_report_api_context["report"]

    response = await async_client.get(
        f"/api/v1/projects/{project.id}/daily-reports/{report.id}",
    )
    assert response.status_code == 200

    payload = response.json()["data"]
    assert payload["id"] == str(report.id)
    assert payload["project_id"] == str(project.id)
    assert payload["weather"] == "sunny"
    assert payload["temperature"] == "3"
    assert payload["photo_count"] == 2
    assert payload["work_description"] == "균열부위 보수 후 페인트 칠 작업"


@pytest.mark.asyncio
async def test_download_daily_report_hwpx_renders_context(
    async_client: AsyncClient,
    daily_report_api_context,
    monkeypatch,
    tmp_path: Path,
):
    project = daily_report_api_context["project"]
    report = daily_report_api_context["report"]

    template = tmp_path / "daily_report_template.hwpx"
    section_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">
  <hp:p><hp:run><hp:t>{{project_name}}</hp:t></hp:run></hp:p>
  <hp:p><hp:run><hp:t>{{work_date_kor}}</hp:t></hp:run></hp:p>
  <hp:p><hp:run><hp:t>{{weather}}</hp:t></hp:run></hp:p>
  <hp:p><hp:run><hp:t>{{temperature}}</hp:t></hp:run></hp:p>
  <hp:p><hp:run><hp:t>{{work_description}}</hp:t></hp:run></hp:p>
</hs:sec>"""
    _write_minimal_hwpx(template, section_xml)

    monkeypatch.setattr(
        operations_router_module,
        "_DAILY_REPORT_TEMPLATE_CANDIDATES",
        (template,),
    )
    monkeypatch.setattr(operations_router_module, "_SAMPLE_ROOT", tmp_path)

    response = await async_client.post(
        f"/api/v1/projects/{project.id}/daily-reports/{report.id}/hwpx",
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/vnd.hancom.hwpx")
    assert "attachment;" in response.headers["content-disposition"]

    with zipfile.ZipFile(io.BytesIO(response.content), "r") as zf:
        rendered = zf.read("Contents/section0.xml").decode("utf-8")

    assert "방배중 외1교(역삼중) 균열보수공사" in rendered
    assert "2026년 02월 19일" in rendered
    assert "맑음" in rendered
    assert "3℃" in rendered
    assert "균열부위 보수 후 페인트 칠 작업" in rendered

