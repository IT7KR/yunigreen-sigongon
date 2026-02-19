"""Labor reporting codebook constants and validation helpers."""
from __future__ import annotations

from typing import Optional

LABOR_CODEBOOK_VERSION = "2026.02.19"

# 근로복지공단 주요 국적 코드
NATIONALITY_CODES: dict[str, str] = {
    "100": "한국",
    "156": "중국",
    "392": "일본",
    "410": "대한민국(재외동포)",
    "458": "말레이시아",
    "608": "필리핀",
    "626": "동티모르",
    "704": "베트남",
    "764": "태국",
    "860": "우즈베키스탄",
}

# 체류자격 코드(운영에서 많이 쓰는 코드 우선)
VISA_STATUS_CODES: dict[str, str] = {
    "E-9": "비전문취업",
    "H-2": "방문취업",
    "F-4": "재외동포",
    "F-5": "영주",
    "F-6": "결혼이민",
}

# 근로복지공단 건설업 직종 코드
JOB_TYPE_CODES: dict[str, str] = {
    "013": "건설·채국·제조·생산 관리자",
    "701": "건설구조 기능원",
    "704": "건설·채국 기계 운전원",
    "705": "기타 건설 기능원(채굴포함)",
    "706": "건설·채국 단순 종사자",
}


def normalize_code(value: Optional[str]) -> str:
    if value is None:
        return ""
    return value.strip().upper()


def is_valid_nationality_code(code: Optional[str]) -> bool:
    normalized = normalize_code(code)
    return bool(normalized and normalized in NATIONALITY_CODES)


def is_valid_visa_status(code: Optional[str]) -> bool:
    normalized = normalize_code(code)
    return bool(normalized and normalized in VISA_STATUS_CODES)


def is_valid_job_type_code(code: Optional[str]) -> bool:
    normalized = normalize_code(code)
    return bool(normalized and normalized in JOB_TYPE_CODES)


def get_labor_codebook_payload() -> dict:
    return {
        "version": LABOR_CODEBOOK_VERSION,
        "nationality_codes": NATIONALITY_CODES,
        "visa_status_codes": VISA_STATUS_CODES,
        "job_type_codes": JOB_TYPE_CODES,
    }

