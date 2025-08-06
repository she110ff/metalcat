-- ============================================
-- LME 시스템 통합 마이그레이션
-- 생성일: 2025-02-01
-- 목적: LME 가격 데이터 수집, 저장, 모니터링 전체 시스템
-- ============================================

-- ============================================
-- 1. 확장 프로그램 활성화
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- 2. LME 가격 데이터 테이블
-- ============================================

-- 처리된 가격 테이블 (메인 데이터)
CREATE TABLE IF NOT EXISTS lme_processed_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 금속 정보
  metal_code VARCHAR(10) NOT NULL,
  metal_name_kr VARCHAR(20) NOT NULL,
  
  -- 변환된 가격 정보
  price_krw_per_kg DECIMAL(12,2) NOT NULL, -- 원/KG (메인 표시 가격)
  price_usd_per_ton DECIMAL(12,4) NOT NULL, -- USD/톤 (원본 가격)
  
  -- 변화율 정보
  change_percent DECIMAL(8,4), -- 전일 대비 변화율
  change_type VARCHAR(10) CHECK (change_type IN ('positive', 'negative', 'unchanged')),
  change_amount_krw DECIMAL(12,2), -- 원화 기준 변화량
  
  -- 환율 정보
  exchange_rate DECIMAL(10,4) NOT NULL, -- 적용된 USD/KRW 환율
  exchange_rate_source VARCHAR(50) DEFAULT 'manual', -- 환율 출처
  
  -- 시간 정보
  price_date DATE NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 유니크 제약조건 (하루에 하나의 금속당 하나의 레코드)
  UNIQUE(metal_code, price_date)
);

-- 크롤링 실행 로그 테이블 (구버전 호환성 유지)
CREATE TABLE IF NOT EXISTS crawling_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 실행 정보
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'partial', 'timeout')),
  
  -- 실행 결과 통계
  total_metals_attempted INTEGER DEFAULT 0,
  successful_extractions INTEGER DEFAULT 0,
  failed_extractions INTEGER DEFAULT 0,
  
  -- 오류 정보
  error_message TEXT,
  
  -- 성능 메트릭
  duration_ms INTEGER,
  
  -- 시간 정보
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 크론 시스템 테이블
-- ============================================

-- 통합 Cron 실행 로그 테이블
CREATE TABLE IF NOT EXISTS cron_execution_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type text NOT NULL, -- 'lme', 'auction' 등
    job_name text NOT NULL,
    status text NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')),
    started_at timestamptz NOT NULL DEFAULT NOW(),
    completed_at timestamptz,
    duration_ms integer,
    success_count integer DEFAULT 0,
    error_message text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT NOW()
);

-- ============================================
-- 4. 인덱스 생성
-- ============================================

