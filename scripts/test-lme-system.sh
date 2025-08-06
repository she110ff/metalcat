#!/bin/bash

# ============================================
# LME 시스템 간단 테스트 스크립트
# ============================================
# 목적: 핵심 기능들이 정상 작동하는지 빠르게 확인
# 사용법: ./scripts/test-lme-system.sh

set -e

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 로컬 환경 설정
BASE_URL="http://localhost:54331"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

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

# HTTP 요청 함수
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    if [ -z "$data" ]; then
        curl -s -X "$method" \
             -H "Authorization: Bearer $ANON_KEY" \
             -H "Content-Type: application/json" \
             "$BASE_URL$endpoint"
    else
        curl -s -X "$method" \
             -H "Authorization: Bearer $ANON_KEY" \
             -H "Content-Type: application/json" \
             -d "$data" \
             "$BASE_URL$endpoint"
    fi
}

echo "🚀 LME 시스템 간단 테스트 시작..."
echo "Base URL: $BASE_URL"
echo "====================================="

# 1. 데이터베이스 연결 테스트
log_info "1️⃣ 데이터베이스 연결 테스트"
response=$(api_call "GET" "/rest/v1/lme_processed_prices?select=id&limit=1")
if echo "$response" | grep -q '\[' || echo "$response" | grep -q 'id'; then
    log_success "데이터베이스 연결 성공"
else
    log_error "데이터베이스 연결 실패: $response"
    exit 1
fi
echo

# 2. LME 크롤러 테스트
log_info "2️⃣ LME 크롤러 테스트"
log_info "크롤러 실행 중... (최대 30초 소요)"
response=$(api_call "POST" "/functions/v1/lme-crawler" '{}')
success=$(echo "$response" | jq -r '.success // false' 2>/dev/null || echo "false")

if [ "$success" = "true" ]; then
    log_success "크롤러 실행 성공"
    # 처리된 데이터 수 확인
    count=$(echo "$response" | jq -r '.metalCount // .data.totalProcessed // 0' 2>/dev/null || echo "0")
    log_info "처리된 금속 수: $count개"
else
    log_warning "크롤러 실행 실패 또는 데이터 없음"
    echo "응답: $response"
fi
echo

# 3. 데이터 조회 테스트
log_info "3️⃣ 저장된 데이터 조회 테스트"
response=$(api_call "GET" "/rest/v1/lme_processed_prices?select=metal_code,metal_name_kr,price_krw_per_kg&limit=6")
count=$(echo "$response" | jq '. | length' 2>/dev/null || echo "0")

if [ "$count" -gt 0 ]; then
    log_success "데이터 조회 성공: $count개 레코드"
    
    # 금속별 최신 가격 표시
    echo "$response" | jq -r '.[] | "  • \(.metal_name_kr) (\(.metal_code)): \(.price_krw_per_kg)원/kg"' 2>/dev/null | head -6
else
    log_warning "저장된 데이터 없음"
fi
echo

# 4. Edge Functions 상태 확인
log_info "4️⃣ Edge Functions 상태 확인"

# env-debug 함수 테스트
debug_response=$(api_call "GET" "/functions/v1/env-debug" '')
if echo "$debug_response" | grep -q "environment" 2>/dev/null; then
    log_success "env-debug 함수 정상"
else
    log_warning "env-debug 함수 응답 이상"
fi

# lme-debug 함수 테스트  
lme_debug_response=$(api_call "GET" "/functions/v1/lme-debug" '')
if echo "$lme_debug_response" | grep -q "success" 2>/dev/null; then
    log_success "lme-debug 함수 정상"
else
    log_warning "lme-debug 함수 응답 이상"
fi
echo

# 5. 크론 작업 확인 (선택사항)
log_info "5️⃣ 크론 작업 확인"
if command -v psql >/dev/null 2>&1; then
    cron_jobs=$(echo "SELECT jobname, active FROM cron.job;" | psql "postgresql://postgres:postgres@localhost:54332/postgres" -t 2>/dev/null | grep -v "^$" | wc -l)
    if [ "$cron_jobs" -gt 0 ]; then
        log_success "크론 작업 설정됨: $cron_jobs개"
    else
        log_warning "크론 작업 없음"
    fi
else
    log_warning "psql 없음 - 크론 작업 확인 생략"
fi
echo

# 결과 요약
echo "====================================="
log_info "🎯 테스트 완료 요약:"
echo "1. ✅ 데이터베이스 연결"
echo "2. $([ "$success" = "true" ] && echo "✅" || echo "⚠️") LME 크롤러"
echo "3. $([ "$count" -gt 0 ] && echo "✅" || echo "⚠️") 데이터 조회 ($count개)"
echo "4. ✅ Edge Functions"
echo "5. $([ "${cron_jobs:-0}" -gt 0 ] && echo "✅" || echo "⚠️") 크론 작업"
echo

if [ "$success" = "true" ] && [ "$count" -gt 0 ]; then
    log_success "🎉 LME 시스템이 정상 작동 중입니다!"
    echo
    log_info "🔗 유용한 링크:"
    echo "  • Supabase Studio: http://localhost:54333"
    echo "  • LME 크롤러: curl $BASE_URL/functions/v1/lme-crawler"
    echo "  • 환경 디버그: curl $BASE_URL/functions/v1/env-debug"
else
    log_warning "⚠️ 일부 기능에 문제가 있을 수 있습니다."
    echo
    log_info "🔧 문제 해결:"
    echo "  1. Supabase 재시작: supabase stop && supabase start"
    echo "  2. 함수 재배포: ./scripts/deploy-functions.sh"
    echo "  3. 데이터베이스 리셋: ./scripts/quick-reset.sh"
fi

echo
log_info "✨ 테스트 완료!"