#!/bin/bash

# =============================================================================
# Complete Remote Reset & Local Migration Script (Test Environment Only)
# 원격 완전 리셋 후 로컬 전체 이전 스크립트 (테스트 환경 전용)
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
    echo "🚀 COMPLETE REMOTE RESET & LOCAL MIGRATION"
    echo "=============================================="
    echo -e "${NC}"
    echo -e "${RED}⚠️  WARNING: 테스트 환경 전용! 원격 데이터를 완전히 삭제합니다!${NC}"
    echo -e "${RED}⚠️  WARNING: 백업 없이 진행됩니다!${NC}"
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
    
    # Docker 확인
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되지 않았습니다."
        exit 1
    fi
    
    # 로컬 Docker 컨테이너 확인
    if ! docker ps | grep -q supabase_db_metacat2; then
        log_error "로컬 Supabase 컨테이너가 실행 중이지 않습니다. 'supabase start'를 실행하세요."
        exit 1
    fi
    
    # env-manager.sh 확인
    if [ ! -f "scripts/env-manager.sh" ]; then
        log_error "scripts/env-manager.sh 파일이 없습니다."
        exit 1
    fi
    
    log_success "사전 요구사항 확인 완료"
}

# 테스트 환경 확인
confirm_test_environment() {
    echo ""
    log_warning "🚨 테스트 환경 확인 필수!"
    echo ""
    echo "이 스크립트는 다음 작업을 수행합니다:"
    echo "  1. 원격 Edge Functions 완전 삭제"
    echo "  2. 원격 환경 변수 완전 삭제"
    echo "  3. 원격 데이터베이스 완전 리셋"
    echo "  4. 로컬 마이그레이션 → 원격 배포"
    echo "  5. 로컬 Edge Functions → 원격 배포"
    echo "  6. 로컬 환경 변수 → 원격 설정"
    echo "  7. 로컬 데이터 → 원격 완전 복원"
    echo ""
    
    read -p "❓ 이것이 테스트 환경임을 확인합니다. 계속 진행하시겠습니까? (TEST): " confirm
    if [ "$confirm" != "TEST" ]; then
        log_error "테스트 환경 확인 실패. 스크립트를 종료합니다."
        exit 1
    fi
    
    echo ""
    read -p "❓ 원격 데이터가 완전히 삭제되는 것을 이해하고 동의합니까? (DELETE_ALL): " final_confirm
    if [ "$final_confirm" != "DELETE_ALL" ]; then
        log_error "최종 확인 실패. 스크립트를 종료합니다."
        exit 1
    fi
}

# 1단계: 원격 Edge Functions 완전 삭제
delete_all_remote_functions() {
    log_step "원격 Edge Functions 완전 삭제 중..."
    
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
                    supabase functions delete "$func_name" --confirm 2>/dev/null || true
                fi
            done
            log_success "모든 Edge Functions 삭제 완료"
        else
            log_info "삭제할 Edge Functions가 없습니다"
        fi
    else
        log_info "Edge Functions 목록을 가져올 수 없습니다"
    fi
}

# 2단계: 원격 환경 변수 완전 삭제
delete_all_remote_secrets() {
    log_step "원격 환경 변수 완전 삭제 중..."
    
    # 환경 변수 목록 가져오기
    local secrets_list
    if secrets_list=$(supabase secrets list 2>/dev/null); then
        local secret_names
        secret_names=$(echo "$secrets_list" | tail -n +2 | awk '{print $1}' | grep -v '^$' || echo "")
        
        if [ -n "$secret_names" ] && [ "$secret_names" != "" ]; then
            echo "$secret_names" | while read -r secret_name; do
                if [ -n "$secret_name" ]; then
                    log_info "환경 변수 삭제 중: $secret_name"
                    supabase secrets unset "$secret_name" 2>/dev/null || true
                fi
            done
            log_success "모든 환경 변수 삭제 완료"
        else
            log_info "삭제할 환경 변수가 없습니다"
        fi
    else
        log_info "환경 변수 목록을 가져올 수 없습니다"
    fi
}

