#!/usr/bin/env python3
"""준공서류 및 학교 서류 HWPX 토큰 템플릿 생성 스크립트.

대상 파일:
  - 5-1. 노무비 미체불확약서,지급내역서.hwpx → 노무비미체불확약서_토큰템플릿.hwpx
  - 5-2. 근로자 인적사항표.hwpx              → 근로자인적사항표_토큰템플릿.hwpx
  - 7. 하자보수보증금 지급각서(...).hwpx     → 하자보수보증금지급각서_토큰템플릿.hwpx
  - 9. 학교 서류/1. 수도전기공문.hwpx       → 수도전기공문_토큰템플릿.hwpx
"""

from __future__ import annotations

import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path


BASE = Path("/workspace/yunigreen-dev")
SAMPLE_DIR = BASE / "sample"
OUTPUT_DIR = BASE / "sample" / "generated"


@dataclass
class PatchRule:
    old: str
    new: str
    max_count: int | None = None


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


def build_token_template(
    source_hwpx: Path,
    output_hwpx: Path,
    rules: list[PatchRule],
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
            updated_text, stats = _apply_patch_rules(section_text, rules)
            section_path.write_text(updated_text, encoding="utf-8")
            for key, value in stats.items():
                section_stats[key] = section_stats.get(key, 0) + value

        # Preview text also update
        preview_stats: dict[str, int] = {}
        preview_path = workdir / "Preview" / "PrvText.txt"
        if preview_path.exists():
            preview_text = preview_path.read_text(encoding="utf-8")
            updated_preview, preview_stats = _apply_patch_rules(preview_text, rules)
            preview_path.write_text(updated_preview, encoding="utf-8")

        output_hwpx.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output_hwpx, "w") as zip_out:
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


