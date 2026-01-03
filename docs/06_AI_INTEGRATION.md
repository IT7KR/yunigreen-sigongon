# 유니그린 SaaS - AI 통합 가이드

## 1. 개요

본 문서는 유니그린 시스템의 AI 통합(Gemini 3.0 Flash) 구현 세부사항을 정의합니다.

### 1.1 AI 파이프라인

```
┌─────────────────────────────────────────────────────────────────┐
│                     유니그린 AI 파이프라인                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [현장 사진]  ──────►  [Gemini 3.0 Flash]  ──────►  [구조화 출력] │
│                              │                                  │
│                              │                                  │
│                              ▼                                  │
│                    ┌─────────────────┐                          │
│                    │   누수 소견서    │                          │
│                    │   자재 추천     │                          │
│                    │   공법 제안     │                          │
│                    └─────────────────┘                          │
│                              │                                  │
│                              ▼                                  │
│  [RDB 매칭] ◄────────────────┴────────────────► [RAG 검색]      │
│  (자재 → 단가)                                (규정 → 할증)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Gemini 3.0 Flash 연동

### 2.1 API 설정

```python
# backend/app/core/ai.py
import google.generativeai as genai
from app.core.config import settings

# API 키 설정
genai.configure(api_key=settings.GEMINI_API_KEY)

# 모델 초기화
model = genai.GenerativeModel(
    model_name="gemini-3.0-flash",
    generation_config={
        "temperature": 0.1,        # 낮은 온도 = 일관된 출력
        "top_p": 0.95,
        "max_output_tokens": 4096,
        "response_mime_type": "application/json",  # JSON 강제
    },
    safety_settings=[
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ]
)
```

### 2.2 프롬프트 설계

```python
# backend/app/services/diagnosis.py

DIAGNOSIS_SYSTEM_PROMPT = """
당신은 20년 경력의 방수/누수 전문 기술자입니다.
주어진 현장 사진을 분석하여 아래 형식으로 JSON을 출력하세요.

## 역할
1. 사진에서 누수/하자 부위를 식별합니다.
2. 손상 정도와 원인을 분석합니다.
3. 필요한 자재와 대략적인 수량을 추천합니다.
4. 적절한 시공 방법을 제안합니다.

## 출력 형식 (JSON)
{
  "leak_opinion": {
    "summary": "요약 (1-2문장)",
    "details": "상세 소견 (300자 이상)",
    "severity": "low | medium | high | critical",
    "affected_area_description": "손상 부위 설명"
  },
  "suggested_materials": [
    {
      "name": "자재명 (한글)",
      "specification": "규격",
      "unit": "단위 (kg, m2, EA, L 등)",
      "quantity": 숫자,
      "reason": "추천 사유"
    }
  ],
  "construction_method": {
    "name": "공법명",
    "steps": ["단계1", "단계2", ...],
    "precautions": ["주의사항1", "주의사항2", ...]
  },
  "estimated_duration_days": 숫자,
  "confidence": 0.0 ~ 1.0
}

## 규칙
1. 모든 텍스트는 한글로 작성합니다.
2. 자재 수량은 사진에서 추정 가능한 면적/길이를 기반으로 산출합니다.
3. 확신이 낮은 항목은 confidence를 낮게 설정합니다.
4. 사진이 불명확하면 "추가 사진 필요"라고 명시합니다.
"""

async def analyze_photos(photos: list[Photo], notes: str = "") -> dict:
    """사진을 분석하여 누수 진단 결과를 반환합니다."""
    
    # 이미지 준비
    image_parts = []
    for photo in photos:
        image_data = await load_image(photo.storage_path)
        image_parts.append({
            "mime_type": photo.mime_type,
            "data": image_data
        })
    
    # 프롬프트 구성
    user_prompt = f"""
다음 {len(photos)}장의 현장 사진을 분석해주세요.

현장 정보:
- 위치: (사진 메타데이터에서 추출)
- 기술자 메모: {notes if notes else "없음"}

분석을 시작해주세요.
"""
    
    # API 호출 (비동기)
    response = await model.generate_content_async([
        DIAGNOSIS_SYSTEM_PROMPT,
        *image_parts,
        user_prompt
    ])
    
    # JSON 파싱
    result = json.loads(response.text)
    return result
```

---

## 3. RAG (검색 증강 생성) 활용

### 3.1 RAG의 역할

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAG 활용 영역                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 시공 방법 검색                                               │
│     질의: "옥상 우레탄 방수 시공 방법"                            │
│     응답: PDF에서 해당 공법의 상세 절차 검색                      │
│                                                                 │
│  2. 할증 규정 검색                                               │
│     질의: "10층 이상 건물 노무비 할증"                           │
│     응답: "10층 이상은 매 5개층당 노무비 1% 가산"                 │
│                                                                 │
│  3. 주의사항 검색                                                │
│     질의: "우레탄 방수 시공 시 주의사항"                          │
│     응답: "바탕면 함수율 10% 이하 건조 후 시공"                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 임베딩 및 검색

```python
# backend/app/services/rag.py
from pgvector.asyncpg import register_vector
import numpy as np

