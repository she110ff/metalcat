#!/bin/bash

# ============================================
# Edge Functions 빠른 테스트 스크립트
# ============================================
# 목적: 배포된 함수들이 정상 작동하는지 빠르게 확인
# 사용법: ./scripts/test-functions.sh

set -e

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

BASE_URL="http://localhost:54331/functions/v1"

log_info "🧪 Edge Functions 빠른 테스트 시작..."
echo

# 테스트할 함수들
FUNCTIONS_TO_TEST=(
    "env-debug"
    "lme-debug"
    "lme-test"
)

SUCCESS_COUNT=0
TOTAL_COUNT=${#FUNCTIONS_TO_TEST[@]}

for func in "${FUNCTIONS_TO_TEST[@]}"; do
    log_info "테스트 중: $func"
    
    # JWT 인증 없이 테스트 (Edge Functions는 배포 시 --no-verify-jwt 옵션 필요)
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
        "$BASE_URL/$func" 2>/dev/null || echo "HTTPSTATUS:000")
    HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$HTTP_STATUS" = "200" ]; then
        log_success "✅ $func - HTTP $HTTP_STATUS"
        if [ ${#BODY} -gt 100 ]; then
            echo "   응답: ${BODY:0:100}..."
        else
            echo "   응답: $BODY"
        fi
        ((SUCCESS_COUNT++))
    else
        log_error "❌ $func - HTTP $HTTP_STATUS"
        if [ ${#BODY} -gt 0 ]; then
            echo "   오류: $BODY"
        fi
    fi
    echo
done

echo "======================================"
log_info "📊 테스트 결과:"
log_success "✅ 성공: $SUCCESS_COUNT/$TOTAL_COUNT"

if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
    log_success "🎉 모든 함수가 정상 작동합니다!"
    echo
    log_info "🚀 이제 실제 크롤러도 테스트해보세요:"
    echo "curl $BASE_URL/lme-crawler"
else
    log_error "⚠️ 일부 함수에 문제가 있습니다."
    echo
    log_info "🔧 문제 해결:"
    echo "1. 함수가 배포되었는지 확인: ./scripts/deploy-functions.sh"
    echo "2. Supabase 로그 확인: supabase functions logs --follow"
fi