# ---------------------------------------------------------------------------
# 1. 노무비 미체불확약서 & 지급내역서
# ---------------------------------------------------------------------------
# 원본 텍스트 구조:
#   '노 무 비  미 체 불 확 약 서'  → 제목 (고정)
#   '1. 공사명 : 대경중학교 본관동 균열보수공사'
#   '2. 계약금액 : 일금 일천삼백삼십육만 원정 (￦ 13,360,000원)'
#   '2-1. 직접노무비 : 일금 사백팔십구만구천육백삼십칠 원정(￦ 4,899,637원)'
#   '3. 계약년월일 : 2025년 12월 04일'
#   '4. 착공년월일 : 2025년 12월 05일'
#   '5. 준공년월일 : 2025년 12월 26일'
#   ...
#   '2025년 12월 26일'              → 서명일
#   '계약상대자 상  호 : ㈜유니그린개발'
#   '대표자 : 이  시 대       (인)'
#   '대경중학교  귀하'
#   (지급내역서)
#   '○ 공 사 명 :'
#   '대경중학교 본관동 균열보수공사'  → 공사명 (별도 행)
#   '㈜유니그린개발'                  → 수급인 (반복)
#   '25.12'                           → 해당 월
#   근로자 이름/금액/계좌/전화/날짜 등 (반복)
NOMUBI_RULES = [
    # 공사명 (본문 형식)
    PatchRule(
        "1. 공사명 : 대경중학교 본관동 균열보수공사",
        "1. 공사명 : {{project_name}}",
        max_count=1,
    ),
    # 계약금액
    PatchRule(
        "2. 계약금액 : 일금 일천삼백삼십육만 원정 (￦ 13,360,000원)",
        "2. 계약금액 : 일금 {{contract_amount_text}} 원정 (￦ {{contract_amount_num}}원)",
        max_count=1,
    ),
    # 직접노무비
    PatchRule(
        "2-1. 직접노무비 : 일금 사백팔십구만구천육백삼십칠 원정(￦ 4,899,637원)",
        "2-1. 직접노무비 : 일금 {{direct_labor_cost_text}} 원정(￦ {{direct_labor_cost_num}}원)",
        max_count=1,
    ),
    # 계약년월일
    PatchRule(
        "3. 계약년월일 : 2025년 12월 04일",
        "3. 계약년월일 : {{contract_date}}",
        max_count=1,
    ),
    # 착공년월일
    PatchRule(
        "4. 착공년월일 : 2025년 12월 05일",
        "4. 착공년월일 : {{start_date}}",
        max_count=1,
    ),
    # 준공년월일
    PatchRule(
        "5. 준공년월일 : 2025년 12월 26일",
        "5. 준공년월일 : {{completion_date}}",
        max_count=1,
    ),
    # 서명일
    PatchRule(
        "2025년 12월 26일",
        "{{sign_year}}년 {{sign_month}}월 {{sign_day}}일",
        max_count=1,
    ),
    # 수급인 상호
    PatchRule(
        "계약상대자 상  호 : ㈜유니그린개발",
        "계약상대자 상  호 : {{contractor_name}}",
        max_count=1,
    ),
    # 대표자
    PatchRule(
        "대표자 : 이  시 대       (인)",
        "대표자 : {{ceo_name}}       (인)",
        max_count=1,
    ),
    # 수신처 (귀하)
    PatchRule(
        "대경중학교  귀하",
        "{{owner_name}}  귀하",
        max_count=1,
    ),
    # 지급내역서 공사명 (별도 행)
    PatchRule(
        "대경중학교 본관동 균열보수공사",
        "{{project_name}}",
        max_count=None,
    ),
    # 지급내역서 수급인 반복 (㈜유니그린개발)
    PatchRule(
        "㈜유니그린개발",
        "{{contractor_name}}",
        max_count=None,
    ),
    # 지급 월 (25.12 → {{payment_month}})
    PatchRule(
        "25.12",
        "{{payment_month}}",
        max_count=None,
    ),
    # 현장대리인
    PatchRule(
        "- 작성자 : 현장대리인  이  성 찬  (인)",
        "- 작성자 : 현장대리인  {{field_manager_name}}  (인)",
        max_count=1,
    ),
    # 근로자 행 (worker loop - 박호진 → 첫 번째 근로자를 대표 토큰으로)
    PatchRule("박호진", "{{worker1_name}}", max_count=1),
    PatchRule("1,470,000원", "{{worker1_amount}}", max_count=1),
    PatchRule("카카오뱅크 /", "{{worker1_bank}} /", max_count=1),
    PatchRule("3333-24-1398474", "{{worker1_account}}", max_count=1),
    PatchRule("010-5790-4439", "{{worker1_phone}}", max_count=1),
    PatchRule("25.12.23.", "{{worker1_pay_date}}", max_count=1),
    PatchRule("이윤관", "{{worker2_name}}", max_count=1),
    PatchRule("1,420,000원", "{{worker2_amount}}", max_count=1),
    PatchRule("3333-11-9342841", "{{worker2_account}}", max_count=1),
    PatchRule("홍성근", "{{worker3_name}}", max_count=1),
    PatchRule("625,000원", "{{worker3_amount}}", max_count=1),
    PatchRule("국민 /", "{{worker3_bank}} /", max_count=1),
    PatchRule("875401-01-392808", "{{worker3_account}}", max_count=1),
    PatchRule("010-8506-0081", "{{worker3_phone}}", max_count=1),
    PatchRule("25.12.22.", "{{worker3_pay_date}}", max_count=1),
    PatchRule("유준서", "{{worker4_name}}", max_count=1),
    PatchRule("160,000원", "{{worker4_amount}}", max_count=1),
    PatchRule("신한 /", "{{worker4_bank}} /", max_count=1),
    PatchRule("110-195-361595", "{{worker4_account}}", max_count=1),
    PatchRule("02-401-5127", "{{worker4_phone}}", max_count=1),
    PatchRule("25.12.20.", "{{worker4_pay_date}}", max_count=1),
    PatchRule("3,675,000원", "{{total_amount}}", max_count=1),
]