class RAGService:
    """RAG 검색 서비스"""
    
    def __init__(self, embedding_model: str = "text-embedding-004"):
        self.embedding_model = embedding_model
    
    async def embed_text(self, text: str) -> list[float]:
        """텍스트를 벡터로 변환합니다."""
        result = await genai.embed_content_async(
            model=f"models/{self.embedding_model}",
            content=text,
            task_type="retrieval_query"
        )
        return result['embedding']
    
    async def search(
        self, 
        query: str, 
        revision_id: str = None,
        top_k: int = 5,
        category: str = None
    ) -> list[dict]:
        """유사한 문서 청크를 검색합니다."""
        
        # 쿼리 임베딩
        query_embedding = await self.embed_text(query)
        
        # pgvector 검색 쿼리
        sql = """
        SELECT 
            id,
            chunk_text,
            source_file,
            source_page,
            category,
            1 - (embedding <=> $1::vector) as similarity
        FROM document_chunk
        WHERE 1=1
        """
        params = [query_embedding]
        
        if revision_id:
            sql += " AND pricebook_revision_id = $2"
            params.append(revision_id)
        
        if category:
            sql += f" AND category = ${len(params) + 1}"
            params.append(category)
        
        sql += f" ORDER BY embedding <=> $1::vector LIMIT {top_k}"
        
        # 비동기 쿼리 실행
        results = await db.fetch_all(sql, params)
        
        return [
            {
                "chunk_text": r["chunk_text"],
                "source_file": r["source_file"],
                "source_page": r["source_page"],
                "category": r["category"],
                "relevance_score": float(r["similarity"])
            }
            for r in results
        ]
```

### 3.3 견적서에 RAG 컨텍스트 추가

```python
# backend/app/services/estimation.py

async def generate_estimate_with_context(
    project_id: str,
    diagnosis_id: str
) -> Estimate:
    """AI 진단 결과를 기반으로 견적서를 생성합니다."""
    
    # 1. AI 진단 결과 조회
    diagnosis = await get_diagnosis(diagnosis_id)
    
    # 2. 자재를 카탈로그와 매칭
    matched_items = []
    for suggestion in diagnosis.suggestions:
        matched = await match_to_catalog(suggestion)
        matched_items.append(matched)
    
    # 3. RAG로 시공 방법 및 주의사항 검색
    construction_context = await rag_service.search(
        query=f"{diagnosis.leak_opinion_text[:100]} 시공 방법",
        category="시공방법",
        top_k=3
    )
    
    # 4. RAG로 할증 규정 검색
    surcharge_context = await rag_service.search(
        query=f"{project.address} 할증 규정",
        category="할증규정",
        top_k=3
    )
    
    # 5. 견적서 생성
    estimate = await create_estimate(
        project_id=project_id,
        items=matched_items,
        construction_notes=format_rag_results(construction_context),
        surcharge_notes=format_rag_results(surcharge_context)
    )
    
    return estimate
```

---

## 4. 비동기 AI 처리 워크플로우

### 4.1 백그라운드 작업 패턴

```python
# backend/app/workers/ai_diagnosis.py
from fastapi import BackgroundTasks

class DiagnosisWorker:
    """AI 진단 백그라운드 워커"""
    
    async def process_diagnosis(self, diagnosis_id: str):
        """진단 요청을 비동기로 처리합니다."""
        
        try:
            # 1. 상태 업데이트: processing
            await update_diagnosis_status(diagnosis_id, "processing")
            
            # 2. 사진 로드
            photos = await get_diagnosis_photos(diagnosis_id)
            
            # 3. AI 분석 (비동기)
            result = await analyze_photos(photos)
            
            # 4. 자재 매칭 (비동기, 병렬 처리)
            matching_tasks = [
                match_to_catalog(mat) 
                for mat in result["suggested_materials"]
            ]
            matched_materials = await asyncio.gather(*matching_tasks)
            
            # 5. 결과 저장
            await save_diagnosis_result(
                diagnosis_id=diagnosis_id,
                leak_opinion=result["leak_opinion"],
                materials=matched_materials,
                construction_method=result["construction_method"]
            )
            
            # 6. 상태 업데이트: completed
            await update_diagnosis_status(diagnosis_id, "completed")
            
            # 7. 알림 발송 (선택적)
            await notify_user(diagnosis_id, "진단이 완료되었습니다.")
            
        except Exception as e:
            # 실패 처리
            await update_diagnosis_status(
                diagnosis_id, 
                "failed", 
                error_message=str(e)
            )
            raise
```

### 4.2 상태 폴링 vs WebSocket

```
방법 1: HTTP 폴링 (단순, 권장)
┌─────────┐                           ┌─────────┐
│ Client  │ ──── POST /diagnose ────► │ Server  │
└─────────┘                           └─────────┘
     │                                      │
     │ (2초마다)                             │
     │ ──── GET /diagnose/{id}/status ────► │
     │ ◄──── { status: "processing" } ───── │
     │                                      │
     │ ──── GET /diagnose/{id}/status ────► │
     │ ◄──── { status: "completed" } ────── │
     │                                      │

