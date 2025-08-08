-- ============================================
-- 크론 로그 정리 시스템 - 모니터링 및 스케줄링
-- ============================================

-- 3. 정리 상태 확인 및 모니터링 함수
CREATE OR REPLACE FUNCTION get_cron_logs_cleanup_stats()
RETURNS TABLE(
    total_logs INTEGER,
    logs_older_than_7days INTEGER,
    logs_older_than_30days INTEGER,
    disk_space_estimate_mb NUMERIC,
    last_cleanup_time TIMESTAMPTZ,
    last_cleanup_deleted_count INTEGER,
    next_cleanup_time TIMESTAMPTZ,
    job_type_distribution JSONB
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    avg_row_size_bytes NUMERIC := 500; -- 예상 행 크기 (UUID + TEXT + JSONB 등)
BEGIN
    RETURN QUERY
    WITH cleanup_stats AS (
        SELECT 
            completed_at,
            success_count,
            metadata
        FROM cron_execution_logs 
        WHERE job_type = 'system' 
          AND job_name = 'cron-logs-cleanup'
          AND status = 'success'
        ORDER BY completed_at DESC 
        LIMIT 1
    ),
    log_counts AS (
        SELECT 
            COUNT(*)::INTEGER as total,
            COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '7 days')::INTEGER as older_7d,
            COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days')::INTEGER as older_30d
        FROM cron_execution_logs
    ),
    job_distribution AS (
        SELECT jsonb_object_agg(job_type, cnt) as distribution
        FROM (
            SELECT job_type, COUNT(*) as cnt
            FROM cron_execution_logs
            GROUP BY job_type
        ) t
    )
    SELECT 
        lc.total as total_logs,
        lc.older_7d as logs_older_than_7days,
        lc.older_30d as logs_older_than_30days,
        ROUND((lc.older_7d * avg_row_size_bytes / 1024.0 / 1024.0)::NUMERIC, 2) as disk_space_estimate_mb,
        cs.completed_at as last_cleanup_time,
        COALESCE(cs.success_count, 0)::INTEGER as last_cleanup_deleted_count,
        -- 다음 정리 시간 계산 (매일 2:30)
        CASE 
            WHEN EXTRACT(HOUR FROM NOW()) < 2 OR (EXTRACT(HOUR FROM NOW()) = 2 AND EXTRACT(MINUTE FROM NOW()) < 30)
            THEN DATE_TRUNC('day', NOW()) + INTERVAL '2 hours 30 minutes'
            ELSE DATE_TRUNC('day', NOW()) + INTERVAL '1 day 2 hours 30 minutes'
        END as next_cleanup_time,
        COALESCE(jd.distribution, '{}'::jsonb) as job_type_distribution
    FROM log_counts lc, job_distribution jd
    LEFT JOIN cleanup_stats cs ON true;
END;
$$ LANGUAGE plpgsql;

-- 4. 크론 작업 스케줄 등록
DO $$
BEGIN
    -- 기존 cron-logs-cleanup 작업 제거 (존재하는 경우)
    BEGIN
        PERFORM cron.unschedule('cron-logs-cleanup');
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- 새로운 크론 작업 등록: 매일 새벽 2시 30분 실행
    PERFORM cron.schedule(
        'cron-logs-cleanup',
        '30 2 * * *',
        'SELECT cleanup_old_cron_logs();'
    );
    
    RAISE NOTICE '✅ 크론 로그 정리 시스템 설정 완료';
    RAISE NOTICE '   • cleanup_old_cron_logs() 함수 생성';
    RAISE NOTICE '   • get_cron_logs_cleanup_stats() 모니터링 함수 생성';
    RAISE NOTICE '   • cron-logs-cleanup: 매일 2:30 실행 스케줄 등록';
    RAISE NOTICE '   • 기본 설정: 7일 이전 데이터 삭제, 배치 크기 1000';
END
$$;
