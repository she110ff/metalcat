#!/bin/bash

# ===================================
# 환경 변수 관리 스크립트
# ===================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# 도움말 출력
show_help() {
    cat << EOF
환경 변수 관리 스크립트

사용법:
    $0 <command> [options]

명령어:
    switch-local          로컬 개발 환경으로 전환
    switch-remote         원격 프로덕션 환경으로 전환
    switch-staging        스테이징 환경으로 전환 (있는 경우)
    
    backup               현재 환경 변수 백업
    restore <backup>     백업된 환경 변수 복원
    
    status               현재 환경 상태 확인
    validate             환경 변수 유효성 검사
    
    deploy-secrets       현재 환경 변수를 Supabase에 배포
    sync-secrets         Supabase에서 환경 변수 동기화
    list-secrets         배포된 환경 변수 목록 확인
    check-env            Edge Function에서 환경 변수 확인
    
    help                 이 도움말 출력

예시:
    $0 switch-local      # 로컬 개발 환경으로 전환
    $0 switch-remote     # 프로덕션 환경으로 전환
    $0 status            # 현재 환경 확인
    $0 deploy-secrets    # 환경 변수를 Supabase에 배포

EOF
}

# 현재 환경 상태 확인
check_current_environment() {
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        local env_var=$(grep "^ENVIRONMENT=" "$PROJECT_ROOT/.env.local" 2>/dev/null | cut -d'=' -f2)
        local supabase_url=$(grep "^EXPO_PUBLIC_SUPABASE_URL=" "$PROJECT_ROOT/.env.local" 2>/dev/null | cut -d'=' -f2)
        
        if [[ $supabase_url == *"127.0.0.1"* ]]; then
            echo "local"
        elif [[ $supabase_url == *"supabase.co"* ]]; then
            echo "remote"
        else
            echo "unknown"
        fi
    else
        echo "none"
    fi
}

# 환경 전환 함수
switch_environment() {
    local target_env=$1
    local source_file=""
    
    case $target_env in
        "local")
            source_file="$PROJECT_ROOT/env.local.recommended"
            ;;
        "remote")
            source_file="$PROJECT_ROOT/env.remote.recommended"
            ;;
        "staging")
            source_file="$PROJECT_ROOT/.env.staging"
            ;;
        *)
            log_error "지원하지 않는 환경: $target_env"
            return 1
            ;;
    esac
    
    if [ ! -f "$source_file" ]; then
        log_error "환경 파일을 찾을 수 없습니다: $source_file"
        return 1
    fi
    
    # 백업 생성
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        local backup_file="$PROJECT_ROOT/.env.local.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$PROJECT_ROOT/.env.local" "$backup_file"
        log_info "현재 환경을 백업했습니다: $backup_file"
    fi
    
    # 환경 파일 복사
    cp "$source_file" "$PROJECT_ROOT/.env.local"
    log_success "$target_env 환경으로 전환 완료"
    
    # Supabase secrets 업데이트
    log_info "Supabase secrets 업데이트 중..."
    deploy_secrets_to_supabase
}

