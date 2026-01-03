"""AI 진단 서비스 - Gemini 3.0 Flash 통합.

CRITICAL: 단가 계산은 절대 AI에게 맡기지 않음.
AI는 이미지 분석과 자재 추천만 담당함.
"""
import uuid
import time
import json
from decimal import Decimal
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.exceptions import AIServiceException, AIAnalysisFailedException
from app.models.diagnosis import (
    AIDiagnosis,
    DiagnosisStatus,
    AIMaterialSuggestion,
    MatchMethod,
)
from app.models.pricebook import CatalogItem, CatalogItemAlias
from app.services.material_matcher import MaterialMatcher


class DiagnosisService:
    """AI 진단 서비스."""
    
    LEAK_OPINION_PROMPT = """
당신은 누수 진단 전문가입니다. 제공된 현장 사진을 분석하여 누수 소견서를 작성해주세요.

## 분석 항목
1. 누수 발생 위치 및 범위
2. 누수 원인 추정 (방수층 노후화, 균열, 시공 불량 등)
3. 손상 정도 (경미/중간/심각)
4. 권장 보수 방법

## 출력 형식 (JSON)
{
  "leak_opinion_text": "누수 소견서 본문 (한글, 300자 이상)",
  "confidence_score": 0.0~1.0,
  "leak_locations": ["위치1", "위치2"],
  "damage_level": "minor|moderate|severe",
  "suggested_repairs": ["방법1", "방법2"]
}

사진을 분석하고 위 형식으로 응답해주세요.
"""

    MATERIAL_SUGGESTION_PROMPT = """
당신은 방수 공사 자재 전문가입니다. 누수 현장 사진과 진단 결과를 바탕으로 필요한 자재를 추천해주세요.

## 진단 결과
{diagnosis_text}

## 추천 규칙
- 한국에서 일반적으로 사용되는 방수 자재명 사용
- 단위는 kg, m, m2, EA, 식 중 하나 사용
- 수량은 사진에서 추정 가능한 범위로 제안

## 출력 형식 (JSON)
{
  "materials": [
    {
      "name": "자재명 (한글)",
      "spec": "규격/사양",
      "unit": "단위",
      "quantity": 수량(숫자)
    }
  ]
}

자재를 추천해주세요.
"""

    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def run_diagnosis(
        self,
        diagnosis_id: uuid.UUID,
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
            
            diagnosis.leak_opinion_text = leak_analysis.get("leak_opinion_text", "")
            diagnosis.confidence_score = Decimal(str(leak_analysis.get("confidence_score", 0.0)))
            diagnosis.raw_response_json = leak_analysis
            
            material_suggestions = await self._suggest_materials(
                diagnosis.leak_opinion_text,
                photo_paths,
            )
            
            for material in material_suggestions:
                suggestion = AIMaterialSuggestion(
                    ai_diagnosis_id=diagnosis.id,
                    suggested_name=material.get("name", ""),
                    suggested_spec=material.get("spec"),
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
            
            await self.db.commit()
            await self.db.refresh(diagnosis)
            
            return diagnosis
            
        except Exception as e:
            diagnosis.status = DiagnosisStatus.FAILED
            diagnosis.error_message = str(e)
            await self.db.commit()
            raise AIAnalysisFailedException() from e
    
    async def _analyze_leak(
        self,
        photo_paths: list[str],
        additional_notes: Optional[str],
    ) -> dict:
        """누수 분석 실행."""
        if not settings.gemini_api_key:
            return self._get_mock_leak_analysis()
        
        try:
            import google.generativeai as genai
            
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            
            prompt = self.LEAK_OPINION_PROMPT
            if additional_notes:
                prompt += f"\n\n## 추가 참고 사항\n{additional_notes}"
            
            response = model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.3,
                },
            )
            
            return json.loads(response.text)
            
        except Exception as e:
            raise AIServiceException(
                message="누수 분석에 실패했어요. 잠시 후 다시 시도해 주세요.",
                details={"error": str(e)},
            )
    
    async def _suggest_materials(
        self,
        diagnosis_text: str,
        photo_paths: list[str],
    ) -> list[dict]:
        """자재 추천 실행."""
        if not settings.gemini_api_key:
            return self._get_mock_materials()
        
        try:
            import google.generativeai as genai
            
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            
            prompt = self.MATERIAL_SUGGESTION_PROMPT.format(
                diagnosis_text=diagnosis_text
            )
            
            response = model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.3,
                },
            )
            
            result = json.loads(response.text)
            return result.get("materials", [])
            
        except Exception as e:
            raise AIServiceException(
                message="자재 추천에 실패했어요",
                details={"error": str(e)},
            )
    
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
    
    def _get_mock_leak_analysis(self) -> dict:
        """테스트용 목업 응답."""
        return {
            "leak_opinion_text": (
                "본 현장은 옥상 방수층의 노후화로 인한 누수가 발생한 것으로 판단됩니다. "
                "우레탄 방수 도막이 균열되어 있으며, 드레인 주변 실링 불량이 관찰됩니다. "
                "전반적인 방수층 재시공을 권장하며, 드레인 주변은 특별히 방수 처리가 필요합니다. "
                "손상 정도는 중간 수준으로, 조속한 보수가 필요합니다."
            ),
            "confidence_score": 0.85,
            "leak_locations": ["옥상 방수층", "드레인 주변"],
            "damage_level": "moderate",
            "suggested_repairs": ["우레탄 방수 재시공", "드레인 실링 보수"],
        }
    
    def _get_mock_materials(self) -> list[dict]:
        """테스트용 목업 자재."""
        return [
            {
                "name": "우레탄계 도막방수재",
                "spec": "1액형, KS F 4911",
                "unit": "kg",
                "quantity": 100,
            },
            {
                "name": "방수용 프라이머",
                "spec": "우레탄계",
                "unit": "kg",
                "quantity": 20,
            },
            {
                "name": "드레인 실링재",
                "spec": "폴리우레탄계",
                "unit": "EA",
                "quantity": 2,
            },
        ]
