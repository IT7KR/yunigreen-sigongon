#!/usr/bin/env python3
"""착공서류 5종 HWPX 토큰 템플릿 생성 스크립트.

원본 착공서류 HWPX 파일에서 회사명, 날짜, 프로젝트명 등
특정 값들을 {{token}} 형태의 플레이스홀더로 교체하여
토큰 템플릿 HWPX 파일을 생성합니다.
"""

from __future__ import annotations

import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path


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


def build_tokenized_template(
    source_hwpx: Path,
    token_template_hwpx: Path,
    patch_rules: list[PatchRule],
) -> dict[str, dict[str, int]]:
    """원본 HWPX 파일을 토큰화된 템플릿으로 변환한다."""
    if not source_hwpx.exists():
        raise FileNotFoundError(f"원본 HWPX 파일이 없습니다: {source_hwpx}")

    with tempfile.TemporaryDirectory() as temp_dir:
        workdir = Path(temp_dir)
        with zipfile.ZipFile(source_hwpx, "r") as zip_in:
            zip_in.extractall(workdir)

        section_stats: dict[str, int] = {}
        contents_dir = workdir / "Contents"
        if contents_dir.exists():
            for section_path in sorted(contents_dir.glob("section*.xml")):
                section_text = section_path.read_text(encoding="utf-8")
                updated_text, stats = _apply_patch_rules(section_text, patch_rules)
                section_path.write_text(updated_text, encoding="utf-8")
                for key, value in stats.items():
                    section_stats[key] = section_stats.get(key, 0) + value

        preview_stats: dict[str, int] = {}
        preview_path = workdir / "Preview" / "PrvText.txt"
        if preview_path.exists():
            preview_text = preview_path.read_text(encoding="utf-8")
            updated_preview, preview_stats = _apply_patch_rules(preview_text, patch_rules)
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


# ────────────────────────────────────────────────────────────────────────────
# 각 문서별 패치 룰 정의
# ────────────────────────────────────────────────────────────────────────────

# 4. 노무비 관련 서류
# 3가지 서식(서식5, 서식6, 서식7)이 포함됨
# - 날짜: "2020.     .    ." / "20   .     .    ."
# - 계약상대자 회사명: "○○건설㈜" (이미 샘플값이므로 그대로 토큰화)
# - 대표: "○○○ (인)"
# - 수신: "마포구청 재무관 귀하" / "0000 귀하"
LABOR_COST_RULES: list[PatchRule] = [
    PatchRule("2020.     .    .", "{{year}}.     {{month}}.    {{day}}.", max_count=1),
    PatchRule("20   .     .    .", "{{year}}.     {{month}}.    {{day}}.", max_count=1),
    PatchRule("2020.     .     .", "{{year}}.     {{month}}.    {{day}}.", max_count=1),
    # 공사명 셀 값 (서식5에는 공백이 많은 헤더, 서식6/7은 테이블 라벨)
    # 해당 문서는 이미 "○○건설㈜", "○○○ (인)"이 템플릿 형태이므로
    # 수신처만 토큰화 (발주청마다 다름)
    PatchRule("마포구청 재무관 귀하", "{{owner_name}} 귀하", max_count=None),
    PatchRule("0000 귀하", "{{owner_name}} 귀하", max_count=None),
]

# 5. 안전보건관리 준수 서약서
# - 날짜: "2025년  11월   06일"
# - 회사명: "주식회사 선이엔지" / "㈜유니그린개발"
# - 주소: "서울시 송파구 양재대로62길 23, 3층(가락동)"
# - 대표자: "이  시  대       (인)"
# - 문서 본문 업체명 ("주식회사 선이엔지는 본 공사..." 중에서 하드코딩된 부분)
SAFETY_PLEDGE_RULES: list[PatchRule] = [
    PatchRule("2025년  11월   06일", "{{year}}년  {{month}}월   {{day}}일", max_count=1),
    # 본문 중 업체명이 하드코딩된 곳 (문장 처음)
    PatchRule(
        "주식회사 선이엔지는 본 공사/용역/물품을 수행함에 있어 위에 언급한 내용대로 는 본 공사/용역/물품을 수행함에 있어 위에 언급한 내용대로",
        "{{contractor_name}}는 본 공사/용역/물품을 수행함에 있어 위에 언급한 내용대로",
        max_count=1,
    ),
    # 하단 서명란 주소
    PatchRule(
        " 주  소: 서울시 송파구 양재대로62길 23, 3층(가락동)",
        " 주  소: {{contractor_address}}",
        max_count=1,
    ),
    # 하단 서명란 업체명
    PatchRule(" 업체명: ㈜유니그린개발", " 업체명: {{contractor_name}}", max_count=1),
    # 하단 서명란 대표자
    PatchRule(" 대표자:    이  시  대       (인)", " 대표자: {{ceo_name}} (인)", max_count=1),
]

