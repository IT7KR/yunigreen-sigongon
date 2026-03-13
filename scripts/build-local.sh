#!/bin/bash
# scripts/build-local.sh - 로컬에서 프론트엔드 프로덕션 이미지 빌드
# 사용법: ./scripts/build-local.sh [옵션]
#
# 옵션:
#   --api-url URL     NEXT_PUBLIC_API_URL 오버라이드
#   --no-cache        Docker 캐시 미사용

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_DIR/dist"

# 기본값
DOCKER_CACHE_OPT=""
API_URL=""

# 인자 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --no-cache)
            DOCKER_CACHE_OPT="--no-cache"
            shift
            ;;
        *)
            echo "알 수 없는 옵션: $1"
            echo "사용법: $0 [--api-url URL] [--no-cache]"
            exit 1
            ;;
    esac
done

# .env.deploy에서 설정 로드
if [ -f "$PROJECT_DIR/.env.deploy" ]; then
    source "$PROJECT_DIR/.env.deploy"
fi

# API_URL 결정 (인자 > .env.deploy > 기본값)
if [ -z "$API_URL" ]; then
    API_URL="${NEXT_PUBLIC_API_URL:-}"
fi

if [ -z "$API_URL" ]; then
    echo "Error: NEXT_PUBLIC_API_URL이 설정되지 않았습니다."
    echo ""
    echo "설정 방법 1: .env.deploy 파일에 NEXT_PUBLIC_API_URL=https://... 추가"
    echo "설정 방법 2: --api-url 옵션으로 전달"
    exit 1
fi

cd "$PROJECT_DIR"

echo "=========================================="
echo "  SigongCore - 로컬 이미지 빌드 (프론트엔드)"
echo "=========================================="
echo "  API URL: $API_URL"
if [ -n "$DOCKER_CACHE_OPT" ]; then
    echo "  캐시: 미사용"
fi
echo "=========================================="

# dist 디렉토리 생성
mkdir -p "$DIST_DIR"

FRONTEND_IMAGE="sigongcore-frontend:latest"

echo ""
echo "Step 1: Frontend 이미지 빌드 중..."
START_TIME=$(date +%s)

docker build \
    $DOCKER_CACHE_OPT \
    --target admin \
    -t "$FRONTEND_IMAGE" \
    --build-arg NEXT_PUBLIC_API_URL="$API_URL" \
    --build-arg NEXT_PUBLIC_USE_MOCKS=true \
    ./frontend

echo ""
echo "  Frontend 이미지를 tar.gz로 저장 중..."
docker save "$FRONTEND_IMAGE" | gzip > "$DIST_DIR/frontend.tar.gz"

END_TIME=$(date +%s)
echo "  Frontend 빌드 완료 ($(( END_TIME - START_TIME ))초)"

echo ""
echo "=========================================="
echo "  빌드 완료!"
echo "=========================================="
echo ""
echo "생성된 파일:"
ls -lh "$DIST_DIR/frontend.tar.gz"
echo ""
echo "다음 단계: ./scripts/deploy-remote.sh 실행"
echo ""