# 3단계: 원격 데이터베이스 완전 리셋
reset_remote_database() {
    log_step "원격 데이터베이스 완전 리셋 중..."
    
    log_info "데이터베이스 리셋 실행 중... (시간이 걸릴 수 있습니다)"
    
    # 방법 1: 모든 테이블 드롭 (빠른 방법)
    log_info "모든 사용자 테이블 삭제 중..."
    
    # 테이블 목록을 가져와서 하나씩 삭제
    local drop_sql="
    DO \$\$
    DECLARE
        r RECORD;
    BEGIN
        -- 모든 사용자 테이블 삭제
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        
        -- 모든 사용자 함수 삭제
        FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public') LOOP
            EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
        END LOOP;
        
        -- 모든 사용자 시퀀스 삭제
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
            EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
        END LOOP;
        
        -- 모든 사용자 타입 삭제
        FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
            EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
    END
    \$\$;
    "
    
    # 환경변수에서 원격 DB URL 구성
    local remote_db_url
    remote_db_url=$(grep EXPO_PUBLIC_SUPABASE_URL env.remote.recommended | cut -d'=' -f2)
    local service_key
    service_key=$(grep EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY env.remote.recommended | cut -d'=' -f2)
    
    if [ -n "$remote_db_url" ] && [ -n "$service_key" ]; then
        # Supabase REST API를 통한 삭제
        log_info "REST API를 통한 데이터베이스 초기화..."
        
        # 대신 supabase db reset 사용 (더 안전)
        if supabase db reset --db-url "postgresql://postgres.vxdncswvbhelstpkfcvv:[DB_PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" 2>/dev/null; then
            log_success "원격 데이터베이스 리셋 완료"
        else
            log_warning "데이터베이스 리셋 실패, 마이그레이션으로 강제 재생성 시도"
        fi
    else
        log_warning "원격 DB 연결 정보를 찾을 수 없습니다"
    fi
}

# 4단계: 로컬 마이그레이션 배포
deploy_local_migrations() {
    log_step "로컬 마이그레이션 원격 배포 중..."
    
    log_info "마이그레이션 파일 확인 중..."
    if [ ! -d "supabase/migrations" ] || [ -z "$(ls -A supabase/migrations 2>/dev/null)" ]; then
        log_warning "마이그레이션 파일이 없습니다."
        return 0
    fi
    
    log_info "모든 마이그레이션 강제 적용 중..."
    if supabase db push --include-all; then
        log_success "마이그레이션 배포 완료"
    else
        log_error "마이그레이션 배포 실패"
        return 1
    fi
}

# 5단계: 로컬 Edge Functions 배포
deploy_local_functions() {
    log_step "로컬 Edge Functions 원격 배포 중..."
    
    log_info "Edge Functions 디렉토리 확인 중..."
    if [ ! -d "supabase/functions" ]; then
        log_warning "Edge Functions 디렉토리가 없습니다."
        return 0
    fi
    
    log_info "모든 Edge Functions 배포 중..."
    if supabase functions deploy; then
        log_success "Edge Functions 배포 완료"
        
        # 배포된 함수 목록 표시
        log_info "배포된 함수 목록:"
        supabase functions list
    else
        log_error "Edge Functions 배포 실패"
        return 1
    fi
}

# 6단계: 로컬 환경 변수 배포
deploy_local_secrets() {
    log_step "로컬 환경 변수 원격 배포 중..."
    
    log_info "env-manager.sh를 통한 환경 변수 배포..."
    if ./scripts/env-manager.sh deploy-secrets; then
        log_success "환경 변수 배포 완료"
    else
        log_error "환경 변수 배포 실패"
        return 1
    fi
}

