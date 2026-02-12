#!/usr/bin/env python3
"""Run harness checks from CLI."""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.harness import HarnessRunRequest, HarnessService, HarnessType


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run project harness checks.")
    parser.add_argument(
        "--harness",
        nargs="+",
        choices=[h.value for h in HarnessType],
        default=[h.value for h in HarnessType],
        help="Harness categories to run",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print full JSON output",
    )
    return parser.parse_args()


async def _run(args: argparse.Namespace) -> int:
    service = HarnessService()
    request = HarnessRunRequest(
        harness_types=[HarnessType(h) for h in args.harness],
    )
    record = await service.run(request)

    if args.json:
        print(record.model_dump_json(indent=2))
    else:
        print(f"run_id={record.id}")
        print(f"status={record.status.value}")
        print(
            "summary="
            f"total:{record.summary.total_checks} "
            f"pass:{record.summary.passed} "
            f"fail:{record.summary.failed} "
            f"warn:{record.summary.warnings}"
        )
        for check in record.checks:
            print(
                f"- [{check.status.value}] "
                f"{check.harness_type.value}/{check.name}: {check.details}"
            )

    return 1 if record.status.value == "failed" else 0


def main() -> None:
    args = _parse_args()
    code = asyncio.run(_run(args))
    sys.exit(code)


if __name__ == "__main__":
    main()
