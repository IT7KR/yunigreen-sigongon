"""Vision schema and legacy normalization tests."""
from app.schemas.vision import VisionResult, extract_vision_payload, build_leak_opinion_text
from app.services.diagnosis import DiagnosisService


def test_vision_assigns_work_ids():
    vision = VisionResult.model_validate(
        {
            "version": "v2",
            "severity": "medium",
            "confidence": 0.8,
            "observations": [],
            "hypotheses": [],
            "work_items": [
                {
                    "trade": "waterproofing",
                    "task": "도막방수 보수",
                    "scope_location": "옥상",
                    "photo_refs": [1],
                    "quantity": {"unit": "m2", "value": 10, "range": None, "basis": "photo"},
                    "price_lookup": {
                        "primary_query": "도막 방수 바름",
                        "must_terms": ["도막", "방수"],
                        "expected_unit": "m2",
                    },
                }
            ],
        }
    )
    assert vision.work_items[0].work_id == "work_1"


def test_extract_vision_payload_prefers_vision_v2():
    payload = {
        "vision_v2": {
            "version": "v2",
            "severity": "low",
            "confidence": 0.5,
            "observations": [],
            "hypotheses": [],
            "work_items": [],
        }
    }
    parsed = extract_vision_payload(payload)
    assert parsed is not None
    assert parsed.version == "v2"


def test_build_leak_opinion_text_non_empty():
    vision = VisionResult.model_validate(
        {
            "version": "v2",
            "severity": "high",
            "confidence": 0.9,
            "case_summary": "옥상 누수 의심",
            "observations": [
                {
                    "type": "stain",
                    "location": "천장 모서리",
                    "evidence": "변색 확인",
                    "photo_refs": [1],
                }
            ],
            "hypotheses": [],
            "work_items": [],
        }
    )
    text = build_leak_opinion_text(vision)
    assert text
    assert "옥상 누수 의심" in text


def test_legacy_payload_is_normalized_to_vision():
    service = DiagnosisService(db=None)  # type: ignore[arg-type]
    vision = service._normalize_vision_response(  # noqa: SLF001 - intentional private helper test
        {
            "leak_opinion": {
                "summary": "레거시 응답",
                "details": "상세",
                "severity": "medium",
                "leak_locations": ["옥상"],
            },
            "confidence": 0.7,
            "suggested_materials": [
                {"name": "우레탄 방수재", "spec": "KS", "unit": "㎡", "quantity": 12}
            ],
        }
    )
    assert vision.version == "v2"
    assert len(vision.work_items) == 1
    assert vision.work_items[0].price_lookup.primary_query == "우레탄 방수재"