# 6. 착공 전 사진
# - 표지 공사명: "서울국제고 노출콘크리트면 보수 및 방수공사" (표지 큰 제목 아래)
# - 표지 회사명: "㈜유니그린개발"
# - 각 페이지 "공사명 : 서울국제고 노출콘크리트면 보수 및 방수공사"
PRE_CONSTRUCTION_PHOTO_RULES: list[PatchRule] = [
    # 표지 공사명 (제목 바로 아래 단독 텍스트 노드)
    PatchRule(
        "서울국제고 노출콘크리트면 보수 및 방수공사",
        "{{project_name}}",
        max_count=None,  # 여러 페이지에 반복됨
    ),
    # 표지 회사명
    PatchRule("㈜유니그린개발", "{{contractor_name}}", max_count=None),
    # 각 페이지의 공사명 라벨 포함 텍스트
    PatchRule("공사명 : {{project_name}}", "공사명 : {{project_name}}", max_count=None),  # 이미 치환됨 (no-op)
]

# 7. 직접시공계획서
# - 공사명: "서울국제고 노출콘크리트면 보수 및 방수공사"
# - 회사명: "㈜유니그린개발" / "(주)유니그린개발"
# - 사업자등록번호: "114-86-06063"
# - 주소: "서울시 송파구 양재대로62길 23, 3층" / "서울시 송파구 양재대로 62길23, 3층(가락동)"
# - 대표자: "이 시 대    (인)" / "이  시 대"
# - 수신: "서울특별시교육청 서울특별시중부교육지원청   귀하" / "서울특별시중부교육지원청 "
# - 발주자 기관명: "서울특별시중부교육지원청"
# - 현장소재지: "서울국제고등학교"
# - 발주자 주소: "서울시 종로구 대학로 10"
# - 계약일: "2023년07월27일"
# - 착공일: "2023년 08월 01일"
# - 준공예정일: "2023년 08월 28일"
# - 도급금액: " 구천사십오만팔백구십원정(￦90,450,890)"
# - 직접시공 금액 합계: "90,450,890원"
# - 각 공종 금액들
DIRECT_CONSTRUCTION_RULES: list[PatchRule] = [
    # 공사명 (여러 곳에 등장)
    PatchRule(
        "서울국제고 노출콘크리트면 보수 및 방수공사",
        "{{project_name}}",
        max_count=None,
    ),
    # 회사명 변형들
    PatchRule("㈜유니그린개발", "{{contractor_name}}", max_count=None),
    PatchRule("(주)유니그린개발", "{{contractor_name}}", max_count=None),
    # 사업자등록번호
    PatchRule("114-86-06063", "{{business_reg_no}}", max_count=None),
    # 주소 변형들
    PatchRule(
        "서울시 송파구 양재대로62길 23, 3층",
        "{{contractor_address}}",
        max_count=None,
    ),
    PatchRule(
        "서울시 송파구 양재대로 62길23, 3층(가락동)",
        "{{contractor_address}}",
        max_count=None,
    ),
    # 대표자 변형들
    PatchRule("이 시 대    (인)", "{{ceo_name}} (인)", max_count=None),
    PatchRule("이  시 대", "{{ceo_name}}", max_count=None),
    # 수신 기관 (발주자)
    PatchRule(
        "서울특별시교육청 서울특별시중부교육지원청   귀하",
        "{{owner_name}} 귀하",
        max_count=1,
    ),
    PatchRule(
        "서울특별시중부교육지원청 \n 귀하",
        "{{owner_name}} 귀하",
        max_count=1,
    ),
    PatchRule("서울특별시중부교육지원청 ", "{{owner_name}} ", max_count=None),
    # 발주자 상호
    PatchRule(
        "상호(기관명) : 서울특별시중부교육지원청",
        "상호(기관명) : {{owner_name}}",
        max_count=1,
    ),
    # 발주자 주소
    PatchRule("서울시 종로구 대학로 10", "{{owner_address}}", max_count=1),
    # 현장 소재지
    PatchRule("서울국제고등학교", "{{site_name}}", max_count=1),
    # 날짜들
    PatchRule("2023년07월27일", "{{contract_date}}", max_count=1),
    PatchRule("2023년 08월 01일", "{{start_date}}", max_count=None),
    PatchRule("2023년 08월 28일", "{{end_date}}", max_count=None),
    # 도급금액
    PatchRule(
        " 구천사십오만팔백구십원정(￦90,450,890)",
        " {{contract_amount_text}}(￦{{contract_amount}})",
        max_count=1,
    ),
    # 직접시공 금액 합계
    PatchRule("90,450,890원", "{{contract_amount}}원", max_count=None),
    # 세부 공종 금액 (공사별로 다름이므로 삭제/빈칸으로)
    PatchRule("6,859,432원", "{{amount_01}}원", max_count=1),
    PatchRule("477,342원", "{{amount_02}}원", max_count=1),
    PatchRule("19,757,523원", "{{amount_03}}원", max_count=1),
    PatchRule("8,781,226원", "{{amount_04}}원", max_count=1),
    PatchRule("27,109,922원", "{{amount_05}}원", max_count=1),
    PatchRule("1,407,744원", "{{amount_06}}원", max_count=1),
    PatchRule("59,558원", "{{amount_07}}원", max_count=1),
    PatchRule("64,452,747원", "{{subtotal_amount}}원", max_count=1),
    PatchRule("5,308,870원", "{{indirect_labor_amount}}원", max_count=1),
    PatchRule("7,299,825원", "{{expense_amount}}원", max_count=1),
    PatchRule("2,311,843원", "{{management_fee_amount}}원", max_count=1),
    PatchRule("2,399,949원", "{{profit_amount}}원", max_count=1),
    PatchRule("454,849원", "{{waste_disposal_amount}}원", max_count=1),
    PatchRule("8,222,808원", "{{vat_amount}}원", max_count=1),
]

