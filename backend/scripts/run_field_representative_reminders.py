#!/usr/bin/env python3
"""현장대리인 경력증명서 리마인더 실행 스크립트."""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import async_session_factory
from app.services.field_representative_reminders import (
    run_field_representative_career_reminders,
)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run field representative career certificate reminders.",
    )
    parser.add_argument(
        "--organization-id",
        type=int,
        default=None,
        help="특정 조직으로 실행 범위를 제한합니다.",
    )
    parser.add_argument(
        "--run-date",
        type=date.fromisoformat,
        default=None,
        help="실행 기준일 (YYYY-MM-DD). 미입력 시 오늘(UTC) 기준으로 실행합니다.",
    )
    return parser.parse_args()


async def _run(args: argparse.Namespace) -> int:
    async with async_session_factory() as session:
        summary = await run_field_representative_career_reminders(
            session,
            run_date=args.run_date,
            organization_id=args.organization_id,
        )
        await session.commit()

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


def main() -> None:
    args = _parse_args()
    code = asyncio.run(_run(args))
    sys.exit(code)


if __name__ == "__main__":
    main()

