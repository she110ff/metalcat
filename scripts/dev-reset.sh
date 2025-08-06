#!/bin/bash

# ============================================
# 로컬 개발 환경 전체 리셋 스크립트
# ============================================
# 목적: 데이터베이스 리셋 + Edge Function 배포를 한 번에 처리
# 사용법: ./scripts/dev-reset.sh

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 스크립트 시작
log_info "🚀 로컬 개발 환경 전체 리셋을 시작합니다..."
echo

# 1. Supabase 상태 확인
log_info "1️⃣ Supabase 로컬 환경 상태 확인..."
if ! supabase status > /dev/null 2>&1; then
    log_warning "Supabase가 실행되지 않았습니다. 시작합니다..."
    supabase start
else
    log_success "Supabase가 이미 실행 중입니다."
fi
echo

# 2. 데이터베이스 리셋
log_info "2️⃣ 데이터베이스 리셋 중..."
log_warning "⚠️ 모든 데이터가 삭제됩니다!"
read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    supabase db reset
    log_success "데이터베이스 리셋 완료"
else
    log_error "사용자가 데이터베이스 리셋을 취소했습니다."
    exit 1
fi
echo

# 3. Edge Functions 배포
log_info "3️⃣ Edge Functions 배포 중..."

# 개별 함수 배포
FUNCTIONS=(
    "lme-crawler"
    "lme-bulk-crawler"
    "env-debug"
    "lme-debug"
    "lme-test"
    "send-auction-notification"
    "check-notification-receipts"
)

FAILED_FUNCTIONS=()

for func in "${FUNCTIONS[@]}"; do
    log_info "  📦 $func 배포 중..."
    if supabase functions deploy "$func" --no-verify-jwt > /dev/null 2>&1; then
        log_success "  ✅ $func 배포 완료"
    else
        log_warning "  ⚠️ $func 배포 실패 (함수가 존재하지 않을 수 있습니다)"
        FAILED_FUNCTIONS+=("$func")
    fi
done

if [ ${#FAILED_FUNCTIONS[@]} -gt 0 ]; then
    echo
    log_warning "배포 실패한 함수들: ${FAILED_FUNCTIONS[*]}"
    log_info "존재하지 않는 함수일 수 있습니다. 무시하고 계속 진행합니다."
fi
echo

# 4. 환경 변수 확인
log_info "4️⃣ 환경 변수 확인..."
if [ -f ".env.local" ]; then
    log_success "✅ .env.local 파일이 존재합니다"
    
    # 필수 환경 변수 확인
    REQUIRED_VARS=("EXPO_PUBLIC_SUPABASE_URL" "EXPO_PUBLIC_SUPABASE_ANON_KEY" "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env.local; then
            log_success "  ✅ $var 설정됨"
        else
            log_warning "  ⚠️ $var가 설정되지 않았습니다"
        fi
    done
else
    log_warning "⚠️ .env.local 파일이 없습니다"
    log_info "템플릿에서 복사하겠습니다..."
    if [ -f "env.local.recommended" ]; then
        cp env.local.recommended .env.local
        log_success "✅ env.local.recommended에서 .env.local로 복사 완료"
    else
        log_error "❌ env.local.recommended 파일이 없습니다"
    fi
fi
echo

# 5. 시스템 상태 확인
log_info "5️⃣ 시스템 상태 최종 확인..."
supabase status
echo

# 6. 크론 작업 상태 확인 (선택사항)
log_info "6️⃣ 크론 작업 확인 (선택사항)..."
read -p "크론 작업 상태를 확인하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "  🔍 크론 작업 조회 중..."
    echo "SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;" | supabase db shell || {
        log_warning "  ⚠️ 크론 작업 조회 실패 (pg_cron이 설치되지 않았을 수 있습니다)"
    }
fi
echo

# 완료 메시지
log_success "🎉 로컬 개발 환경 리셋 완료!"
echo
log_info "📋 다음 단계:"
log_info "  1. 브라우저에서 http://localhost:54333 (Supabase Studio) 확인"
log_info "  2. Edge Functions 테스트: ./scripts/test-lme-system.sh"
log_info "  3. 앱 실행: npm start 또는 yarn start"
echo
log_info "🔗 유용한 링크:"
log_info "  • Supabase Studio: http://localhost:54333"
log_info "  • API 문서: http://localhost:54333/project/default/api"
log_info "  • Edge Functions: http://localhost:54331/functions/v1/"
echo

# 선택적으로 LME 크롤러 테스트 실행
read -p "LME 크롤러를 테스트하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "🧪 LME 크롤러 테스트 실행 중..."
    if [ -f "scripts/test-lme-system.sh" ]; then
        ./scripts/test-lme-system.sh
    else
        log_warning "scripts/test-lme-system.sh 파일이 없습니다"
        log_info "수동으로 테스트하려면: curl http://localhost:54331/functions/v1/lme-crawler"
    fi
fi

log_success "✨ 모든 작업이 완료되었습니다!"
