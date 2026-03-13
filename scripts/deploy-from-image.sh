#!/bin/bash
# scripts/deploy-from-image.sh - 서버에서 이미지 로드 및 실행
#
# 이 스크립트는 서버에서 실행됩니다.
# 로컬에서 전송된 tar.gz 이미지 파일을 로드하고 컨테이너를 교체합니다.
#
# 서버 디렉토리 구조:
#   /home/ubuntu/sigongcore/      ← REMOTE_DIR (docker-compose.yml 위치)
#   ├── docker-compose.yml
#   ├── frontend/.env
#   ├── dist/                     ← frontend.tar.gz
#   └── scripts/                  ← 이 스크립트

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"        # /var/www/sigongcore
COMPOSE_DIR="$(dirname "$PROJECT_DIR")"       # /var/www  (docker-compose.yml 위치)
DIST_DIR="$PROJECT_DIR/dist"

cd "$COMPOSE_DIR"

echo "=========================================="
echo "  SigongCore - 이미지 로드 및 실행"
echo "=========================================="
echo "  프로젝트: $PROJECT_DIR"
echo "  Compose:  $COMPOSE_DIR/docker-compose.yml"
echo "=========================================="

# 이미지 파일 확인
if [ ! -f "$DIST_DIR/frontend.tar.gz" ]; then
    echo "Error: $DIST_DIR/frontend.tar.gz 파일이 없습니다."
    exit 1
fi

# Step 1: Docker 이미지 로드
echo ""
echo "Step 1: Docker 이미지 로드 중..."
docker load < "$DIST_DIR/frontend.tar.gz"
echo "  ✅ 이미지 로드 완료"

# Step 2: 컨테이너 교체
echo ""
echo "Step 2: 컨테이너 교체 중 (다운타임 최소화)..."

# frontend/.env가 없으면 빈 파일 생성 (docker compose env_file 오류 방지)
if [ ! -f "$PROJECT_DIR/frontend/.env" ]; then
    echo "  ⚠️  $PROJECT_DIR/frontend/.env 파일이 없습니다. 빈 파일을 생성합니다."
    mkdir -p "$PROJECT_DIR/frontend"
    touch "$PROJECT_DIR/frontend/.env"
fi

docker compose up -d --no-deps --force-recreate --pull never sigongcore-frontend
echo "  ✅ 컨테이너 교체 완료"

# Step 3: 시작 확인 (컨테이너 상태)
echo ""
echo "Step 3: 컨테이너 상태 확인..."
sleep 3

if docker ps --format '{{.Names}}' | grep -q "sigongcore-frontend"; then
    echo "  ✅ sigongcore-frontend 실행 중"
    docker ps --filter "name=sigongcore-frontend" --format "  상태: {{.Status}}  포트: {{.Ports}}"
else
    echo "  ❌ 컨테이너 시작 실패"
    echo "  실행 중인 컨테이너 목록:"
    docker ps --format "  {{.Names}} ({{.Status}})"
    echo "  로그 확인: docker logs sigongcore-frontend"
    exit 1
fi

# Step 4: tar.gz 정리
echo ""
echo "Step 4: 이미지 파일 정리..."
rm -f "$DIST_DIR/frontend.tar.gz"
echo "  dist/frontend.tar.gz 삭제 완료"

echo ""
echo "=========================================="
echo "  배포 완료!"
echo "=========================================="
echo ""