방법 2: WebSocket (실시간, 복잡)
┌─────────┐                           ┌─────────┐
│ Client  │ ◄════ WebSocket ════════► │ Server  │
└─────────┘                           └─────────┘
     │                                      │
     │ ──── { action: "diagnose" } ───────► │
     │ ◄──── { status: "processing" } ───── │
     │ ◄──── { status: "analyzing" } ────── │
     │ ◄──── { status: "completed" } ────── │
     │                                      │
```

---

## 5. 에러 처리 및 재시도

### 5.1 AI API 에러 처리

```python
# backend/app/services/diagnosis.py
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

class AIServiceError(Exception):
    """AI 서비스 오류"""
    pass

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
async def call_gemini_with_retry(prompt: str, images: list) -> dict:
    """재시도 로직이 포함된 Gemini API 호출"""
    
    try:
        response = await model.generate_content_async([prompt, *images])
        
        # 빈 응답 체크
        if not response.text:
            raise AIServiceError("빈 응답을 받았습니다.")
        
        # JSON 파싱
        return json.loads(response.text)
        
    except json.JSONDecodeError as e:
        raise AIServiceError(f"JSON 파싱 실패: {e}")
    
    except Exception as e:
        raise AIServiceError(f"AI API 호출 실패: {e}")
```

### 5.2 폴백 처리

```python
async def analyze_with_fallback(photos: list[Photo]) -> dict:
    """폴백 로직이 포함된 분석"""
    
    try:
        # 1차: Gemini 3.0 Flash
        return await analyze_photos_gemini(photos)
    
    except AIServiceError:
        try:
            # 2차: Gemini 2.0 Flash (폴백)
            return await analyze_photos_gemini_2(photos)
        
        except AIServiceError:
            # 3차: 수동 입력 요청
            return {
                "status": "manual_required",
                "message": "AI 분석에 실패했습니다. 수동으로 입력해주세요."
            }
```

---

## 6. 프롬프트 버전 관리

### 6.1 프롬프트 저장소

```
backend/app/prompts/
├── diagnosis/
│   ├── v1.0.0.txt    # 초기 버전
│   ├── v1.1.0.txt    # 자재 추천 개선
│   └── current.txt   # 현재 사용 버전 (심볼릭 링크)
├── estimation/
│   └── ...
└── rag/
    └── ...
```

### 6.2 프롬프트 로더

```python
# backend/app/core/prompts.py
from pathlib import Path

class PromptLoader:
    """프롬프트 로더"""
    
    def __init__(self, base_path: str = "app/prompts"):
        self.base_path = Path(base_path)
    
    def load(self, category: str, version: str = "current") -> str:
        """프롬프트를 로드합니다."""
        
        prompt_path = self.base_path / category / f"{version}.txt"
        
        if not prompt_path.exists():
            raise FileNotFoundError(f"프롬프트를 찾을 수 없습니다: {prompt_path}")
        
        return prompt_path.read_text(encoding="utf-8")
    
    def list_versions(self, category: str) -> list[str]:
        """사용 가능한 프롬프트 버전 목록을 반환합니다."""
        
        category_path = self.base_path / category
        return [
            f.stem for f in category_path.glob("v*.txt")
        ]

# 사용 예시
prompt_loader = PromptLoader()
diagnosis_prompt = prompt_loader.load("diagnosis", "current")
```

---

## 7. 모니터링 및 로깅

### 7.1 AI 호출 로깅

```python
# backend/app/services/diagnosis.py
import logging
import time

logger = logging.getLogger(__name__)

async def analyze_photos_with_logging(photos: list[Photo]) -> dict:
    """로깅이 포함된 사진 분석"""
    
    start_time = time.time()
    request_id = generate_request_id()
    
    logger.info(f"[{request_id}] AI 분석 시작: {len(photos)}장의 사진")
    
    try:
        result = await analyze_photos(photos)
        
        processing_time = (time.time() - start_time) * 1000
        
        logger.info(
            f"[{request_id}] AI 분석 완료: "
            f"처리시간={processing_time:.0f}ms, "
            f"신뢰도={result.get('confidence', 'N/A')}, "
            f"자재추천={len(result.get('suggested_materials', []))}건"
        )
        
        # 메트릭 기록 (선택적)
        await record_metric("ai_diagnosis_duration_ms", processing_time)
        await record_metric("ai_diagnosis_success", 1)
        
        return result
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        
        logger.error(
            f"[{request_id}] AI 분석 실패: "
            f"처리시간={processing_time:.0f}ms, "
            f"오류={str(e)}"
        )
        
        await record_metric("ai_diagnosis_failure", 1)
        raise
```

---

## 8. 버전 이력

| 버전 | 날짜 | 변경 내용 |
|-----|------|----------|
| 0.1.0 | 2026-01-04 | docs/06_AI_INTEGRATION.md로 분리 (AGENTS.md에서 이동) |