# Supabase에 secrets 배포
deploy_secrets_to_supabase() {
    if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
        log_error ".env.local 파일이 없습니다"
        return 1
    fi
    
    log_info "환경 변수를 Supabase에 배포 중..."
    
    # .env.local에서 필요한 변수 추출 및 배포
    local expo_url=$(grep "^EXPO_PUBLIC_SUPABASE_URL=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2)
    local expo_service_key=$(grep "^EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2)
    local internal_url=$(grep "^INTERNAL_SUPABASE_URL=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2)
    local environment=$(grep "^ENVIRONMENT=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2)
    
    # Edge Function용 환경 변수 설정
    cd "$PROJECT_ROOT"
    
    if [ -n "$expo_url" ]; then
        supabase secrets set EXPO_PUBLIC_SUPABASE_URL="$expo_url" 2>/dev/null || log_warning "EXPO_PUBLIC_SUPABASE_URL 설정 실패"
    fi
    
    if [ -n "$expo_service_key" ]; then
        supabase secrets set EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY="$expo_service_key" 2>/dev/null || log_warning "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY 설정 실패"
    fi
    
    if [ -n "$internal_url" ]; then
        supabase secrets set INTERNAL_SUPABASE_URL="$internal_url" 2>/dev/null || log_warning "INTERNAL_SUPABASE_URL 설정 실패"
    fi
    
    if [ -n "$environment" ]; then
        supabase secrets set ENVIRONMENT="$environment" 2>/dev/null || log_warning "ENVIRONMENT 설정 실패"
    fi
    
    log_success "Supabase secrets 배포 완료"
}

# 환경 상태 출력
show_status() {
    local current_env=$(check_current_environment)
    
    echo "========================================"
    echo "           환경 상태 확인"
    echo "========================================"
    echo
    
    case $current_env in
        "local")
            log_info "현재 환경: 🏠 로컬 개발 환경"
            ;;
        "remote")
            log_info "현재 환경: 🌐 원격 프로덕션 환경"
            ;;
        "none")
            log_warning "환경 설정 없음: .env.local 파일이 없습니다"
            ;;
        *)
            log_warning "알 수 없는 환경 설정"
            ;;
    esac
    
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        echo
        echo "주요 환경 변수:"
        echo "----------------------------------------"
        grep "^ENVIRONMENT=" "$PROJECT_ROOT/.env.local" 2>/dev/null || echo "ENVIRONMENT: 설정되지 않음"
        grep "^EXPO_PUBLIC_SUPABASE_URL=" "$PROJECT_ROOT/.env.local" 2>/dev/null || echo "SUPABASE_URL: 설정되지 않음"
        grep "^LOG_LEVEL=" "$PROJECT_ROOT/.env.local" 2>/dev/null || echo "LOG_LEVEL: 설정되지 않음"
        grep "^DEBUG_MODE=" "$PROJECT_ROOT/.env.local" 2>/dev/null || echo "DEBUG_MODE: 설정되지 않음"
    fi
    
    echo
}

# 환경 변수 유효성 검사
validate_environment() {
    log_info "환경 변수 유효성 검사 중..."
    
    local errors=0
    
    if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
        log_error ".env.local 파일이 없습니다"
        return 1
    fi
    
    # 필수 변수 확인
    local required_vars=("EXPO_PUBLIC_SUPABASE_URL" "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" "ENVIRONMENT")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$PROJECT_ROOT/.env.local"; then
            log_error "필수 변수 누락: $var"
            ((errors++))
        fi
    done
    
    # URL 형식 검사
    local supabase_url=$(grep "^EXPO_PUBLIC_SUPABASE_URL=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2)
    if [[ ! $supabase_url =~ ^https?:// ]]; then
        log_error "잘못된 SUPABASE_URL 형식: $supabase_url"
        ((errors++))
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "환경 변수 유효성 검사 통과"
        return 0
    else
        log_error "$errors개의 오류가 발견되었습니다"
        return 1
    fi
}

# 배포된 환경 변수 목록 확인
list_deployed_secrets() {
    log_info "배포된 환경 변수 목록 확인 중..."
    
    cd "$PROJECT_ROOT"
    supabase secrets list
}

# Edge Function에서 환경 변수 확인
check_edge_function_env() {
    log_info "Edge Function에서 환경 변수 확인 중..."
    
    local current_env=$(check_current_environment)
    
    case $current_env in
        "local")
            local function_url="http://127.0.0.1:54331/functions/v1/lme-crawler"
            local auth_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
            ;;
        "remote")
            local function_url="https://vxdncswvbhelstpkfcvv.supabase.co/functions/v1/lme-crawler"
            local auth_key=$(grep "^EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2)
            ;;
        *)
            log_error "환경을 확인할 수 없습니다"
            return 1
            ;;
    esac
    
    log_info "Edge Function 호출: $function_url"
    
    curl -s -X POST "$function_url" \
        -H "Authorization: Bearer $auth_key" \
        -H "Content-Type: application/json" | \
    jq -r '
        if .success then
            "✅ 환경: " + .data.environment + 
            "\n🔗 Supabase URL: " + .data.supabase_url +
            "\n⚙️ 설정:\n" + (.data.config_used | to_entries | map("  " + .key + ": " + (.value | tostring)) | join("\n"))
        else
            "❌ 실패: " + .error
        end
    '
}

# 메인 함수
main() {
    case ${1:-""} in
        "switch-local")
            switch_environment "local"
            ;;
        "switch-remote")
            switch_environment "remote"
            ;;
        "switch-staging")
            switch_environment "staging"
            ;;
        "status")
            show_status
            ;;
        "validate")
            validate_environment
            ;;
        "deploy-secrets")
            deploy_secrets_to_supabase
            ;;
        "list-secrets")
            list_deployed_secrets
            ;;
        "check-env")
            check_edge_function_env
            ;;
        "help"|"")
            show_help
            ;;
        *)
            log_error "알 수 없는 명령어: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"
