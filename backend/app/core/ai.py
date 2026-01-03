"""Gemini AI 서비스 - 이미지 분석 및 폴백 처리."""
import json
import base64
import logging
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class AIResponse:
    """AI 응답 결과."""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    model_used: Optional[str] = None
    requires_manual: bool = False


class GeminiService:
    """Gemini AI 서비스 - 폴백 로직 포함."""
    
    MODELS = [
        "gemini-2.0-flash-exp",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
    ]
    
    def __init__(self):
        self._genai = None
        self._configured = False
    
    def _ensure_configured(self):
        """Gemini API 설정 확인 및 초기화."""
        if self._configured:
            return True
        
        if not settings.gemini_api_key:
            logger.warning("GEMINI_API_KEY not configured")
            return False
        
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            self._genai = genai
            self._configured = True
            return True
        except ImportError:
            logger.error("google-generativeai package not installed")
            return False
        except Exception as e:
            logger.error(f"Failed to configure Gemini: {e}")
            return False
    
    async def analyze_with_images(
        self,
        prompt: str,
        image_paths: list[str],
        additional_context: Optional[str] = None,
    ) -> AIResponse:
        """이미지와 함께 분석 실행 - 폴백 로직 포함."""
        
        if not self._ensure_configured():
            return AIResponse(
                success=False,
                requires_manual=True,
                error="AI 서비스가 설정되지 않았어요. 수동으로 입력해 주세요.",
            )
        
        image_parts = await self._load_images(image_paths)
        if not image_parts:
            return AIResponse(
                success=False,
                requires_manual=True,
                error="분석할 사진을 로드할 수 없어요.",
            )
        
        full_prompt = prompt
        if additional_context:
            full_prompt += f"\n\n## 추가 참고 사항\n{additional_context}"
        
        for model_name in self.MODELS:
            try:
                result = await self._call_model(model_name, full_prompt, image_parts)
                if result.success:
                    return result
                logger.warning(f"Model {model_name} failed, trying next...")
            except Exception as e:
                logger.warning(f"Model {model_name} error: {e}, trying next...")
                continue
        
        return AIResponse(
            success=False,
            requires_manual=True,
            error="AI 분석에 실패했어요. 수동으로 입력해 주세요.",
        )
    
    async def _call_model(
        self,
        model_name: str,
        prompt: str,
        image_parts: list[dict],
    ) -> AIResponse:
        """특정 모델로 API 호출."""
        try:
            model = self._genai.GenerativeModel(
                model_name=model_name,
                generation_config={
                    "temperature": 0.2,
                    "top_p": 0.95,
                    "max_output_tokens": 4096,
                    "response_mime_type": "application/json",
                },
            )
            
            content = [prompt] + image_parts
            response = await model.generate_content_async(content)
            
            if not response.text:
                return AIResponse(success=False, error="Empty response")
            
            data = json.loads(response.text)
            
            return AIResponse(
                success=True,
                data=data,
                model_used=model_name,
            )
            
        except json.JSONDecodeError as e:
            return AIResponse(success=False, error=f"JSON parsing failed: {e}")
        except Exception as e:
            return AIResponse(success=False, error=str(e))
    
    async def _load_images(self, image_paths: list[str]) -> list[dict]:
        """이미지 파일들을 로드하여 Gemini 형식으로 변환."""
        image_parts = []
        
        for path in image_paths:
            try:
                file_path = Path(path)
                if not file_path.exists():
                    file_path = Path(settings.upload_dir) / path
                
                if not file_path.exists():
                    logger.warning(f"Image not found: {path}")
                    continue
                
                with open(file_path, "rb") as f:
                    image_data = f.read()
                
                mime_type = self._get_mime_type(file_path.suffix)
                
                image_parts.append({
                    "mime_type": mime_type,
                    "data": base64.standard_b64encode(image_data).decode("utf-8"),
                })
                
            except Exception as e:
                logger.error(f"Failed to load image {path}: {e}")
                continue
        
        return image_parts
    
    def _get_mime_type(self, suffix: str) -> str:
        """파일 확장자에서 MIME 타입 결정."""
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
        }
        return mime_map.get(suffix.lower(), "image/jpeg")


class PromptLoader:
    """프롬프트 버전 관리 로더."""
    
    def __init__(self, base_path: str = "app/prompts"):
        self.base_path = Path(base_path)
    
    def load(self, category: str, version: str = "current") -> str:
        """프롬프트 로드."""
        prompt_path = self.base_path / category / f"{version}.txt"
        
        if not prompt_path.exists():
            raise FileNotFoundError(f"Prompt not found: {prompt_path}")
        
        return prompt_path.read_text(encoding="utf-8")
    
    def list_versions(self, category: str) -> list[str]:
        """사용 가능한 프롬프트 버전 목록."""
        category_path = self.base_path / category
        if not category_path.exists():
            return []
        
        return [f.stem for f in category_path.glob("v*.txt")]


gemini_service = GeminiService()
prompt_loader = PromptLoader()