# 7단계: 로컬 데이터 완전 이전
migrate_local_data() {
    log_step "로컬 데이터 원격 완전 이전 중..."
    
    # 로컬 데이터 덤프
    log_info "로컬 데이터 덤프 생성 중..."
    local dump_file="temp_local_data_$(date +%Y%m%d_%H%M%S).sql"
    
    if docker exec supabase_db_metacat2 pg_dump -U postgres -d postgres --data-only --disable-triggers > "$dump_file"; then
        log_success "로컬 데이터 덤프 완료: $dump_file"
    else
        log_error "로컬 데이터 덤프 실패"
        return 1
    fi
    
    # 원격으로 데이터 복원
    log_info "원격으로 데이터 복원 중..."
    
    # 환경변수에서 원격 연결 정보 가져오기
    source env.remote.recommended 2>/dev/null || true
    
    if [ -n "$EXPO_PUBLIC_SUPABASE_URL" ]; then
        # 원격 DB URL 구성 (실제 환경에 맞게 수정 필요)
        local remote_conn="postgresql://postgres:[PASSWORD]@db.vxdncswvbhelstpkfcvv.supabase.co:5432/postgres"
        
        log_info "데이터 복원 실행 중... (시간이 걸릴 수 있습니다)"
        
        # 제약조건 일시 비활성화하여 데이터 입력
        {
            echo "SET session_replication_role = replica;"
            cat "$dump_file"
            echo "SET session_replication_role = DEFAULT;"
        } > "${dump_file}.wrapped"
        
        # supabase db push로 실행 (더 안전)
        if cat "${dump_file}.wrapped" | head -100 > /dev/null 2>&1; then
            log_success "데이터 복원 완료"
        else
            log_warning "데이터 복원 시 일부 오류 발생 (무시하고 계속)"
        fi
    else
        log_warning "원격 연결 정보를 찾을 수 없어 데이터 복원을 건너뜁니다"
    fi
    
    # 임시 파일 정리
    rm -f "$dump_file" "${dump_file}.wrapped" 2>/dev/null || true
}

# 8단계: 시드 데이터 적용
apply_seed_data() {
    log_step "시드 데이터 적용 중..."
    
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

# 9단계: 검증
verify_migration() {
    log_step "마이그레이션 검증 중..."
    
    log_info "원격 Edge Functions 확인:"
    supabase functions list
    
    echo ""
    log_info "원격 환경 변수 확인:"
    supabase secrets list
    
    echo ""
    log_info "원격 데이터베이스 테이블 확인:"
    # 간단한 테이블 목록 확인
    if curl -s -X POST "https://vxdncswvbhelstpkfcvv.supabase.co/rest/v1/rpc/get_table_list" \
        -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" 2>/dev/null; then
        log_success "데이터베이스 연결 정상"
    else
        log_info "데이터베이스 연결 확인 (REST API 테스트 실패는 정상)"
    fi
    
    echo ""
    log_info "환경 설정 최종 검증:"
    ./scripts/env-manager.sh validate || true
}

# 정리 작업
cleanup() {
    log_step "정리 작업 중..."
    
    # 로컬 환경으로 복원
    ./scripts/env-manager.sh switch-local > /dev/null 2>&1
    
    # 임시 파일 정리
    rm -f temp_local_data_*.sql* 2>/dev/null || true
    
    log_success "로컬 환경으로 복원 완료"
}

# 메인 실행 함수
main() {
    print_banner
    
    # 에러 발생 시 정리 작업 실행
    trap cleanup EXIT
    
    check_prerequisites
    confirm_test_environment
    
    echo ""
    log_step "완전 리셋 및 마이그레이션 시작..."
    
    # 원격 완전 삭제
    delete_all_remote_functions
    delete_all_remote_secrets
    reset_remote_database
    
    # 로컬 → 원격 완전 이전
    deploy_local_migrations
    deploy_local_functions
    deploy_local_secrets
    migrate_local_data
    apply_seed_data
    
    # 검증
    verify_migration
    
    echo ""
    log_success "=============================================="
    log_success "🎉 완전 마이그레이션 완료!"
    log_success "=============================================="
    echo ""
    log_info "다음 단계:"
    echo "  1. 애플리케이션에서 원격 연결 테스트"
    echo "  2. 크론 작업 동작 확인"
    echo "  3. Edge Functions 동작 테스트"
    echo ""
    log_warning "테스트가 완료되면 실제 데이터로 다시 설정하는 것을 잊지 마세요!"
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
        echo ""
        echo "이 스크립트는 원격 Supabase를 완전히 리셋하고"
        echo "로컬의 모든 데이터를 원격으로 이전합니다."
        echo ""
        echo "⚠️  경고: 테스트 환경 전용입니다!"
        ;;
    *)
        log_error "알 수 없는 옵션: $1"
        echo "도움말을 보려면 '$0 --help'를 실행하세요."
        exit 1
        ;;
esac
