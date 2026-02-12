"""Project-wide harness checks and run registry."""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Optional

import httpx
from pydantic import BaseModel, Field

from app.core.config import settings


class HarnessType(str, Enum):
    """Harness categories."""

    CODE = "code"
    BEHAVIOR = "behavior"
    AI = "ai"
    OPS = "ops"


class HarnessCheckStatus(str, Enum):
    """Per-check status."""

    PASS = "pass"
    FAIL = "fail"
    WARN = "warn"


class HarnessRunStatus(str, Enum):
    """Overall run status."""

    PASSED = "passed"
    FAILED = "failed"


class HarnessCheckResult(BaseModel):
    """Single harness check result."""

    name: str
    harness_type: HarnessType
    status: HarnessCheckStatus
    details: str
    evidence: list[str] = Field(default_factory=list)


class HarnessSummary(BaseModel):
    """Run summary."""

    total_checks: int
    passed: int
    failed: int
    warnings: int
    by_harness: dict[HarnessType, dict[str, int]]


class HarnessRunRecord(BaseModel):
    """Persisted harness run record."""

    id: str
    created_at: datetime
    finished_at: datetime
    status: HarnessRunStatus
    selected_harnesses: list[HarnessType]
    checks: list[HarnessCheckResult]
    summary: HarnessSummary


class HarnessRunRequest(BaseModel):
    """Harness run request payload."""

    harness_types: list[HarnessType] = Field(
        default_factory=lambda: [
            HarnessType.CODE,
            HarnessType.BEHAVIOR,
            HarnessType.AI,
            HarnessType.OPS,
        ]
    )


class HarnessMetrics(BaseModel):
    """Aggregated harness metrics."""

    window_days: int
    total_runs: int
    passed_runs: int
    failed_runs: int
    pass_rate: float
    by_harness: dict[HarnessType, dict[str, int]]
    recent_failures: list[dict[str, Any]]


