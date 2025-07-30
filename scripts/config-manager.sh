#!/bin/bash

# LME 시스템 환경변수 관리자
# 사용법: 
#   ./config-manager.sh get                    # 현재 설정 조회
#   ./config-manager.sh set interval 300      # 간격 설정 (초)
#   ./config-manager.sh set exchange_rate 1350 # 기본 환율 설정
#   ./config-manager.sh init                   # 초기 .env.local 파일 생성

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 환경 변수 로드
load_env_vars() {
    if [ -f .env.local ]; then
        export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env.local | sed 's/[[:space:]]*#.*$//' | xargs)
        echo -e "${GREEN}✅ .env.local 파일 로드됨${NC}"
    elif [ -f .env ]; then
        export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env | sed 's/[[:space:]]*#.*$//' | xargs)
        echo -e "${GREEN}✅ .env 파일 로드됨${NC}"
    else
        echo -e "${YELLOW}⚠️ 환경변수 파일이 없습니다.${NC}"
        return 1
    fi
}

# 현재 설정 조회
show_current_config() {
    echo -e "${BLUE}📊 현재 LME 시스템 환경변수 설정${NC}"
    echo "=================================================="
    
    load_env_vars 2>/dev/null || echo -e "${YELLOW}⚠️ 환경변수 파일 없음${NC}"
    
    echo -e "\n${YELLOW}🔧 핵심 설정${NC}"
    echo "  SUPABASE_URL: ${SUPABASE_URL:-'❌ 미설정'}"
    echo "  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:+✅ 설정됨}"
    echo "  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:+✅ 설정됨}"
    
    echo -e "\n${YELLOW}🕷️ 크롤링 설정${NC}"
    echo "  LME_SOURCE_URL: ${LME_SOURCE_URL:-'https://www.nonferrous.or.kr/stats/?act=sub3 (기본값)'}"
    echo "  LME_CRAWLER_INTERVAL: ${LME_CRAWLER_INTERVAL:-60}초"
    echo "  MAX_RETRY_ATTEMPTS: ${MAX_RETRY_ATTEMPTS:-3}회"
    echo "  MAX_PAGES: ${MAX_PAGES:-10}페이지"
    
    echo -e "\n${YELLOW}💱 환율 설정${NC}"
    echo "  DEFAULT_EXCHANGE_RATE: ${DEFAULT_EXCHANGE_RATE:-1320} (API 실패시 사용)"
    echo "  💡 실제 환율은 exchangerate-api.com에서 실시간 조회됩니다"
    
    echo -e "\n${YELLOW}🎯 기타 설정${NC}"
    echo "  ENVIRONMENT: ${ENVIRONMENT:-local}"
    echo "  LOG_LEVEL: ${LOG_LEVEL:-info}"
}

# .env.local 파일 초기화
init_env_file() {
    if [ -f .env.local ]; then
        echo -e "${YELLOW}⚠️ .env.local 파일이 이미 존재합니다. 덮어쓰시겠습니까? (y/n)${NC}"
        read -r answer
        if [ "$answer" != "y" ]; then
            echo -e "${BLUE}초기화 취소됨${NC}"
            return
        fi
    fi
    
    if [ ! -f env.local.template ]; then
        echo -e "${RED}❌ env.local.template 파일이 없습니다${NC}"
        return 1
    fi
    
    cp env.local.template .env.local
    echo -e "${GREEN}✅ .env.local 파일이 생성되었습니다${NC}"
    echo -e "${BLUE}💡 Supabase 키 값들을 올바르게 설정해주세요${NC}"
}