# 8. 안전보건관리계획서
# - 공사명: "서울국제고 노출콘크리트면 보수 및 방수공사"
# - 회사명: "㈜유니그린개발"
# - 사업자등록번호: "114-86-06063"
# - 주소: "서울시 송파구 양재대로62길 23, 3층"
# - 대표자: "이 시 대    (인)"
# - 수신: "서울특별시교육청 서울특별시중부교육지원청   귀하"
# - 현장소장/안전관리자: "이민주"
# - 연락처: "010-6227-4455"
# - 발주자: "서울특별시교육청 " / "서울특별시중부교육지원청"
# - 발주자 담당자: "학교시설지원과 전유빈"
# - 발주자 연락처: "02-708-6614"
# - 소방서: "종로소방서" 연락처: "02-6981-5674"
# - 경찰서: "성북1치안센터" 연락처: "02-920-1877"
# - 공사기간: "23년08월01일~23년08월28일"
# - 공사금액: "90,450,890원"
# - 산업안전보건관리비: "1,920,000원" / "1,918,621.1원"
SAFETY_MANAGEMENT_RULES: list[PatchRule] = [
    # 공사명
    PatchRule(
        "서울국제고 노출콘크리트면 보수 및 방수공사",
        "{{project_name}}",
        max_count=None,
    ),
    # 회사명
    PatchRule("㈜유니그린개발", "{{contractor_name}}", max_count=None),
    # 사업자등록번호
    PatchRule("114-86-06063", "{{business_reg_no}}", max_count=None),
    # 주소
    PatchRule("서울시 송파구 양재대로62길 23, 3층", "{{contractor_address}}", max_count=None),
    # 대표자
    PatchRule("이 시 대    (인)", "{{ceo_name}} (인)", max_count=None),
    # 수신
    PatchRule(
        "서울특별시교육청 서울특별시중부교육지원청   귀하",
        "{{owner_name}} 귀하",
        max_count=1,
    ),
    # 현장소장/안전관리자 이름 (여러 곳에 등장)
    PatchRule("이민주", "{{field_manager_name}}", max_count=None),
    # 현장소장 연락처
    PatchRule("010-6227-4455", "{{field_manager_phone}}", max_count=None),
    # 발주자
    PatchRule("서울특별시교육청 \n서울특별시중부교육지원청", "{{owner_name}}", max_count=None),
    PatchRule("서울특별시교육청 ", "{{owner_org}} ", max_count=None),
    PatchRule("서울특별시중부교육지원청", "{{owner_name}}", max_count=None),
    # 발주자 담당자
    PatchRule("학교시설지원과 전유빈", "{{owner_contact_name}}", max_count=1),
    PatchRule("02-708-6614", "{{owner_contact_phone}}", max_count=1),
    # 소방서/경찰서 (현장별로 다름)
    PatchRule("종로소방서", "{{fire_station}}", max_count=1),
    PatchRule("02-6981-5674", "{{fire_station_phone}}", max_count=1),
    PatchRule("성북1치안센터", "{{police_station}}", max_count=1),
    PatchRule("02-920-1877", "{{police_station_phone}}", max_count=1),
    # 공사기간
    PatchRule("23년08월01일~23년08월28일", "{{start_date}}~{{end_date}}", max_count=1),
    # 공사금액
    PatchRule("90,450,890원", "{{contract_amount}}원", max_count=None),
    # 산업안전보건관리비
    PatchRule("1,920,000원(부가세포함)", "{{safety_mgmt_budget}}원(부가세포함)", max_count=None),
    PatchRule("1,920,000원", "{{safety_mgmt_budget}}원", max_count=None),
    PatchRule("1,918,621.1원", "{{safety_mgmt_base}}원", max_count=1),
    # 세부 비용 항목
    PatchRule("16,013,722원", "{{material_cost}}원", max_count=1),
    PatchRule("43,515,334원", "{{direct_labor_cost}}원", max_count=1),
    PatchRule("30,921,834원", "{{other_cost}}원", max_count=1),
]

