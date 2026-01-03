"""API 응답 스키마 정의."""
from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel

T = TypeVar("T")


class PaginationMeta(BaseModel):
    """페이지네이션 메타 정보."""
    page: int
    per_page: int
    total: int
    total_pages: int


class ErrorDetail(BaseModel):
    """에러 상세 정보."""
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    """에러 응답."""
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None


class APIResponse(BaseModel, Generic[T]):
    """표준 API 응답 래퍼.
    
    모든 API 응답은 이 형식을 따릅니다.
    """
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorResponse] = None
    
    @classmethod
    def ok(cls, data: T) -> "APIResponse[T]":
        """성공 응답 생성."""
        return cls(success=True, data=data, error=None)
    
    @classmethod
    def fail(
        cls, 
        code: str, 
        message: str, 
        details: Optional[List[ErrorDetail]] = None
    ) -> "APIResponse[None]":
        """실패 응답 생성."""
        return cls(
            success=False, 
            data=None, 
            error=ErrorResponse(code=code, message=message, details=details)
        )


class PaginatedResponse(BaseModel, Generic[T]):
    """페이지네이션된 응답."""
    success: bool = True
    data: List[T]
    error: Optional[ErrorResponse] = None
    meta: PaginationMeta
    
    @classmethod
    def create(
        cls,
        items: List[T],
        page: int,
        per_page: int,
        total: int,
    ) -> "PaginatedResponse[T]":
        """페이지네이션 응답 생성."""
        total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
        return cls(
            success=True,
            data=items,
            meta=PaginationMeta(
                page=page,
                per_page=per_page,
                total=total,
                total_pages=total_pages,
            ),
        )
