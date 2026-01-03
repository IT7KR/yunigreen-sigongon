"""자재 매칭 서비스 - 정규화 + 2단계 매칭 + HITL.

핵심 원칙:
- AI 추천 자재명 → 단가표 품목 매칭
- 신뢰도 >= 0.9: 자동 확정
- 신뢰도 < 0.9: 후보 제시 → 사용자 선택 → alias 저장 (학습 루프)
"""
import re
import uuid
from decimal import Decimal
from typing import Optional
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, or_, and_
from sqlmodel import select

from app.models.pricebook import (
    CatalogItem,
    CatalogItemAlias,
    CatalogItemPrice,
    ItemType,
    AliasSource,
)


@dataclass
class MatchCandidate:
    """매칭 후보."""
    catalog_item_id: uuid.UUID
    name_ko: str
    specification: Optional[str]
    unit: str
    material_family: Optional[str]
    match_score: float
    match_reason: str
    unit_price: Optional[Decimal] = None


@dataclass
class MatchResult:
    """매칭 결과."""
    is_confident: bool
    best_match: Optional[MatchCandidate]
    candidates: list[MatchCandidate]
    normalized_query: str
    extracted_tokens: list[str]


class MaterialMatcher:
    """자재 매칭 서비스.
    
    2단계 매칭:
    1. 패밀리 매칭: "우레탄 방수재" → material_family = "우레탄계"
    2. 사양 매칭: 단위, 규격, 속성으로 후보 축소
    
    학습 루프:
    - 사용자가 선택한 매칭을 alias로 저장
    - 다음부터는 alias에서 바로 찾음
    """
    
    CONFIDENCE_THRESHOLD = 0.9
    MAX_CANDIDATES = 5
    
    NORMALIZE_PATTERNS = [
        (r'\s+', ' '),
        (r'[（）\(\)]', ''),
        (r'[,，]', ' '),
        (r'제품$', ''),
        (r'자재$', ''),
    ]
    
    FAMILY_KEYWORDS = {
        '우레탄': ['우레탄', '폴리우레탄', 'PU', 'urethane'],
        '시멘트': ['시멘트', '몰탈', '모르타르', 'cement'],
        '아스팔트': ['아스팔트', '역청', 'asphalt'],
        '실리콘': ['실리콘', '실란트', 'silicone'],
        '에폭시': ['에폭시', 'epoxy'],
        '도막': ['도막', '코팅', 'coating'],
        '시트': ['시트', '멤브레인', 'sheet', 'membrane'],
        '프라이머': ['프라이머', '초벌', 'primer'],
    }
    
    SPEC_KEYWORDS = [
        '1액형', '2액형', '수성', '유성', '용제형',
        'KS', 'KS F', 'KS M',
        '옥상용', '지하용', '욕실용', '외벽용',
    ]
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def match(
        self,
        suggested_name: str,
        suggested_spec: Optional[str] = None,
        suggested_unit: Optional[str] = None,
        revision_id: Optional[uuid.UUID] = None,
    ) -> MatchResult:
        """자재명을 단가표 품목과 매칭.
        
        Args:
            suggested_name: AI가 추천한 자재명
            suggested_spec: AI가 추천한 규격
            suggested_unit: AI가 추천한 단위
            revision_id: 단가표 버전 ID (가격 조회용)
            
        Returns:
            MatchResult: 매칭 결과 (자동 확정 여부 + 후보 목록)
        """
        normalized = self._normalize(suggested_name)
        tokens = self._extract_tokens(normalized, suggested_spec)
        
        alias_match = await self._match_by_alias(suggested_name)
        if alias_match:
            if revision_id:
                alias_match.unit_price = await self._get_price(
                    alias_match.catalog_item_id, revision_id
                )
            return MatchResult(
                is_confident=True,
                best_match=alias_match,
                candidates=[alias_match],
                normalized_query=normalized,
                extracted_tokens=tokens,
            )
        
        candidates = await self._find_candidates(
            normalized=normalized,
            tokens=tokens,
            suggested_spec=suggested_spec,
            suggested_unit=suggested_unit,
        )
        
        if revision_id:
            for candidate in candidates:
                candidate.unit_price = await self._get_price(
                    candidate.catalog_item_id, revision_id
                )
        
        best_match = candidates[0] if candidates else None
        is_confident = best_match and best_match.match_score >= self.CONFIDENCE_THRESHOLD
        
        return MatchResult(
            is_confident=is_confident,
            best_match=best_match if is_confident else None,
            candidates=candidates[:self.MAX_CANDIDATES],
            normalized_query=normalized,
            extracted_tokens=tokens,
        )
    
    async def confirm_match(
        self,
        original_text: str,
        catalog_item_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
    ) -> CatalogItemAlias:
        """사용자가 선택한 매칭을 alias로 저장 (학습 루프).
        
        다음에 같은 텍스트가 나오면 바로 매칭됨.
        """
        normalized = self._normalize(original_text)
        
        existing = await self.db.execute(
            select(CatalogItemAlias).where(
                CatalogItemAlias.catalog_item_id == catalog_item_id,
                CatalogItemAlias.normalized_text == normalized,
            )
        )
        if existing.scalar_one_or_none():
            return existing.scalar_one()
        
        alias = CatalogItemAlias(
            id=uuid.uuid4(),
            catalog_item_id=catalog_item_id,
            alias_text=original_text,
            normalized_text=normalized,
            source=AliasSource.USER,
        )
        self.db.add(alias)
        await self.db.flush()
        
        return alias
    
    def _normalize(self, text: str) -> str:
        """텍스트 정규화."""
        result = text.strip().lower()
        
        for pattern, replacement in self.NORMALIZE_PATTERNS:
            result = re.sub(pattern, replacement, result)
        
        return result.strip()
    
    def _extract_tokens(
        self,
        normalized: str,
        spec: Optional[str] = None,
    ) -> list[str]:
        """매칭에 사용할 토큰 추출."""
        tokens = []
        
        combined = f"{normalized} {spec or ''}"
        
        for family, keywords in self.FAMILY_KEYWORDS.items():
            for kw in keywords:
                if kw.lower() in combined.lower():
                    tokens.append(f"family:{family}")
                    break
        
        for spec_kw in self.SPEC_KEYWORDS:
            if spec_kw.lower() in combined.lower():
                tokens.append(f"spec:{spec_kw}")
        
        words = re.findall(r'[가-힣]+', combined)
        for word in words:
            if len(word) >= 2 and word not in ['방수', '자재', '제품', '용']:
                tokens.append(f"word:{word}")
        
        return list(set(tokens))
    
    async def _match_by_alias(self, text: str) -> Optional[MatchCandidate]:
        """alias 테이블에서 매칭."""
        normalized = self._normalize(text)
        
        result = await self.db.execute(
            select(CatalogItemAlias, CatalogItem)
            .join(CatalogItem, CatalogItemAlias.catalog_item_id == CatalogItem.id)
            .where(
                or_(
                    CatalogItemAlias.normalized_text == normalized,
                    CatalogItemAlias.alias_text.ilike(f"%{text}%"),
                )
            )
            .where(CatalogItem.is_active == True)
            .limit(1)
        )
        row = result.first()
        
        if row:
            alias, item = row
            return MatchCandidate(
                catalog_item_id=item.id,
                name_ko=item.name_ko,
                specification=item.specification,
                unit=item.base_unit,
                material_family=item.category_path,
                match_score=0.98,
                match_reason=f"alias 매칭: '{alias.alias_text}'",
            )
        
        return None
    
    async def _find_candidates(
        self,
        normalized: str,
        tokens: list[str],
        suggested_spec: Optional[str],
        suggested_unit: Optional[str],
    ) -> list[MatchCandidate]:
        """후보 목록 생성 (2단계 매칭)."""
        candidates = []
        
        family_tokens = [t.split(':')[1] for t in tokens if t.startswith('family:')]
        
        query = select(CatalogItem).where(CatalogItem.is_active == True)
        
        if family_tokens:
            family_conditions = []
            for family in family_tokens:
                for kw in self.FAMILY_KEYWORDS.get(family, [family]):
                    family_conditions.append(CatalogItem.name_ko.ilike(f"%{kw}%"))
                    family_conditions.append(CatalogItem.category_path.ilike(f"%{kw}%"))
            if family_conditions:
                query = query.where(or_(*family_conditions))
        else:
            words = re.findall(r'[가-힣]{2,}', normalized)
            if words:
                word_conditions = [CatalogItem.name_ko.ilike(f"%{w}%") for w in words[:3]]
                query = query.where(or_(*word_conditions))
        
        query = query.limit(20)
        
        result = await self.db.execute(query)
        items = result.scalars().all()
        
        for item in items:
            score = self._calculate_score(
                item=item,
                normalized=normalized,
                tokens=tokens,
                suggested_spec=suggested_spec,
                suggested_unit=suggested_unit,
            )
            
            if score > 0.3:
                candidates.append(MatchCandidate(
                    catalog_item_id=item.id,
                    name_ko=item.name_ko,
                    specification=item.specification,
                    unit=item.base_unit,
                    material_family=item.category_path,
                    match_score=score,
                    match_reason=self._get_match_reason(item, tokens),
                ))
        
        candidates.sort(key=lambda x: x.match_score, reverse=True)
        
        return candidates
    
    def _calculate_score(
        self,
        item: CatalogItem,
        normalized: str,
        tokens: list[str],
        suggested_spec: Optional[str],
        suggested_unit: Optional[str],
    ) -> float:
        """매칭 점수 계산."""
        score = 0.0
        
        item_name_lower = item.name_ko.lower()
        
        family_tokens = [t.split(':')[1] for t in tokens if t.startswith('family:')]
        for family in family_tokens:
            for kw in self.FAMILY_KEYWORDS.get(family, []):
                if kw.lower() in item_name_lower:
                    score += 0.3
                    break
        
        spec_tokens = [t.split(':')[1] for t in tokens if t.startswith('spec:')]
        item_spec = (item.specification or '').lower()
        for spec in spec_tokens:
            if spec.lower() in item_spec or spec.lower() in item_name_lower:
                score += 0.2
        
        word_tokens = [t.split(':')[1] for t in tokens if t.startswith('word:')]
        for word in word_tokens:
            if word in item_name_lower:
                score += 0.15
        
        if suggested_unit and item.base_unit:
            if suggested_unit.lower() == item.base_unit.lower():
                score += 0.2
        
        if suggested_spec and item.specification:
            if suggested_spec.lower() in item.specification.lower():
                score += 0.15
        
        return min(score, 1.0)
    
    def _get_match_reason(self, item: CatalogItem, tokens: list[str]) -> str:
        """매칭 이유 설명 생성."""
        reasons = []
        
        family_tokens = [t.split(':')[1] for t in tokens if t.startswith('family:')]
        if family_tokens:
            reasons.append(f"패밀리: {', '.join(family_tokens)}")
        
        spec_tokens = [t.split(':')[1] for t in tokens if t.startswith('spec:')]
        if spec_tokens:
            reasons.append(f"규격: {', '.join(spec_tokens)}")
        
        if not reasons:
            reasons.append("유사 품명")
        
        return " / ".join(reasons)
    
    async def _get_price(
        self,
        catalog_item_id: uuid.UUID,
        revision_id: uuid.UUID,
    ) -> Optional[Decimal]:
        """품목의 가격 조회."""
        result = await self.db.execute(
            select(CatalogItemPrice.unit_price)
            .where(CatalogItemPrice.catalog_item_id == catalog_item_id)
            .where(CatalogItemPrice.pricebook_revision_id == revision_id)
        )
        price = result.scalar_one_or_none()
        return price