# ────────────────────────────────────────────────────────────────────────────
# 메인 실행
# ────────────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent.parent
SOURCE_DIR = REPO_ROOT / "sample" / "2. 관공서 착공서류"
OUTPUT_DIR = REPO_ROOT / "sample" / "generated"

TEMPLATES = [
    (
        "4. 노무비 관련 서류.hwpx",
        "노무비관련서류_토큰템플릿.hwpx",
        LABOR_COST_RULES,
    ),
    (
        "5. 안전보건관리 준수 서약서.hwpx",
        "안전보건서약서_토큰템플릿.hwpx",
        SAFETY_PLEDGE_RULES,
    ),
    (
        "6. 착공 전 사진.hwpx",
        "착공전사진_토큰템플릿.hwpx",
        PRE_CONSTRUCTION_PHOTO_RULES,
    ),
    (
        "7. 직접시공계획서.hwpx",
        "직접시공계획서_토큰템플릿.hwpx",
        DIRECT_CONSTRUCTION_RULES,
    ),
    (
        "8. 안전보건관리계획서(산업안전보건관리비 사용계획서 포함).hwpx",
        "안전보건관리계획서_토큰템플릿.hwpx",
        SAFETY_MANAGEMENT_RULES,
    ),
]


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"출력 디렉토리: {OUTPUT_DIR}")
    print()

    for source_name, output_name, rules in TEMPLATES:
        source_path = SOURCE_DIR / source_name
        output_path = OUTPUT_DIR / output_name

        print(f"처리 중: {source_name}")
        print(f"  → {output_name}")

        try:
            stats = build_tokenized_template(source_path, output_path, rules)

            # 결과 요약
            replaced_count = sum(v for v in stats["section"].values() if v > 0)
            zero_count = sum(1 for v in stats["section"].values() if v == 0)
            print(f"  섹션 치환: {replaced_count}개 규칙 적용됨")
            if zero_count > 0:
                print(f"  미매칭 규칙: {zero_count}개")
                for key, val in stats["section"].items():
                    if val == 0:
                        print(f"    - 미매칭: {repr(key[:60])}")

            # ZIP 유효성 검증
            with zipfile.ZipFile(output_path, "r") as z:
                names = z.namelist()
                section_files = [n for n in names if "section" in n.lower() and n.endswith(".xml")]
                # 토큰이 실제로 삽입됐는지 확인
                token_found = False
                for sec in section_files:
                    content = z.read(sec).decode("utf-8", errors="replace")
                    if "{{" in content:
                        token_found = True
                        break
                print(f"  ZIP 유효: {len(names)}개 파일, 토큰 삽입 확인: {token_found}")
            print()

        except Exception as e:
            print(f"  [오류] {e}")
            print()

    print("완료! 생성된 파일 목록:")
    for output_path in sorted(OUTPUT_DIR.glob("*_토큰템플릿.hwpx")):
        size_kb = output_path.stat().st_size / 1024
        print(f"  {output_path.name} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
