"""비동기 데이터베이스 연결 관리."""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel

from app.core.config import settings


# 비동기 엔진 생성
engine = create_async_engine(
    settings.async_database_url,
    echo=settings.debug,
    future=True,
    poolclass=NullPool,  # 비동기 환경에서는 NullPool 권장
)

# 비동기 세션 팩토리
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """비동기 DB 세션 의존성.
    
    사용 예:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_async_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """데이터베이스 테이블 초기화.
    
    주의: 운영 환경에서는 Alembic 마이그레이션 사용 권장.
    """
    async with engine.begin() as conn:
        # 모든 테이블 생성 (개발용)
        await conn.run_sync(SQLModel.metadata.create_all)


async def close_db() -> None:
    """데이터베이스 연결 종료."""
    await engine.dispose()