# ---------------------------------------------------------------------------
# 2. 근로자 인적사항표
# ---------------------------------------------------------------------------
# 원본:
#   '공 사 명 : 방배중 외1교(역삼중)균열보수공사'
#   '주  소  : 서울시 송파구 양재대로62길 23, 3층(가락동)'
#   '상  호  : ㈜유니그린개발'
#   '대표자  :   이 시 대      (인, 서명)'
#   '○ 공사명 : 방배중 외1교(역삼중)균열보수공사'
#   근로자 행: 이성찬 / 970125-1****** / 010-9958-5590 등
#   '2025년 08월 09일'
#   '상  호 : ㈜유니그린개발'
#   '주  소 :\n서울시 송파구 양재대로 62길 23, 3층(가락동)'
#   '대표자 : 이시대             (인)'
#   '서울특별시교육청 서울특별시강남서초교육지원청 귀하'
WORKER_INFO_RULES = [
    # 공사명 (헤더)
    PatchRule(
        "공 사 명 : 방배중 외1교(역삼중)균열보수공사",
        "공 사 명 : {{project_name}}",
        max_count=1,
    ),
    # 주소 (헤더)
    PatchRule(
        "주  소  : 서울시 송파구 양재대로62길 23, 3층(가락동)",
        "주  소  : {{company_address}}",
        max_count=1,
    ),
    # 상호 (헤더)
    PatchRule(
        "상  호  : ㈜유니그린개발",
        "상  호  : {{contractor_name}}",
        max_count=1,
    ),
    # 대표자 (헤더)
    PatchRule(
        "대표자  :   이 시 대      (인, 서명)",
        "대표자  :   {{ceo_name}}      (인, 서명)",
        max_count=1,
    ),
    # 상용근로자 인적사항표 공사명
    PatchRule(
        "○ 공사명 : 방배중 외1교(역삼중)균열보수공사",
        "○ 공사명 : {{project_name}}",
        max_count=1,
    ),
    # 근로자 1
    PatchRule("이성찬", "{{worker1_name}}", max_count=1),
    PatchRule("970125-1******", "{{worker1_id}}", max_count=1),
    PatchRule("010-9958-5590", "{{worker1_phone}}", max_count=1),
    # 근로자 2
    PatchRule("엄시우", "{{worker2_name}}", max_count=1),
    PatchRule("781216-1******", "{{worker2_id}}", max_count=1),
    PatchRule("010-6659-7436", "{{worker2_phone}}", max_count=1),
    # 근로자 3
    PatchRule("김석일", "{{worker3_name}}", max_count=1),
    PatchRule("580212-1******", "{{worker3_id}}", max_count=1),
    PatchRule("010-8753-3822", "{{worker3_phone}}", max_count=1),
    # 서명일
    PatchRule(
        "2025년 08월 09일",
        "{{sign_year}}년 {{sign_month}}월 {{sign_day}}일",
        max_count=1,
    ),
    # 서명란 상호
    PatchRule(
        "상  호 : ㈜유니그린개발",
        "상  호 : {{contractor_name}}",
        max_count=1,
    ),
    # 서명란 주소
    PatchRule(
        "서울시 송파구 양재대로 62길 23, 3층(가락동)",
        "{{company_address}}",
        max_count=1,
    ),
    # 서명란 대표자
    PatchRule(
        "대표자 : 이시대             (인)",
        "대표자 : {{ceo_name}}             (인)",
        max_count=1,
    ),
    # 수신처
    PatchRule(
        "서울특별시교육청 서울특별시강남서초교육지원청 귀하",
        "{{recipient}} 귀하",
        max_count=1,
    ),
]


