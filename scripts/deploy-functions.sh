#!/bin/bash

# ============================================
# Edge Functions 배포 스크립트
# ============================================
# 목적: 모든 Edge Functions를 로컬 환경에 배포
# 사용법: ./scripts/deploy-functions.sh [함수명]

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 모든 함수 목록
ALL_FUNCTIONS=(
    "lme-crawler"
    "lme-bulk-crawler"
    "lme-debug"
    "lme-test"
    "env-debug"
    "send-auction-notification"
    "check-notification-receipts"
)

# 인자가 있으면 특정 함수만 배포
if [ $# -gt 0 ]; then
    FUNCTIONS_TO_DEPLOY=("$@")
    log_info "🎯 지정된 함수들을 배포합니다: ${FUNCTIONS_TO_DEPLOY[*]}"
else
    FUNCTIONS_TO_DEPLOY=("${ALL_FUNCTIONS[@]}")
    log_info "📦 모든 Edge Functions를 배포합니다..."
fi

echo

# Supabase 상태 확인
if ! supabase status > /dev/null 2>&1; then
    log_warning "Supabase가 실행되지 않았습니다. 시작합니다..."
    supabase start
    echo
fi

# 함수 배포
DEPLOYED_COUNT=0
FAILED_COUNT=0
FAILED_FUNCTIONS=()

for func in "${FUNCTIONS_TO_DEPLOY[@]}"; do
    log_info "배포 중: $func"
    
    if supabase functions deploy "$func" --no-verify-jwt; then
        log_success "✅ $func 배포 완료"
        ((DEPLOYED_COUNT++))
    else
        log_warning "❌ $func 배포 실패"
        FAILED_FUNCTIONS+=("$func")
        ((FAILED_COUNT++))
    fi
    echo
done

# 결과 요약
echo "======================================"
log_info "📊 배포 결과 요약:"
log_success "✅ 성공: $DEPLOYED_COUNT개"
if [ $FAILED_COUNT -gt 0 ]; then
    log_warning "❌ 실패: $FAILED_COUNT개 (${FAILED_FUNCTIONS[*]})"
else
    log_success "❌ 실패: 0개"
fi

echo
log_info "🔗 배포된 함수들:"
for func in "${FUNCTIONS_TO_DEPLOY[@]}"; do
    if [[ ! " ${FAILED_FUNCTIONS[@]} " =~ " $func " ]]; then
        echo "  • http://localhost:54331/functions/v1/$func"
    fi
done

echo
log_info "🧪 테스트 명령어:"
echo "  curl http://localhost:54331/functions/v1/lme-crawler"
echo "  curl http://localhost:54331/functions/v1/env-debug"

if [ $FAILED_COUNT -eq 0 ]; then
    log_success "🎉 모든 함수 배포 완료!"
else
    log_warning "⚠️ 일부 함수 배포 실패. 함수 디렉토리를 확인해주세요."
fi
