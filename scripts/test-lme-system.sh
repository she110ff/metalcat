#!/bin/bash

# LME 가격 크롤링 시스템 통합 테스트 스크립트
# 사용법: ./scripts/test-lme-system.sh [환경]
# 환경: local, staging, production

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 기본 설정
ENVIRONMENT=${1:-local}
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
TEST_RESULTS_FILE="test_results_$(date +%Y%m%d_%H%M%S).json"

echo -e "${BLUE}🏗️ LME 가격 크롤링 시스템 통합 테스트${NC}"
echo "환경: $ENVIRONMENT"
echo "결과 파일: $TEST_RESULTS_FILE"
echo "=================================="

# 환경별 설정
case $ENVIRONMENT in
  "local")
    SUPABASE_URL="http://localhost:54321"
    SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # 로컬 개발용 키
    ;;
  "staging")
    SUPABASE_URL=$STAGING_SUPABASE_URL
    SUPABASE_ANON_KEY=$STAGING_SUPABASE_ANON_KEY
    ;;
  "production")
    SUPABASE_URL=$PRODUCTION_SUPABASE_URL
    SUPABASE_ANON_KEY=$PRODUCTION_SUPABASE_ANON_KEY
    ;;
  *)
    echo -e "${RED}❌ 지원하지 않는 환경: $ENVIRONMENT${NC}"
    echo "사용 가능한 환경: local, staging, production"
    exit 1
    ;;
esac

# 필수 환경 변수 확인
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ 필수 환경 변수가 설정되지 않았습니다${NC}"
    echo "SUPABASE_URL: $SUPABASE_URL"
    echo "SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..."
    exit 1
fi

# 테스트 결과 저장 변수
TEST_RESULTS='{"environment":"'$ENVIRONMENT'","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","tests":[]}'

# 테스트 결과 추가 함수
add_test_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    local details="$4"
    
    local result='{"name":"'$test_name'","status":"'$status'","message":"'$message'","details":'${details:-'null'}',"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
    TEST_RESULTS=$(echo $TEST_RESULTS | jq '.tests += ['$result']')
}

# HTTP 요청 함수
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    if [ -z "$data" ]; then
        curl -s -X $method \
             -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
             -H "Content-Type: application/json" \
             "$SUPABASE_URL$endpoint"
    else
        curl -s -X $method \
             -H "Authorization: Bearer $SUPABASE_URL" \
             -H "Content-Type: application/json" \
             -d "$data" \
             "$SUPABASE_URL$endpoint"
    fi
}

# 테스트 함수들
test_database_connectivity() {
    echo -e "${BLUE}📊 데이터베이스 연결 테스트${NC}"
    
    local response=$(make_request "GET" "/rest/v1/system_settings?select=key&limit=1")
    local status_code=$?
    
    if [ $status_code -eq 0 ] && echo "$response" | jq -e '.[]' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 데이터베이스 연결 성공${NC}"
        add_test_result "database_connectivity" "passed" "데이터베이스 연결이 정상적으로 작동합니다" "$response"
    else
        echo -e "${RED}❌ 데이터베이스 연결 실패${NC}"
        echo "응답: $response"
        add_test_result "database_connectivity" "failed" "데이터베이스 연결에 실패했습니다" "$response"
    fi
}

test_system_settings() {
    echo -e "${BLUE}⚙️ 시스템 설정 테스트${NC}"
    
    local response=$(make_request "GET" "/rest/v1/system_settings?select=key,value,description")
    local count=$(echo "$response" | jq '. | length')
    
    if [ "$count" -gt 0 ]; then
        echo -e "${GREEN}✅ 시스템 설정 확인: $count개 설정 발견${NC}"
        add_test_result "system_settings" "passed" "$count개의 시스템 설정이 정상적으로 로드되었습니다" "$response"
    else
        echo -e "${RED}❌ 시스템 설정이 없습니다${NC}"
        add_test_result "system_settings" "failed" "시스템 설정을 찾을 수 없습니다" "$response"
    fi
}

test_manual_crawling() {
    echo -e "${BLUE}🕷️ 수동 크롤링 테스트${NC}"
    
    local response=$(make_request "POST" "/functions/v1/lme-price-crawler" '{}')
    local success=$(echo "$response" | jq -r '.success // false')
    
    if [ "$success" = "true" ]; then
        local processed=$(echo "$response" | jq -r '.data.totalProcessed // 0')
        echo -e "${GREEN}✅ 수동 크롤링 성공: $processed개 데이터 처리${NC}"
        add_test_result "manual_crawling" "passed" "$processed개의 LME 가격 데이터가 성공적으로 처리되었습니다" "$response"
    else
        local error=$(echo "$response" | jq -r '.error // "알 수 없는 오류"')
        echo -e "${RED}❌ 수동 크롤링 실패: $error${NC}"
        add_test_result "manual_crawling" "failed" "수동 크롤링이 실패했습니다: $error" "$response"
    fi
    
    # 잠시 대기 (데이터 처리 시간 확보)
    sleep 3
}

