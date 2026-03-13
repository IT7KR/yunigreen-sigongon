#!/bin/bash
# scripts/deploy-remote.sh - 로컬에서 서버로 이미지 배포
# 사용법: ./scripts/deploy-remote.sh [옵션]
#
# 옵션:
#   --yes, -y    확인 없이 바로 배포
#
# 설정 필요 (.env.deploy):
#   SERVER: SSH 접속 정보 (예: user@192.168.1.100)
#   REMOTE_DIR: 서버의 sigongcore 프로젝트 경로
#
# 서버 디렉토리 구조:
#   /home/ubuntu/sigongcore/      ← REMOTE_DIR
#   ├── docker-compose.yml
#   ├── frontend/.env
#   ├── dist/
#   └── scripts/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_DIR/dist"

# 인자 파싱
AUTO_YES=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --yes|-y)
            AUTO_YES=true
            shift
            ;;
        *)
            echo "알 수 없는 옵션: $1"
            echo "사용법: $0 [--yes|-y]"
            exit 1
            ;;
    esac
done

# SSH ControlMaster 설정 (패스워드 한 번만 입력)
SSH_CONTROL_PATH="/tmp/ssh-sigongcore-deploy-$$"

# 스크립트 종료 시 SSH 연결 정리
cleanup() {
    ssh -O exit -o ControlPath="$SSH_CONTROL_PATH" "$SERVER" 2>/dev/null || true
}
trap cleanup EXIT

# 설정 로드
SERVER="${DEPLOY_SERVER:-}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-}"
SSH_PORT=""

# .env.deploy 파일에서 설정 로드
if [ -f "$PROJECT_DIR/.env.deploy" ]; then
    source "$PROJECT_DIR/.env.deploy"
fi

# SSH 포트 설정
SSH_PORT_OPT=""
SCP_PORT_OPT=""
if [ -n "$SSH_PORT" ] && [ "$SSH_PORT" != "22" ]; then
    SSH_PORT_OPT="-p $SSH_PORT"
    SCP_PORT_OPT="-P $SSH_PORT"
fi
SSH_OPTS="$SSH_PORT_OPT -o ControlMaster=auto -o ControlPath=$SSH_CONTROL_PATH -o ControlPersist=60"
SCP_OPTS="$SCP_PORT_OPT -o ControlMaster=auto -o ControlPath=$SSH_CONTROL_PATH -o ControlPersist=60"

# 설정 확인
if [ -z "$SERVER" ]; then
    echo "Error: SERVER가 설정되지 않았습니다."
    echo ""
    echo "설정 방법 1: .env.deploy 파일 생성"
    echo "  cp .env.deploy.example .env.deploy"
    echo "  # SERVER, REMOTE_DIR 값 입력"
    echo ""
    echo "설정 방법 2: 환경변수로 실행"
    echo "  DEPLOY_SERVER=user@ip DEPLOY_REMOTE_DIR=/path ./scripts/deploy-remote.sh"
    exit 1
fi

if [ -z "$REMOTE_DIR" ]; then
    echo "Error: REMOTE_DIR가 설정되지 않았습니다."
    exit 1
fi

# dist/frontend.tar.gz 확인
if [ ! -f "$DIST_DIR/frontend.tar.gz" ]; then
    echo "Error: dist/frontend.tar.gz 파일이 없습니다."
    echo "먼저 ./scripts/build-local.sh를 실행하세요."
    exit 1
fi

FRONTEND_SIZE=$(du -h "$DIST_DIR/frontend.tar.gz" | cut -f1)

echo "=========================================="
echo "  SigongCore - 서버 배포 (프론트엔드)"
echo "=========================================="
echo "  서버: $SERVER (포트: ${SSH_PORT:-22})"
echo "  경로: $REMOTE_DIR"
echo ""
echo "  전송할 파일:"
echo "    - frontend.tar.gz ($FRONTEND_SIZE)"
echo "=========================================="

# 확인 프롬프트
if [ "$AUTO_YES" = false ]; then
    echo ""
    read -p "배포를 진행하시겠습니까? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "배포가 취소되었습니다."
        exit 0
    fi
fi

echo ""
echo "Step 1: 서버 연결 중... (패스워드 한 번만 입력)"
ssh $SSH_OPTS "$SERVER" "mkdir -p $REMOTE_DIR/dist $REMOTE_DIR/scripts"

echo ""
echo "Step 2: 이미지 파일 전송 중..."
echo "  (파일 크기에 따라 시간이 걸릴 수 있습니다)"

if command -v rsync &> /dev/null; then
    rsync -avz --progress -e "ssh $SSH_OPTS" "$DIST_DIR/frontend.tar.gz" "$SERVER:$REMOTE_DIR/dist/"
else
    scp $SCP_OPTS "$DIST_DIR/frontend.tar.gz" "$SERVER:$REMOTE_DIR/dist/"
fi

echo ""
echo "Step 3: 배포 스크립트 전송 중..."
scp $SCP_OPTS "$SCRIPT_DIR/deploy-from-image.sh" "$SERVER:$REMOTE_DIR/scripts/"
ssh $SSH_OPTS "$SERVER" "chmod +x $REMOTE_DIR/scripts/deploy-from-image.sh"

echo ""
echo "Step 4: 서버에서 배포 스크립트 실행 중..."
ssh $SSH_OPTS "$SERVER" "cd $REMOTE_DIR && ./scripts/deploy-from-image.sh"

echo ""
echo "Step 5: 로컬 이미지 파일 정리..."
rm -f "$DIST_DIR/frontend.tar.gz"
echo "  dist/frontend.tar.gz 삭제 완료"

echo ""
echo "=========================================="
echo "  배포 완료!"
echo "=========================================="
echo ""
