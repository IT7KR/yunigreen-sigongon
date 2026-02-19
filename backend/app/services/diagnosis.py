"""AI 진단 서비스 - Gemini API 통합.

CRITICAL: 단가 계산은 절대 AI에게 맡기지 않음.
AI는 이미지 분석과 자재 추천만 담당함.
"""
import time
import logging
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.exceptions import AIServiceException, AIAnalysisFailedException
from app.core.ai import gemini_service, prompt_loader, AIResponse
from app.schemas.vision import VisionResult, build_leak_opinion_text
from app.models.diagnosis import (
    AIDiagnosis,
    DiagnosisStatus,
    AIMaterialSuggestion,
    MatchMethod,
)
from app.models.pricebook import CatalogItem
from app.services.material_matcher import MaterialMatcher

logger = logging.getLogger(__name__)


class DiagnosisService:
    """AI 진단 서비스."""
    
    MATERIAL_PROMPT_TEMPLATE = """
당신은 방수 공사 자재 전문가입니다. 누수 현장 사진과 진단 결과를 바탕으로 필요한 자재를 추천해주세요.

## 진단 결과
{diagnosis_text}

## 추천 규칙
- 한국에서 일반적으로 사용되는 방수 자재명 사용
- 단위는 kg, m, m2, EA, 식 중 하나 사용
- 수량은 사진에서 추정 가능한 범위로 제안

## 출력 형식 (JSON)
{{
  "materials": [
    {{
      "name": "자재명 (한글)",
      "spec": "규격/사양",
      "unit": "단위",
      "quantity": 수량(숫자),
      "reason": "추천 사유"
    }}
  ]
}}
"""

    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def run_diagnosis(
        self,
        diagnosis_id: int,
        photo_paths: list[str],
        additional_notes: Optional[str] = None,
    ) -> AIDiagnosis:
        """AI 진단 실행."""
        start_time = time.time()
        
        diagnosis_result = await self.db.execute(
            select(AIDiagnosis).where(AIDiagnosis.id == diagnosis_id)
        )
        diagnosis = diagnosis_result.scalar_one_or_none()
        
        if not diagnosis:
            raise AIServiceException("진단 기록을 찾을 수 없어요")
        
        try:
            diagnosis.status = DiagnosisStatus.PROCESSING
            await self.db.commit()
            
            leak_analysis = await self._analyze_leak(photo_paths, additional_notes)
            
            if leak_analysis.get("requires_manual"):
                diagnosis.status = DiagnosisStatus.FAILED
                diagnosis.error_message = leak_analysis.get("error", "AI 분석 실패")
                await self.db.commit()
                return diagnosis

            vision = self._normalize_vision_response(leak_analysis)
            diagnosis.leak_opinion_text = build_leak_opinion_text(vision)
            diagnosis.confidence_score = Decimal(str(vision.confidence))
            diagnosis.raw_response_json = {
                "vision_v2": vision.model_dump(mode="json"),
                "legacy_model_output": leak_analysis,
            }

            material_suggestions = self._material_hints_from_vision(vision)
            if not material_suggestions:
                # Keep backward compatibility for old projects with narrative-only prompts.
                material_suggestions = await self._suggest_materials(
                    diagnosis.leak_opinion_text,
                    photo_paths,
                )

            # If diagnosis is re-run, replace previous suggestions.
            await self.db.execute(
                delete(AIMaterialSuggestion).where(
                    AIMaterialSuggestion.ai_diagnosis_id == diagnosis.id
                )
            )
            
            for material in material_suggestions:
                raw_quantity = material.get("quantity", 1)
                try:
                    parsed_quantity = Decimal(str(raw_quantity))
                except Exception:
                    parsed_quantity = Decimal("1")

                suggestion = AIMaterialSuggestion(
                    ai_diagnosis_id=diagnosis.id,
                    suggested_name=material.get("name", ""),
                    suggested_spec=material.get("spec", material.get("specification")),
                    suggested_unit=material.get("unit", "EA"),
                    suggested_quantity=parsed_quantity,
                )
                
                matched_item, confidence = await self._match_catalog_item(
                    suggestion.suggested_name,
                    suggestion.suggested_spec,
                    suggestion.suggested_unit,
                )
                
                if matched_item:
                    suggestion.matched_catalog_item_id = matched_item.id
                    suggestion.match_confidence = Decimal(str(confidence))
                    suggestion.match_method = MatchMethod.FUZZY
                
                self.db.add(suggestion)
            
            processing_time = int((time.time() - start_time) * 1000)
            diagnosis.processing_time_ms = processing_time
            diagnosis.status = DiagnosisStatus.COMPLETED
            
            logger.info(
                f"Diagnosis {diagnosis_id} completed: "
                f"time={processing_time}ms, confidence={diagnosis.confidence_score}, "
                f"materials={len(material_suggestions)}"
            )
            
            await self.db.commit()
            await self.db.refresh(diagnosis)
            
            return diagnosis
            
        except Exception as e:
            logger.error(f"Diagnosis {diagnosis_id} failed: {e}")
            diagnosis.status = DiagnosisStatus.FAILED
            diagnosis.error_message = str(e)
            await self.db.commit()
            raise AIAnalysisFailedException() from e
    
    async def _analyze_leak(
        self,
        photo_paths: list[str],
        additional_notes: Optional[str],
    ) -> dict:
        """누수 분석 실행 - GeminiService 사용."""
        
        if not photo_paths:
            return self._get_mock_leak_analysis()
        
        try:
            prompt = prompt_loader.load("diagnosis", "current")
        except FileNotFoundError:
            logger.warning("Diagnosis prompt not found, using default")
            prompt = self._get_default_diagnosis_prompt()
        
        response: AIResponse = await gemini_service.analyze_with_images(
            prompt=prompt,
            image_paths=photo_paths,
            additional_context=additional_notes,
        )
        
        if response.success and response.data:
            logger.info(f"Leak analysis completed with model: {response.model_used}")
            return response.data
        
        if response.requires_manual:
            logger.warning(f"AI analysis requires manual input: {response.error}")
            return {
                "requires_manual": True,
                "error": response.error,
            }
        
        return self._get_mock_leak_analysis()

    def _normalize_vision_response(self, raw_output: dict[str, Any]) -> VisionResult:
        """Converts model output to a stable Vision v2 payload."""
        try:
            return VisionResult.model_validate(raw_output)
        except Exception:
            legacy = self._legacy_to_vision(raw_output)
            return VisionResult.model_validate(legacy)

    async def _suggest_materials(
        self,
        diagnosis_text: str,
        photo_paths: list[str],
    ) -> list[dict]:
        """자재 추천 실행."""
        
        if not diagnosis_text:
            return self._get_mock_materials()
        
        prompt = self.MATERIAL_PROMPT_TEMPLATE.format(diagnosis_text=diagnosis_text)
        
        response: AIResponse = await gemini_service.analyze_with_images(
            prompt=prompt,
            image_paths=photo_paths,
        )
        
        if response.success and response.data:
            materials = response.data.get("materials", [])
            if isinstance(response.data.get("suggested_materials"), list):
                materials = response.data.get("suggested_materials", [])
            logger.info(f"Material suggestion completed: {len(materials)} items")
            return materials
        
        logger.warning("Material suggestion failed, using mock data")
        return self._get_mock_materials()

    def _material_hints_from_vision(self, vision: VisionResult) -> list[dict[str, Any]]:
        hints: list[dict[str, Any]] = []
        for work_item in vision.work_items:
            for material in work_item.materials_hint:
                quantity = work_item.quantity.value
                if quantity is None and work_item.quantity.range is not None:
                    quantity = work_item.quantity.range.min
                hints.append(
                    {
                        "name": material.name,
                        "spec": material.spec or "",
                        "unit": self._normalize_unit(work_item.quantity.unit),
                        "quantity": quantity if quantity is not None else 1,
                    }
                )
        return hints

    def _legacy_to_vision(self, raw_output: dict[str, Any]) -> dict[str, Any]:
        """Fallback transform for old prompt outputs."""
        leak_opinion = raw_output.get("leak_opinion", {}) if isinstance(raw_output, dict) else {}
        confidence = raw_output.get("confidence", raw_output.get("confidence_score", 0.0))
        leak_locations = leak_opinion.get("leak_locations") or []
        summary = leak_opinion.get("summary") or raw_output.get("leak_opinion_text", "")
        details = leak_opinion.get("details") or raw_output.get("leak_opinion_text", "")

        suggested_materials = (
            raw_output.get("suggested_materials")
            or raw_output.get("materials")
            or []
        )

        work_items = []
        for idx, material in enumerate(suggested_materials, start=1):
            name = material.get("name", "누수 보수")
            spec = material.get("spec", material.get("specification"))
            unit = self._normalize_unit(material.get("unit", "unknown"))
            raw_quantity = material.get("quantity")
            quantity_value = None
            try:
                if raw_quantity is not None:
                    quantity_value = float(raw_quantity)
            except Exception:
                quantity_value = None

            work_items.append(
                {
                    "work_id": f"work_{idx}",
                    "trade": "waterproofing",
                    "task": name,
                    "scope_location": leak_locations[0] if leak_locations else "미상",
                    "photo_refs": [1],
                    "quantity": {
                        "unit": unit,
                        "value": quantity_value,
                        "range": None,
                        "basis": "legacy_suggestion",
                    },
                    "materials_hint": [{"name": name, "spec": spec}],
                    "price_lookup": {
                        "primary_query": name,
                        "must_terms": [name, "방수"],
                        "expected_unit": unit,
                    },
                    "needs_user_measurement": quantity_value is None,
                    "measurement_questions": (
                        ["정확한 시공 면적(㎡)을 알려주세요."]
                        if quantity_value is None
                        else []
                    ),
                }
            )

        if not work_items:
            work_items = [
                {
                    "work_id": "work_1",
                    "trade": "waterproofing",
                    "task": "누수 보수",
                    "scope_location": leak_locations[0] if leak_locations else "미상",
                    "photo_refs": [1],
                    "quantity": {
                        "unit": "unknown",
                        "value": None,
                        "range": None,
                        "basis": "legacy_analysis",
                    },
                    "materials_hint": [],
                    "price_lookup": {
                        "primary_query": "누수 보수 방수",
                        "must_terms": ["누수", "방수"],
                        "expected_unit": "unknown",
                    },
                    "needs_user_measurement": True,
                    "measurement_questions": ["시공 범위(면적/길이)를 측정해 주세요."],
                }
            ]

        return {
            "version": "v2",
            "severity": leak_opinion.get("severity", "unknown"),
            "confidence": float(confidence) if confidence is not None else 0.0,
            "case_summary": summary,
            "observations": [
                {
                    "type": "unknown",
                    "location": location,
                    "evidence": details or summary or "legacy",
                    "photo_refs": [1],
                }
                for location in leak_locations[:5]
            ],
            "hypotheses": [
                {
                    "likely_source": "unknown",
                    "rationale": summary or details or "legacy",
                    "confidence": float(confidence) if confidence is not None else 0.0,
                    "photo_refs": [1],
                    "checks": [],
                }
            ] if summary or details else [],
            "work_items": work_items,
            "missing_info_requests": [],
            "safety_notes": [],
        }

    def _normalize_unit(self, unit: Optional[str]) -> str:
        if not unit:
            return "unknown"
        normalized = unit.strip().lower()
        mapping = {
            "㎡": "m2",
            "m²": "m2",
            "m2": "m2",
            "m": "m",
            "ea": "ea",
            "개": "ea",
            "식": "set",
            "set": "set",
            "kg": "kg",
            "l": "l",
            "ℓ": "l",
        }
        return mapping.get(normalized, normalized)
    
    async def _match_catalog_item(
        self,
        suggested_name: str,
        suggested_spec: Optional[str],
        suggested_unit: Optional[str] = None,
    ) -> tuple[Optional[CatalogItem], float]:
        """카탈로그 품목 매칭 - MaterialMatcher 사용."""
        matcher = MaterialMatcher(self.db)
        
        result = await matcher.match(
            suggested_name=suggested_name,
            suggested_spec=suggested_spec,
            suggested_unit=suggested_unit,
        )
        
        if result.best_match:
            item_result = await self.db.execute(
                select(CatalogItem).where(CatalogItem.id == result.best_match.catalog_item_id)
            )
            item = item_result.scalar_one_or_none()
            return item, result.best_match.match_score
        
        return None, 0.0
    
    def _get_default_diagnosis_prompt(self) -> str:
        """기본 진단 프롬프트."""
        return """
당신은 누수/방수 현장 기술검토자입니다.
사진 분석 결과를 견적/RAG 연계를 위한 구조화 JSON으로 출력하세요.

필수 키:
- version, severity, confidence
- observations[] (관찰 사실)
- hypotheses[] (원인 가설)
- work_items[] (trade/task/scope/quantity/price_lookup/photo_refs)

규칙:
1) 단가/총액/세금은 절대 추정하지 않습니다.
2) 확정 불가 수량은 value=null 또는 range로 작성합니다.
3) work_items.price_lookup은 primary_query/must_terms/expected_unit을 포함합니다.
4) 출력은 JSON 객체 하나만 작성합니다.
"""
    
    def _get_mock_leak_analysis(self) -> dict:
        """테스트용 목업 응답."""
        return {
            "leak_opinion": {
                "summary": "옥상 방수층 노후화로 인한 누수",
                "details": (
                    "본 현장은 옥상 방수층의 노후화로 인한 누수가 발생한 것으로 판단됩니다. "
                    "우레탄 방수 도막이 균열되어 있으며, 드레인 주변 실링 불량이 관찰됩니다. "
                    "전반적인 방수층 재시공을 권장하며, 드레인 주변은 특별히 방수 처리가 필요합니다. "
                    "손상 정도는 중간 수준으로, 조속한 보수가 필요합니다."
                ),
                "severity": "medium",
                "leak_locations": ["옥상 방수층", "드레인 주변"],
            },
            "leak_opinion_text": (
                "본 현장은 옥상 방수층의 노후화로 인한 누수가 발생한 것으로 판단됩니다. "
                "우레탄 방수 도막이 균열되어 있으며, 드레인 주변 실링 불량이 관찰됩니다. "
                "전반적인 방수층 재시공을 권장하며, 드레인 주변은 특별히 방수 처리가 필요합니다. "
                "손상 정도는 중간 수준으로, 조속한 보수가 필요합니다."
            ),
            "confidence": 0.85,
            "confidence_score": 0.85,
        }
    
    def _get_mock_materials(self) -> list[dict]:
        """테스트용 목업 자재."""
        return [
            {
                "name": "우레탄계 도막방수재",
                "spec": "1액형, KS F 4911",
                "unit": "kg",
                "quantity": 100,
                "reason": "옥상 전체 방수층 재시공",
            },
            {
                "name": "방수용 프라이머",
                "spec": "우레탄계",
                "unit": "kg",
                "quantity": 20,
                "reason": "바탕면 접착력 향상",
            },
            {
                "name": "드레인 실링재",
                "spec": "폴리우레탄계",
                "unit": "EA",
                "quantity": 2,
                "reason": "드레인 주변 누수 방지",
            },
        ]
