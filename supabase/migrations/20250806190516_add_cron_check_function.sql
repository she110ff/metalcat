-- 크론 상태 확인을 위한 임시 함수
CREATE OR REPLACE FUNCTION check_cron_status()
RETURNS TABLE (
  cron_jobs_info jsonb,
  recent_logs jsonb,
  system_health jsonb
) AS $$
BEGIN
  -- 크론 작업 정보
  cron_jobs_info := (
    SELECT jsonb_agg(
      jsonb_build_object(
        'jobname', jobname,
        'schedule', schedule,
        'active', active,
        'command', command
      )
    )
    FROM cron.job
  );
  
  -- 최근 로그
  recent_logs := (
    SELECT jsonb_agg(
      jsonb_build_object(
        'job_type', job_type,
        'job_name', job_name,
        'status', status,
        'started_at', started_at,
        'completed_at', completed_at,
        'duration_ms', duration_ms
      )
    )
    FROM (
      SELECT * FROM cron_execution_logs 
      ORDER BY started_at DESC 
      LIMIT 5
    ) recent
  );
  
  -- 시스템 상태
  system_health := get_cron_system_health();
  
  RETURN QUERY SELECT cron_jobs_info, recent_logs, system_health;
END;
$$ LANGUAGE plpgsql;

-- 권한 설정
GRANT EXECUTE ON FUNCTION check_cron_status() TO authenticated, anon;
