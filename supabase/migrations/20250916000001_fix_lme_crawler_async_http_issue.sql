-- 마이그레이션: lme-crawler-minutely 비동기 HTTP 처리 문제 해결
-- 작성일: 2025-09-16
-- 목적: net.http_collect_response 사용으로 PostgreSQL 비동기 HTTP 요청 처리 문제 해결

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS run_lme_crawler();

-- net.http_collect_response를 사용하는 run_lme_crawler() 함수 생성
CREATE OR REPLACE FUNCTION run_lme_crawler()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    -- 환경별 URL 설정
    SELECT get_current_environment() INTO current_env;
    
    IF current_env = 'production' THEN
        crawler_url := 'https://vxdncswvbhelstpkfcvv.supabase.co/functions/v1/lme-crawler';
        RAISE NOTICE '🚀 프로덕션 환경에서 LME 크롤러 실행: %', crawler_url;
    ELSE
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
    
    -- Edge Function 호출 (anon 키 사용)
    SELECT net.http_post(
        url := crawler_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6I'
        ),
        body := '{}'::jsonb
    ) INTO request_id;
    
    RAISE NOTICE '📡 HTTP 요청 전송 완료, request_id: %', request_id;
    
    -- 핵심 수정: net.http_collect_response 사용
    -- 이 함수는 응답이 완료될 때까지 동기적으로 대기합니다
    SELECT status, message, status_code, content_type, content, timed_out, error_msg
    INTO response_record
    FROM net.http_collect_response(request_id, async := false);
    
    RAISE NOTICE '✅ HTTP 응답 수집 완료: status=%, status_code=%, timed_out=%', 
        response_record.status, response_record.status_code, response_record.timed_out;
    
    -- 실행 시간 계산
    exec_duration_ms := EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000;
    
    -- 응답 처리
    IF response_record.status = 'SUCCESS' AND response_record.status_code = 200 AND NOT COALESCE(response_record.timed_out, false) THEN
        -- 성공
        UPDATE cron_execution_logs 
        SET 
            status = 'success',
            completed_at = NOW(),
            duration_ms = exec_duration_ms,
            success_count = 6, -- LME는 6개 금속
            metadata = metadata || jsonb_build_object(
                'http_status', response_record.status_code,
                'response_size', length(response_record.content),
                'request_id', request_id,
                'auth_method', 'anon_key',
                'collection_method', 'http_collect_response',
                'response_status', response_record.status
            )
        WHERE id = log_id;
        
        RAISE NOTICE '✅ LME 크롤러 성공: % (로그 ID: %, 소요시간: %ms)', 
            NOW(), log_id, exec_duration_ms;
    ELSE
        -- 실패
        UPDATE cron_execution_logs 
        SET 
            status = 'failed',
            completed_at = NOW(),
            duration_ms = exec_duration_ms,
            error_message = CASE 
                WHEN response_record.timed_out THEN 'HTTP 요청 타임아웃'
                WHEN response_record.status != 'SUCCESS' THEN 'HTTP 수집 실패: ' || COALESCE(response_record.message, 'Unknown')
                ELSE COALESCE(response_record.error_msg, 'HTTP ' || COALESCE(response_record.status_code::text, 'Unknown'))
            END,
            metadata = metadata || jsonb_build_object(
                'http_status', COALESCE(response_record.status_code, 0),
                'error_type', CASE 
                    WHEN response_record.timed_out THEN 'request_timeout'
                    WHEN response_record.status != 'SUCCESS' THEN 'collection_failed'
                    ELSE 'http_error'
                END,
                'request_id', request_id,
                'auth_method', 'anon_key',
                'collection_method', 'http_collect_response',
                'response_status', response_record.status,
                'response_message', response_record.message
            )
        WHERE id = log_id;
        
        RAISE NOTICE '❌ LME 크롤러 실패: % (오류: %)', 
            NOW(), 
            CASE 
                WHEN response_record.timed_out THEN 'HTTP 요청 타임아웃'
                WHEN response_record.status != 'SUCCESS' THEN 'HTTP 수집 실패'
                ELSE COALESCE(response_record.error_msg, 'HTTP Error')
            END;
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
            'sql_state', SQLSTATE,
            'request_id', COALESCE(request_id, 0),
            'auth_method', 'anon_key',
            'collection_method', 'http_collect_response'
        )
    WHERE id = log_id;
    
    RAISE NOTICE '💥 LME 크롤러 예외 발생: %', SQLERRM;
END;
$$;

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION run_lme_crawler() TO postgres;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '🔧 run_lme_crawler() 함수 비동기 HTTP 처리 문제 해결 완료!';
    RAISE NOTICE '✨ 핵심 변경사항:';
    RAISE NOTICE '   - net.http_collect_response() 사용으로 동기적 응답 처리';
    RAISE NOTICE '   - PostgreSQL 트랜잭션 내에서 HTTP 응답 완료까지 대기';
    RAISE NOTICE '   - 복잡한 타이밍 로직 제거로 안정성 향상';
    RAISE NOTICE '   - anon 키 사용으로 인증 문제 해결';
    RAISE NOTICE '   - 안정적인 응답 수집 보장';
END;
$$;
