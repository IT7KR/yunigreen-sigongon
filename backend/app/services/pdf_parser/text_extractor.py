"""텍스트 추출기 - pypdf 기반 (RAG용)."""
import re
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

try:
    from pypdf import PdfReader
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


@dataclass
class TextChunk:
    """RAG용 텍스트 청크."""
    content: str
    chapter: str
    section: Optional[str]
    page_number: int
    chunk_type: str
    source_file: str


class TextExtractor:
    """PDF 텍스트 추출기 (RAG 임베딩용)."""
    
    CHUNK_SIZE = 500
    CHUNK_OVERLAP = 50
    
    def __init__(self, pdf_path: str):
        if not PYPDF_AVAILABLE:
            raise ImportError("pypdf가 설치되지 않았습니다. pip install pypdf")
        self.pdf_path = Path(pdf_path)
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")
        self.reader = PdfReader(str(self.pdf_path))
    
    def extract_all_text(self) -> list[tuple[int, str]]:
        """모든 페이지의 텍스트 추출."""
        results = []
        for page_num, page in enumerate(self.reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                results.append((page_num, text))
        return results
    
    def extract_chunks(self) -> list[TextChunk]:
        """RAG용 텍스트 청크 추출."""
        chunks = []
        current_chapter = ""
        current_section = ""
        
        for page_num, text in self.extract_all_text():
            chapter_match = re.search(r"제\s*(\d+)\s*장\s+([^\n]+)", text)
            if chapter_match:
                current_chapter = f"제{chapter_match.group(1)}장 {chapter_match.group(2).strip()}"
            
            section_match = re.search(r"^(\d+)\.\s+([^\n]+)", text, re.MULTILINE)
            if section_match:
                current_section = f"{section_match.group(1)}. {section_match.group(2).strip()}"
            
            explanations = self._extract_explanations(text)
            for exp_text in explanations:
                if len(exp_text) > 50:
                    chunks.append(TextChunk(
                        content=exp_text,
                        chapter=current_chapter,
                        section=current_section,
                        page_number=page_num,
                        chunk_type="explanation",
                        source_file=self.pdf_path.name,
                    ))
            
            notes = self._extract_notes(text)
            for note_text in notes:
                if len(note_text) > 30:
                    chunks.append(TextChunk(
                        content=note_text,
                        chapter=current_chapter,
                        section=current_section,
                        page_number=page_num,
                        chunk_type="note",
                        source_file=self.pdf_path.name,
                    ))
            
            general_chunks = self._split_into_chunks(text)
            for chunk_text in general_chunks:
                if len(chunk_text) > 100:
                    chunks.append(TextChunk(
                        content=chunk_text,
                        chapter=current_chapter,
                        section=current_section,
                        page_number=page_num,
                        chunk_type="general",
                        source_file=self.pdf_path.name,
                    ))
        
        return chunks
    
    def _extract_explanations(self, text: str) -> list[str]:
        """해설 섹션 추출."""
        patterns = [
            r"해설[:\s]*([^\n]+(?:\n(?![제\d])[^\n]+)*)",
            r"〔해설〕[:\s]*([^\n]+(?:\n(?![제\d])[^\n]+)*)",
            r"①\s*([^\n②]+)",
            r"②\s*([^\n③]+)",
            r"③\s*([^\n④]+)",
        ]
        
        explanations = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            explanations.extend(matches)
        
        return [e.strip() for e in explanations if e.strip()]
    
    def _extract_notes(self, text: str) -> list[str]:
        """주기/참고 섹션 추출."""
        patterns = [
            r"주기[:\s]*([^\n]+(?:\n(?![제\d])[^\n]+)*)",
            r"참고[:\s]*([^\n]+(?:\n(?![제\d])[^\n]+)*)",
            r"비고[:\s]*([^\n]+(?:\n(?![제\d])[^\n]+)*)",
            r"※\s*([^\n]+)",
        ]
        
        notes = []
        for pattern in patterns:
            matches = re.findall(pattern, text)
            notes.extend(matches)
        
        return [n.strip() for n in notes if n.strip()]
    
    def _split_into_chunks(self, text: str) -> list[str]:
        """텍스트를 청크로 분할."""
        text = re.sub(r"\s+", " ", text).strip()
        
        if len(text) <= self.CHUNK_SIZE:
            return [text] if text else []
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + self.CHUNK_SIZE
            
            if end < len(text):
                break_point = text.rfind(".", start, end)
                if break_point == -1 or break_point <= start:
                    break_point = text.rfind(" ", start, end)
                if break_point > start:
                    end = break_point + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - self.CHUNK_OVERLAP
            if start < 0:
                start = 0
        
        return chunks
