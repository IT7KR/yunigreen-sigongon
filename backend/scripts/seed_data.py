"""시드 데이터 생성 스크립트.

테스트 및 개발용 초기 데이터를 생성합니다.
"""
import asyncio
import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

import sys
sys.path.insert(0, '/workspace/sigongcore-dev/backend')

from app.core.security import get_password_hash
from app.models.user import User, UserRole, Organization
from app.models.project import Project, ProjectStatus, SiteVisit, VisitType
from app.models.pricebook import (
    Pricebook, PricebookRevision, RevisionStatus,
    CatalogItem, CatalogItemPrice, ItemType,
)

DOCKER_DB_URL = "postgresql+asyncpg://postgres:password@localhost:5437/sigongcore"


async def create_seed_data():
    """시드 데이터 생성."""
    engine = create_async_engine(DOCKER_DB_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("=== 시드 데이터 생성 시작 ===\n")
        
        existing = await db.execute(text("SELECT COUNT(*) FROM organization"))
        count = existing.scalar() or 0
        if count > 0:
            print("⚠️  이미 시드 데이터가 존재합니다. 스킵합니다.")
            return
        
        org = Organization(
            id=uuid.uuid4(),
            name="유니그린 테스트",
            business_number="123-45-67890",
            address="서울시 강남구 테헤란로 123",
            phone="02-1234-5678",
            rep_name="관리자",
            rep_phone="010-1111-1111",
            rep_email="admin@sigongcore.test",
            created_at=datetime.utcnow(),
        )
        db.add(org)
        await db.flush()
        print(f"✓ 조직 생성: {org.name} (ID: {org.id})")
        
        users_data = [
            {
            "email": "admin@sigongcore.test",
                "username": "admin",
                "password": "admin123!",
                "name": "관리자",
                "role": UserRole.ADMIN,
                "phone": "010-1111-1111",
            },
            {
            "email": "manager@sigongcore.test",
                "username": "manager_kim",
                "password": "manager123!",
                "name": "김매니저",
                "role": UserRole.MANAGER,
                "phone": "010-2222-2222",
            },
            {
            "email": "tech1@sigongcore.test",
                "username": "tech_park",
                "password": "tech123!",
                "name": "박기술",
                "role": UserRole.TECHNICIAN,
                "phone": "010-3333-3333",
            },
            {
            "email": "tech2@sigongcore.test",
                "username": "tech_lee",
                "password": "tech123!",
                "name": "이기사",
                "role": UserRole.TECHNICIAN,
                "phone": "010-4444-4444",
            },
        ]
        
        users = []
        for user_data in users_data:
            user = User(
                id=uuid.uuid4(),
                email=user_data["email"],
                username=user_data["username"],
                password_hash=get_password_hash(user_data["password"]),
                name=user_data["name"],
                role=user_data["role"],
                phone=user_data["phone"],
                organization_id=org.id,
                is_active=True,
                created_at=datetime.utcnow(),
            )
            db.add(user)
            users.append(user)
            print(f"✓ 사용자 생성: {user.email} ({user.role.value})")
        
        await db.flush()
        
        pricebook = Pricebook(
            id=uuid.uuid4(),
            name="2026년 방수공사 단가표",
            description="유니그린 표준 단가표",
            source_type="internal",
            created_at=datetime.utcnow(),
        )
        db.add(pricebook)
        await db.flush()
        print(f"\n✓ 단가표 생성: {pricebook.name}")
        
        revision = PricebookRevision(
            id=uuid.uuid4(),
            pricebook_id=pricebook.id,
            version_label="v2026.01",
            effective_from=date(2026, 1, 1),
            status=RevisionStatus.ACTIVE,
            created_at=datetime.utcnow(),
            created_by=users[0].id,
        )
        db.add(revision)
        await db.flush()
        print(f"✓ 단가표 버전 생성: {revision.version_label}")
        
        catalog_items_data = [
            {"name": "우레탄 방수", "spec": "2mm 두께", "unit": "㎡", "type": ItemType.MATERIAL, "price": 25000, "code": "WP-001"},
            {"name": "시트 방수", "spec": "1.5mm TPO", "unit": "㎡", "type": ItemType.MATERIAL, "price": 35000, "code": "WP-002"},
            {"name": "아스팔트 방수", "spec": "3mm", "unit": "㎡", "type": ItemType.MATERIAL, "price": 20000, "code": "WP-003"},
            {"name": "실리콘 실란트", "spec": "300ml", "unit": "EA", "type": ItemType.MATERIAL, "price": 8000, "code": "MT-001"},
            {"name": "프라이머", "spec": "18L", "unit": "통", "type": ItemType.MATERIAL, "price": 45000, "code": "MT-002"},
            {"name": "보강 메쉬", "spec": "1m x 50m", "unit": "롤", "type": ItemType.MATERIAL, "price": 35000, "code": "MT-003"},
            {"name": "크랙 보수재", "spec": "20kg", "unit": "포", "type": ItemType.MATERIAL, "price": 28000, "code": "MT-004"},
            {"name": "방수공", "spec": "숙련공", "unit": "인", "type": ItemType.LABOR, "price": 180000, "code": "LB-001"},
            {"name": "보통인부", "spec": "일반", "unit": "인", "type": ItemType.LABOR, "price": 150000, "code": "LB-002"},
            {"name": "장비 사용료", "spec": "고압세척기", "unit": "일", "type": ItemType.EQUIPMENT, "price": 50000, "code": "EQ-001"},
        ]
        
        catalog_items = []
        for item_data in catalog_items_data:
            item = CatalogItem(
                id=uuid.uuid4(),
                item_code=item_data["code"],
                name_ko=item_data["name"],
                specification=item_data["spec"],
                base_unit=item_data["unit"],
                item_type=item_data["type"],
                material_family="방수" if item_data["type"] == ItemType.MATERIAL else None,
                created_at=datetime.utcnow(),
            )
            db.add(item)
            catalog_items.append((item, item_data["price"]))
        
        await db.flush()
        print(f"✓ 카탈로그 항목 {len(catalog_items)}개 생성")
        
        for item, price in catalog_items:
            item_price = CatalogItemPrice(
                id=uuid.uuid4(),
                pricebook_revision_id=revision.id,
                catalog_item_id=item.id,
                unit_price=Decimal(str(price)),
                created_at=datetime.utcnow(),
            )
            db.add(item_price)
        
        await db.flush()
        print(f"✓ 단가 정보 {len(catalog_items)}개 등록")
        
        technician = users[2]
        
        projects_data = [
            {
                "name": "강남아파트 옥상방수",
                "address": "서울시 강남구 역삼동 123-45",
                "client_name": "강남아파트 관리사무소",
                "client_phone": "02-555-1234",
                "status": ProjectStatus.DRAFT,
                "notes": "옥상 전체 방수 공사 필요. 기존 방수층 노후화.",
            },
            {
                "name": "서초빌딩 지하주차장",
                "address": "서울시 서초구 반포대로 456",
                "client_name": "서초빌딩",
                "client_phone": "02-555-5678",
                "status": ProjectStatus.DIAGNOSING,
                "notes": "지하주차장 천장 누수. 균열 다수 발견.",
            },
            {
                "name": "송파아파트 외벽",
                "address": "서울시 송파구 잠실동 789",
                "client_name": "송파아파트 입주자대표회의",
                "client_phone": "02-555-9012",
                "status": ProjectStatus.ESTIMATING,
                "notes": "외벽 크랙으로 인한 누수. 5층~10층 집중.",
            },
        ]
        
        projects = []
        for proj_data in projects_data:
            project = Project(
                id=uuid.uuid4(),
                organization_id=org.id,
                pricebook_revision_id=revision.id,
                name=proj_data["name"],
                address=proj_data["address"],
                client_name=proj_data["client_name"],
                client_phone=proj_data["client_phone"],
                status=proj_data["status"],
                notes=proj_data["notes"],
                created_at=datetime.utcnow(),
            )
            db.add(project)
            projects.append(project)
            print(f"\n✓ 프로젝트 생성: {project.name}")
        
        await db.flush()
        
        for i, project in enumerate(projects):
            visit = SiteVisit(
                id=uuid.uuid4(),
                project_id=project.id,
                technician_id=technician.id,
                visit_type=VisitType.INITIAL,
                visited_at=datetime.utcnow() - timedelta(days=len(projects) - i),
                notes=f"{project.name} 최초 현장 방문",
                created_at=datetime.utcnow(),
            )
            db.add(visit)
            print(f"  ✓ 현장방문 기록 추가")
        
        await db.commit()
        
        print("\n" + "=" * 50)
        print("=== 시드 데이터 생성 완료 ===")
        print("=" * 50)
        print("\n📋 로그인 정보:")
        print("-" * 50)
        for user_data in users_data:
            print(f"  {user_data['role'].value:12} | {user_data['username']:20} | {user_data['password']}")
        print("-" * 50)
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_seed_data())
