#!/usr/bin/env python3
"""시방서 HWPX 템플릿 렌더링 PoC (토큰 기반).

흐름:
1) 완성본 샘플 HWPX -> 토큰 템플릿 HWPX 생성(선택)
2) 토큰 템플릿 + 데이터 컨텍스트로 결과 HWPX 렌더링
"""

from __future__ import annotations

import argparse
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.hwpx_template_engine import HwpxTemplateEngine


@dataclass
class PatchRule:
    old: str
    new: str
    max_count: int | None = None


SPEC_TEMPLATE_PATCH_RULES = [
    PatchRule("공     사     명", "{{project_name}}", max_count=1),
    PatchRule("1. 공 사 명 : ", "1. 공 사 명 : {{project_name}}", max_count=1),
    PatchRule("2. 공사위치 : ", "2. 공사위치 : {{site_address}}", max_count=1),
    PatchRule("3. 공사범위 : ", "3. 공사범위 : {{scope_summary}}", max_count=1),
    PatchRule(
        "5. 공사기간 : 착공일로부터 28일 ",
        "5. 공사기간 : 착공일로부터 {{duration_days}}일 ",
        max_count=1,
    ),
    PatchRule(
        "상세범위 견적서 참고",
        "{{#scope_items}}{{index}}) {{item}}{{separator}}{{/scope_items}}",
        max_count=1,
    ),
    # 템플릿 본문의 placeholder 텍스트
    PatchRule("공사명", "{{project_name}}", max_count=None),
]


def _apply_patch_rules(text: str, rules: list[PatchRule]) -> tuple[str, dict[str, int]]:
    updated = text
    stats: dict[str, int] = {}

    for rule in rules:
        matched = updated.count(rule.old)
        if matched == 0:
            stats[rule.old] = 0
            continue

        if rule.max_count is None:
            updated = updated.replace(rule.old, rule.new)
            stats[rule.old] = matched
        else:
            updated = updated.replace(rule.old, rule.new, rule.max_count)
            stats[rule.old] = min(matched, rule.max_count)

    return updated, stats


def build_tokenized_spec_template(
    source_hwpx: Path,
    token_template_hwpx: Path,
) -> dict[str, dict[str, int]]:
    if not source_hwpx.exists():
        raise FileNotFoundError(f"원본 HWPX 파일이 없습니다: {source_hwpx}")

    with tempfile.TemporaryDirectory() as temp_dir:
        workdir = Path(temp_dir)
        with zipfile.ZipFile(source_hwpx, "r") as zip_in:
            zip_in.extractall(workdir)

        section_stats: dict[str, int] = {}
        for section_path in sorted((workdir / "Contents").glob("section*.xml")):
            section_text = section_path.read_text(encoding="utf-8")
            updated_text, stats = _apply_patch_rules(section_text, SPEC_TEMPLATE_PATCH_RULES)
            section_path.write_text(updated_text, encoding="utf-8")
            for key, value in stats.items():
                section_stats[key] = section_stats.get(key, 0) + value

        preview_stats: dict[str, int] = {}
        preview_path = workdir / "Preview" / "PrvText.txt"
        if preview_path.exists():
            preview_text = preview_path.read_text(encoding="utf-8")
            updated_preview, preview_stats = _apply_patch_rules(
                preview_text,
                SPEC_TEMPLATE_PATCH_RULES,
            )
            preview_path.write_text(updated_preview, encoding="utf-8")

        token_template_hwpx.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(token_template_hwpx, "w") as zip_out:
            for file_path in sorted(workdir.rglob("*")):
                if file_path.is_dir():
                    continue
                arcname = file_path.relative_to(workdir).as_posix()
                compress_type = (
                    zipfile.ZIP_STORED
                    if arcname == "mimetype"
                    else zipfile.ZIP_DEFLATED
                )
                zip_out.write(file_path, arcname, compress_type=compress_type)

    return {"section": section_stats, "preview": preview_stats}


def main() -> None:
    parser = argparse.ArgumentParser(description="HWPX 시방서 템플릿 엔진 PoC")
    parser.add_argument(
        "--template-source",
        default="sample/샘플시방서_(주)유니그린개발.hwpx",
        help="원본 시방서 HWPX(완성본/샘플)",
    )
    parser.add_argument(
        "--token-template",
        default="sample/generated/시방서_토큰템플릿.hwpx",
        help="토큰화된 템플릿 HWPX 출력 경로",
    )
    parser.add_argument(
        "--output",
        default="sample/generated/시방서_자동생성_샘플.hwpx",
        help="렌더링 결과 HWPX 출력 경로",
    )
    parser.add_argument(
        "--use-existing-token-template",
        action="store_true",
        help="토큰 템플릿 생성 단계를 건너뛰고 기존 템플릿을 사용",
    )
    parser.add_argument(
        "--project-name",
        default="서초고등학교 누수 부분 방수공사",
        help="공사명",
    )
    parser.add_argument(
        "--site-address",
        default="서울 서초구 반포대로27길 29 서초고등학교",
        help="공사 위치",
    )
    parser.add_argument(
        "--duration-days",
        type=int,
        default=21,
        help="공사기간(일)",
    )
    parser.add_argument(
        "--scope",
        action="append",
        default=None,
        help="공사범위 항목(여러 번 지정 가능)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="미해결 토큰/루프 발견 시 실패 처리",
    )
    args = parser.parse_args()

    source = Path(args.template_source)
    token_template = Path(args.token_template)
    output = Path(args.output)
    scope_items = args.scope or [
        "균열 보수",
        "우레탄도막방수",
        "창틀 보수 방수",
        "실리콘 코킹 보강",
    ]

    if not args.use_existing_token_template:
        patch_stats = build_tokenized_spec_template(source, token_template)
        print("토큰 템플릿 생성 완료")
        print(f"- source: {source}")
        print(f"- token_template: {token_template}")
        print("- patch stats (section):")
        for key, value in patch_stats["section"].items():
            print(f"  - {key}: {value}")
        if patch_stats["preview"]:
            print("- patch stats (preview):")
            for key, value in patch_stats["preview"].items():
                print(f"  - {key}: {value}")
        print()
    elif not token_template.exists():
        raise FileNotFoundError(
            f"--use-existing-token-template 옵션이지만 템플릿 파일이 없습니다: {token_template}"
        )

    context = {
        "project_name": args.project_name,
        "site_address": args.site_address,
        "duration_days": args.duration_days,
        "scope_items": scope_items,
        "scope_summary": ", ".join(scope_items),
    }

    engine = HwpxTemplateEngine(strict=args.strict)
    render_stats = engine.render(
        template_path=token_template,
        output_path=output,
        context=context,
    )

    print("HWPX 렌더링 완료")
    print(f"- output: {output}")
    print(f"- sections_processed: {render_stats.sections_processed}")
    print(f"- placeholders_replaced: {render_stats.placeholders_replaced}")
    print(f"- inline_loops_rendered: {render_stats.inline_loops_rendered}")
    print(f"- block_loops_rendered: {render_stats.block_loops_rendered}")
    if render_stats.missing_placeholders:
        print(f"- missing_placeholders: {dict(render_stats.missing_placeholders)}")
    if render_stats.missing_loops:
        print(f"- missing_loops: {dict(render_stats.missing_loops)}")


if __name__ == "__main__":
    main()
