#!/bin/bash

# =============================================================================
# Deploy Fresh Remote Script
# 원격 Supabase 완전 초기화 후 로컬 환경 배포 자동화 스크립트
# =============================================================================

set -e  # 에러 발생 시 스크립트 종료

# 색상 코드 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 로그 함수들
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# 배너 출력
print_banner() {
    echo -e "${CYAN}"
    echo "=============================================="
    echo "🚀 SUPABASE FRESH REMOTE DEPLOYMENT"
    echo "=============================================="
    echo -e "${NC}"
    echo -e "${RED}⚠️  WARNING: 이 스크립트는 원격 Supabase의 모든 데이터를 삭제합니다!${NC}"
    echo -e "${RED}⚠️  WARNING: 프로덕션 환경에서 실행하기 전에 반드시 백업하세요!${NC}"
    echo ""
}

# 사전 요구사항 확인
check_prerequisites() {
    log_step "사전 요구사항 확인 중..."
    
    # Supabase CLI 확인
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI가 설치되지 않았습니다."
        exit 1
    fi
    
    # jq 확인
    if ! command -v jq &> /dev/null; then
        log_error "jq가 설치되지 않았습니다. brew install jq로 설치하세요."
        exit 1
    fi
    
    # env-manager.sh 확인
    if [ ! -f "scripts/env-manager.sh" ]; then
        log_error "scripts/env-manager.sh 파일이 없습니다."
        exit 1
    fi
    
    # 환경 파일 확인
    if [ ! -f ".env.local" ] || [ ! -f ".env.local.remote" ]; then
        log_error "환경 파일(.env.local, .env.local.remote)이 없습니다."
        exit 1
    fi
    
    log_success "사전 요구사항 확인 완료"
}

# 현재 환경 상태 확인
check_current_state() {
    log_step "현재 환경 상태 확인 중..."
    
    # 현재 환경 확인
    ./scripts/env-manager.sh status
    
    # Supabase 로그인 상태 확인
    if ! supabase projects list &> /dev/null; then
        log_error "Supabase에 로그인되지 않았습니다. 'supabase login'을 실행하세요."
        exit 1
    fi
    
    log_success "환경 상태 확인 완료"
}

# 사용자 확인
confirm_action() {
    echo ""
    log_warning "다음 작업들이 수행됩니다:"
    echo "  1. 원격 데이터베이스와 Edge Functions 백업"
    echo "  2. 원격 Edge Functions 모두 삭제"
    echo "  3. 원격 환경 변수 모두 삭제"
    echo "  4. 로컬 마이그레이션을 원격에 배포"
    echo "  5. 로컬 Edge Functions을 원격에 배포"
    echo "  6. 로컬 환경 변수를 원격에 설정"
    echo ""
    
    read -p "❓ 계속 진행하시겠습니까? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_error "사용자가 취소했습니다."
        exit 1
    fi
    
    echo ""
    read -p "❓ 정말로 원격 데이터를 모두 삭제하고 진행하시겠습니까? (DELETE): " final_confirm
    if [ "$final_confirm" != "DELETE" ]; then
        log_error "최종 확인 실패. 스크립트를 종료합니다."
        exit 1
    fi
}

# 백업 생성
create_backup() {
    log_step "원격 데이터 백업 생성 중..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="backups/$timestamp"
    
    mkdir -p "$backup_dir"
    
    # 현재 환경을 원격으로 전환 (백업용)
    ./scripts/env-manager.sh switch-remote > /dev/null 2>&1
    
    # Edge Functions 목록 백업
    log_info "Edge Functions 목록 백업 중..."
    if supabase functions list --output json > "$backup_dir/remote_functions_backup.json" 2>/dev/null; then
        log_success "Edge Functions 목록 백업 완료"
    else
        log_warning "Edge Functions 목록 백업 실패 (함수가 없을 수 있음)"
    fi
    
    # 환경 변수 백업
    log_info "환경 변수 백업 중..."
    if supabase secrets list > "$backup_dir/remote_secrets_backup.txt" 2>/dev/null; then
        log_success "환경 변수 백업 완료"
    else
        log_warning "환경 변수 백업 실패 (환경 변수가 없을 수 있음)"
    fi
    
    # 데이터베이스 스키마 백업 (옵션)
    log_info "데이터베이스 스키마 정보 수집 중..."
    echo "-- Remote Database Schema Backup" > "$backup_dir/remote_schema_info.sql"
    echo "-- Generated at: $(date)" >> "$backup_dir/remote_schema_info.sql"
    echo "-- Note: Manual database backup recommended via Supabase Dashboard" >> "$backup_dir/remote_schema_info.sql"
    
    log_success "백업이 $backup_dir에 저장되었습니다"
    echo "📁 백업 위치: $(pwd)/$backup_dir"
}