# 환경변수 파일 업데이트
update_env_file() {
    local key="$1"
    local value="$2"
    local env_file=".env.local"
    
    if [ -f "$env_file" ]; then
        # 기존 설정이 있으면 업데이트, 없으면 추가
        if grep -q "^${key}=" "$env_file"; then
            sed -i.bak "s/^${key}=.*/${key}=${value}/" "$env_file"
            rm -f "${env_file}.bak"
        else
            echo "${key}=${value}" >> "$env_file"
        fi
        echo -e "${GREEN}✅ ${env_file} 업데이트: ${key}=${value}${NC}"
    else
        echo -e "${YELLOW}⚠️ ${env_file} 파일이 없습니다. 생성하시겠습니까? (y/n)${NC}"
        read -r answer
        if [ "$answer" = "y" ]; then
            cp env.local.template .env.local
            update_env_file "$key" "$value"
        fi
    fi
}

# 설정값 업데이트
set_config() {
    local setting="$1"
    local value="$2"
    
    case "$setting" in
        "interval")
            update_env_file "LME_CRAWLER_INTERVAL" "$value"
            echo -e "${GREEN}✅ 크롤링 간격 설정: ${value}초${NC}"
            ;;
        "exchange_rate")
            update_env_file "DEFAULT_EXCHANGE_RATE" "$value"
            echo -e "${GREEN}✅ 기본 환율 설정: ${value} (API 실패시 사용)${NC}"
            ;;
        "max_retries")
            update_env_file "MAX_RETRY_ATTEMPTS" "$value"
            echo -e "${GREEN}✅ 재시도 횟수 설정: ${value}회${NC}"
            ;;
        "max_pages")
            update_env_file "MAX_PAGES" "$value"
            echo -e "${GREEN}✅ 최대 페이지 수 설정: ${value}페이지${NC}"
            ;;
        *)
            echo -e "${RED}❌ 지원하지 않는 설정: $setting${NC}"
            echo "사용 가능한 설정: interval, exchange_rate, max_retries, max_pages"
            exit 1
            ;;
    esac
}

# 환경변수 파일 검증
validate_env_file() {
    if [ ! -f .env.local ]; then
        echo -e "${RED}❌ .env.local 파일이 없습니다${NC}"
        echo -e "${BLUE}💡 먼저 init 명령어로 파일을 생성하세요: ./config-manager.sh init${NC}"
        return 1
    fi
    
    load_env_vars >/dev/null 2>&1
    
    local errors=0
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${RED}❌ SUPABASE_URL이 설정되지 않았습니다${NC}"
        errors=$((errors + 1))
    fi
    
    if [ -z "$SUPABASE_ANON_KEY" ] || [ "$SUPABASE_ANON_KEY" = "your_anon_key_here" ]; then
        echo -e "${RED}❌ SUPABASE_ANON_KEY가 설정되지 않았습니다${NC}"
        errors=$((errors + 1))
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ "$SUPABASE_SERVICE_ROLE_KEY" = "your_service_role_key_here" ]; then
        echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다${NC}"
        errors=$((errors + 1))
    fi
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✅ 환경변수 설정이 유효합니다${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ ${errors}개의 환경변수 설정 문제가 발견되었습니다${NC}"
        return 1
    fi
}

# 메인 로직
case "${1:-get}" in
    "get")
        show_current_config
        ;;
    "set")
        if [ $# -ne 3 ]; then
            echo "사용법: $0 set <설정명> <값>"
            echo "예시: $0 set interval 300"
            echo "      $0 set exchange_rate 1350"
            exit 1
        fi
        set_config "$2" "$3"
        ;;
    "init")
        init_env_file
        ;;
    "validate")
        validate_env_file
        ;;
    *)
        echo "사용법: $0 {get|set|init|validate}"
        echo ""
        echo "명령어:"
        echo "  get                     현재 환경변수 설정 조회"
        echo "  set <설정명> <값>       환경변수 값 변경"
        echo "  init                    초기 .env.local 파일 생성"
        echo "  validate                환경변수 설정 검증"
        echo ""
        echo "설정 가능한 항목:"
        echo "  interval <초>           크롤링 간격 (예: 300)"
        echo "  exchange_rate <환율>    기본 환율 (예: 1350)"
        echo "  max_retries <횟수>      재시도 횟수 (예: 5)"
        echo "  max_pages <페이지>      최대 페이지 (예: 20)"
        exit 1
        ;;
esac 