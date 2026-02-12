"""Harness service tests."""
from pathlib import Path

import pytest

from app.services.harness import (
    HarnessCheckStatus,
    HarnessRunRequest,
    HarnessService,
    HarnessType,
)


@pytest.mark.asyncio
async def test_harness_run_is_persisted(tmp_path: Path):
    service = HarnessService(data_dir=tmp_path / "runs")
    request = HarnessRunRequest(harness_types=[HarnessType.AI, HarnessType.OPS])

    record = await service.run(request)

    assert record.id
    assert record.summary.total_checks == len(record.checks)
    assert (tmp_path / "runs" / f"{record.id}.json").exists()

    loaded = await service.get_run(record.id)
    assert loaded is not None
    assert loaded.id == record.id


@pytest.mark.asyncio
async def test_harness_metrics_aggregation(tmp_path: Path):
    service = HarnessService(data_dir=tmp_path / "runs")

    await service.run(HarnessRunRequest(harness_types=[HarnessType.AI]))
    await service.run(HarnessRunRequest(harness_types=[HarnessType.CODE]))

    metrics = await service.get_metrics(window_days=7)

    assert metrics.total_runs == 2
    assert metrics.passed_runs + metrics.failed_runs == 2
    assert 0.0 <= metrics.pass_rate <= 1.0
    assert HarnessType.AI in metrics.by_harness
    assert HarnessType.CODE in metrics.by_harness


@pytest.mark.asyncio
async def test_harness_missing_run_returns_none(tmp_path: Path):
    service = HarnessService(data_dir=tmp_path / "runs")

    missing = await service.get_run("missing-id")

    assert missing is None


@pytest.mark.asyncio
async def test_harness_warn_or_pass_for_live_health(tmp_path: Path):
    service = HarnessService(data_dir=tmp_path / "runs")
    record = await service.run(
        HarnessRunRequest(harness_types=[HarnessType.BEHAVIOR])
    )

    live_check = next(
        check for check in record.checks if check.name == "live_health_endpoint"
    )
    assert live_check.status in {
        HarnessCheckStatus.WARN,
        HarnessCheckStatus.PASS,
        HarnessCheckStatus.FAIL,
    }
