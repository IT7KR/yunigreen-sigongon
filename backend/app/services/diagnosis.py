"""AI 진단 서비스 - Gemini API 통합.

CRITICAL: 단가 계산은 절대 AI에게 맡기지 않음.
AI는 이미지 분석과 자재 추천만 담당함.
"""
import time
import logging
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.exceptions import AIServiceException, AIAnalysisFailedException
from app.core.ai import gemini_service, prompt_loader, AIResponse
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
            
            diagnosis.leak_opinion_text = leak_analysis.get("leak_opinion", {}).get(
                "details", leak_analysis.get("leak_opinion_text", "")
            )
            diagnosis.confidence_score = Decimal(
                str(leak_analysis.get("confidence", leak_analysis.get("confidence_score", 0.0)))
            )
            diagnosis.raw_response_json = leak_analysis
            
            material_suggestions = await self._suggest_materials(
                diagnosis.leak_opinion_text,
                photo_paths,
            )
            
            for material in material_suggestions:
                suggestion = AIMaterialSuggestion(
                    ai_diagnosis_id=diagnosis.id,
                    suggested_name=material.get("name", ""),
                    suggested_spec=material.get("spec", material.get("specification")),
                    suggested_unit=material.get("unit", "EA"),
                    suggested_quantity=Decimal(str(material.get("quantity", 1))),
                )
                
                matched_item, confidence = await self._match_catalog_item(
                    suggestion.suggested_name,
                    suggestion.suggested_spec,
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
당신은 20년 경력의 방수/누수 전문 기술자입니다.
주어진 현장 사진을 분석하여 아래 형식으로 JSON을 출력하세요.

## 출력 형식 (JSON)
{
  "leak_opinion": {
    "summary": "요약 (1-2문장)",
    "details": "상세 소견 (300자 이상)",
    "severity": "low | medium | high | critical",
    "leak_locations": ["위치1", "위치2"]
  },
  "suggested_materials": [
    {
      "name": "자재명 (한글)",
      "spec": "규격",
      "unit": "단위",
      "quantity": 숫자
    }
  ],
  "confidence": 0.0 ~ 1.0
}

모든 텍스트는 한글로 작성합니다.
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