# ---------------------------------------------------------------------------
# 3. 하자보수보증금 지급각서
# ---------------------------------------------------------------------------
# 원본:
#   '공     사     명'  (헤더 셀)
#   '하하호호 장난감도서관 잠실점 방수 공사'  (값 셀)
#   '계   약   금   액'
#   '금 일천사백이십만 원(￦ 14,200,000 원)'
#   '공 사 계 약 기 간'
#   '2025.11.06. ~ 2025.11.20.'
#   '준   공   일   자'
#   '2025.11.20.'
#   '하자보증금면제금액'
#   '금 426,000 원(계약금액 3%)'
#   '하 자 보 수 기 간'
#   '(준공검사일로부터 3년) 2025.11.20. ~ 2028.11.19.'
#   ... 본문 ...
#   '2025년 11월 20일'
#   '주 소 : 서울시 송파구 양재대로62길 23, 302호'
#   '상 호 : ㈜유니그린개발'
#   '성 명 : 이   시   대       (인)'
#   '서울특별시 송 파 구 (분 임)재 무 관\n귀하'
DEFECT_RULES = [
    # 공사명
    PatchRule(
        "하하호호 장난감도서관 잠실점 방수 공사",
        "{{project_name}}",
        max_count=1,
    ),
    # 계약금액
    PatchRule(
        "금 일천사백이십만 원(￦ 14,200,000 원)",
        "금 {{contract_amount_text}} 원(￦ {{contract_amount_num}} 원)",
        max_count=1,
    ),
    # 공사 계약 기간
    PatchRule(
        "2025.11.06. ~ 2025.11.20.",
        "{{contract_start_date}}. ~ {{contract_end_date}}.",
        max_count=1,
    ),
    # 준공일자
    PatchRule(
        "2025.11.20.",
        "{{completion_date}}.",
        max_count=None,
    ),
    # 하자보증금 면제금액
    PatchRule(
        "금 426,000 원(계약금액 3%)",
        "금 {{defect_warranty_amount}} 원(계약금액 {{defect_warranty_rate}}%)",
        max_count=1,
    ),
    # 하자보수 기간 - 먼저 전체 패턴 교체 시도 (원본에서 실행)
    # 이 규칙은 원본 파일에 직접 적용되므로 계약기간 규칙보다 먼저 선언
    PatchRule(
        "(준공검사일로부터 3년) 2025.11.20. ~ 2028.11.19.",
        "(준공검사일로부터 {{defect_period_years}}년) {{defect_start_date}}. ~ {{defect_end_date}}.",
        max_count=1,
    ),
    # 준공일자 (standalone - 위 defect 규칙 적용 후 남은 2025.11.20.)
    PatchRule(
        "2025.11.20.",
        "{{completion_date}}.",
        max_count=None,
    ),
    # defect_start_date가 completion_date와 같은 경우 이미 처리됨
    # defect_end_date가 처리 안된 경우 (원본에 defect 규칙 미적용시)
    PatchRule(
        "2028.11.19.",
        "{{defect_end_date}}.",
        max_count=1,
    ),
    # 서명일
    PatchRule(
        "2025년 11월 20일",
        "{{sign_year}}년 {{sign_month}}월 {{sign_day}}일",
        max_count=1,
    ),
    # 주소
    PatchRule(
        "주 소 : 서울시 송파구 양재대로62길 23, 302호",
        "주 소 : {{company_address}}",
        max_count=1,
    ),
    # 상호
    PatchRule(
        "상 호 : ㈜유니그린개발",
        "상 호 : {{contractor_name}}",
        max_count=1,
    ),
    # 대표자
    PatchRule(
        "성 명 : 이   시   대       (인)",
        "성 명 : {{ceo_name}}       (인)",
        max_count=1,
    ),
    # 수신처
    PatchRule(
        "서울특별시 송 파 구 (분 임)재 무 관",
        "{{owner_name}}",
        max_count=1,
    ),
]