-- LME 처리된 데이터 조회 최적화
CREATE INDEX IF NOT EXISTS idx_lme_processed_prices_metal_date ON lme_processed_prices(metal_code, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_lme_processed_prices_processed_at ON lme_processed_prices(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lme_processed_prices_change_type ON lme_processed_prices(change_type, price_date DESC);

-- 크롤링 로그 모니터링
CREATE INDEX IF NOT EXISTS idx_crawling_logs_status_started ON crawling_logs(status, started_at DESC);

-- 크론 실행 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_type_status ON cron_execution_logs(job_type, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_started_at ON cron_execution_logs(started_at DESC);

-- ============================================
-- 5. RLS (Row Level Security) 설정
-- ============================================

-- RLS 활성화
ALTER TABLE lme_processed_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawling_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_execution_logs ENABLE ROW LEVEL SECURITY;

-- lme_processed_prices 정책
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

-- crawling_logs 정책
CREATE POLICY "authenticated_read_recent_crawling_logs" 
ON crawling_logs FOR SELECT 
TO authenticated 
USING (
  started_at >= CURRENT_DATE - INTERVAL '7 days'
);

CREATE POLICY "admin_read_all_crawling_logs" 
ON crawling_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "service_role_write_crawling_logs" 
ON crawling_logs FOR INSERT 
TO service_role 
WITH CHECK (true);

CREATE POLICY "service_role_update_crawling_logs" 
ON crawling_logs FOR UPDATE 
TO service_role 
USING (true);

-- cron_execution_logs 정책
CREATE POLICY "authenticated_read_recent_cron_logs" 
ON cron_execution_logs FOR SELECT 
TO authenticated 
USING (
  started_at >= CURRENT_DATE - INTERVAL '7 days'
);

CREATE POLICY "admin_read_all_cron_logs" 
ON cron_execution_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "service_role_write_cron_logs" 
ON cron_execution_logs FOR INSERT 
TO service_role 
WITH CHECK (true);

CREATE POLICY "service_role_update_cron_logs" 
ON cron_execution_logs FOR UPDATE 
TO service_role 
USING (true);

-- ============================================
-- 6. 공통 유틸리티 함수
-- ============================================

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 7. 환경 및 설정 관리 함수
-- ============================================

-- 환경 감지 함수 (기존 호환성)
CREATE OR REPLACE FUNCTION get_current_environment()
RETURNS text AS $$
BEGIN
    -- 더 정확한 로컬 환경 감지 로직
    -- 로컬 Supabase는 특정 포트(54332)를 사용하고, 특정 설정들이 있음
    RETURN CASE 
        WHEN current_setting('port', true)::integer = 54332 
        THEN 'local'
        WHEN current_setting('port', true)::integer = 5432
             AND EXISTS (
                 SELECT 1 FROM pg_stat_activity 
                 WHERE application_name LIKE '%supabase%' 
                 OR client_addr::text LIKE '172.%'
             )
        THEN 'local'
        WHEN current_setting('listen_addresses', true) = '*' 
             AND current_setting('port', true)::integer IN (5432, 54332)
        THEN 'local'  -- Supabase 로컬은 보통 이 조건
        ELSE 'production'
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. LME 데이터 조회 함수
-- ============================================

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

-- ============================================
-- 9. 크롤러 실행 함수
-- ============================================

-- LME 크롤러 실행 함수
CREATE OR REPLACE FUNCTION run_lme_crawler()
RETURNS void AS $$
DECLARE
    log_id uuid;
    crawler_url text;
    request_id bigint;
    response_record record;
    start_time timestamptz;
    exec_duration_ms integer;
    current_env text;
BEGIN
    start_time := NOW();
    
    -- 환경별 URL 설정 (Edge Function에서 환경 변수로 자동 처리)
    SELECT get_current_environment() INTO current_env;
    
    IF current_env = 'production' THEN
        -- 프로덕션: 실제 프로젝트 URL 사용
        -- 실제 배포시에는 이 URL을 프로젝트의 실제 URL로 변경해야 함
        crawler_url := 'https://vxdncswvbhelstpkfcvv.supabase.co/functions/v1/lme-crawler';
        RAISE NOTICE '🚀 프로덕션 환경에서 LME 크롤러 실행: %', crawler_url;
    ELSE
        -- 로컬 환경: Docker 내부 네트워크 IP 사용 
        crawler_url := 'http://172.18.0.5:8000/functions/v1/lme-crawler';
        RAISE NOTICE '🔧 로컬 환경에서 LME 크롤러 실행: %', crawler_url;
    END IF;
    
    -- 실행 로그 시작 기록
    INSERT INTO cron_execution_logs (
        job_type,
        job_name,
        status,
        started_at,
        metadata
    ) VALUES (
        'lme',
        'lme-crawler-minutely',
        'running',
        start_time,
        jsonb_build_object('url', crawler_url, 'environment', current_env)
    ) RETURNING id INTO log_id;
    
    RAISE NOTICE 'LME 크롤러 시작: % (로그 ID: %, URL: %)', start_time, log_id, crawler_url;
    
    -- Edge Function 호출 (Authorization 헤더 추가)
    SELECT net.http_post(
        url := crawler_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
        ),
        body := '{}'::jsonb
    ) INTO request_id;
    
    -- 응답 대기
    PERFORM pg_sleep(3);
    
    -- 응답 확인
    SELECT status_code, content, error_msg 
    INTO response_record
    FROM net._http_response 
    ORDER BY id DESC 
    LIMIT 1;
    
    -- 실행 시간 계산
    exec_duration_ms := EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000;
    
    -- 응답 처리
    IF response_record.status_code = 200 THEN
        -- 성공
        UPDATE cron_execution_logs 
        SET 
            status = 'success',
            completed_at = NOW(),
            duration_ms = exec_duration_ms,
            success_count = 6, -- LME는 6개 금속
            metadata = metadata || jsonb_build_object(
                'http_status', response_record.status_code,
                'response_size', length(response_record.content)
            )
        WHERE id = log_id;
        
        RAISE NOTICE 'LME 크롤러 성공: % (로그 ID: %, 소요시간: %ms)', NOW(), log_id, exec_duration_ms;
    ELSE
        -- 실패
        UPDATE cron_execution_logs 
        SET 
            status = 'failed',
            completed_at = NOW(),
            duration_ms = exec_duration_ms,
            error_message = COALESCE(response_record.error_msg, 'HTTP ' || COALESCE(response_record.status_code::text, 'Unknown')),
            metadata = metadata || jsonb_build_object(
                'http_status', COALESCE(response_record.status_code, 0),
                'error_type', 'http_error'
            )
        WHERE id = log_id;
        
        RAISE NOTICE 'LME 크롤러 실패: % (오류: %)', NOW(), COALESCE(response_record.error_msg, 'HTTP Error');
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    -- 예외 발생시 로그 업데이트
    exec_duration_ms := EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000;
    
    UPDATE cron_execution_logs 
    SET 
        status = 'failed',
        completed_at = NOW(),
        duration_ms = exec_duration_ms,
        error_message = SQLERRM,
        metadata = metadata || jsonb_build_object(
            'error_type', 'exception',
            'sql_state', SQLSTATE
        )
    WHERE id = log_id;
    
    RAISE NOTICE 'LME 크롤러 예외 발생: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. 모니터링 및 관리 함수
-- ============================================

-- 모든 cron job 상태 확인
CREATE OR REPLACE FUNCTION get_cron_jobs_status()
RETURNS TABLE (
    jobid bigint,
    jobname text,
    schedule text,
    active boolean,
    last_run_time timestamptz,
    last_run_status text,
    last_execution_log_id uuid,
    last_execution_duration_ms integer
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.jobid,
        j.jobname,
        j.schedule,
        j.active,
        jr.start_time as last_run_time,
        jr.status as last_run_status,
        cel.id as last_execution_log_id,
        cel.duration_ms as last_execution_duration_ms
    FROM cron.job j
    LEFT JOIN LATERAL (
        SELECT start_time, status
        FROM cron.job_run_details jrd
        WHERE jrd.jobid = j.jobid
        ORDER BY start_time DESC
        LIMIT 1
    ) jr ON true
    LEFT JOIN LATERAL (
        SELECT id, duration_ms
        FROM cron_execution_logs cel
        WHERE cel.job_name = j.jobname
        ORDER BY started_at DESC
        LIMIT 1
    ) cel ON true
    ORDER BY j.jobname;
END;
$$ LANGUAGE plpgsql;

-- 특정 job type의 실행 통계
CREATE OR REPLACE FUNCTION get_crawler_stats(
    crawler_type_param text DEFAULT NULL,
    hours_back integer DEFAULT 24
)
RETURNS TABLE (
    job_type text,
    total_executions bigint,
    successful_executions bigint,
    failed_executions bigint,
    success_rate numeric,
    avg_duration_ms numeric,
    last_success_time timestamptz,
    last_failure_time timestamptz
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cel.job_type,
        COUNT(*)::bigint as total_executions,
        COUNT(*) FILTER (WHERE cel.status = 'success')::bigint as successful_executions,
        COUNT(*) FILTER (WHERE cel.status = 'failed')::bigint as failed_executions,
        ROUND(
            (COUNT(*) FILTER (WHERE cel.status = 'success')::numeric / COUNT(*)::numeric * 100), 2
        ) as success_rate,
        ROUND(AVG(cel.duration_ms), 2) as avg_duration_ms,
        MAX(cel.completed_at) FILTER (WHERE cel.status = 'success') as last_success_time,
        MAX(cel.completed_at) FILTER (WHERE cel.status = 'failed') as last_failure_time
    FROM cron_execution_logs cel
    WHERE 
        cel.started_at >= NOW() - (hours_back || ' hours')::interval
        AND (crawler_type_param IS NULL OR cel.job_type = crawler_type_param)
    GROUP BY cel.job_type
    ORDER BY cel.job_type;
END;
$$ LANGUAGE plpgsql;

-- 최근 실행 로그 조회
CREATE OR REPLACE FUNCTION get_recent_executions(
    job_type_param text DEFAULT NULL,
    limit_count integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    job_type text,
    job_name text,
    status text,
    started_at timestamptz,
    completed_at timestamptz,
    duration_ms integer,
    success_count integer,
    error_message text,
    environment text,
    url text
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cel.id,
        cel.job_type,
        cel.job_name,
        cel.status,
        cel.started_at,
        cel.completed_at,
        cel.duration_ms,
        cel.success_count,
        cel.error_message,
        cel.metadata->>'environment' as environment,
        cel.metadata->>'url' as url
    FROM cron_execution_logs cel
    WHERE 
        (job_type_param IS NULL OR cel.job_type = job_type_param)
    ORDER BY cel.started_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 시스템 상태 체크 함수
CREATE OR REPLACE FUNCTION get_cron_system_health()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
    current_env text;
    total_jobs integer;
    active_jobs integer;
    recent_failures integer;
BEGIN
    SELECT get_current_environment() INTO current_env;
    
    -- cron job 통계
    SELECT COUNT(*), COUNT(*) FILTER (WHERE active = true)
    INTO total_jobs, active_jobs
    FROM cron.job;
    
    -- 최근 1시간 실패 횟수
    SELECT COUNT(*)::integer
    INTO recent_failures
    FROM cron_execution_logs
    WHERE status = 'failed' 
    AND started_at >= NOW() - INTERVAL '1 hour';
    
    -- 결과 JSON 생성
    result := jsonb_build_object(
        'environment', current_env,
        'timestamp', NOW(),
        'cron_jobs', jsonb_build_object(
            'total', total_jobs,
            'active', active_jobs,
            'inactive', total_jobs - active_jobs
        ),
        'recent_failures_1h', recent_failures,
        'health_status', CASE 
            WHEN recent_failures = 0 THEN 'healthy'
            WHEN recent_failures < 5 THEN 'warning'
            ELSE 'critical'
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;



-- ============================================
-- 11. 초기 설정 데이터
-- ============================================



-- ============================================
-- 12. 크론 작업 스케줄링
-- ============================================

-- LME 크롤러 cron job 생성 (15분마다 실행)
SELECT cron.schedule(
    'lme-crawler-minutely',
    '*/15 * * * *',
    'SELECT run_lme_crawler();'
);

-- ============================================
-- 13. 권한 설정
-- ============================================

-- 함수 실행 권한 설정
GRANT EXECUTE ON FUNCTION get_latest_lme_prices() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_crawling_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cron_jobs_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_crawler_stats(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_executions(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cron_system_health() TO authenticated;

-- ============================================
-- 14. 코멘트 및 문서화
-- ============================================

COMMENT ON TABLE lme_processed_prices IS 'LME 가격 데이터 (처리된 형태)';
COMMENT ON TABLE crawling_logs IS '크롤링 실행 로그 (구버전 호환성)';
COMMENT ON TABLE cron_execution_logs IS '통합 크론 실행 로그';

COMMENT ON COLUMN lme_processed_prices.change_type IS '가격 변화 방향: positive(상승), negative(하락), unchanged(변화없음)';
COMMENT ON COLUMN crawling_logs.status IS '실행 상태: running(실행중), success(성공), failed(실패), partial(부분성공), timeout(타임아웃)';

COMMENT ON FUNCTION get_latest_lme_prices() IS '각 금속별 최신 LME 가격 정보를 반환하는 함수';
COMMENT ON FUNCTION get_crawling_status() IS '크롤링 시스템의 현재 상태와 성능 지표를 반환하는 함수';
COMMENT ON FUNCTION run_lme_crawler() IS 'LME 크롤러 실행 함수 - 크론 작업에서 호출';

-- ============================================
-- 완료 메시지 및 추가 설정 안내
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🎉 LME 시스템 통합 완료!';
  RAISE NOTICE '📊 테이블: lme_processed_prices, crawling_logs, cron_execution_logs';
  RAISE NOTICE '🔒 RLS 정책: 익명/인증/서비스 역할별 권한 설정';
  RAISE NOTICE '⚙️ 함수: 가격 조회, 상태 확인, 크롤러 실행, 모니터링';
  RAISE NOTICE '⏰ 크론 작업: lme-crawler-minutely (15분마다 실행)';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 프로덕션 배포시 추가 설정:';
  RAISE NOTICE '   1. 마이그레이션 파일에서 ''https://your-project.supabase.co''를 실제 프로젝트 URL로 변경';
  RAISE NOTICE '   2. Edge Function에서는 환경 변수(EXPO_PUBLIC_SUPABASE_URL)가 자동으로 사용됩니다';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 LME 가격 수집 및 모니터링 시스템 준비 완료!';
END $$;