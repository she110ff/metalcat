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
    
    status               현재 환경 상태 확인 (SMS 설정 포함)
    validate             환경 변수 유효성 검사 (SMS 설정 확인 포함)
    
    deploy-secrets       현재 환경 변수를 Supabase에 배포
    deploy-secrets --force 확인 없이 모든 환경 변수를 Supabase에 배포
    preview-secrets      배포될 환경 변수 미리보기
    sync-secrets         Supabase에서 환경 변수 동기화
    list-secrets         배포된 환경 변수 목록 확인
    check-env            Edge Function에서 환경 변수 확인
    
    help                 이 도움말 출력

SMS 관련 환경 변수:
    NC_SMS_ACCESS_KEY    네이버 클라우드 SMS API Access Key
    NC_SMS_SECRET_KEY    네이버 클라우드 SMS API Secret Key  
    NC_SMS_SERVICE_ID    네이버 클라우드 SMS 서비스 ID
    NC_SMS_FROM_NUMBER   승인받은 발신번호

예시:
    $0 switch-local      # 로컬 개발 환경으로 전환
    $0 switch-remote     # 프로덕션 환경으로 전환
    $0 status            # 현재 환경 확인 (SMS 설정 포함)
    $0 validate          # 환경 변수 유효성 검사 (SMS 설정 확인)
    $0 preview-secrets   # 배포될 환경 변수 미리보기
    $0 deploy-secrets    # 환경 변수를 Supabase에 배포 (확인 후)
    $0 deploy-secrets --force  # 모든 환경 변수를 즉시 배포

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
    deploy_secrets_to_supabase "--force"
}

# 배포될 환경 변수 미리보기
preview_secrets() {
    if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
        log_error ".env.local 파일이 없습니다"
        return 1
    fi
    
    echo "========================================"
    echo "        배포될 환경 변수 미리보기"
    echo "========================================"
    echo
    
    local count=0
    
    while IFS='=' read -r key value; do
        # 빈 줄이나 주석 라인 제외
        if [[ -n "$key" && ! "$key" =~ ^[[:space:]]*# ]]; then
            ((count++))
            
            # 민감한 정보는 마스킹 처리
            if [[ $key =~ (KEY|SECRET|PASSWORD|TOKEN) ]]; then
                local masked_value=$(echo "$value" | sed 's/./*/g' | cut -c1-20)
                echo "$count. $key=$masked_value..."
            else
                echo "$count. $key=$value"
            fi
        fi
    done < <(grep -v '^[[:space:]]*$' "$PROJECT_ROOT/.env.local" | grep -v '^[[:space:]]*#')
    
    echo
    log_info "총 $count개의 환경 변수가 배포 예정입니다."
}

# Supabase에 secrets 배포
deploy_secrets_to_supabase() {
    local force_mode=${1:-false}
    
    if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
        log_error ".env.local 파일이 없습니다"
        return 1
    fi
    
    # force 모드가 아닌 경우 미리보기 및 확인
    if [ "$force_mode" != "--force" ]; then
        preview_secrets
        echo
        log_warning "위의 환경 변수들이 Supabase에 배포됩니다."
        read -p "계속하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "배포가 취소되었습니다."
            return 0
        fi
    fi
    
    log_info "환경 변수를 Supabase에 배포 중..."
    
    # Edge Function용 환경 변수 설정
    cd "$PROJECT_ROOT"
    
    local success_count=0
    local total_count=0
    
    # .env.local의 모든 변수를 읽어서 배포
    while IFS='=' read -r key value; do
        # 빈 줄이나 주석 라인 제외
        if [[ -n "$key" && ! "$key" =~ ^[[:space:]]*# ]]; then
            ((total_count++))
            
            # 값에서 따옴표 제거 (있는 경우)
            value=$(echo "$value" | sed 's/^["'\'']//' | sed 's/["'\'']$//')
            
            log_info "배포 중: $key"
            
            if supabase secrets set "$key"="$value" 2>/dev/null; then
                ((success_count++))
                log_success "✓ $key 설정 완료"
            else
                log_warning "✗ $key 설정 실패"
            fi
        fi
    done < <(grep -v '^[[:space:]]*$' "$PROJECT_ROOT/.env.local" | grep -v '^[[:space:]]*#')
    
    echo
    log_success "Supabase secrets 배포 완료: $success_count/$total_count 성공"
    
    if [ $success_count -lt $total_count ]; then
        log_warning "일부 환경 변수 배포에 실패했습니다. 권한이나 Supabase 연결을 확인해주세요."
    fi
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
        
        echo
        echo "SMS 관련 환경 변수:"
        echo "----------------------------------------"
        if grep -q "^NC_SMS_ACCESS_KEY=" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
            local sms_key=$(grep "^NC_SMS_ACCESS_KEY=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2)
            echo "NC_SMS_ACCESS_KEY: ${sms_key:0:20}... (마스킹됨)"
        else
            echo "NC_SMS_ACCESS_KEY: 설정되지 않음"
        fi
        
        if grep -q "^NC_SMS_SERVICE_ID=" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
            grep "^NC_SMS_SERVICE_ID=" "$PROJECT_ROOT/.env.local" 2>/dev/null
        else
            echo "NC_SMS_SERVICE_ID: 설정되지 않음"
        fi
        
        if grep -q "^NC_SMS_FROM_NUMBER=" "$PROJECT_ROOT/.env.local" 2>/dev/null; then
            grep "^NC_SMS_FROM_NUMBER=" "$PROJECT_ROOT/.env.local" 2>/dev/null
        else
            echo "NC_SMS_FROM_NUMBER: 설정되지 않음"
        fi
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
    
    # 선택적 변수 (SMS 관련)
    local optional_vars=("NC_SMS_ACCESS_KEY" "NC_SMS_SECRET_KEY" "NC_SMS_SERVICE_ID" "NC_SMS_FROM_NUMBER")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$PROJECT_ROOT/.env.local"; then
            log_error "필수 변수 누락: $var"
            ((errors++))
        fi
    done
    
    # 선택적 변수 확인 (SMS 관련)
    log_info "SMS 관련 환경 변수 확인:"
    for var in "${optional_vars[@]}"; do
        if grep -q "^$var=" "$PROJECT_ROOT/.env.local"; then
            log_success "✓ $var 설정됨"
        else
            log_warning "⚠ $var 설정되지 않음 (SMS 기능 사용 시 필요)"
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
            if [ "$2" = "--force" ]; then
                deploy_secrets_to_supabase "--force"
            else
                deploy_secrets_to_supabase
            fi
            ;;
        "preview-secrets")
            preview_secrets
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
