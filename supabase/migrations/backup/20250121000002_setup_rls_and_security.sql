-- RLS 정책 및 보안 설정
-- 생성일: 2025-01-21
-- 목적: LME 가격 데이터 테이블의 보안 정책 설정

-- Row Level Security (RLS) 활성화
ALTER TABLE lme_processed_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawling_logs ENABLE ROW LEVEL SECURITY;
-- system_settings 테이블 제거로 RLS 비활성화

-- =================================
-- lme_processed_prices 테이블 정책
-- =================================

-- 읽기 정책: 인증된 사용자는 모든 데이터 조회 가능
CREATE POLICY "authenticated_read_lme_processed_prices" 
ON lme_processed_prices FOR SELECT 
TO authenticated 
USING (true);

-- 익명 사용자도 처리된 가격 데이터는 조회 가능 (공개 API용)
CREATE POLICY "public_read_lme_processed_prices" 
ON lme_processed_prices FOR SELECT 
TO anon 
USING (
  -- 최근 30일 데이터만 공개
  price_date >= CURRENT_DATE - INTERVAL '30 days'
);

-- 쓰기 정책: service_role만 삽입/업데이트/삭제 가능
CREATE POLICY "service_role_write_lme_processed_prices" 
ON lme_processed_prices FOR ALL 
TO service_role 
USING (true);

-- =================================
-- crawling_logs 테이블 정책
-- =================================

-- 읽기 정책: 인증된 사용자는 최근 7일 로그만 조회 가능
CREATE POLICY "authenticated_read_recent_crawling_logs" 
ON crawling_logs FOR SELECT 
TO authenticated 
USING (
  started_at >= CURRENT_DATE - INTERVAL '7 days'
);

-- 관리자는 모든 로그 조회 가능 (추후 사용자 역할 시스템 구현시 확장)
CREATE POLICY "admin_read_all_crawling_logs" 
ON crawling_logs FOR SELECT 
TO authenticated 
USING (
  -- 현재는 모든 인증된 사용자에게 권한 부여
  -- 추후 auth.users.user_metadata->>'role' = 'admin' 조건 추가 예정
  true
);

-- 쓰기 정책: service_role만 삽입/업데이트 가능
CREATE POLICY "service_role_write_crawling_logs" 
ON crawling_logs FOR INSERT 
TO service_role 
WITH CHECK (true);

CREATE POLICY "service_role_update_crawling_logs" 
ON crawling_logs FOR UPDATE 
TO service_role 
USING (true);

-- system_settings 테이블이 제거되어 관련 RLS 정책도 제거됨

-- =================================
-- 추가 보안 설정
-- =================================

-- get_system_setting 함수 제거됨 (환경변수 사용)

-- 최신 LME 가격 조회 함수
CREATE OR REPLACE FUNCTION get_latest_lme_prices()
RETURNS TABLE(
    metal_code VARCHAR(10),
    metal_name_kr VARCHAR(20),
    price_krw_per_kg DECIMAL(12,2),
    change_percent DECIMAL(8,4),
    change_type VARCHAR(10),
    price_date DATE,
    last_updated TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (p.metal_code)
        p.metal_code,
        p.metal_name_kr,
        p.price_krw_per_kg,
        p.change_percent,
        p.change_type,
        p.price_date,
        p.processed_at as last_updated
    FROM lme_processed_prices p
    WHERE p.price_date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY p.metal_code, p.price_date DESC, p.processed_at DESC;
END;
$$;

-- 크롤링 상태 확인 함수
CREATE OR REPLACE FUNCTION get_crawling_status()
RETURNS TABLE(
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    is_currently_running BOOLEAN,
    success_rate_24h DECIMAL(5,2),
    avg_duration_ms INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    last_success TIMESTAMPTZ;
    last_failure TIMESTAMPTZ;
    is_running BOOLEAN;
    success_rate DECIMAL(5,2);
    avg_duration INTEGER;
BEGIN
    -- 최근 성공 시각
    SELECT MAX(completed_at) INTO last_success
    FROM crawling_logs 
    WHERE status = 'success' AND completed_at IS NOT NULL;
    
    -- 최근 실패 시각
    SELECT MAX(started_at) INTO last_failure
    FROM crawling_logs 
    WHERE status IN ('failed', 'timeout') AND started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    -- 현재 실행 중인지 확인
    SELECT EXISTS(
        SELECT 1 FROM crawling_logs 
        WHERE status = 'running' AND started_at >= CURRENT_TIMESTAMP - INTERVAL '10 minutes'
    ) INTO is_running;
    
    -- 24시간 성공률 계산
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*)), 2)
        END
    INTO success_rate
    FROM crawling_logs 
    WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    AND status IN ('success', 'failed', 'partial', 'timeout');
    
    -- 평균 실행 시간
    SELECT ROUND(AVG(duration_ms))::INTEGER
    INTO avg_duration
    FROM crawling_logs 
    WHERE status = 'success' 
    AND started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    AND duration_ms IS NOT NULL;
    
    RETURN QUERY SELECT last_success, last_failure, is_running, success_rate, avg_duration;
END;
$$;

-- 함수 실행 권한 설정
GRANT EXECUTE ON FUNCTION get_latest_lme_prices() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_crawling_status() TO authenticated;

-- 테이블 코멘트 업데이트
COMMENT ON POLICY "authenticated_read_lme_processed_prices" ON lme_processed_prices IS '인증된 사용자의 처리된 LME 가격 데이터 읽기 권한';
COMMENT ON POLICY "public_read_lme_processed_prices" ON lme_processed_prices IS '익명 사용자의 최근 30일 LME 가격 데이터 읽기 권한 (공개 API용)';

-- get_system_setting 함수 코멘트 제거됨
COMMENT ON FUNCTION get_latest_lme_prices() IS '각 금속별 최신 LME 가격 정보를 반환하는 함수';
COMMENT ON FUNCTION get_crawling_status() IS '크롤링 시스템의 현재 상태와 성능 지표를 반환하는 함수';

 