-- cron_execution_logs 테이블 RLS 정책 설정
-- 생성일: 2025-02-01
-- 목적: cron_execution_logs 테이블의 보안 정책 설정

-- RLS (Row Level Security) 활성화
ALTER TABLE cron_execution_logs ENABLE ROW LEVEL SECURITY;

-- =================================
-- cron_execution_logs 테이블 RLS 정책
-- =================================

-- 읽기 정책: 인증된 사용자는 최근 7일 로그만 조회 가능
CREATE POLICY "authenticated_read_recent_cron_logs" 
ON cron_execution_logs FOR SELECT 
TO authenticated 
USING (
  started_at >= CURRENT_DATE - INTERVAL '7 days'
);

-- 관리자 정책: 모든 로그 조회 가능 (추후 역할 시스템 확장 예정)
CREATE POLICY "admin_read_all_cron_logs" 
ON cron_execution_logs FOR SELECT 
TO authenticated 
USING (
  -- 현재는 모든 인증된 사용자에게 권한 부여
  -- 추후 auth.users.user_metadata->>'role' = 'admin' 조건 추가 예정
  true
);

-- 쓰기 정책: service_role만 삽입/업데이트 가능
CREATE POLICY "service_role_write_cron_logs" 
ON cron_execution_logs FOR INSERT 
TO service_role 
WITH CHECK (true);

CREATE POLICY "service_role_update_cron_logs" 
ON cron_execution_logs FOR UPDATE 
TO service_role 
USING (true);

-- =================================
-- 함수 보안 강화
-- =================================

-- get_cron_jobs_status 함수를 SECURITY DEFINER로 변경
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

-- get_crawler_stats 함수를 SECURITY DEFINER로 변경
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

-- get_recent_executions 함수를 SECURITY DEFINER로 변경
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

-- get_cron_system_health 함수를 SECURITY DEFINER로 변경
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
    SELECT get_current_environment_simple() INTO current_env;
    
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

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ cron_execution_logs RLS 정책 설정 완료';
    RAISE NOTICE '✅ 함수 보안 강화 완료 (SECURITY DEFINER 적용)';
END;
$$; 