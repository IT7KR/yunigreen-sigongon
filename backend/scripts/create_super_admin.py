"""슈퍼 관리자(Super Admin) 계정 생성 스크립트.

Super Admin 계정을 생성하는 유틸리티 스크립트입니다.
시스템 레벨의 관리 권한을 가지며, organization_id는 NULL입니다.
"""
import asyncio
import argparse
import os
import sys
from datetime import datetime

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

sys.path.insert(0, '/workspace/it7/sigongcore/backend')

from app.core.security import get_password_hash
from app.models.user import User, UserRole

# DB URL 설정
DEFAULT_DB_URL = "postgresql+asyncpg://postgres:password@localhost:5437/sigongcore"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

# 기본값
DEFAULT_USERNAME = "superadmin"
DEFAULT_PASSWORD = "admin123!"
DEFAULT_NAME = "유니그린 관리자"
DEFAULT_EMAIL = "admin@yunigreen.com"


async def check_user_exists(db: AsyncSession, username: str) -> bool:
    """사용자 이름 중복 확인."""
    result = await db.execute(
        text("SELECT COUNT(*) FROM \"user\" WHERE username = :username"),
        {"username": username}
    )
    count = result.scalar() or 0
    return count > 0


async def create_super_admin(
    username: str,
    password: str,
    name: str,
    email: str,
    phone: str | None = None,
) -> User:
    """슈퍼 관리자 계정 생성."""
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # 중복 확인
        if await check_user_exists(db, username):
            print(f"\n❌ 오류: 이미 존재하는 사용자명입니다: {username}")
            await engine.dispose()
            sys.exit(1)

        # 슈퍼 관리자 생성 (organization_id는 NULL)
        user = User(
            username=username,
            email=email,
            name=name,
            phone=phone,
            password_hash=get_password_hash(password),
            role=UserRole.SUPER_ADMIN,
            organization_id=None,  # System-level role: NULL required
            is_active=True,
            created_at=datetime.utcnow(),
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

        await engine.dispose()
        return user


def mask_password(password: str) -> str:
    """비밀번호를 마스킹하여 반환."""
    if len(password) <= 4:
        return "*" * len(password)
    return password[:2] + "*" * (len(password) - 4) + password[-2:]


async def main():
    """메인 함수."""
    parser = argparse.ArgumentParser(
        description="슈퍼 관리자(Super Admin) 계정 생성 스크립트"
    )
    parser.add_argument(
        "--username",
        type=str,
        default=None,
        help=f"사용자명 (기본값: {DEFAULT_USERNAME})"
    )
    parser.add_argument(
        "--password",
        type=str,
        default=None,
        help=f"비밀번호 (기본값: {DEFAULT_PASSWORD})"
    )
    parser.add_argument(
        "--name",
        type=str,
        default=None,
        help=f"이름 (기본값: {DEFAULT_NAME})"
    )
    parser.add_argument(
        "--email",
        type=str,
        default=None,
        help=f"이메일 (기본값: {DEFAULT_EMAIL})"
    )
    parser.add_argument(
        "--phone",
        type=str,
        default=None,
        help="전화번호 (선택사항)"
    )

    args = parser.parse_args()

    # 인자 처리
    username = args.username or DEFAULT_USERNAME
    password = args.password or DEFAULT_PASSWORD
    name = args.name or DEFAULT_NAME
    email = args.email or DEFAULT_EMAIL
    phone = args.phone

    try:
        print("\n⏳ 슈퍼 관리자 계정을 생성 중입니다...\n")

        user = await create_super_admin(
            username=username,
            password=password,
            name=name,
            email=email,
            phone=phone,
        )

        print("=" * 60)
        print("✅ 슈퍼 관리자 계정 생성 완료!")
        print("=" * 60)
        print()
        print("📋 계정 정보:")
        print("-" * 60)
        print(f"  사용자 ID    : {user.id}")
        print(f"  사용자명     : {user.username}")
        print(f"  이름         : {user.name}")
        print(f"  이메일       : {user.email}")
        if user.phone:
            print(f"  전화번호     : {user.phone}")
        print(f"  역할         : {user.role.value} (Super Admin)")
        print(f"  조직 ID      : None (시스템 레벨)")
        print(f"  활성 상태    : {'활성' if user.is_active else '비활성'}")
        print(f"  생성 일시    : {user.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 60)
        print()
        print("🔐 로그인 정보 (테스트용):")
        print("-" * 60)
        print(f"  사용자명: {user.username}")
        print(f"  비밀번호: {mask_password(password)}")
        print("-" * 60)
        print()

    except Exception as e:
        print(f"\n❌ 오류가 발생했습니다: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
