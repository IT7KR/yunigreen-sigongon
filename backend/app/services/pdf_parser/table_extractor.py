"""표 데이터 추출기 - tabula-py 기반."""
import re
from pathlib import Path
from typing import Optional
from decimal import Decimal
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

try:
    import tabula
    import pandas as pd
    TABULA_AVAILABLE = True
except ImportError:
    TABULA_AVAILABLE = False
    pd = None  # type: ignore[assignment]

if TYPE_CHECKING:
    import pandas as pd  # noqa: F401


@dataclass
class PriceItem:
    """단가표 항목."""
    chapter: str
    section: str
    item_name: str
    specification: Optional[str]
    unit: str
    unit_price: Decimal
    category: str
    source_page: int


class TableExtractor:
    """PDF 표 데이터 추출기."""
    
    HEADER_PATTERNS = [
        r"구\s*분",
        r"규\s*격", 
        r"단\s*위",
        r"단\s*가",
    ]
    
    SKIP_ROWS = ["소계", "합계", "계", "인건비소계", "재료비소계", "경비소계"]
    
    def __init__(self, pdf_path: str):
        if not TABULA_AVAILABLE:
            raise ImportError("tabula-py가 설치되지 않았습니다. pip install tabula-py")
        self.pdf_path = Path(pdf_path)
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")
    
    def extract_all_tables(self) -> list["pd.DataFrame"]:
        """PDF의 모든 표 추출."""
        tables = tabula.read_pdf(
            str(self.pdf_path),
            pages="all",
            multiple_tables=True,
            pandas_options={"header": None},
            lattice=True,
        )
        return tables
    
    def extract_price_items(self) -> list[PriceItem]:
        """단가표 항목 추출."""
        tables = self.extract_all_tables()
        items = []
        
        current_chapter = ""
        current_section = ""
        
        for page_idx, table in enumerate(tables):
            if table.empty:
                continue
            
            normalized = self._normalize_table(table)
            if normalized is None:
                continue
            
            for _, row in normalized.iterrows():
                item_name = str(row.get("item_name", "")).strip()
                
                if not item_name or self._is_skip_row(item_name):
                    continue
                
                if self._is_chapter_header(item_name):
                    current_chapter = item_name
                    continue
                
                if self._is_section_header(item_name):
                    current_section = item_name
                    continue
                
                unit_price = self._parse_price(row.get("unit_price", ""))
                if unit_price is None:
                    continue
                
                items.append(PriceItem(
                    chapter=current_chapter,
                    section=current_section,
                    item_name=item_name,
                    specification=str(row.get("specification", "")).strip() or None,
                    unit=str(row.get("unit", "")).strip() or "식",
                    unit_price=unit_price,
                    category=self._determine_category(item_name),
                    source_page=page_idx + 1,
                ))
        
        return items
    
    def _normalize_table(self, table: Any) -> Optional[Any]:
        """표 정규화 - 헤더 찾기 및 컬럼명 매핑."""
        header_row_idx = None
        
        for idx, row in table.iterrows():
            row_text = " ".join(str(v) for v in row.values if pd.notna(v))
            if all(re.search(p, row_text) for p in self.HEADER_PATTERNS[:2]):
                header_row_idx = idx
                break
        
        if header_row_idx is None:
            return None
        
        data = table.iloc[header_row_idx + 1:].copy()
        if data.empty:
            return None
        
        col_mapping = {}
        header_row = table.iloc[header_row_idx]
        
        for col_idx, value in enumerate(header_row):
            if pd.isna(value):
                continue
            value_str = str(value).replace(" ", "")
            if "구분" in value_str:
                col_mapping[col_idx] = "item_name"
            elif "규격" in value_str:
                col_mapping[col_idx] = "specification"
            elif "단위" in value_str:
                col_mapping[col_idx] = "unit"
            elif "단가" in value_str:
                col_mapping[col_idx] = "unit_price"
        
        if "item_name" not in col_mapping.values():
            return None
        
        data = data.rename(columns={
            data.columns[k]: v for k, v in col_mapping.items()
            if k < len(data.columns)
        })
        
        return data
    
    def _is_skip_row(self, text: str) -> bool:
        """건너뛸 행인지 확인."""
        return any(skip in text for skip in self.SKIP_ROWS)
    
    def _is_chapter_header(self, text: str) -> bool:
        """장 헤더인지 확인."""
        return bool(re.match(r"제\s*\d+\s*장", text))
    
    def _is_section_header(self, text: str) -> bool:
        """절 헤더인지 확인."""
        return bool(re.match(r"^\d+\.\s+", text))
    
    def _parse_price(self, value) -> Optional[Decimal]:
        """가격 문자열 파싱."""
        if pd.isna(value):
            return None
        
        text = str(value).replace(",", "").replace(" ", "").strip()
        
        match = re.search(r"(\d+(?:\.\d+)?)", text)
        if match:
            try:
                return Decimal(match.group(1))
            except Exception:
                return None
        return None
    
    def _determine_category(self, item_name: str) -> str:
        """항목 카테고리 결정."""
        labor_keywords = ["공", "인부", "기능공", "기술자", "조공", "보통인부"]
        equipment_keywords = ["기계", "장비", "크레인", "펌프", "믹서"]
        
        for kw in labor_keywords:
            if kw in item_name:
                return "labor"
        
        for kw in equipment_keywords:
            if kw in item_name:
                return "equipment"
        
        return "material"
