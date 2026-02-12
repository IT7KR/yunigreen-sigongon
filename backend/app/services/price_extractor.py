"""가격 추출 서비스 - Gemini + Grounding 검증.

핵심 원칙:
- AI는 추출만 담당, 계산은 절대 안 함
- 모든 추출된 가격은 Grounding 검증 필수
- 검증 실패 시 수동 검토로 전환
"""
import re
import json
from decimal import Decimal
from datetime import datetime
from typing import Optional
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AIServiceException
from app.core.snowflake import generate_snowflake_id
from app.models.price_staging import (
    PriceStaging,
    StagingStatus,
    ConfidenceLevel,
)


@dataclass
class ExtractedPrice:
    """추출된 가격 데이터."""
    item_name: str
    specification: Optional[str]
    unit: str
    unit_price: Decimal
    source_page: int
    source_text: str
    confidence_score: float
    is_grounded: bool
    grounding_match: Optional[str]


class PriceExtractor:
    """PDF에서 가격을 추출하고 검증하는 서비스.
    
    워크플로우:
    1. PDF 텍스트를 페이지별로 받음
    2. Gemini로 가격 항목 추출 (structured output)
    3. 각 추출된 가격을 원본 텍스트에서 검증 (Grounding)
    4. 검증 결과와 함께 staging 테이블에 저장
    """
    
    EXTRACTION_PROMPT = """
당신은 건설 단가표 PDF에서 가격 정보를 추출하는 전문가입니다.

## 작업
제공된 텍스트에서 자재/노무/장비 단가 항목을 추출해주세요.

## 추출 규칙
1. 품명(item_name): 자재명, 공종명, 장비명
2. 규격(specification): 사양, KS 규격, 크기 등 (없으면 null)
3. 단위(unit): m, m2, kg, EA, 인, 식 등
4. 단가(unit_price): 숫자만 (쉼표 제거)

## 주의사항
- 소계, 합계, 계 행은 제외
- 단가가 명시되지 않은 행은 제외
- 확실하지 않은 경우 confidence를 낮게 설정

## 출력 형식 (JSON)
{
  "items": [
    {
      "item_name": "품명",
      "specification": "규격 또는 null",
      "unit": "단위",
      "unit_price": 숫자,
      "confidence": 0.0~1.0,
      "source_line": "이 항목이 나온 원본 텍스트 라인"
    }
  ]
}

## 텍스트
{text}
"""

    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def extract_from_pages(
        self,
        pages: list[tuple[int, str]],  # [(page_num, text), ...]
        source_file: str,
        revision_id: int,
    ) -> list[PriceStaging]:
        """여러 페이지에서 가격 추출 및 staging 저장.
        
        Args:
            pages: [(페이지번호, 텍스트), ...] 리스트
            source_file: 원본 PDF 파일명
            revision_id: 단가표 버전 ID
            
        Returns:
            생성된 PriceStaging 레코드 리스트
        """
        all_staging = []
        
        for page_num, text in pages:
            if not text.strip():
                continue
            
            # AI로 가격 추출
            extracted = await self._extract_prices_from_text(text, page_num)
            
            # 각 항목에 대해 Grounding 검증 및 staging 생성
            for item in extracted:
                # Grounding 검증
                grounded, match = self._verify_grounding(
                    item.unit_price,
                    item.source_text,
                    text,
                )
                item.is_grounded = grounded
                item.grounding_match = match
                
                # 신뢰도 레벨 결정
                confidence_level = self._determine_confidence_level(item)
                
                # 이상치 감지
                anomalies = self._detect_anomalies(item)
                
                # Staging 생성
                staging = PriceStaging(
                    id=generate_snowflake_id(),
                    pricebook_revision_id=revision_id,
                    item_name=item.item_name,
                    specification=item.specification,
                    unit=item.unit,
                    unit_price_extracted=item.unit_price,
                    source_file=source_file,
                    source_page=item.source_page,
                    source_text_snippet=item.source_text[:500],  # 최대 500자
                    confidence_level=confidence_level,
                    confidence_score=Decimal(str(item.confidence_score)),
                    is_grounded=item.is_grounded,
                    grounding_match=item.grounding_match,
                    anomaly_flags=anomalies if anomalies else None,
                    status=self._determine_initial_status(item, anomalies),
                )
                
                self.db.add(staging)
                all_staging.append(staging)
        
        await self.db.flush()
        return all_staging
    
    async def _extract_prices_from_text(
        self,
        text: str,
        page_num: int,
    ) -> list[ExtractedPrice]:
        """Gemini로 텍스트에서 가격 추출."""
        if not settings.gemini_api_key:
            return self._get_mock_extraction(text, page_num)
        
        try:
            import google.generativeai as genai
            
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel(settings.gemini_model)
            
            prompt = self.EXTRACTION_PROMPT.format(text=text[:4000])  # 토큰 제한
            
            response = model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.1,  # 낮은 temperature로 일관성 확보
                },
            )
            
            result = json.loads(response.text)
            items = result.get("items", [])
            
            return [
                ExtractedPrice(
                    item_name=item.get("item_name", ""),
                    specification=item.get("specification"),
                    unit=item.get("unit", "EA"),
                    unit_price=Decimal(str(item.get("unit_price", 0))),
                    source_page=page_num,
                    source_text=item.get("source_line", ""),
                    confidence_score=float(item.get("confidence", 0.5)),
                    is_grounded=False,
                    grounding_match=None,
                )
                for item in items
                if item.get("item_name") and item.get("unit_price")
            ]
            
        except Exception as e:
            # 추출 실패 시 빈 리스트 반환 (전체 프로세스 중단 방지)
            print(f"가격 추출 실패 (page {page_num}): {e}")
            return []
    
    def _verify_grounding(
        self,
        extracted_price: Decimal,
        source_line: str,
        full_text: str,
    ) -> tuple[bool, Optional[str]]:
        """추출된 가격이 원본 텍스트에 실제로 존재하는지 검증.
        
        환각 방지의 핵심 로직:
        - 추출된 숫자가 원본에 있어야만 신뢰
        - 없으면 is_grounded=False → 수동 검토 필요
        
        Returns:
            (is_grounded, matched_string)
        """
        # 가격을 다양한 형식으로 검색
        price_str = str(int(extracted_price))  # 소수점 제거
        price_patterns = [
            price_str,                                    # 15000
            f"{int(extracted_price):,}",                  # 15,000
            f"{int(extracted_price):,}원",               # 15,000원
            re.sub(r'(\d)(?=(\d{3})+$)', r'\1,', price_str),  # 15,000
        ]
        
        search_text = full_text if full_text else source_line
        
        for pattern in price_patterns:
            if pattern in search_text:
                # 컨텍스트 추출 (매칭 위치 앞뒤 30자)
                idx = search_text.find(pattern)
                start = max(0, idx - 30)
                end = min(len(search_text), idx + len(pattern) + 30)
                context = search_text[start:end]
                return True, context.strip()
        
        return False, None
    
    def _determine_confidence_level(self, item: ExtractedPrice) -> ConfidenceLevel:
        """신뢰도 레벨 결정."""
        score = item.confidence_score
        
        # Grounding 실패 시 무조건 LOW
        if not item.is_grounded:
            return ConfidenceLevel.LOW
        
        if score >= 0.9:
            return ConfidenceLevel.HIGH
        elif score >= 0.7:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW
    
    def _detect_anomalies(self, item: ExtractedPrice) -> list[str]:
        """이상치 감지."""
        anomalies = []
        
        # Grounding 실패
        if not item.is_grounded:
            anomalies.append("grounding_failed")
        
        # 가격이 너무 낮거나 높음
        if item.unit_price < 100:
            anomalies.append("price_too_low")
        if item.unit_price > 10_000_000:
            anomalies.append("price_too_high")
        
        # 품명이 너무 짧음
        if len(item.item_name) < 2:
            anomalies.append("item_name_too_short")
        
        # 규격 누락 (일부 항목은 필수일 수 있음)
        if not item.specification:
            anomalies.append("missing_specification")
        
        return anomalies
    
    def _determine_initial_status(
        self,
        item: ExtractedPrice,
        anomalies: list[str],
    ) -> StagingStatus:
        """초기 상태 결정."""
        # 심각한 이상치가 있으면 검토 필요
        critical_anomalies = {"grounding_failed", "price_too_low", "price_too_high"}
        if anomalies and critical_anomalies & set(anomalies):
            return StagingStatus.NEEDS_REVIEW
        
        # 신뢰도 높고 grounding 성공이면 pending (자동 승인 후보)
        if item.is_grounded and item.confidence_score >= 0.9:
            return StagingStatus.PENDING
        
        # 그 외는 검토 필요
        return StagingStatus.NEEDS_REVIEW
    
    def _get_mock_extraction(
        self,
        text: str,
        page_num: int,
    ) -> list[ExtractedPrice]:
        """테스트용 목업 추출 결과."""
        # 텍스트에서 간단한 패턴 매칭으로 가격 추출 시도
        results = []
        
        # "품명 - 00,000원" 패턴 찾기
        pattern = r'([가-힣\s]+)\s*[-:]\s*([\d,]+)\s*원?'
        matches = re.findall(pattern, text)
        
        for name, price in matches[:5]:  # 최대 5개
            price_val = int(price.replace(",", ""))
            results.append(ExtractedPrice(
                item_name=name.strip(),
                specification=None,
                unit="EA",
                unit_price=Decimal(str(price_val)),
                source_page=page_num,
                source_text=f"{name} - {price}원",
                confidence_score=0.6,
                is_grounded=True,
                grounding_match=f"{name} - {price}원",
            ))
        
        return results