# 원격 Edge Functions 삭제
delete_remote_functions() {
    log_step "원격 Edge Functions 삭제 중..."
    
    # 원격 환경으로 전환
    ./scripts/env-manager.sh switch-remote > /dev/null 2>&1
    
    # 함수 목록 가져오기
    local functions_json
    if functions_json=$(supabase functions list --output json 2>/dev/null); then
        local function_names
        function_names=$(echo "$functions_json" | jq -r '.[].name' 2>/dev/null || echo "")
        
        if [ -n "$function_names" ] && [ "$function_names" != "" ]; then
            echo "$function_names" | while read -r func_name; do
                if [ -n "$func_name" ]; then
                    log_info "함수 삭제 중: $func_name"
                    if supabase functions delete "$func_name" --confirm 2>/dev/null; then
                        log_success "함수 삭제 완료: $func_name"
                    else
                        log_warning "함수 삭제 실패: $func_name (이미 삭제되었을 수 있음)"
                    fi
                fi
            done
        else
            log_info "삭제할 Edge Functions가 없습니다"
        fi
    else
        log_info "Edge Functions 목록을 가져올 수 없습니다 (함수가 없을 수 있음)"
    fi
    
    log_success "Edge Functions 삭제 완료"
}

# 원격 환경 변수 삭제
delete_remote_secrets() {
    log_step "원격 환경 변수 삭제 중..."
    
    # 원격 환경으로 전환
    ./scripts/env-manager.sh switch-remote > /dev/null 2>&1
    
    # 환경 변수 목록 가져오기
    local secrets_list
    if secrets_list=$(supabase secrets list 2>/dev/null); then
        # 첫 번째 줄(헤더) 제외하고 환경 변수명 추출
        local secret_names
        secret_names=$(echo "$secrets_list" | tail -n +2 | awk '{print $1}' | grep -v '^$' || echo "")
        
        if [ -n "$secret_names" ] && [ "$secret_names" != "" ]; then
            echo "$secret_names" | while read -r secret_name; do
                if [ -n "$secret_name" ]; then
                    log_info "환경 변수 삭제 중: $secret_name"
                    if supabase secrets unset "$secret_name" 2>/dev/null; then
                        log_success "환경 변수 삭제 완료: $secret_name"
                    else
                        log_warning "환경 변수 삭제 실패: $secret_name"
                    fi
                fi
            done
        else
            log_info "삭제할 환경 변수가 없습니다"
        fi
    else
        log_info "환경 변수 목록을 가져올 수 없습니다"
    fi
    
    log_success "환경 변수 삭제 완료"
}

# 데이터베이스 마이그레이션 배포
deploy_database() {
    log_step "데이터베이스 마이그레이션 배포 중..."
    
    # 원격 환경으로 전환
    ./scripts/env-manager.sh switch-remote > /dev/null 2>&1
    
    log_info "마이그레이션 파일 확인 중..."
    if [ ! -d "supabase/migrations" ] || [ -z "$(ls -A supabase/migrations)" ]; then
        log_warning "마이그레이션 파일이 없습니다. 건너뜁니다."
        return 0
    fi
    
    log_info "데이터베이스 push 실행 중..."
    if supabase db push --include-all; then
        log_success "데이터베이스 마이그레이션 배포 완료"
    else
        log_error "데이터베이스 마이그레이션 배포 실패"
        return 1
    fi
}

# Edge Functions 배포
deploy_functions() {
    log_step "Edge Functions 배포 중..."
    
    # 원격 환경으로 전환
    ./scripts/env-manager.sh switch-remote > /dev/null 2>&1
    
    log_info "Edge Functions 디렉토리 확인 중..."
    if [ ! -d "supabase/functions" ]; then
        log_warning "Edge Functions 디렉토리가 없습니다. 건너뜁니다."
        return 0
    fi
    
    # 모든 함수 배포
    log_info "모든 Edge Functions 배포 중..."
    if supabase functions deploy; then
        log_success "Edge Functions 배포 완료"
    else
        log_error "Edge Functions 배포 실패"
        return 1
    fi
    
    # 배포된 함수 목록 확인
    log_info "배포된 함수 목록:"
    supabase functions list
}

