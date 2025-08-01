-- LME 크롤러를 위한 cron job 설정
-- pg_cron과 pg_net 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- LME 크롤러 실행 함수 생성 (실제 Edge Function 호출)
CREATE OR REPLACE FUNCTION run_lme_crawler()
RETURNS void AS $$
DECLARE
    log_id uuid;
    request_id bigint;
    response_record record;
BEGIN
    -- 크롤링 로그 시작 기록
    INSERT INTO crawling_logs (
        status,
        started_at
    ) VALUES (
        'running',
        NOW()
    ) RETURNING id INTO log_id;
    
    RAISE NOTICE 'LME 크롤러 시작: % (로그 ID: %)', NOW(), log_id;
    
    -- Edge Function 호출 (로컬 환경: host.docker.internal, 프로덕션: 실제 URL)
    SELECT net.http_post(
        url := 'http://host.docker.internal:54331/functions/v1/lme-crawler',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    ) INTO request_id;
    
    -- 잠시 대기 (응답 처리 시간)
    PERFORM pg_sleep(3);
    
    -- 가장 최근 응답 확인
    SELECT status_code, content, error_msg 
    INTO response_record
    FROM net._http_response 
    ORDER BY id DESC 
    LIMIT 1;
    
    -- 응답 처리
    IF response_record.status_code = 200 THEN
        -- 성공
        UPDATE crawling_logs 
        SET 
            status = 'success',
            completed_at = NOW(),
            successful_extractions = 6
        WHERE id = log_id;
        
        RAISE NOTICE 'LME 크롤러 성공: % (로그 ID: %)', NOW(), log_id;
    ELSE
        -- 실패
        UPDATE crawling_logs 
        SET 
            status = 'failed',
            completed_at = NOW(),
            error_message = COALESCE(response_record.error_msg, 'HTTP ' || COALESCE(response_record.status_code::text, 'Unknown'))
        WHERE id = log_id;
        
        RAISE NOTICE 'LME 크롤러 실패: % (오류: %)', NOW(), COALESCE(response_record.error_msg, 'HTTP Error');
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    -- 에러 발생시 로그 업데이트
    UPDATE crawling_logs 
    SET 
        status = 'failed',
        completed_at = NOW(),
        error_message = SQLERRM
    WHERE id = log_id;
    
    RAISE NOTICE 'LME 크롤러 예외 발생: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 1분마다 LME 크롤러 실행하는 cron job 생성
SELECT cron.schedule(
    'lme-crawler-minutely',
    '* * * * *',
    'SELECT run_lme_crawler();'
);

-- cron job 상태 확인 함수
CREATE OR REPLACE FUNCTION check_lme_cron_status()
RETURNS TABLE (
    jobid bigint,
    jobname text,
    schedule text,
    active boolean,
    last_run_time timestamptz,
    last_run_status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.jobid,
        j.jobname,
        j.schedule,
        j.active,
        jr.start_time as last_run_time,
        jr.status as last_run_status
    FROM cron.job j
    LEFT JOIN LATERAL (
        SELECT start_time, status
        FROM cron.job_run_details jrd
        WHERE jrd.jobid = j.jobid
        ORDER BY start_time DESC
        LIMIT 1
    ) jr ON true
    WHERE j.jobname = 'lme-crawler-minutely';
END;
$$ LANGUAGE plpgsql;