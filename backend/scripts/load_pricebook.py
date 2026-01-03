#!/usr/bin/env python3
"""단가표 PDF 데이터 로딩 스크립트.

사용법:
    python scripts/load_pricebook.py --name "종합적산정보" --revision "2025-H2"
"""
import asyncio
import argparse
from datetime import datetime
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import async_session_maker
from app.services.pdf_parser import PricebookLoader


DEFAULT_PDF_PATHS = [
    "종합적산정보건축부문(견적서근거자료).pdf",
    "종합적산정보공통부문(견적서근거자료).pdf",
]


async def main():
    parser = argparse.ArgumentParser(description="단가표 PDF 데이터 로딩")
    parser.add_argument(
        "--name",
        default="종합적산정보",
        help="단가표 이름 (기본: 종합적산정보)",
    )
    parser.add_argument(
        "--revision",
        default=f"{datetime.now().year}-H{'1' if datetime.now().month <= 6 else '2'}",
        help="버전 코드 (기본: 현재 연도-반기)",
    )
    parser.add_argument(
        "--pdfs",
        nargs="+",
        default=DEFAULT_PDF_PATHS,
        help="PDF 파일 경로 목록",
    )
    parser.add_argument(
        "--effective-from",
        type=lambda s: datetime.fromisoformat(s),
        default=datetime.now(),
        help="적용 시작일 (ISO 형식)",
    )
    
    args = parser.parse_args()
    
    project_root = Path(__file__).parent.parent.parent
    pdf_paths = [str(project_root / p) for p in args.pdfs]
    
    for path in pdf_paths:
        if not Path(path).exists():
            print(f"❌ PDF 파일을 찾을 수 없습니다: {path}")
            return
    
    print(f"📚 단가표 로딩 시작")
    print(f"   - 이름: {args.name}")
    print(f"   - 버전: {args.revision}")
    print(f"   - PDF 파일: {len(pdf_paths)}개")
    print()
    
    async with async_session_maker() as session:
        loader = PricebookLoader(session)
        
        try:
            result = await loader.load_from_pdf(
                pdf_paths=pdf_paths,
                pricebook_name=args.name,
                revision_code=args.revision,
                effective_from=args.effective_from,
            )
            
            print(f"✅ 로딩 완료!")
            print(f"   - 단가표 ID: {result['pricebook_id']}")
            print(f"   - 버전 ID: {result['revision_id']}")
            print(f"   - 적재된 단가 항목: {result['items_loaded']}개")
            print(f"   - 적재된 텍스트 청크: {result['chunks_loaded']}개")
            
        except Exception as e:
            print(f"❌ 로딩 실패: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
