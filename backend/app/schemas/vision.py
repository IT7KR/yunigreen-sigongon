"""Vision structured output schemas for diagnosis -> pricing pipeline."""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field, ValidationError, model_validator


class QuantityRange(BaseModel):
    min: float = Field(ge=0)
    max: float = Field(ge=0)

    @model_validator(mode="after")
    def _validate_range(self) -> "QuantityRange":
        if self.max < self.min:
            raise ValueError("range.max must be >= range.min")
        return self


class WorkQuantity(BaseModel):
    unit: str = Field(default="unknown")
    value: Optional[float] = Field(default=None, ge=0)
    range: Optional[QuantityRange] = None
    basis: str = Field(default="")

    @model_validator(mode="after")
    def _validate_quantity_shape(self) -> "WorkQuantity":
        # value and range can both be absent, but if value exists range is optional.
        # if both exist, value should stay within range for consistency.
        if self.value is not None and self.range is not None:
            if self.value < self.range.min or self.value > self.range.max:
                raise ValueError("quantity.value must be within quantity.range")
        return self


class PriceLookup(BaseModel):
    primary_query: str
    must_terms: list[str] = Field(default_factory=list)
    expected_unit: str = Field(default="unknown")


class Observation(BaseModel):
    type: str
    location: str
    evidence: str
    photo_refs: list[int] = Field(default_factory=list)


class Hypothesis(BaseModel):
    likely_source: str
    rationale: str
    confidence: float = Field(ge=0, le=1)
    photo_refs: list[int] = Field(default_factory=list)
    checks: list[str] = Field(default_factory=list)


class MaterialHint(BaseModel):
    name: str
    spec: Optional[str] = None


class WorkItem(BaseModel):
    trade: str
    task: str
    scope_location: str
    quantity: WorkQuantity
    price_lookup: PriceLookup
    photo_refs: list[int] = Field(default_factory=list)
    materials_hint: list[MaterialHint] = Field(default_factory=list)
    needs_user_measurement: bool = False
    measurement_questions: list[str] = Field(default_factory=list)
    work_id: Optional[str] = None


class MissingInfoRequest(BaseModel):
    question: str
    why: str


class VisionResult(BaseModel):
    version: str = "v2"
    severity: str = "unknown"
    confidence: float = Field(ge=0, le=1, default=0.0)
    case_summary: Optional[str] = None
    observations: list[Observation] = Field(default_factory=list)
    hypotheses: list[Hypothesis] = Field(default_factory=list)
    work_items: list[WorkItem] = Field(default_factory=list)
    missing_info_requests: list[MissingInfoRequest] = Field(default_factory=list)
    safety_notes: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _assign_work_ids(self) -> "VisionResult":
        for idx, work_item in enumerate(self.work_items, start=1):
            if not work_item.work_id:
                work_item.work_id = f"work_{idx}"
        return self


def extract_vision_payload(raw_response_json: Optional[dict[str, Any]]) -> Optional[VisionResult]:
    """Extracts normalized vision payload from stored raw_response_json."""
    if not raw_response_json:
        return None
    payload: Any = raw_response_json.get("vision_v2", raw_response_json)
    if not isinstance(payload, dict):
        return None
    try:
        return VisionResult.model_validate(payload)
    except ValidationError:
        return None


def build_leak_opinion_text(vision: VisionResult) -> str:
    """Builds backward-compatible diagnosis narrative from structured vision."""
    summary = vision.case_summary or ""
    obs = ", ".join(
        f"{o.location}:{o.type}" for o in vision.observations[:4]
    )
    hypo = ", ".join(
        f"{h.likely_source}({h.confidence:.2f})" for h in vision.hypotheses[:3]
    )
    work = ", ".join(w.task for w in vision.work_items[:5])
    parts = [
        summary,
        f"관찰: {obs}" if obs else "",
        f"가설: {hypo}" if hypo else "",
        f"작업후보: {work}" if work else "",
    ]
    text = " | ".join(p for p in parts if p)
    return text or "사진 기반 구조화 진단이 생성됐어요."