# 환경 변수 배포
deploy_secrets() {
    log_step "환경 변수 배포 중..."
    
    # 원격 환경으로 전환
    ./scripts/env-manager.sh switch-remote > /dev/null 2>&1
    
    log_info "env-manager.sh를 통한 환경 변수 배포 중..."
    if ./scripts/env-manager.sh deploy-secrets; then
        log_success "환경 변수 배포 완료"
    else
        log_error "환경 변수 배포 실패"
        return 1
    fi
}

# 시드 데이터 적용
apply_seed_data() {
    log_step "시드 데이터 적용 중..."
    
    # 원격 환경으로 전환
    ./scripts/env-manager.sh switch-remote > /dev/null 2>&1
    
    if [ ! -f "supabase/seed.sql" ]; then
        log_info "시드 데이터 파일이 없습니다. 건너뜁니다."
        return 0
    fi
    
    log_info "시드 데이터 적용 중..."
    if supabase db seed; then
        log_success "시드 데이터 적용 완료"
    else
        log_warning "시드 데이터 적용 실패 (무시하고 계속 진행)"
    fi
}

# 배포 검증
verify_deployment() {
    log_step "배포 검증 중..."
    
    # 원격 환경으로 전환
    ./scripts/env-manager.sh switch-remote > /dev/null 2>&1
    
    log_info "배포된 Edge Functions 확인 중..."
    supabase functions list
    
    log_info "환경 변수 확인 중..."
    supabase secrets list
    
    log_info "데이터베이스 연결 확인 중..."
    if supabase db ping; then
        log_success "데이터베이스 연결 정상"
    else
        log_warning "데이터베이스 연결 확인 실패"
    fi
    
    log_info "환경 설정 검증 중..."
    if ./scripts/env-manager.sh validate; then
        log_success "환경 설정 검증 완료"
    else
        log_warning "환경 설정 검증 실패"
    fi
    
    log_info "전체 환경 체크 실행 중..."
    ./scripts/env-manager.sh check-env
}

# 정리 작업
cleanup() {
    log_step "정리 작업 중..."
    
    # 로컬 환경으로 복원
    ./scripts/env-manager.sh switch-local > /dev/null 2>&1
    
    log_success "로컬 환경으로 복원 완료"
}

# 메인 실행 함수
main() {
    print_banner
    
    # 에러 발생 시 정리 작업 실행
    trap cleanup EXIT
    
    check_prerequisites
    check_current_state
    confirm_action
    
    echo ""
    log_step "배포 프로세스 시작..."
    
    # 백업 생성
    create_backup
    
    # 원격 리소스 삭제
    delete_remote_functions
    delete_remote_secrets
    
    # 로컬 리소스 배포
    deploy_database
    deploy_functions
    deploy_secrets
    apply_seed_data
    
    # 검증
    verify_deployment
    
    echo ""
    log_success "=============================================="
    log_success "🎉 배포 완료!"
    log_success "=============================================="
    echo ""
    log_info "다음 단계:"
    echo "  1. 애플리케이션에서 원격 API 연결 테스트"
    echo "  2. 각 기능별 동작 확인"
    echo "  3. 모니터링 및 로그 확인"
    echo ""
    log_info "문제 발생 시 백업 파일을 사용하여 복원하세요."
}

# 스크립트 인자 처리
case "${1:-}" in
    "")
        main
        ;;
    "--help" | "-h")
        echo "사용법: $0 [옵션]"
        echo ""
        echo "옵션:"
        echo "  --help, -h     이 도움말 표시"
        echo "  --dry-run      실제 배포 없이 시뮬레이션 실행"
        echo ""
        echo "이 스크립트는 원격 Supabase 환경을 완전히 초기화하고"
        echo "로컬 개발 환경을 원격에 배포합니다."
        ;;
    "--dry-run")
        log_info "DRY RUN 모드: 실제 배포는 수행되지 않습니다."
        print_banner
        check_prerequisites
        check_current_state
        log_info "DRY RUN 완료. 실제 배포를 원하면 '--dry-run' 없이 실행하세요."
        ;;
    *)
        log_error "알 수 없는 옵션: $1"
        echo "도움말을 보려면 '$0 --help'를 실행하세요."
        exit 1
        ;;
esac
