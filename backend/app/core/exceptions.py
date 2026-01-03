"""커스텀 예외 클래스.

UX 라이팅 원칙:
- 해요체 사용
- 능동형 문장
- 원인 + 해결방법 안내
"""
from typing import Any, Optional


class YunigreenException(Exception):
    """유니그린 기본 예외."""
    
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        details: Optional[dict[str, Any]] = None,
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(message)


class NotFoundException(YunigreenException):
    """리소스를 찾을 수 없음."""
    
    # 리소스별 친근한 메시지
    RESOURCE_MESSAGES = {
        "project": "프로젝트를 찾을 수 없어요",
        "user": "사용자를 찾을 수 없어요",
        "estimate": "견적서를 찾을 수 없어요",
        "diagnosis": "진단 결과를 찾을 수 없어요",
        "site_visit": "현장 방문 기록을 찾을 수 없어요",
        "photo": "사진을 찾을 수 없어요",
        "pricebook": "단가표를 찾을 수 없어요",
        "catalog_item": "품목을 찾을 수 없어요",
    }
    
    def __init__(self, resource: str, resource_id: Any):
        message = self.RESOURCE_MESSAGES.get(
            resource.lower(), 
            f"{resource}을(를) 찾을 수 없어요"
        )
        super().__init__(
            message=message,
            code="NOT_FOUND",
            details={"resource": resource, "id": str(resource_id)},
        )


class ValidationException(YunigreenException):
    """유효성 검사 실패."""
    
    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details=details,
        )


class AuthenticationException(YunigreenException):
    """인증 실패."""
    
    def __init__(self, message: str = "로그인이 필요해요"):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
        )


class InvalidCredentialsException(AuthenticationException):
    """잘못된 인증 정보."""
    
    def __init__(self):
        super().__init__(
            message="이메일 또는 비밀번호가 틀렸어요. 다시 확인해 주세요."
        )


class TokenExpiredException(AuthenticationException):
    """토큰 만료."""
    
    def __init__(self):
        super().__init__(
            message="로그인이 만료됐어요. 다시 로그인해 주세요."
        )


class AuthorizationException(YunigreenException):
    """권한 부족."""
    
    def __init__(self, message: str = "이 기능은 관리자만 쓸 수 있어요"):
        super().__init__(
            message=message,
            code="FORBIDDEN",
        )


class PricebookException(YunigreenException):
    """단가표 관련 예외."""
    
    def __init__(self, message: str, code: str = "PRICEBOOK_ERROR"):
        super().__init__(message=message, code=code)


class NoPricebookActiveException(PricebookException):
    """활성 단가표 버전 없음."""
    
    def __init__(self):
        super().__init__(
            message="활성화된 단가표가 없어요. 관리자에게 문의해 주세요.",
            code="PRICEBOOK_INACTIVE",
        )


class EstimateException(YunigreenException):
    """견적서 관련 예외."""
    
    def __init__(self, message: str, code: str = "ESTIMATE_ERROR"):
        super().__init__(message=message, code=code)


class EstimateLockedException(EstimateException):
    """발행된 견적서 수정 시도."""
    
    def __init__(self):
        super().__init__(
            message="발행된 견적서는 수정할 수 없어요. 새 버전을 만들어 주세요.",
            code="ESTIMATE_LOCKED",
        )


class AIServiceException(YunigreenException):
    """AI 서비스 관련 예외."""
    
    def __init__(
        self, 
        message: str = "AI 서비스에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.", 
        details: Optional[dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="AI_SERVICE_ERROR",
            details=details,
        )


class AIAnalysisFailedException(AIServiceException):
    """AI 분석 실패."""
    
    def __init__(self):
        super().__init__(
            message="사진 분석에 실패했어요. 다른 사진으로 다시 시도해 주세요."
        )


class FileUploadException(YunigreenException):
    """파일 업로드 관련 예외."""
    
    def __init__(self, message: str = "파일을 올리는 데 실패했어요"):
        super().__init__(
            message=message,
            code="FILE_UPLOAD_ERROR",
        )


class FileTooLargeException(FileUploadException):
    """파일 크기 초과."""
    
    def __init__(self, max_size_mb: int = 10):
        super().__init__(
            message=f"파일 용량이 너무 커요. {max_size_mb}MB 이하로 올려주세요."
        )


class InvalidFileTypeException(FileUploadException):
    """잘못된 파일 형식."""
    
    def __init__(self, allowed_types: list[str]):
        types_str = ", ".join(allowed_types)
        super().__init__(
            message=f"{types_str} 형식만 올릴 수 있어요."
        )


class DuplicateException(YunigreenException):
    """중복 데이터."""
    
    def __init__(self, field: str, value: str):
        super().__init__(
            message=f"이미 사용 중인 {field}이에요. 다른 값을 입력해 주세요.",
            code="DUPLICATE_ERROR",
            details={"field": field, "value": value},
        )


class InactiveAccountException(YunigreenException):
    """비활성 계정."""
    
    def __init__(self):
        super().__init__(
            message="비활성화된 계정이에요. 관리자에게 문의해 주세요.",
            code="ACCOUNT_INACTIVE",
        )