class HarnessService:
    """Harness runner + file-backed run registry."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.backend_root = Path(__file__).resolve().parents[2]
        parent = self.backend_root.parent
        if (parent / "backend").exists() and (parent / "frontend").exists():
            self.repo_root = parent
        else:
            self.repo_root = self.backend_root

        configured_data_dir = Path(data_dir or settings.harness_data_dir)
        if configured_data_dir.is_absolute():
            self.data_dir = configured_data_dir
        else:
            self.data_dir = self.backend_root / configured_data_dir

        self.docs_root = self.repo_root / "docs"
        self.frontend_root = self.repo_root / "frontend"
        self.routers_root = self.backend_root / "app" / "routers"

        self.data_dir.mkdir(parents=True, exist_ok=True)

    async def run(self, request: HarnessRunRequest) -> HarnessRunRecord:
        """Run selected harnesses and persist the result."""
        selected = self._normalize_harness_types(request.harness_types)
        started_at = datetime.now(timezone.utc)
        checks: list[HarnessCheckResult] = []

        for harness_type in selected:
            if harness_type == HarnessType.CODE:
                checks.extend(await self._run_code_harness())
            elif harness_type == HarnessType.BEHAVIOR:
                checks.extend(await self._run_behavior_harness())
            elif harness_type == HarnessType.AI:
                checks.extend(await self._run_ai_harness())
            elif harness_type == HarnessType.OPS:
                checks.extend(await self._run_ops_harness())

        summary = self._build_summary(checks)
        status = (
            HarnessRunStatus.FAILED
            if summary.failed > 0
            else HarnessRunStatus.PASSED
        )
        record = HarnessRunRecord(
            id=str(uuid.uuid4()),
            created_at=started_at,
            finished_at=datetime.now(timezone.utc),
            status=status,
            selected_harnesses=selected,
            checks=checks,
            summary=summary,
        )
        self._write_run(record)
        return record

    async def get_run(self, run_id: str) -> Optional[HarnessRunRecord]:
        """Get a single persisted run."""
        path = self.data_dir / f"{run_id}.json"
        if not path.exists():
            return None
        payload = json.loads(path.read_text(encoding="utf-8"))
        return HarnessRunRecord.model_validate(payload)

    async def get_metrics(self, window_days: int = 7) -> HarnessMetrics:
        """Aggregate run metrics for the recent window."""
        all_runs = self._read_all_runs()
        window_start = datetime.now(timezone.utc) - timedelta(days=window_days)
        runs = [r for r in all_runs if r.created_at >= window_start]

        passed_runs = len([r for r in runs if r.status == HarnessRunStatus.PASSED])
        failed_runs = len([r for r in runs if r.status == HarnessRunStatus.FAILED])
        total_runs = len(runs)
        pass_rate = (passed_runs / total_runs) if total_runs > 0 else 0.0

        by_harness: dict[HarnessType, dict[str, int]] = {
            HarnessType.CODE: {"pass": 0, "fail": 0, "warn": 0},
            HarnessType.BEHAVIOR: {"pass": 0, "fail": 0, "warn": 0},
            HarnessType.AI: {"pass": 0, "fail": 0, "warn": 0},
            HarnessType.OPS: {"pass": 0, "fail": 0, "warn": 0},
        }

        recent_failures: list[dict[str, Any]] = []
        for run in runs:
            for check in run.checks:
                by_harness[check.harness_type][check.status.value] += 1
                if check.status == HarnessCheckStatus.FAIL:
                    recent_failures.append(
                        {
                            "run_id": run.id,
                            "created_at": run.created_at.isoformat(),
                            "harness_type": check.harness_type.value,
                            "check_name": check.name,
                            "details": check.details,
                        }
                    )

        recent_failures = recent_failures[:20]
        return HarnessMetrics(
            window_days=window_days,
            total_runs=total_runs,
            passed_runs=passed_runs,
            failed_runs=failed_runs,
            pass_rate=round(pass_rate, 4),
            by_harness=by_harness,
            recent_failures=recent_failures,
        )

    def _normalize_harness_types(self, harness_types: list[HarnessType]) -> list[HarnessType]:
        ordered: list[HarnessType] = []
        seen: set[HarnessType] = set()
        for harness_type in harness_types:
            if harness_type not in seen:
                ordered.append(harness_type)
                seen.add(harness_type)
        return ordered

    def _build_summary(self, checks: list[HarnessCheckResult]) -> HarnessSummary:
        by_harness: dict[HarnessType, dict[str, int]] = {
            HarnessType.CODE: {"pass": 0, "fail": 0, "warn": 0},
            HarnessType.BEHAVIOR: {"pass": 0, "fail": 0, "warn": 0},
            HarnessType.AI: {"pass": 0, "fail": 0, "warn": 0},
            HarnessType.OPS: {"pass": 0, "fail": 0, "warn": 0},
        }

        passed = 0
        failed = 0
        warnings = 0
        for check in checks:
            by_harness[check.harness_type][check.status.value] += 1
            if check.status == HarnessCheckStatus.PASS:
                passed += 1
            elif check.status == HarnessCheckStatus.FAIL:
                failed += 1
            else:
                warnings += 1

        return HarnessSummary(
            total_checks=len(checks),
            passed=passed,
            failed=failed,
            warnings=warnings,
            by_harness=by_harness,
        )

    def _write_run(self, record: HarnessRunRecord) -> None:
        path = self.data_dir / f"{record.id}.json"
        path.write_text(
            record.model_dump_json(indent=2, exclude_none=True),
            encoding="utf-8",
        )

    def _read_all_runs(self) -> list[HarnessRunRecord]:
        runs: list[HarnessRunRecord] = []
        for path in sorted(self.data_dir.glob("*.json")):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
                runs.append(HarnessRunRecord.model_validate(payload))
            except Exception:
                continue

        runs.sort(key=lambda run: run.created_at, reverse=True)
        return runs

    async def _run_code_harness(self) -> list[HarnessCheckResult]:
        return [
            self._check_router_async_only(),
            self._check_no_sync_session_usage(),
            self._check_frontend_layer_boundaries(),
            self._check_engineering_docs_scaffold(),
        ]

    async def _run_behavior_harness(self) -> list[HarnessCheckResult]:
        return [
            self._check_openapi_includes_harness_routes(),
            self._check_behavior_tests_exist(),
            self._check_api_spec_documents_harness(),
            await self._check_live_health_endpoint(),
        ]

    async def _run_ai_harness(self) -> list[HarnessCheckResult]:
        return [
            self._check_gemini_fallback_chain(),
            self._check_json_schema_enforcement(),
            self._check_prompt_versioning_files(),
            self._check_ai_price_guardrail(),
            self._check_manual_fallback_path(),
        ]

    async def _run_ops_harness(self) -> list[HarnessCheckResult]:
        return [
            self._check_health_payload_contract(),
            self._check_ai_error_mapping(),
            self._check_db_healthcheck_in_compose(),
            self._check_diagnosis_observability_logging(),
        ]

    def _check_router_async_only(self) -> HarnessCheckResult:
        violations: list[str] = []
        files = sorted(self.routers_root.glob("*.py"))
        for file_path in files:
            if file_path.name == "__init__.py":
                continue
            lines = file_path.read_text(encoding="utf-8").splitlines()
            for i, line in enumerate(lines):
                stripped = line.strip()
                if not stripped.startswith("@router."):
                    continue
                j = i + 1
                while j < len(lines):
                    current = lines[j].strip()
                    if not current or current.startswith("#"):
                        j += 1
                        continue
                    if current.startswith("@"):
                        j += 1
                        continue
                    if current.startswith("def "):
                        violations.append(f"{file_path}:{j + 1}")
                    break

        if violations:
            return HarnessCheckResult(
                name="router_async_only",
                harness_type=HarnessType.CODE,
                status=HarnessCheckStatus.FAIL,
                details="FastAPI 라우터에 sync endpoint가 있어요.",
                evidence=violations[:20],
            )
        return HarnessCheckResult(
            name="router_async_only",
            harness_type=HarnessType.CODE,
            status=HarnessCheckStatus.PASS,
            details="모든 FastAPI endpoint가 async로 선언되어 있어요.",
        )

    def _check_no_sync_session_usage(self) -> HarnessCheckResult:
        patterns = [
            re.compile(r"from\s+sqlalchemy\.orm\s+import\s+Session"),
            re.compile(r"\bSessionLocal\b"),
        ]
        violations: list[str] = []
        for file_path in (self.backend_root / "app").rglob("*.py"):
            text = file_path.read_text(encoding="utf-8")
            if any(pattern.search(text) for pattern in patterns):
                violations.append(str(file_path))

        if violations:
            return HarnessCheckResult(
                name="no_sync_db_session",
                harness_type=HarnessType.CODE,
                status=HarnessCheckStatus.FAIL,
                details="sync DB session 사용 흔적이 있어요.",
                evidence=violations[:20],
            )
        return HarnessCheckResult(
            name="no_sync_db_session",
            harness_type=HarnessType.CODE,
            status=HarnessCheckStatus.PASS,
            details="sync SQLAlchemy Session 사용 흔적이 없어요.",
        )

    def _check_frontend_layer_boundaries(self) -> HarnessCheckResult:
        if not self.frontend_root.exists():
            return HarnessCheckResult(
                name="frontend_layer_boundaries",
                harness_type=HarnessType.CODE,
                status=HarnessCheckStatus.WARN,
                details="frontend 디렉터리가 없어 레이어 경계를 검사하지 않았어요.",
            )

        violations: list[str] = []
        target_files = [
            *self.frontend_root.glob("apps/admin/**/*.ts"),
            *self.frontend_root.glob("apps/admin/**/*.tsx"),
            *self.frontend_root.glob("apps/mobile/**/*.ts"),
            *self.frontend_root.glob("apps/mobile/**/*.tsx"),
        ]
        for file_path in target_files:
            text = file_path.read_text(encoding="utf-8")
            if re.search(r"from\s+['\"].*apps\/(admin|mobile)", text):
                violations.append(str(file_path))
            if "from '@sigongon/admin'" in text or 'from "@sigongon/admin"' in text:
                violations.append(str(file_path))
            if "from '@sigongon/mobile'" in text or 'from "@sigongon/mobile"' in text:
                violations.append(str(file_path))

        if violations:
            return HarnessCheckResult(
                name="frontend_layer_boundaries",
                harness_type=HarnessType.CODE,
                status=HarnessCheckStatus.FAIL,
                details="앱 간 직접 참조가 감지됐어요. packages 경유로 분리해야 해요.",
                evidence=sorted(set(violations))[:20],
            )
        return HarnessCheckResult(
            name="frontend_layer_boundaries",
            harness_type=HarnessType.CODE,
            status=HarnessCheckStatus.PASS,
            details="frontend 앱 간 직접 참조가 감지되지 않았어요.",
        )

    def _check_engineering_docs_scaffold(self) -> HarnessCheckResult:
        required = [
            self.docs_root / "engineering" / "01_arch_rules.md",
            self.docs_root / "engineering" / "02_quality_gates.md",
            self.docs_root / "engineering" / "03_ai_safety_rules.md",
            self.docs_root / "engineering" / "04_prompt_lifecycle.md",
            self.docs_root / "specs" / "_template" / "spec.md",
            self.docs_root / "specs" / "_template" / "acceptance.md",
            self.docs_root / "specs" / "_template" / "eval_cases.yaml",
        ]
        missing = [str(path) for path in required if not path.exists()]
        if missing:
            return HarnessCheckResult(
                name="engineering_docs_scaffold",
                harness_type=HarnessType.CODE,
                status=HarnessCheckStatus.FAIL,
                details="Harness 기반 엔지니어링 문서 스캐폴드가 누락됐어요.",
                evidence=missing,
            )
        return HarnessCheckResult(
            name="engineering_docs_scaffold",
            harness_type=HarnessType.CODE,
            status=HarnessCheckStatus.PASS,
            details="Harness 엔지니어링 문서 스캐폴드가 준비되어 있어요.",
        )

    def _check_openapi_includes_harness_routes(self) -> HarnessCheckResult:
        main_path = self.backend_root / "app" / "main.py"
        if not main_path.exists():
            return HarnessCheckResult(
                name="openapi_includes_harness_routes",
                harness_type=HarnessType.BEHAVIOR,
                status=HarnessCheckStatus.FAIL,
                details="main.py를 찾을 수 없어요.",
            )
        text = main_path.read_text(encoding="utf-8")
        if "harness_router" not in text:
            return HarnessCheckResult(
                name="openapi_includes_harness_routes",
                harness_type=HarnessType.BEHAVIOR,
                status=HarnessCheckStatus.FAIL,
                details="harness 라우터가 앱에 연결되지 않았어요.",
            )
        return HarnessCheckResult(
            name="openapi_includes_harness_routes",
            harness_type=HarnessType.BEHAVIOR,
            status=HarnessCheckStatus.PASS,
            details="harness 라우터 연결이 확인됐어요.",
        )

    def _check_behavior_tests_exist(self) -> HarnessCheckResult:
        required = [
            self.backend_root / "tests" / "test_health.py",
            self.backend_root / "tests" / "test_e2e_workflow.py",
            self.backend_root / "tests" / "test_harness_service.py",
        ]
        missing = [str(path) for path in required if not path.exists()]
        if missing:
            return HarnessCheckResult(
                name="behavior_tests_exist",
                harness_type=HarnessType.BEHAVIOR,
                status=HarnessCheckStatus.FAIL,
                details="핵심 behavior 테스트 파일이 누락됐어요.",
                evidence=missing,
            )
        return HarnessCheckResult(
            name="behavior_tests_exist",
            harness_type=HarnessType.BEHAVIOR,
            status=HarnessCheckStatus.PASS,
            details="핵심 behavior 테스트 파일이 존재해요.",
        )

    def _check_api_spec_documents_harness(self) -> HarnessCheckResult:
        spec_path = self.docs_root / "03_API_SPEC.md"
        if not spec_path.exists():
            return HarnessCheckResult(
                name="api_spec_documents_harness",
                harness_type=HarnessType.BEHAVIOR,
                status=HarnessCheckStatus.WARN,
                details="API 명세 문서를 찾지 못했어요.",
            )
        text = spec_path.read_text(encoding="utf-8")
        if "/harness/runs" not in text:
            return HarnessCheckResult(
                name="api_spec_documents_harness",
                harness_type=HarnessType.BEHAVIOR,
                status=HarnessCheckStatus.FAIL,
                details="API 명세에 harness endpoint가 반영되지 않았어요.",
            )
        return HarnessCheckResult(
            name="api_spec_documents_harness",
            harness_type=HarnessType.BEHAVIOR,
            status=HarnessCheckStatus.PASS,
            details="API 명세에 harness endpoint가 반영되어 있어요.",
        )

    async def _check_live_health_endpoint(self) -> HarnessCheckResult:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get("http://127.0.0.1:8000/health")
            if response.status_code != 200:
                return HarnessCheckResult(
                    name="live_health_endpoint",
                    harness_type=HarnessType.BEHAVIOR,
                    status=HarnessCheckStatus.FAIL,
                    details=f"/health 응답 코드가 비정상이에요: {response.status_code}",
                )
            payload = response.json()
            required_keys = {"status", "version", "database", "ai_service"}
            missing = [k for k in required_keys if k not in payload]
            if missing:
                return HarnessCheckResult(
                    name="live_health_endpoint",
                    harness_type=HarnessType.BEHAVIOR,
                    status=HarnessCheckStatus.FAIL,
                    details="/health 응답 필드가 누락됐어요.",
                    evidence=missing,
                )
            return HarnessCheckResult(
                name="live_health_endpoint",
                harness_type=HarnessType.BEHAVIOR,
                status=HarnessCheckStatus.PASS,
                details="실행 중인 서버 /health 검증에 성공했어요.",
            )
        except Exception:
            return HarnessCheckResult(
                name="live_health_endpoint",
                harness_type=HarnessType.BEHAVIOR,
                status=HarnessCheckStatus.WARN,
                details="로컬 서버가 실행 중이 아니라 live /health 검증을 건너뛰었어요.",
            )

    def _check_gemini_fallback_chain(self) -> HarnessCheckResult:
        ai_path = self.backend_root / "app" / "core" / "ai.py"
        if not ai_path.exists():
            return HarnessCheckResult(
                name="gemini_fallback_chain",
                harness_type=HarnessType.AI,
                status=HarnessCheckStatus.FAIL,
                details="core/ai.py를 찾을 수 없어요.",
            )
        text = ai_path.read_text(encoding="utf-8")
        missing = []
        for model in ("gemini-3.0-flash", "gemini-2.0-flash"):
            if model not in text:
                missing.append(model)
        if missing:
            return HarnessCheckResult(
                name="gemini_fallback_chain",
                harness_type=HarnessType.AI,
                status=HarnessCheckStatus.FAIL,
                details="필수 Gemini 폴백 체인이 누락됐어요.",
                evidence=missing,
            )
        model_count = len(re.findall(r"gemini-[0-9]\.[0-9]-flash", text))
        status = HarnessCheckStatus.PASS if model_count >= 3 else HarnessCheckStatus.WARN
        details = (
            "Gemini 폴백 체인이 3단계 이상으로 구성되어 있어요."
            if status == HarnessCheckStatus.PASS
            else "Gemini 폴백 체인이 2단계 이하예요. 3단계를 권장해요."
        )
        return HarnessCheckResult(
            name="gemini_fallback_chain",
            harness_type=HarnessType.AI,
            status=status,
            details=details,
        )

    def _check_json_schema_enforcement(self) -> HarnessCheckResult:
        targets = [
            self.backend_root / "app" / "core" / "ai.py",
            self.backend_root / "app" / "services" / "price_extractor.py",
        ]
        missing = []
        for path in targets:
            if not path.exists():
                missing.append(str(path))
                continue
            text = path.read_text(encoding="utf-8")
            if '"response_mime_type": "application/json"' not in text:
                missing.append(str(path))
        if missing:
            return HarnessCheckResult(
                name="json_schema_enforcement",
                harness_type=HarnessType.AI,
                status=HarnessCheckStatus.FAIL,
                details="일부 AI 호출에서 JSON 응답 강제가 누락됐어요.",
                evidence=missing,
            )
        return HarnessCheckResult(
            name="json_schema_enforcement",
            harness_type=HarnessType.AI,
            status=HarnessCheckStatus.PASS,
            details='AI 호출에 "application/json" 강제가 설정되어 있어요.',
        )

    def _check_prompt_versioning_files(self) -> HarnessCheckResult:
        required = [
            self.backend_root / "app" / "prompts" / "diagnosis" / "current.txt",
        ]
        missing = [str(path) for path in required if not path.exists()]
        if missing:
            return HarnessCheckResult(
                name="prompt_versioning_files",
                harness_type=HarnessType.AI,
                status=HarnessCheckStatus.FAIL,
                details="프롬프트 버전 관리 파일이 누락됐어요.",
                evidence=missing,
            )
        return HarnessCheckResult(
            name="prompt_versioning_files",
            harness_type=HarnessType.AI,
            status=HarnessCheckStatus.PASS,
            details="프롬프트 버전 관리 파일이 존재해요.",
        )

    def _check_ai_price_guardrail(self) -> HarnessCheckResult:
        estimation_path = self.backend_root / "app" / "services" / "estimation.py"
        if not estimation_path.exists():
            return HarnessCheckResult(
                name="ai_price_guardrail",
                harness_type=HarnessType.AI,
                status=HarnessCheckStatus.FAIL,
                details="estimation.py를 찾을 수 없어요.",
            )
        text = estimation_path.read_text(encoding="utf-8").lower()
        forbidden = ["gemini", "generativeai", "analyze_with_images"]
        violations = [token for token in forbidden if token in text]
        if violations:
            return HarnessCheckResult(
                name="ai_price_guardrail",
                harness_type=HarnessType.AI,
                status=HarnessCheckStatus.FAIL,
                details="견적 계산 로직에서 AI 호출 흔적이 감지됐어요.",
                evidence=violations,
            )
        return HarnessCheckResult(
            name="ai_price_guardrail",
            harness_type=HarnessType.AI,
            status=HarnessCheckStatus.PASS,
            details="견적 계산 서비스는 AI 호출 없이 RDB 계산만 수행해요.",
        )

    def _check_manual_fallback_path(self) -> HarnessCheckResult:
        ai_path = self.backend_root / "app" / "core" / "ai.py"
        text = ai_path.read_text(encoding="utf-8") if ai_path.exists() else ""
        required = ["requires_manual=True", "수동으로 입력해 주세요"]
        missing = [token for token in required if token not in text]
        if missing:
            return HarnessCheckResult(
                name="manual_fallback_path",
                harness_type=HarnessType.AI,
                status=HarnessCheckStatus.FAIL,
                details="AI 실패 시 수동 폴백 경로가 충분히 보장되지 않았어요.",
                evidence=missing,
            )
        return HarnessCheckResult(
            name="manual_fallback_path",
            harness_type=HarnessType.AI,
            status=HarnessCheckStatus.PASS,
            details="AI 실패 시 수동 입력 폴백 경로가 확인돼요.",
        )

    def _check_health_payload_contract(self) -> HarnessCheckResult:
        main_path = self.backend_root / "app" / "main.py"
        if not main_path.exists():
            return HarnessCheckResult(
                name="health_payload_contract",
                harness_type=HarnessType.OPS,
                status=HarnessCheckStatus.FAIL,
                details="main.py를 찾을 수 없어요.",
            )
        text = main_path.read_text(encoding="utf-8")
        required = ['"status"', '"version"', '"database"', '"ai_service"']
        missing = [key for key in required if key not in text]
        if missing:
            return HarnessCheckResult(
                name="health_payload_contract",
                harness_type=HarnessType.OPS,
                status=HarnessCheckStatus.FAIL,
                details="/health 응답 필드 계약이 누락됐어요.",
                evidence=missing,
            )
        return HarnessCheckResult(
            name="health_payload_contract",
            harness_type=HarnessType.OPS,
            status=HarnessCheckStatus.PASS,
            details="/health 응답 필드 계약이 유지되고 있어요.",
        )

    def _check_ai_error_mapping(self) -> HarnessCheckResult:
        main_path = self.backend_root / "app" / "main.py"
        text = main_path.read_text(encoding="utf-8") if main_path.exists() else ""
        if '"AI_SERVICE_ERROR": 503' not in text:
            return HarnessCheckResult(
                name="ai_error_mapping",
                harness_type=HarnessType.OPS,
                status=HarnessCheckStatus.FAIL,
                details="AI_SERVICE_ERROR 상태 코드 매핑이 누락됐어요.",
            )
        return HarnessCheckResult(
            name="ai_error_mapping",
            harness_type=HarnessType.OPS,
            status=HarnessCheckStatus.PASS,
            details="AI_SERVICE_ERROR -> 503 매핑이 유지되고 있어요.",
        )

    def _check_db_healthcheck_in_compose(self) -> HarnessCheckResult:
        compose_files = [
            self.repo_root / "docker-compose.yml",
            self.repo_root / "docker-compose.dev.yml",
        ]
        missing = []
        for path in compose_files:
            if not path.exists():
                continue
            text = path.read_text(encoding="utf-8")
            if "healthcheck:" not in text or "pg_isready" not in text:
                missing.append(str(path))
        if missing:
            return HarnessCheckResult(
                name="db_healthcheck_in_compose",
                harness_type=HarnessType.OPS,
                status=HarnessCheckStatus.FAIL,
                details="일부 compose 파일에서 DB healthcheck 구성이 누락됐어요.",
                evidence=missing,
            )
        if not any(path.exists() for path in compose_files):
            return HarnessCheckResult(
                name="db_healthcheck_in_compose",
                harness_type=HarnessType.OPS,
                status=HarnessCheckStatus.WARN,
                details="compose 파일이 없어 DB healthcheck 검사를 건너뛰었어요.",
            )
        return HarnessCheckResult(
            name="db_healthcheck_in_compose",
            harness_type=HarnessType.OPS,
            status=HarnessCheckStatus.PASS,
            details="compose 파일의 DB healthcheck 구성이 확인돼요.",
        )

    def _check_diagnosis_observability_logging(self) -> HarnessCheckResult:
        diagnosis_path = self.backend_root / "app" / "services" / "diagnosis.py"
        text = diagnosis_path.read_text(encoding="utf-8") if diagnosis_path.exists() else ""
        required = ["processing_time", "confidence", "materials="]
        missing = [token for token in required if token not in text]
        if missing:
            return HarnessCheckResult(
                name="diagnosis_observability_logging",
                harness_type=HarnessType.OPS,
                status=HarnessCheckStatus.WARN,
                details="진단 로그 관찰성 필드가 일부 누락됐어요.",
                evidence=missing,
            )
        return HarnessCheckResult(
            name="diagnosis_observability_logging",
            harness_type=HarnessType.OPS,
            status=HarnessCheckStatus.PASS,
            details="진단 처리시간/신뢰도/자재수 로그가 확인돼요.",
        )