# ---------------------------------------------------------------------------
# 4. 수도전기공문
# ---------------------------------------------------------------------------
# 원본:
#   '문서번호 : 유니25-20251226'
#   '시행일자 : 2025.12.26.'
#   '수    신 : 서울특별시중부교육청 대경중학교'
#   '제    목 : 대경중학교 본관동 균열보수공사 수도·전기료 정산건.'
#   '2. 당사는 2025.12.04.에 체결한 대경중학교 본관동 균열보수공사에 대해 25.12.26. 준공으로 수도
#    ·전기료를 정산하여 정산금액과 통장사본을 보내주시기를 요청합니다.'
#   '(주)유니그린개발 대표이사 이시대'
WATER_ELEC_RULES = [
    # 문서번호
    PatchRule(
        "문서번호 : 유니25-20251226",
        "문서번호 : {{doc_number}}",
        max_count=1,
    ),
    # 시행일자
    PatchRule(
        "시행일자 : 2025.12.26.",
        "시행일자 : {{doc_date}}.",
        max_count=1,
    ),
    # 수신
    PatchRule(
        "수    신 : 서울특별시중부교육청 대경중학교",
        "수    신 : {{recipient}}",
        max_count=1,
    ),
    # 제목
    PatchRule(
        "제    목 : 대경중학교 본관동 균열보수공사 수도·전기료 정산건.",
        "제    목 : {{project_name}} 수도·전기료 정산건.",
        max_count=1,
    ),
    # 본문 내용 (두 개의 hp:t 엘리먼트에 나뉘어 있을 수 있음)
    PatchRule(
        "2. 당사는 2025.12.04.에 체결한 대경중학교 본관동 균열보수공사에 대해 25.12.26. 준공으로             수도",
        "2. 당사는 {{contract_date}}에 체결한 {{project_name}}에 대해 {{completion_date}}. 준공으로             수도",
        max_count=1,
    ),
]


def main() -> None:
    tasks = [
        {
            "label": "노무비미체불확약서",
            "source": SAMPLE_DIR / "3. 관공서 준공서류" / "5-1. 노무비 미체불확약서,지급내역서.hwpx",
            "output": OUTPUT_DIR / "노무비미체불확약서_토큰템플릿.hwpx",
            "rules": NOMUBI_RULES,
        },
        {
            "label": "근로자인적사항표",
            "source": SAMPLE_DIR / "3. 관공서 준공서류" / "5-2. 근로자 인적사항표.hwpx",
            "output": OUTPUT_DIR / "근로자인적사항표_토큰템플릿.hwpx",
            "rules": WORKER_INFO_RULES,
        },
        {
            "label": "하자보수보증금지급각서",
            "source": SAMPLE_DIR / "3. 관공서 준공서류" / "7. 하자보수보증금 지급각서(발주처에서 요청하는 경우 하자보증증권으로 제출).hwpx",
            "output": OUTPUT_DIR / "하자보수보증금지급각서_토큰템플릿.hwpx",
            "rules": DEFECT_RULES,
        },
        {
            "label": "수도전기공문",
            "source": SAMPLE_DIR / "9. 학교 서류" / "1. 수도전기공문.hwpx",
            "output": OUTPUT_DIR / "수도전기공문_토큰템플릿.hwpx",
            "rules": WATER_ELEC_RULES,
        },
    ]

    for task in tasks:
        label = task["label"]
        source: Path = task["source"]
        output: Path = task["output"]
        rules: list[PatchRule] = task["rules"]

        print(f"\n{'='*60}")
        print(f"[{label}] 토큰 템플릿 생성 중...")
        print(f"  source : {source}")
        print(f"  output : {output}")

        stats = build_token_template(source, output, rules)

        print(f"  => 완료")
        applied = {k: v for k, v in stats["section"].items() if v > 0}
        skipped = {k: v for k, v in stats["section"].items() if v == 0}
        print(f"  적용된 패치: {len(applied)}개")
        for k, v in applied.items():
            print(f"    ✓ [{v}회] {repr(k[:60])}")
        if skipped:
            print(f"  미적용 패치: {len(skipped)}개")
            for k in skipped:
                print(f"    ✗ {repr(k[:60])}")

    print(f"\n{'='*60}")
    print("모든 토큰 템플릿 생성 완료.")


if __name__ == "__main__":
    main()
