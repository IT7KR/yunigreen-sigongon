#!/usr/bin/env python3
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import async_session_factory
from app.services.pdf_parser.text_extractor import TextExtractor
from app.models.rag import DocumentChunk
from app.services.rag import RAGService


async def main():
    pdf_files = [
        "/app/data/estimate_arch.pdf",
        "/app/data/estimate_common.pdf",
    ]
    
    async with async_session_factory() as db:
        rag_service = RAGService(db)
        total_chunks = 0
        
        for pdf_path in pdf_files:
            print(f"Processing: {pdf_path}")
            
            try:
                extractor = TextExtractor(pdf_path)
                chunks = extractor.extract_chunks()
                print(f"  Found {len(chunks)} chunks")
                
                for chunk in chunks:
                    embedding = await rag_service._get_embedding(chunk.content)
                    
                    doc_chunk = DocumentChunk(
                        chunk_text=chunk.content,
                        source_file=chunk.source_file,
                        source_page=chunk.page_number,
                        chapter=chunk.chapter,
                        section=chunk.section,
                        category=chunk.chunk_type,
                        embedding=embedding,
                    )
                    db.add(doc_chunk)
                    total_chunks += 1
                    
                    if total_chunks % 50 == 0:
                        print(f"  Loaded {total_chunks} chunks...")
                        await db.flush()
                
            except Exception as e:
                print(f"  Error: {e}")
                continue
        
        await db.commit()
        print(f"\nTotal chunks loaded: {total_chunks}")


if __name__ == "__main__":
    asyncio.run(main())
