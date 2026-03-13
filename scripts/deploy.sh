#!/bin/bash
# scripts/deploy.sh - 빌드 + 배포 통합 래퍼 (프론트엔드)
# 사용법: ./scripts/deploy.sh [옵션]
#
# 옵션:
#   --yes, -y         확인 없이 바로 배포
#   --api-url URL     NEXT_PUBLIC_API_URL 오버라이드
#   --no-cache        Docker 캐시 미사용
#   --build-only      빌드만 (배포하지 않음)
#   --deploy-only     배포만 (빌드하지 않음)
#   --help, -h        도움말

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 인자 분류
BUILD_ARGS=()
DEPLOY_ARGS=()
BUILD_ONLY=false
DEPLOY_ONLY=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --yes|-y)
            DEPLOY_ARGS+=("--yes")
            shift
            ;;
        --api-url)
            BUILD_ARGS+=("--api-url" "$2")
            shift 2
            ;;
        --no-cache)
            BUILD_ARGS+=("--no-cache")
            shift
            ;;
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --deploy-only)
            DEPLOY_ONLY=true
            shift
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo "알 수 없는 옵션: $1"
            SHOW_HELP=true
            shift
            ;;
    esac
done

if [ "$SHOW_HELP" = true ]; then
    echo "SigongCore 프론트엔드 배포 스크립트"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  --yes, -y         확인 없이 바로 배포"
    echo "  --api-url URL     NEXT_PUBLIC_API_URL 오버라이드"
    echo "  --no-cache        Docker 캐시 미사용"
    echo "  --build-only      빌드만 (dist/ 생성)"
    echo "  --deploy-only     dist/의 이미지로 배포만"
    echo "  --help, -h        도움말"
    echo ""
    echo "예시:"
    echo "  $0                    빌드 + 배포"
    echo "  $0 -y                 확인 없이 배포"
    echo "  $0 --build-only       빌드만 (dist/ 생성)"
    echo "  $0 --deploy-only      dist/의 이미지로 배포만"
    echo "  $0 --no-cache -y      캐시 없이 빌드 + 즉시 배포"
    exit 0
fi

echo "=========================================="
echo "  SigongCore - 배포 파이프라인"
echo "=========================================="

cd "$PROJECT_DIR"
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "  브랜치: $BRANCH"
echo "  커밋:   $COMMIT"
echo "=========================================="

# 빌드 단계
if [ "$DEPLOY_ONLY" = false ]; then
    echo ""
    echo "[Phase 1] 빌드"
    echo "----------------------------------------"
    "$SCRIPT_DIR/build-local.sh" "${BUILD_ARGS[@]}"
else
    echo ""
    echo "[Phase 1] 빌드 (스킵 - --deploy-only)"
fi

# 배포 단계
if [ "$BUILD_ONLY" = false ]; then
    echo ""
    echo "[Phase 2] 배포"
    echo "----------------------------------------"
    "$SCRIPT_DIR/deploy-remote.sh" "${DEPLOY_ARGS[@]}"
else
    echo ""
    echo "[Phase 2] 배포 (스킵 - --build-only)"
    echo ""
    echo "빌드된 이미지: dist/frontend.tar.gz"
    echo "배포하려면: ./scripts/deploy-remote.sh"
fi

echo ""
echo "=========================================="
echo "  파이프라인 완료!"
echo "=========================================="
echo ""