test_data_retrieval() {
    echo -e "${BLUE}📈 데이터 조회 테스트${NC}"
    
    local response=$(make_request "GET" "/rest/v1/lme_processed_prices?select=metal_code,metal_name_kr,price_krw_per_kg,change_percent&order=processed_at.desc&limit=10")
    local count=$(echo "$response" | jq '. | length')
    
    if [ "$count" -gt 0 ]; then
        echo -e "${GREEN}✅ 데이터 조회 성공: $count개 최신 가격 데이터 조회${NC}"
        add_test_result "data_retrieval" "passed" "$count개의 최신 LME 가격 데이터를 성공적으로 조회했습니다" "$response"
    else
        echo -e "${YELLOW}⚠️ 조회된 데이터가 없습니다${NC}"
        add_test_result "data_retrieval" "warning" "저장된 LME 가격 데이터가 없습니다" "$response"
    fi
}

test_latest_prices_function() {
    echo -e "${BLUE}🔧 최신 가격 조회 함수 테스트${NC}"
    
    local response=$(make_request "POST" "/rest/v1/rpc/get_latest_lme_prices" '{}')
    local count=$(echo "$response" | jq '. | length')
    
    if [ "$count" -gt 0 ]; then
        echo -e "${GREEN}✅ 함수 호출 성공: $count개 금속 가격 반환${NC}"
        add_test_result "latest_prices_function" "passed" "get_latest_lme_prices 함수가 $count개 금속 가격을 반환했습니다" "$response"
    else
        echo -e "${YELLOW}⚠️ 함수에서 반환된 데이터가 없습니다${NC}"
        add_test_result "latest_prices_function" "warning" "get_latest_lme_prices 함수에서 데이터가 반환되지 않았습니다" "$response"
    fi
}

test_crawling_statistics() {
    echo -e "${BLUE}📊 크롤링 통계 테스트${NC}"
    
    local response=$(make_request "POST" "/rest/v1/rpc/get_crawling_statistics" '{"days": 7}')
    local total_runs=$(echo "$response" | jq -r '.[0].total_runs // 0')
    local success_rate=$(echo "$response" | jq -r '.[0].success_rate // 0')
    
    if [ "$total_runs" -gt 0 ]; then
        echo -e "${GREEN}✅ 통계 조회 성공: 총 $total_runs회 실행, 성공률 $success_rate%${NC}"
        add_test_result "crawling_statistics" "passed" "지난 7일간 $total_runs회 실행, 성공률 $success_rate%" "$response"
    else
        echo -e "${YELLOW}⚠️ 크롤링 통계가 없습니다${NC}"
        add_test_result "crawling_statistics" "warning" "크롤링 실행 기록이 없습니다" "$response"
    fi
}

test_monitoring_system() {
    echo -e "${BLUE}🔍 모니터링 시스템 테스트${NC}"
    
    local response=$(make_request "GET" "/functions/v1/lme-monitoring?action=health-check")
    local overall_status=$(echo "$response" | jq -r '.overall_status // "unknown"')
    local checks_count=$(echo "$response" | jq '.checks | length')
    
    if [ "$overall_status" = "healthy" ] || [ "$overall_status" = "degraded" ]; then
        echo -e "${GREEN}✅ 모니터링 시스템 작동: 상태 $overall_status, $checks_count개 점검 항목${NC}"
        add_test_result "monitoring_system" "passed" "모니터링 시스템이 정상 작동합니다 (상태: $overall_status)" "$response"
    else
        echo -e "${RED}❌ 모니터링 시스템 오류${NC}"
        add_test_result "monitoring_system" "failed" "모니터링 시스템에 오류가 발생했습니다" "$response"
    fi
}

test_data_validation() {
    echo -e "${BLUE}✅ 데이터 유효성 검증${NC}"
    
    # 최신 가격 데이터의 유효성 검증
    local response=$(make_request "GET" "/rest/v1/lme_processed_prices?select=metal_code,price_krw_per_kg,change_percent&order=processed_at.desc&limit=6")
    local valid_count=0
    local invalid_items=()
    
    # 각 금속별로 데이터 검증
    for metal in "AL" "CU" "NI" "ZN" "PB" "SN"; do
        local price=$(echo "$response" | jq -r '.[] | select(.metal_code == "'$metal'") | .price_krw_per_kg')
        
        if [ "$price" != "null" ] && [ "$price" != "" ]; then
            # 가격이 합리적인 범위에 있는지 확인 (100원 ~ 100만원/kg)
            if (( $(echo "$price > 100 && $price < 1000000" | bc -l) )); then
                ((valid_count++))
            else
                invalid_items+=("$metal: 비정상적인 가격 $price")
            fi
        else
            invalid_items+=("$metal: 가격 데이터 없음")
        fi
    done
    
    if [ $valid_count -eq 6 ]; then
        echo -e "${GREEN}✅ 모든 금속 가격 데이터가 유효합니다${NC}"
        add_test_result "data_validation" "passed" "6개 금속의 가격 데이터가 모두 유효한 범위에 있습니다" "$response"
    elif [ $valid_count -gt 3 ]; then
        echo -e "${YELLOW}⚠️ 일부 금속 데이터에 문제가 있습니다 ($valid_count/6 유효)${NC}"
        add_test_result "data_validation" "warning" "$valid_count/6개 금속 데이터가 유효합니다" "{\"valid_count\":$valid_count,\"invalid_items\":$(printf '%s\n' "${invalid_items[@]}" | jq -R . | jq -s .)}"
    else
        echo -e "${RED}❌ 대부분의 금속 데이터가 유효하지 않습니다 ($valid_count/6 유효)${NC}"
        add_test_result "data_validation" "failed" "너무 많은 금속 데이터가 유효하지 않습니다" "{\"valid_count\":$valid_count,\"invalid_items\":$(printf '%s\n' "${invalid_items[@]}" | jq -R . | jq -s .)}"
    fi
}

