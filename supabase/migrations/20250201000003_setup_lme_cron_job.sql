-- 확장 가능한 Cron 시스템 설정
-- pg_cron과 pg_net 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. 애플리케이션 설정 테이블
CREATE TABLE IF NOT EXISTS app_config (
    key text PRIMARY KEY,
    value text NOT NULL,
    environment text NOT NULL DEFAULT 'local',
    description text,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- 환경별 설정 초기 데이터
INSERT INTO app_config (key, value, environment, description) VALUES 
('lme_crawler_url', 'http://host.docker.internal:54331/functions/v1/lme-crawler', 'local', 'LME 크롤러 로컬 환경 URL'),
('lme_crawler_url', 'https://your-project.supabase.co/functions/v1/lme-crawler', 'production', 'LME 크롤러 프로덕션 환경 URL')
ON CONFLICT (key) DO NOTHING;

-- 2. 통합 Cron 실행 로그 테이블
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_type_status ON cron_execution_logs(job_type, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_started_at ON cron_execution_logs(started_at DESC);

-- 3. 환경 감지 및 설정 조회 함수
CREATE OR REPLACE FUNCTION get_current_environment()
RETURNS text AS $$
BEGIN
    -- Docker 환경에서는 host.docker.internal 사용 가능 여부로 판단
    -- 실제로는 더 정교한 환경 감지 로직 필요
    RETURN CASE 
        WHEN current_setting('listen_addresses', true) LIKE '%*%' THEN 'production'
        ELSE 'local'
    END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_app_config(config_key text)
RETURNS text AS $$
DECLARE
    current_env text;
    config_value text;
BEGIN
    -- 현재 환경 감지
    SELECT get_current_environment() INTO current_env;
    
    -- 환경별 설정값 조회
    SELECT value INTO config_value 
    FROM app_config 
    WHERE key = config_key AND environment = current_env;
    
    -- 설정값이 없으면 local 환경값 사용
    IF config_value IS NULL THEN
        SELECT value INTO config_value 
        FROM app_config 
        WHERE key = config_key AND environment = 'local';
    END IF;
    
    RETURN config_value;
END;
$$ LANGUAGE plpgsql;

-- 4. 공통 크롤러 실행 함수
CREATE OR REPLACE FUNCTION run_generic_crawler(
    crawler_type text,
    url_key text,
    job_name text
) RETURNS uuid AS $$
DECLARE
    log_id uuid;
    crawler_url text;
    request_id bigint;
    response_record record;
    start_time timestamptz;
    duration_ms integer;
BEGIN
    start_time := NOW();
    
    -- URL 설정 조회
    SELECT get_app_config(url_key) INTO crawler_url;
    
    IF crawler_url IS NULL THEN
        RAISE EXCEPTION '설정을 찾을 수 없습니다: %', url_key;
    END IF;
    
    -- 실행 로그 시작 기록
    INSERT INTO cron_execution_logs (
        job_type,
        job_name,
        status,
        started_at,
        metadata
    ) VALUES (
        crawler_type,
        job_name,
        'running',
        start_time,
        jsonb_build_object('url', crawler_url, 'environment', get_current_environment())
    ) RETURNING id INTO log_id;
    
    RAISE NOTICE '% 크롤러 시작: % (로그 ID: %, URL: %)', upper(crawler_type), start_time, log_id, crawler_url;
    
    -- Edge Function 호출
    SELECT net.http_post(
        url := crawler_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
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
    duration_ms := EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000;
    
    -- 응답 처리
    IF response_record.status_code = 200 THEN
        -- 성공
        UPDATE cron_execution_logs 
        SET 
            status = 'success',
            completed_at = NOW(),
            duration_ms = duration_ms,
            success_count = 6, -- LME는 6개 금속
            metadata = metadata || jsonb_build_object(
                'http_status', response_record.status_code,
                'response_size', length(response_record.content)
            )
        WHERE id = log_id;
        
        RAISE NOTICE '% 크롤러 성공: % (로그 ID: %, 소요시간: %ms)', upper(crawler_type), NOW(), log_id, duration_ms;
    ELSE
        -- 실패
        UPDATE cron_execution_logs 
        SET 
            status = 'failed',
            completed_at = NOW(),
            duration_ms = duration_ms,
            error_message = COALESCE(response_record.error_msg, 'HTTP ' || COALESCE(response_record.status_code::text, 'Unknown')),
            metadata = metadata || jsonb_build_object(
                'http_status', COALESCE(response_record.status_code, 0),
                'error_type', 'http_error'
            )
        WHERE id = log_id;
        
        RAISE NOTICE '% 크롤러 실패: % (오류: %)', upper(crawler_type), NOW(), COALESCE(response_record.error_msg, 'HTTP Error');
    END IF;
    
    RETURN log_id;
    
EXCEPTION WHEN OTHERS THEN
    -- 예외 발생시 로그 업데이트
    duration_ms := EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000;
    
    UPDATE cron_execution_logs 
    SET 
        status = 'failed',
        completed_at = NOW(),
        duration_ms = duration_ms,
        error_message = SQLERRM,
        metadata = metadata || jsonb_build_object(
            'error_type', 'exception',
            'sql_state', SQLSTATE
        )
    WHERE id = log_id;
    
    RAISE NOTICE '% 크롤러 예외 발생: %', upper(crawler_type), SQLERRM;
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 5. LME 크롤러 전용 함수
CREATE OR REPLACE FUNCTION run_lme_crawler()
RETURNS void AS $$
DECLARE
    log_id uuid;
BEGIN
    SELECT run_generic_crawler('lme', 'lme_crawler_url', 'lme-crawler-minutely') INTO log_id;
END;
$$ LANGUAGE plpgsql;

-- 6. LME 크롤러 cron job 생성 (1분마다 실행)
SELECT cron.schedule(
    'lme-crawler-minutely',
    '* * * * *',
    'SELECT run_lme_crawler();'
);

-- 7. 통합 모니터링 및 관리 함수들

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
) AS $$
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
) AS $$
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
) AS $$
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

-- 설정 관리 함수
CREATE OR REPLACE FUNCTION update_app_config(
    config_key text,
    config_value text,
    config_environment text DEFAULT 'local',
    config_description text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO app_config (key, value, environment, description, updated_at)
    VALUES (config_key, config_value, config_environment, config_description, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET 
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, app_config.description),
        updated_at = NOW();
        
    RAISE NOTICE '설정 업데이트됨: % = % (환경: %)', config_key, config_value, config_environment;
END;
$$ LANGUAGE plpgsql;

-- 현재 환경의 모든 설정 조회
CREATE OR REPLACE FUNCTION get_current_app_config()
RETURNS TABLE (
    key text,
    value text,
    environment text,
    description text,
    updated_at timestamptz
) AS $$
DECLARE
    current_env text;
BEGIN
    SELECT get_current_environment() INTO current_env;
    
    RETURN QUERY
    SELECT 
        ac.key,
        ac.value,
        ac.environment,
        ac.description,
        ac.updated_at
    FROM app_config ac
    WHERE ac.environment = current_env
    ORDER BY ac.key;
END;
$$ LANGUAGE plpgsql;

-- 8. 시스템 상태 체크 함수 (종합 대시보드용)
CREATE OR REPLACE FUNCTION get_cron_system_health()
RETURNS jsonb AS $$
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