test_performance() {
    echo -e "${BLUE}⚡ 성능 테스트${NC}"
    
    # 연속 3회 크롤링 테스트
    local total_time=0
    local success_count=0
    
    for i in {1..3}; do
        echo "  크롤링 $i/3 실행 중..."
        local start_time=$(date +%s%N)
        local response=$(make_request "POST" "/functions/v1/lme-price-crawler" '{}')
        local end_time=$(date +%s%N)
        
        local duration=$(( (end_time - start_time) / 1000000 )) # 밀리초로 변환
        local success=$(echo "$response" | jq -r '.success // false')
        
        if [ "$success" = "true" ]; then
            ((success_count++))
            total_time=$((total_time + duration))
            echo "    완료: ${duration}ms"
        else
            echo "    실패: $duration ms"
        fi
        
        sleep 2 # 서버 부하 방지
    done
    
    if [ $success_count -eq 3 ]; then
        local avg_time=$((total_time / 3))
        echo -e "${GREEN}✅ 성능 테스트 성공: 평균 응답시간 ${avg_time}ms${NC}"
        add_test_result "performance" "passed" "3회 연속 크롤링 성공, 평균 응답시간 ${avg_time}ms" "{\"average_time_ms\":$avg_time,\"success_rate\":100}"
    elif [ $success_count -gt 0 ]; then
        local avg_time=$((total_time / success_count))
        echo -e "${YELLOW}⚠️ 성능 테스트 부분 성공: $success_count/3 성공, 평균 응답시간 ${avg_time}ms${NC}"
        add_test_result "performance" "warning" "$success_count/3 크롤링 성공, 평균 응답시간 ${avg_time}ms" "{\"average_time_ms\":$avg_time,\"success_rate\":$((success_count * 100 / 3))}"
    else
        echo -e "${RED}❌ 성능 테스트 실패: 모든 크롤링 실패${NC}"
        add_test_result "performance" "failed" "3회 크롤링 모두 실패" "{\"success_rate\":0}"
    fi
}

# 메인 테스트 실행
main() {
    echo -e "${BLUE}🚀 테스트 시작: $(date)${NC}"
    echo
    
    # 필수 도구 확인
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq가 설치되지 않았습니다. brew install jq 또는 apt-get install jq로 설치하세요.${NC}"
        exit 1
    fi
    
    if ! command -v bc &> /dev/null; then
        echo -e "${RED}❌ bc가 설치되지 않았습니다. brew install bc 또는 apt-get install bc로 설치하세요.${NC}"
        exit 1
    fi
    
    # 테스트 실행
    test_database_connectivity
    echo
    test_system_settings
    echo
    test_manual_crawling
    echo
    test_data_retrieval
    echo
    test_latest_prices_function
    echo
    test_crawling_statistics
    echo
    test_monitoring_system
    echo
    test_data_validation
    echo
    test_performance
    echo
    
    # 결과 요약
    local total_tests=$(echo "$TEST_RESULTS" | jq '.tests | length')
    local passed_tests=$(echo "$TEST_RESULTS" | jq '.tests | map(select(.status == "passed")) | length')
    local warning_tests=$(echo "$TEST_RESULTS" | jq '.tests | map(select(.status == "warning")) | length')
    local failed_tests=$(echo "$TEST_RESULTS" | jq '.tests | map(select(.status == "failed")) | length')
    
    echo "========================================"
    echo -e "${BLUE}📋 테스트 결과 요약${NC}"
    echo "총 테스트: $total_tests"
    echo -e "통과: ${GREEN}$passed_tests${NC}"
    echo -e "경고: ${YELLOW}$warning_tests${NC}"
    echo -e "실패: ${RED}$failed_tests${NC}"
    echo
    echo -e "상세 결과: ${BLUE}$TEST_RESULTS_FILE${NC}"
    
    # 결과 파일 저장
    echo "$TEST_RESULTS" | jq '.' > "$TEST_RESULTS_FILE"
    
    # 종료 코드 결정
    if [ $failed_tests -gt 0 ]; then
        echo -e "${RED}❌ 일부 테스트가 실패했습니다${NC}"
        exit 1
    elif [ $warning_tests -gt 0 ]; then
        echo -e "${YELLOW}⚠️ 일부 테스트에서 경고가 발생했습니다${NC}"
        exit 0
    else
        echo -e "${GREEN}✅ 모든 테스트가 성공했습니다!${NC}"
        exit 0
    fi
}

# 스크립트 실행
main "$@" 