

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."auction_category_enum" AS ENUM (
    'scrap',
    'machinery',
    'materials',
    'demolition'
);


ALTER TYPE "public"."auction_category_enum" OWNER TO "postgres";


CREATE TYPE "public"."auction_result_enum" AS ENUM (
    'successful',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."auction_result_enum" OWNER TO "postgres";


CREATE TYPE "public"."auction_status_enum" AS ENUM (
    'active',
    'ending',
    'ended',
    'cancelled'
);


ALTER TYPE "public"."auction_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."transaction_status_enum" AS ENUM (
    'pending',
    'paid',
    'delivered',
    'completed',
    'failed'
);


ALTER TYPE "public"."transaction_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type_enum" AS ENUM (
    'normal',
    'urgent'
);


ALTER TYPE "public"."transaction_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_cron_status"() RETURNS TABLE("cron_jobs_info" "jsonb", "recent_logs" "jsonb", "system_health" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."check_cron_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_self_bidding_violations"() RETURNS TABLE("auction_id" "text", "auction_title" character varying, "bidder_id" "text", "bidder_name" character varying, "amount" numeric, "bid_time" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id::text,
    a.title,
    ab.user_id::text,
    ab.user_name,
    ab.amount,
    ab.bid_time
  FROM auction_bids ab
  INNER JOIN auctions a ON ab.auction_id = a.id
  WHERE a.user_id = ab.user_id -- 경매 소유자와 입찰자가 같은 경우
  ORDER BY ab.bid_time DESC;
END;
$$;


ALTER FUNCTION "public"."check_self_bidding_violations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_self_bidding_violations"() IS '기존 데이터에서 자신의 경매에 입찰한 위반 사례를 확인하는 함수';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_verification_codes"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE users 
  SET 
    verification_code = NULL,
    verification_expires_at = NULL,
    updated_at = NOW()
  WHERE verification_expires_at < NOW() 
    AND verification_code IS NOT NULL;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_verification_codes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_verification_codes"() IS '만료된 인증 코드 정리 (배치 작업용)';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"("retention_days" integer DEFAULT 7, "batch_size" integer DEFAULT 1000) RETURNS TABLE("deleted_count" integer, "remaining_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    deleted_batch INTEGER;
    total_deleted INTEGER := 0;
    total_remaining INTEGER;
BEGIN
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- 배치 단위로 삭제 (메모리 효율성)
    LOOP
        WITH deleted AS (
            DELETE FROM notification_history 
            WHERE created_at < cutoff_date
            AND id IN (
                SELECT id FROM notification_history 
                WHERE created_at < cutoff_date 
                LIMIT batch_size
            )
            RETURNING id
        )
        SELECT COUNT(*) INTO deleted_batch FROM deleted;
        
        total_deleted := total_deleted + deleted_batch;
        
        -- 더 이상 삭제할 레코드가 없으면 종료
        EXIT WHEN deleted_batch = 0;
        
        -- 배치 간 잠시 대기 (시스템 부하 방지)
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    -- 남은 레코드 수 조회
    SELECT COUNT(*) INTO total_remaining FROM notification_history;
    
    RETURN QUERY SELECT total_deleted, total_remaining;
    
    RAISE NOTICE 'Cleaned up % old notifications. Remaining: %', total_deleted, total_remaining;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_notifications"("retention_days" integer, "batch_size" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_notifications"("retention_days" integer, "batch_size" integer) IS '오래된 알림 자동 정리 (기본 7일 보관, 배치 1000개)';



CREATE OR REPLACE FUNCTION "public"."create_notification_partition"("partition_date" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'notification_history_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            LIKE notification_history INCLUDING ALL
        ) INHERITS (notification_history)
    ', partition_name);
    
    EXECUTE format('
        ALTER TABLE %I ADD CONSTRAINT %I 
        CHECK (created_at >= %L AND created_at < %L)
    ', partition_name, partition_name || '_date_check', start_date, end_date);
    
    RAISE NOTICE 'Created partition: %', partition_name;
END;
$$;


ALTER FUNCTION "public"."create_notification_partition"("partition_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_transaction_record"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 낙찰된 경우 거래 레코드 자동 생성
  IF NEW.result_type = 'successful' THEN
    INSERT INTO auction_transactions (
      auction_result_id,
      transaction_status,
      payment_amount
    ) VALUES (
      NEW.id,
      'pending',
      NEW.winning_amount
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_transaction_record"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."diagnose_notification_system"() RETURNS TABLE("check_type" "text", "status" "text", "details" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 1. 트리거 존재 여부 확인
  RETURN QUERY
  SELECT 
    'trigger_check'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'MISSING' END::TEXT,
    jsonb_build_object(
      'trigger_count', COUNT(*),
      'triggers', jsonb_agg(trigger_name)
    )
  FROM information_schema.triggers 
  WHERE trigger_name = 'trigger_new_auction_notification';

  -- 2. 알림 함수 존재 여부 확인
  RETURN QUERY
  SELECT 
    'function_check'::TEXT,
    CASE WHEN COUNT(*) >= 2 THEN 'OK' ELSE 'MISSING' END::TEXT,
    jsonb_build_object(
      'function_count', COUNT(*),
      'functions', jsonb_agg(proname)
    )
  FROM pg_proc 
  WHERE proname IN ('send_auction_create_notification', 'trigger_auction_create_notification');

  -- 3. 활성 푸시 토큰 확인
  RETURN QUERY
  SELECT 
    'push_tokens'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'NO_TOKENS' END::TEXT,
    jsonb_build_object(
      'active_token_count', COUNT(*),
      'total_users_with_tokens', COUNT(DISTINCT user_id)
    )
  FROM user_push_tokens 
  WHERE is_active = true;

  -- 4. 최근 경매 확인
  RETURN QUERY
  SELECT 
    'recent_auctions'::TEXT,
    'INFO'::TEXT,
    jsonb_build_object(
      'auction_count', COUNT(*),
      'recent_auctions', jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'created_at', created_at
        )
      )
    )
  FROM (
    SELECT id, title, created_at 
    FROM auctions 
    ORDER BY created_at DESC 
    LIMIT 5
  ) recent;

  -- 5. 최근 알림 히스토리 확인
  RETURN QUERY
  SELECT 
    'notification_history'::TEXT,
    'INFO'::TEXT,
    jsonb_build_object(
      'notification_count', COUNT(*),
      'recent_notifications', jsonb_agg(
        jsonb_build_object(
          'type', type,
          'title', title,
          'created_at', created_at
        )
      )
    )
  FROM (
    SELECT type, title, created_at 
    FROM notification_history 
    ORDER BY created_at DESC 
    LIMIT 5
  ) recent_notifications;

  -- 6. 환경 확인
  RETURN QUERY
  SELECT 
    'environment'::TEXT,
    'INFO'::TEXT,
    jsonb_build_object(
      'current_environment', get_current_environment()
    );
END;
$$;


ALTER FUNCTION "public"."diagnose_notification_system"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_users"() RETURNS TABLE("id" "uuid", "phone_number" character varying, "name" character varying, "is_admin" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.phone_number,
    u.name,
    u.is_admin,
    u.created_at
  FROM users u
  WHERE u.is_admin = true
  ORDER BY u.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_admin_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auction_photo_count"("auction_id" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM auction_photos 
    WHERE auction_photos.auction_id = get_auction_photo_count.auction_id
  );
END;
$$;


ALTER FUNCTION "public"."get_auction_photo_count"("auction_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auction_processing_stats"() RETURNS TABLE("today_processed" integer, "today_successful" integer, "today_failed" integer, "this_week_processed" integer, "success_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH today_stats AS (
    SELECT 
      COUNT(*) as processed,
      COUNT(*) FILTER (WHERE result_type = 'successful') as successful,
      COUNT(*) FILTER (WHERE result_type = 'failed') as failed
    FROM auction_results
    WHERE DATE(processed_at) = CURRENT_DATE
  ),
  week_stats AS (
    SELECT COUNT(*) as processed
    FROM auction_results
    WHERE processed_at >= DATE_TRUNC('week', NOW())
  ),
  overall_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND(COUNT(*) FILTER (WHERE result_type = 'successful') * 100.0 / COUNT(*), 2)
        ELSE 0
      END as rate
    FROM auction_results
    WHERE processed_at >= NOW() - INTERVAL '30 days'
  )
  SELECT 
    ts.processed::INTEGER,
    ts.successful::INTEGER, 
    ts.failed::INTEGER,
    ws.processed::INTEGER,
    os.rate
  FROM today_stats ts, week_stats ws, overall_stats os;
END;
$$;


ALTER FUNCTION "public"."get_auction_processing_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_auction_processing_stats"() IS '경매 처리 통계 조회 함수';



CREATE OR REPLACE FUNCTION "public"."get_auction_representative_photo"("auction_id" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT photo_url
    FROM auction_photos 
    WHERE auction_photos.auction_id = get_auction_representative_photo.auction_id 
    AND is_representative = true
    ORDER BY photo_order
    LIMIT 1
  );
END;
$$;


ALTER FUNCTION "public"."get_auction_representative_photo"("auction_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_crawler_stats"("crawler_type_param" "text" DEFAULT NULL::"text", "hours_back" integer DEFAULT 24) RETURNS TABLE("job_type" "text", "total_executions" bigint, "successful_executions" bigint, "failed_executions" bigint, "success_rate" numeric, "avg_duration_ms" numeric, "last_success_time" timestamp with time zone, "last_failure_time" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
$$;


ALTER FUNCTION "public"."get_crawler_stats"("crawler_type_param" "text", "hours_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_crawling_status"() RETURNS TABLE("last_success_at" timestamp with time zone, "last_failure_at" timestamp with time zone, "is_currently_running" boolean, "success_rate_24h" numeric, "avg_duration_ms" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_crawling_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_crawling_status"() IS '크롤링 시스템의 현재 상태와 성능 지표를 반환하는 함수';



CREATE OR REPLACE FUNCTION "public"."get_cron_jobs_status"() RETURNS TABLE("jobid" bigint, "jobname" "text", "schedule" "text", "active" boolean, "last_run_time" timestamp with time zone, "last_run_status" "text", "last_execution_log_id" "uuid", "last_execution_duration_ms" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
$$;


ALTER FUNCTION "public"."get_cron_jobs_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cron_system_health"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
$$;


ALTER FUNCTION "public"."get_cron_system_health"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_environment"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- 간단하고 확실한 환경 감지
    -- Supabase 원격 환경에서는 특정 system identifier나 설정이 다름
    RETURN CASE 
        WHEN current_setting('port', true)::integer = 54332 THEN 'local'
        ELSE 'production'
    END;
END;
$$;


ALTER FUNCTION "public"."get_current_environment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_timezone_info"() RETURNS TABLE("current_timezone" "text", "current_time_utc" timestamp with time zone, "current_time_seoul" timestamp with time zone, "offset_hours" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        current_setting('TIMEZONE') as current_timezone,
        NOW() as current_time_utc,
        NOW() AT TIME ZONE 'Asia/Seoul' as current_time_seoul,
        to_char(EXTRACT(TIMEZONE_HOUR FROM NOW()), 'FM+00') || ':' || 
        to_char(EXTRACT(TIMEZONE_MINUTE FROM NOW()), 'FM00') as offset_hours;
END;
$$;


ALTER FUNCTION "public"."get_current_timezone_info"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_lme_prices"() RETURNS TABLE("metal_code" character varying, "metal_name_kr" character varying, "price_krw_per_kg" numeric, "change_percent" numeric, "change_type" character varying, "price_date" "date", "last_updated" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_latest_lme_prices"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_latest_lme_prices"() IS '각 금속별 최신 LME 가격 정보를 반환하는 함수';



CREATE OR REPLACE FUNCTION "public"."get_recent_executions"("job_type_param" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "job_type" "text", "job_name" "text", "status" "text", "started_at" timestamp with time zone, "completed_at" timestamp with time zone, "duration_ms" integer, "success_count" integer, "error_message" "text", "environment" "text", "url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
$$;


ALTER FUNCTION "public"."get_recent_executions"("job_type_param" "text", "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_service_request_analytics"("start_date" timestamp with time zone DEFAULT ("now"() - '30 days'::interval), "end_date" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("total_requests" bigint, "completion_rate" numeric, "average_processing_hours" numeric, "appraisal_requests" bigint, "purchase_requests" bigint, "status_distribution" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FILTER (WHERE completed_at IS NOT NULL) as avg_hours,
      COUNT(*) FILTER (WHERE service_type = 'appraisal') as appraisal,
      COUNT(*) FILTER (WHERE service_type = 'purchase') as purchase,
      jsonb_object_agg(status, count_by_status) as status_dist
    FROM service_requests,
    LATERAL (
      SELECT COUNT(*) as count_by_status
      FROM service_requests sr2
      WHERE sr2.status = service_requests.status
      AND sr2.created_at BETWEEN start_date AND end_date
    ) sub
    WHERE created_at BETWEEN start_date AND end_date
  )
  SELECT 
    total,
    CASE WHEN total > 0 THEN ROUND((completed::NUMERIC / total) * 100, 2) ELSE 0 END,
    ROUND(avg_hours, 2),
    appraisal,
    purchase,
    status_dist
  FROM stats;
END;
$$;


ALTER FUNCTION "public"."get_service_request_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_service_request_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) IS '서비스 요청 통계 분석 함수 (관리자용)';



CREATE OR REPLACE FUNCTION "public"."get_user_activity_summary"("user_uuid" "uuid") RETURNS TABLE("user_id" "uuid", "user_name" character varying, "total_service_requests" bigint, "completed_service_requests" bigint, "total_auctions" bigint, "active_auctions" bigint, "last_activity" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    COALESCE(sr_stats.total_requests, 0) as total_service_requests,
    COALESCE(sr_stats.completed_requests, 0) as completed_service_requests,
    COALESCE(a_stats.total_auctions, 0) as total_auctions,
    COALESCE(a_stats.active_auctions, 0) as active_auctions,
    GREATEST(
      u.updated_at,
      COALESCE(sr_stats.last_request, u.created_at),
      COALESCE(a_stats.last_auction, u.created_at)
    ) as last_activity
  FROM users u
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
      MAX(created_at) as last_request
    FROM service_requests 
    WHERE user_id = user_uuid
    GROUP BY user_id
  ) sr_stats ON u.id = sr_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_auctions,
      COUNT(*) FILTER (WHERE status IN ('active', 'ending')) as active_auctions,
      MAX(created_at) as last_auction
    FROM auctions 
    WHERE user_id = user_uuid
    GROUP BY user_id
  ) a_stats ON u.id = a_stats.user_id
  WHERE u.id = user_uuid;
  
EXCEPTION WHEN OTHERS THEN
  -- auctions 테이블이 없는 경우 서비스 요청만 반환
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    COALESCE(sr_stats.total_requests, 0) as total_service_requests,
    COALESCE(sr_stats.completed_requests, 0) as completed_service_requests,
    0::BIGINT as total_auctions,
    0::BIGINT as active_auctions,
    GREATEST(u.updated_at, COALESCE(sr_stats.last_request, u.created_at)) as last_activity
  FROM users u
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
      MAX(created_at) as last_request
    FROM service_requests 
    WHERE user_id = user_uuid
    GROUP BY user_id
  ) sr_stats ON u.id = sr_stats.user_id
  WHERE u.id = user_uuid;
END;
$$;


ALTER FUNCTION "public"."get_user_activity_summary"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_activity_summary"("user_uuid" "uuid") IS '사용자 활동 요약 (서비스 요청, 경매 등)';



CREATE OR REPLACE FUNCTION "public"."get_user_by_phone"("phone" "text") RETURNS TABLE("id" "uuid", "phone_number" character varying, "name" character varying, "is_business" boolean, "is_phone_verified" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.phone_number,
    u.name,
    u.is_business,
    u.is_phone_verified,
    u.created_at
  FROM users u
  WHERE u.phone_number = phone;
END;
$$;


ALTER FUNCTION "public"."get_user_by_phone"("phone" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_by_phone"("phone" "text") IS '전화번호로 사용자 조회';



CREATE OR REPLACE FUNCTION "public"."get_user_notification_stats"("p_user_id" "uuid") RETURNS TABLE("total_count" bigint, "unread_count" bigint, "read_count" bigint, "oldest_notification" timestamp with time zone, "newest_notification" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_count,
        COUNT(*) FILTER (WHERE is_read = false)::BIGINT as unread_count,
        COUNT(*) FILTER (WHERE is_read = true)::BIGINT as read_count,
        MIN(created_at) as oldest_notification,
        MAX(created_at) as newest_notification
    FROM notification_history
    WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_notification_stats"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_notification_stats"("p_user_id" "uuid") IS '사용자별 알림 통계 조회';



CREATE OR REPLACE FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_unread_only" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "title" "text", "body" "text", "data" "jsonb", "notification_type" "text", "is_read" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nh.id,
        nh.title,
        nh.body,
        nh.data,
        nh.notification_type,
        nh.is_read,
        nh.created_at
    FROM notification_history nh
    WHERE nh.user_id = p_user_id
    AND (NOT p_unread_only OR nh.is_read = FALSE)
    ORDER BY nh.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_unread_only" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_unread_only" boolean) IS '사용자별 알림 조회 최적화 함수';



CREATE OR REPLACE FUNCTION "public"."get_user_profile_summary"("user_uuid" "uuid") RETURNS TABLE("id" "uuid", "name" character varying, "phone_number" character varying, "avatar_url" "text", "is_business" boolean, "company_name" character varying, "business_type" character varying, "is_verified" boolean, "member_since" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.phone_number,
    u.avatar_url,
    u.is_business,
    u.company_name,
    u.business_type,
    u.is_phone_verified as is_verified,
    u.created_at as member_since
  FROM users u
  WHERE u.id = user_uuid;
END;
$$;


ALTER FUNCTION "public"."get_user_profile_summary"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_profile_summary"("user_uuid" "uuid") IS '사용자 프로필 요약 정보 조회';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."service_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "service_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "contact_phone" "text" NOT NULL,
    "address" "text" NOT NULL,
    "address_detail" "text",
    "description" "text" NOT NULL,
    "scheduled_date" timestamp with time zone,
    "assigned_expert_id" "uuid",
    "expert_notes" "text",
    "estimated_value" numeric(15,2),
    "final_offer" numeric(15,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "service_requests_service_type_check" CHECK (("service_type" = ANY (ARRAY['appraisal'::"text", 'purchase'::"text"]))),
    CONSTRAINT "service_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'assigned'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."service_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."service_requests" IS '프리미엄 서비스 요청 메인 테이블 - 비회원/회원 모두 지원';



COMMENT ON COLUMN "public"."service_requests"."user_id" IS '사용자 ID (NULL: 비회원 요청, UUID: 회원 요청)';



COMMENT ON COLUMN "public"."service_requests"."service_type" IS 'appraisal: 감정 서비스, purchase: 매입 서비스';



COMMENT ON COLUMN "public"."service_requests"."status" IS 'pending: 접수대기, assigned: 담당자배정, in_progress: 진행중, completed: 완료, cancelled: 취소';



CREATE OR REPLACE FUNCTION "public"."get_user_recent_requests"("user_uuid" "uuid" DEFAULT NULL::"uuid", "limit_count" integer DEFAULT 10) RETURNS SETOF "public"."service_requests"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM service_requests
  WHERE user_id = user_uuid OR user_id IS NULL
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_user_recent_requests"("user_uuid" "uuid", "limit_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_recent_requests"("user_uuid" "uuid", "limit_count" integer) IS '사용자별 최근 서비스 요청 조회 함수';



CREATE OR REPLACE FUNCTION "public"."get_user_statistics"() RETURNS TABLE("total_users" bigint, "verified_users" bigint, "business_users" bigint, "individual_users" bigint, "users_this_month" bigint, "verification_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_phone_verified = true) as verified,
      COUNT(*) FILTER (WHERE is_business = true) as business,
      COUNT(*) FILTER (WHERE is_business = false) as individual,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as this_month
    FROM users
  )
  SELECT 
    total,
    verified,
    business,
    individual,
    this_month,
    CASE 
      WHEN total > 0 THEN ROUND((verified::NUMERIC / total) * 100, 2)
      ELSE 0
    END as verification_rate
  FROM stats;
END;
$$;


ALTER FUNCTION "public"."get_user_statistics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_statistics"() IS '전체 사용자 통계 조회';



CREATE OR REPLACE FUNCTION "public"."get_user_unread_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notification_history 
    WHERE user_id = p_user_id 
    AND is_read = false;
    
    RETURN unread_count;
END;
$$;


ALTER FUNCTION "public"."get_user_unread_count"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_unread_count"("p_user_id" "uuid") IS '사용자별 미읽 알림 개수 조회 최적화';



CREATE OR REPLACE FUNCTION "public"."is_user_admin"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM users
  WHERE id = user_uuid;
  
  RETURN COALESCE(admin_status, false);
END;
$$;


ALTER FUNCTION "public"."is_user_admin"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- 상태가 변경된 경우에만 로그 생성
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO service_request_status_logs (
            service_request_id,
            old_status,
            new_status,
            note,
            created_by
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            CASE 
                WHEN NEW.status = 'assigned' THEN '담당자가 배정되었습니다.'
                WHEN NEW.status = 'in_progress' THEN '서비스가 진행 중입니다.'
                WHEN NEW.status = 'completed' THEN '서비스가 완료되었습니다.'
                WHEN NEW.status = 'cancelled' THEN '서비스가 취소되었습니다.'
                ELSE '상태가 변경되었습니다.'
            END,
            NULL -- created_by는 애플리케이션에서 설정
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_token_performance"() RETURNS TABLE("total_tokens" integer, "active_tokens" integer, "unique_users" integer, "performance_note" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.total_tokens,
        t.active_tokens,
        t.unique_users,
        CASE 
            WHEN t.total_tokens > 1000 THEN '대용량 데이터 - 파티셔닝 고려'
            WHEN t.active_tokens::DECIMAL / NULLIF(t.total_tokens, 0) < 0.8 THEN '비활성 토큰 정리 필요'
            ELSE '정상 상태'
        END as performance_note
    FROM token_upsert_performance t;
END;
$$;


ALTER FUNCTION "public"."log_token_performance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_ended_auctions"() RETURNS TABLE("processed_count" integer, "successful_count" integer, "failed_count" integer, "error_count" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  ended_auction RECORD;
  total_processed INTEGER := 0;
  total_successful INTEGER := 0;
  total_failed INTEGER := 0;
  total_errors INTEGER := 0;
  auction_error TEXT;
  log_id UUID;
  
  -- 알림 관련 변수
  seller_tokens TEXT[];
  winner_tokens TEXT[];
  auction_title TEXT;
BEGIN
  -- 로그 시작 - UUID 생성
  INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
  VALUES ('auction', 'auction-end-processor', 'running', 
          jsonb_build_object('started_at', NOW()))
  RETURNING id INTO log_id;

  -- 타임아웃 설정 (5분)
  SET statement_timeout = '5min';

  -- 종료된 경매들 처리 (락 적용)
  FOR ended_auction IN 
    SELECT 
      a.id,
      a.title,
      a.starting_price,
      a.user_id as seller_id,
      a.end_time,
      a.status
    FROM auctions a
    WHERE a.end_time <= NOW() 
      AND a.status IN ('active', 'ending')
    ORDER BY a.end_time ASC
    FOR UPDATE OF a SKIP LOCKED -- 동시성 제어 개선
  LOOP
    BEGIN
      total_processed := total_processed + 1;
      auction_title := ended_auction.title;
      
      -- 실제 최고 입찰자 재확인 (is_top_bid 신뢰하지 않음)
      DECLARE
        actual_winning_bid RECORD;
      BEGIN
        SELECT 
          ab.id as winning_bid_id,
          ab.user_id as winning_user_id,
          ab.amount as winning_amount,
          ab.user_name as winning_user_name
        INTO actual_winning_bid
        FROM auction_bids ab
        WHERE ab.auction_id = ended_auction.id
        ORDER BY ab.amount DESC, ab.bid_time ASC
        LIMIT 1;
        
        -- 알림을 위한 토큰 조회 (새로운 스키마 사용)
        -- 경매 등록자 토큰
        SELECT array_agg(token) INTO seller_tokens
        FROM user_push_tokens 
        WHERE user_id = ended_auction.seller_id AND is_active = true;
        
        -- 낙찰자 토큰 (낙찰된 경우)
        IF actual_winning_bid.winning_user_id IS NOT NULL THEN
          SELECT array_agg(token) INTO winner_tokens
          FROM user_push_tokens 
          WHERE user_id = actual_winning_bid.winning_user_id AND is_active = true;
        END IF;
        
        -- 낙찰/유찰 결정 (실제 최고 입찰 기준)
        IF actual_winning_bid.winning_amount IS NOT NULL 
           AND actual_winning_bid.winning_amount >= ended_auction.starting_price THEN
        
        -- 낙찰 처리 (개선된 로직 - 실제 최고 입찰 기준)
        INSERT INTO auction_results (
          auction_id, 
          result_type, 
          winning_bid_id, 
          winning_user_id, 
          winning_amount,
          metadata
        ) VALUES (
          ended_auction.id, 
          'successful', 
          actual_winning_bid.winning_bid_id, 
          actual_winning_bid.winning_user_id, 
          actual_winning_bid.winning_amount,
          jsonb_build_object(
            'winning_user_name', actual_winning_bid.winning_user_name,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id,
            'validation_method', 'amount_based_verification',
            'fixed_version', 'v3.0'
          )
        );
        
        -- 알림 발송 (예외 처리 개선)
        BEGIN
          -- 경매 등록자에게 알림
          IF array_length(seller_tokens, 1) > 0 THEN
            PERFORM send_auction_end_notification(
              seller_tokens,
              '경매가 종료되었습니다',
              auction_title || ' 경매가 종료되었습니다.',
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'auction_title', auction_title,
                'user_type', 'seller',
                'result', 'successful'
              )
            );
            
            -- 히스토리 저장 (새로운 스키마 사용)
            INSERT INTO notification_history (user_id, notification_type, title, body, data)
            VALUES (ended_auction.seller_id, 'auction_ended', '경매가 종료되었습니다', 
                    auction_title || ' 경매가 종료되었습니다.',
                    jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
          END IF;
          
          -- 낙찰자에게 알림
          IF array_length(winner_tokens, 1) > 0 THEN
            PERFORM send_auction_end_notification(
              winner_tokens,
              '경매에 낙찰되었습니다!',
              auction_title || ' 경매에 낙찰되었습니다!',
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'auction_title', auction_title,
                'user_type', 'winner',
                'result', 'successful',
                'winning_amount', actual_winning_bid.winning_amount
              )
            );
            
            -- 히스토리 저장 (새로운 스키마 사용)
            INSERT INTO notification_history (user_id, notification_type, title, body, data)
            VALUES (actual_winning_bid.winning_user_id, 'auction_won', '경매에 낙찰되었습니다!', 
                    auction_title || ' 경매에 낙찰되었습니다!',
                    jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '❌ 알림 발송 실패: % - %', auction_title, SQLERRM;
          -- 알림 실패가 경매 처리를 중단시키지 않도록 예외를 흡수
        END;
        
        total_successful := total_successful + 1;
        
        RAISE NOTICE '✅ 낙찰 처리: % (₩%) - 알림 발송 완료', ended_auction.title, actual_winning_bid.winning_amount;
                                                                                                 
        
      ELSE
        -- 유찰 처리 (개선된 로직 - 실제 최고 입찰 기준)
        INSERT INTO auction_results (
          auction_id, 
          result_type,
          metadata
        ) VALUES (
          ended_auction.id, 
          'failed',
          jsonb_build_object(
            'reason', CASE 
              WHEN actual_winning_bid.winning_amount IS NULL THEN 'no_bids'
              WHEN actual_winning_bid.winning_amount < ended_auction.starting_price THEN 'below_starting_price'
              ELSE 'unknown'
            END,
            'highest_bid', actual_winning_bid.winning_amount,
            'starting_price', ended_auction.starting_price,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id,
            'validation_method', 'amount_based_verification',
            'fixed_version', 'v3.0'
          )
        );
        
        -- 경매 등록자에게 유찰 알림 (예외 처리 개선)
        BEGIN
          IF array_length(seller_tokens, 1) > 0 THEN
            PERFORM send_auction_end_notification(
              seller_tokens,
              '경매가 유찰되었습니다',
              auction_title || ' 경매가 유찰되었습니다.',
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'auction_title', auction_title,
                'user_type', 'seller',
                'result', 'failed',
                'highest_bid', actual_winning_bid.winning_amount
              )
            );
            
            -- 히스토리 저장 (새로운 스키마 사용)
            INSERT INTO notification_history (user_id, notification_type, title, body, data)
            VALUES (ended_auction.seller_id, 'auction_failed', '경매가 유찰되었습니다', 
                    auction_title || ' 경매가 유찰되었습니다.',
                    jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '❌ 유찰 알림 발송 실패: % - %', auction_title, SQLERRM;
        END;
        
        total_failed := total_failed + 1;
        
        RAISE NOTICE '❌ 유찰 처리: % (최고가: ₩%, 시작가: ₩%) - 알림 발송 완료', 
          ended_auction.title, 
          COALESCE(actual_winning_bid.winning_amount, 0), 
          ended_auction.starting_price;
        END IF;
      END; -- actual_winning_bid 블록 종료
      
      -- 경매 상태를 ended로 업데이트
      UPDATE auctions 
      SET status = 'ended', updated_at = NOW()
      WHERE id = ended_auction.id;
      
    EXCEPTION WHEN OTHERS THEN
      total_errors := total_errors + 1;
      auction_error := SQLERRM;
      
      RAISE NOTICE '❌ 경매 처리 오류: % - %', ended_auction.title, auction_error;
      
      -- 오류 로그 저장
      INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
      VALUES ('auction', 'auction-end-processor', 'failed', 
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'error', auction_error,
                'timestamp', NOW()
              ));
    END;
  END LOOP;

  -- 로그 완료 - 기존 로그 업데이트
  UPDATE cron_execution_logs 
  SET status = 'success', 
      completed_at = NOW(),
      metadata = jsonb_build_object(
        'processed', total_processed,
        'successful', total_successful,
        'failed', total_failed,
        'errors', total_errors,
        'completed_at', NOW(),
        'version', 'v3.0'
      )
  WHERE id = log_id;

  RETURN QUERY SELECT total_processed, total_successful, total_failed, total_errors;
EXCEPTION WHEN OTHERS THEN
  -- 전체 함수 실패 시 로그 업데이트
  IF log_id IS NOT NULL THEN
    UPDATE cron_execution_logs 
    SET status = 'failed', 
        completed_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'error', SQLERRM,
          'failed_at', NOW(),
          'version', 'v3.0'
        )
    WHERE id = log_id;
  END IF;
  
  RAISE;
END;
$$;


ALTER FUNCTION "public"."process_ended_auctions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."repair_auction_bids"("auction_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  max_bid RECORD;
BEGIN
  -- 모든 is_top_bid를 false로 초기화
  UPDATE auction_bids 
  SET is_top_bid = false 
  WHERE auction_id = repair_auction_bids.auction_id;
  
  -- 실제 최고 입찰을 찾아서 true로 설정
  SELECT id, amount, user_id INTO max_bid
  FROM auction_bids 
  WHERE auction_id = repair_auction_bids.auction_id
  ORDER BY amount DESC, bid_time ASC
  LIMIT 1;
  
  IF max_bid.id IS NOT NULL THEN
    UPDATE auction_bids 
    SET is_top_bid = true 
    WHERE id = max_bid.id;
    
    -- 경매 정보도 업데이트
    UPDATE auctions 
    SET 
      current_bid = max_bid.amount,
      updated_at = NOW()
    WHERE id = repair_auction_bids.auction_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."repair_auction_bids"("auction_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_lme_crawler"() RETURNS "void"
    LANGUAGE "plpgsql"
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
    
    -- Edge Function 호출 (환경별 Authorization 헤더)
    IF current_env = 'production' THEN
        -- 프로덕션 환경: 실제 service_role 키 사용
        SELECT net.http_post(
            url := crawler_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZG5jc3d2YmhlbHN0cGtmY3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMjMyMTIsImV4cCI6MjA2OTY5OTIxMn0.Sh2kGjkOON-OiD2SNeh2YeCqcgL-MlxY4YhbTCGjSOw'
            ),
            body := '{}'::jsonb
        ) INTO request_id;
    ELSE
        -- 로컬 환경: 로컬 개발용 키 사용
        SELECT net.http_post(
            url := crawler_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
            ),
            body := '{}'::jsonb
        ) INTO request_id;
    END IF;
    
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
$$;


ALTER FUNCTION "public"."run_lme_crawler"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."run_lme_crawler"() IS 'LME 크롤러 실행 함수 - 크론 작업에서 호출';



CREATE OR REPLACE FUNCTION "public"."send_auction_create_notification"("auction_id" "text", "auction_title" "text", "auction_category" "text", "seller_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_env TEXT;
  supabase_url TEXT;
  function_url TEXT;
  response_id BIGINT;
  all_tokens TEXT[];
  notification_title TEXT;
  notification_body TEXT;
  user_record RECORD;
BEGIN
  -- 현재 환경 확인
  SELECT get_current_environment() INTO current_env;
  
  -- 모든 활성 사용자의 푸시 토큰 가져오기 (새로운 스키마 사용)
  SELECT array_agg(token) INTO all_tokens
  FROM user_push_tokens 
  WHERE is_active = true;
  
  -- 토큰이 없으면 처리하지 않음
  IF all_tokens IS NULL OR array_length(all_tokens, 1) IS NULL OR array_length(all_tokens, 1) = 0 THEN
    RAISE NOTICE '📱 새 경매 알림 전송 건너뜀: 활성 토큰이 없음';
    RETURN;
  END IF;
  
  -- 알림 내용 구성
  notification_title := '새로운 경매가 등록되었습니다!';
  notification_body := auction_title || ' 경매가 새로 등록되었습니다.';
  
  RAISE NOTICE '📢 새 경매 알림 발송: % - % (토큰 수: %)', notification_title, notification_body, array_length(all_tokens, 1);
  
  -- 모든 사용자에게 알림 히스토리 저장 (새로운 스키마 사용)
  FOR user_record IN 
    SELECT user_id FROM user_push_tokens WHERE is_active = true
  LOOP
    INSERT INTO notification_history (user_id, notification_type, title, body, data)
    VALUES (
      user_record.user_id, 
      'auction_created', 
      notification_title, 
      notification_body,
      jsonb_build_object(
        'auction_id', auction_id,
        'auction_title', auction_title,
        'auction_category', auction_category,
        'seller_name', seller_name,
        'notification_type', 'auction_created'
      )
    );
  END LOOP;
  
  -- 환경별 처리
  IF current_env = 'local' THEN
    -- 로컬 환경에서는 로그만 출력
    RAISE NOTICE '🏠 로컬 환경: 실제 새 경매 알림 전송 생략';
  ELSE
    -- 프로덕션/스테이징에서는 실제 Edge Function 호출
    BEGIN
      -- 환경별 Supabase URL 설정
      IF current_env = 'production' THEN
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      ELSE
        -- 스테이징이나 기타 환경
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      END IF;
      
      function_url := supabase_url || '/functions/v1/send-auction-notification';
      
      RAISE NOTICE '🚀 새 경매 알림 Edge Function 호출: %', function_url;
      
      -- pg_net을 사용해서 Edge Function 호출
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZG5jc3d2YmhlbHN0cGtmY3Z2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDEyMzIxMiwiZXhwIjoyMDY5Njk5MjEyfQ.oAOAE-0vaU0ph5bkX9DBWfCwFEJha9wo8W1kATeAHTI'
        ),
        body := jsonb_build_object(
          'tokens', all_tokens, 
          'title', notification_title, 
          'body', notification_body, 
          'data', jsonb_build_object(
            'auction_id', auction_id,
            'auction_title', auction_title,
            'auction_category', auction_category,
            'seller_name', seller_name,
            'notification_type', 'auction_created'
          )
        ),
        timeout_milliseconds := 30000
      ) INTO response_id;
      
      RAISE NOTICE '✅ 새 경매 알림 전송 요청 완료 (request_id: %)', response_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ 새 경매 알림 전송 실패: %', SQLERRM;
      -- 알림 실패가 경매 등록을 중단시키지 않도록 예외를 흡수
    END;
  END IF;
END;
$$;


ALTER FUNCTION "public"."send_auction_create_notification"("auction_id" "text", "auction_title" "text", "auction_category" "text", "seller_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."send_auction_create_notification"("auction_id" "text", "auction_title" "text", "auction_category" "text", "seller_name" "text") IS '새 경매 등록 시 모든 사용자에게 알림 발송 함수';



CREATE OR REPLACE FUNCTION "public"."send_auction_end_notification"("tokens" "text"[], "title" "text", "body" "text", "data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_env TEXT;
  supabase_url TEXT;
  function_url TEXT;
  response_id BIGINT;
BEGIN
  -- 현재 환경 확인
  SELECT get_current_environment() INTO current_env;
  
  -- 토큰이 없으면 처리하지 않음
  IF tokens IS NULL OR array_length(tokens, 1) IS NULL OR array_length(tokens, 1) = 0 THEN
    RAISE NOTICE '📱 알림 전송 건너뜀: 유효한 토큰이 없음';
    RETURN;
  END IF;
  
  RAISE NOTICE '📱 알림 발송: % - % (토큰 수: %)', title, body, array_length(tokens, 1);
  
  -- 환경별 처리
  IF current_env = 'local' THEN
    -- 로컬 환경에서는 로그만 출력
    RAISE NOTICE '🏠 로컬 환경: 실제 알림 전송 생략';
  ELSE
    -- 프로덕션/스테이징에서는 실제 Edge Function 호출
    BEGIN
      -- 환경별 Supabase URL 설정
      IF current_env = 'production' THEN
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      ELSE
        -- 스테이징이나 기타 환경
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      END IF;
      
      function_url := supabase_url || '/functions/v1/send-auction-notification';
      
      RAISE NOTICE '🚀 Edge Function 호출: %', function_url;
      
      -- pg_net을 사용해서 Edge Function 호출
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZG5jc3d2YmhlbHN0cGtmY3Z2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDEyMzIxMiwiZXhwIjoyMDY5Njk5MjEyfQ.oAOAE-0vaU0ph5bkX9DBWfCwFEJha9wo8W1kATeAHTI'
        ),
        body := jsonb_build_object(
          'tokens', tokens, 
          'title', title, 
          'body', body, 
          'data', data
        ),
        timeout_milliseconds := 30000
      ) INTO response_id;
      
      RAISE NOTICE '✅ 알림 전송 요청 완료 (request_id: %)', response_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ 알림 전송 실패: %', SQLERRM;
      -- 알림 실패가 경매 처리를 중단시키지 않도록 예외를 흡수
    END;
  END IF;
END;
$$;


ALTER FUNCTION "public"."send_auction_end_notification"("tokens" "text"[], "title" "text", "body" "text", "data" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."send_auction_end_notification"("tokens" "text"[], "title" "text", "body" "text", "data" "jsonb") IS '경매 종료 시 실시간 알림 발송 함수';



CREATE OR REPLACE FUNCTION "public"."set_completed_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- 상태가 completed로 변경된 경우 완료 시간 설정
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        NEW.completed_at = NOW();
    -- 상태가 completed에서 다른 상태로 변경된 경우 완료 시간 제거
    ELSIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_completed_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_current_user_id"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$;


ALTER FUNCTION "public"."set_current_user_id"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_admin_status"("user_uuid" "uuid", "admin_status" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- 사용자 존재 확인
  SELECT EXISTS(SELECT 1 FROM users WHERE id = user_uuid) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN false;
  END IF;
  
  -- 관리자 권한 설정
  UPDATE users 
  SET is_admin = admin_status
  WHERE id = user_uuid;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."set_user_admin_status"("user_uuid" "uuid", "admin_status" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_verification_code"("user_uuid" "uuid", "code" character varying, "expires_minutes" integer DEFAULT 5) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE users 
  SET 
    verification_code = code,
    verification_expires_at = NOW() + (expires_minutes || ' minutes')::INTERVAL,
    updated_at = NOW()
  WHERE id = user_uuid;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."set_verification_code"("user_uuid" "uuid", "code" character varying, "expires_minutes" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_verification_code"("user_uuid" "uuid", "code" character varying, "expires_minutes" integer) IS '인증 코드 설정 (SMS 발송 후 호출)';



CREATE OR REPLACE FUNCTION "public"."test_notification_manually"("test_title" "text" DEFAULT '테스트 알림'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  all_tokens TEXT[];
  result JSONB;
BEGIN
  -- 모든 활성 토큰 가져오기 (새로운 스키마 사용)
  SELECT array_agg(token) INTO all_tokens
  FROM user_push_tokens 
  WHERE is_active = true;
  
  -- 알림 함수 호출
  PERFORM send_auction_create_notification(
    'test_auction_123',
    test_title,
    '테스트',
    '테스트 사용자'
  );
  
  result := jsonb_build_object(
    'token_count', COALESCE(array_length(all_tokens, 1), 0),
    'test_executed', true,
    'environment', get_current_environment()
  );
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."test_notification_manually"("test_title" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_auction_create_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  seller_name TEXT;
  category_text TEXT;
BEGIN
  -- 판매자 이름 가져오기 (users 테이블에서)
  SELECT COALESCE(name, phone_number, 'Unknown') INTO seller_name
  FROM users 
  WHERE id = NEW.user_id;
  
  -- 카테고리 텍스트 변환
  category_text := CASE NEW.auction_category
    WHEN 'scrap' THEN '고철'
    WHEN 'machinery' THEN '중고기계'
    WHEN 'materials' THEN '중고자재'
    WHEN 'demolition' THEN '철거'
    ELSE NEW.auction_category::text
  END;
  
  -- 새 경매 알림 발송 (비동기)
  PERFORM send_auction_create_notification(
    NEW.id,
    NEW.title,
    category_text,
    COALESCE(seller_name, 'Unknown')
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_auction_create_notification"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_auction_create_notification"() IS '경매 등록 시 자동 알림 발송 트리거 함수';



CREATE OR REPLACE FUNCTION "public"."update_auction_on_bid"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  max_amount NUMERIC;
BEGIN
  -- 경매 테이블에 락 적용하여 동시성 제어
  PERFORM 1 FROM auctions WHERE id = NEW.auction_id FOR UPDATE;
  
  -- 현재 최고 입찰가 확인
  SELECT COALESCE(MAX(amount), 0) INTO max_amount
  FROM auction_bids 
  WHERE auction_id = NEW.auction_id;
  
  -- 새 입찰이 최고 입찰가보다 높은 경우에만 처리
  IF NEW.amount > max_amount THEN
    -- 모든 이전 입찰을 false로 설정
    UPDATE auction_bids 
    SET is_top_bid = false 
    WHERE auction_id = NEW.auction_id;
    
    -- 현재 입찰을 최고 입찰로 설정
    NEW.is_top_bid = true;
    
    -- 경매 정보 업데이트
    UPDATE auctions 
    SET 
      current_bid = NEW.amount,
      total_bid_amount = NEW.amount,
      bidder_count = (
        SELECT COUNT(DISTINCT user_id) 
        FROM auction_bids 
        WHERE auction_id = NEW.auction_id
      ),
      updated_at = NOW()
    WHERE id = NEW.auction_id;
  ELSE
    -- 최고 입찰가보다 낮은 경우 false로 설정
    NEW.is_top_bid = false;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_auction_on_bid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_auction_result_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_auction_result_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_auction_status_realtime"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- ending 상태로 변경 (종료 1시간 전)
  UPDATE auctions 
  SET 
    status = 'ending',
    updated_at = NOW()
  WHERE 
    end_time <= NOW() + INTERVAL '1 hour' 
    AND end_time > NOW()
    AND status = 'active';
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE '⏰ % 개 경매가 ending 상태로 변경됨', updated_count;
  END IF;
  
  RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."update_auction_status_realtime"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_auction_status_realtime"() IS '경매 상태 실시간 업데이트 (ending 전환) - 5분마다 실행';



CREATE OR REPLACE FUNCTION "public"."update_auction_transaction_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_auction_transaction_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_auction_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_auction_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_auction_bids"("auction_id" "text") RETURNS TABLE("is_valid" boolean, "error_message" "text", "top_bid_amount" numeric, "top_bid_user_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  max_bid RECORD;
  top_bid_count INTEGER;
BEGIN
  -- 최고 입찰 확인
  SELECT amount, user_id INTO max_bid
  FROM auction_bids 
  WHERE auction_id = validate_auction_bids.auction_id
  ORDER BY amount DESC, bid_time ASC
  LIMIT 1;
  
  -- is_top_bid가 true인 레코드 수 확인
  SELECT COUNT(*) INTO top_bid_count
  FROM auction_bids 
  WHERE auction_id = validate_auction_bids.auction_id
  AND is_top_bid = true;
  
  -- 검증 결과 반환
  IF top_bid_count = 1 AND max_bid.amount IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      'Valid',
      max_bid.amount,
      max_bid.user_id;
  ELSE
    RETURN QUERY SELECT 
      false,
      'Multiple or no top bids found',
      max_bid.amount,
      max_bid.user_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."validate_auction_bids"("auction_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_phone_code"("user_uuid" "uuid", "code" character varying) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  is_valid BOOLEAN := false;
BEGIN
  -- 코드 검증 및 사용자 인증 상태 업데이트
  UPDATE users 
  SET 
    is_phone_verified = true,
    verification_code = NULL,
    verification_expires_at = NULL,
    updated_at = NOW()
  WHERE id = user_uuid 
    AND verification_code = code 
    AND verification_expires_at > NOW();
  
  is_valid := FOUND;
  
  RETURN is_valid;
END;
$$;


ALTER FUNCTION "public"."verify_phone_code"("user_uuid" "uuid", "code" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_phone_code"("user_uuid" "uuid", "code" character varying) IS '인증 코드 검증 및 사용자 인증 완료';



CREATE TABLE IF NOT EXISTS "public"."auction_bids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auction_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_name" character varying(100) NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "price_per_unit" numeric(10,2),
    "location" character varying(200) NOT NULL,
    "bid_time" timestamp with time zone DEFAULT "now"(),
    "is_top_bid" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."auction_bids" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."auction_bids" OWNER TO "postgres";


COMMENT ON TABLE "public"."auction_bids" IS '경매 입찰 정보';



CREATE TABLE IF NOT EXISTS "public"."auctions" (
    "id" "text" DEFAULT ((('auction_'::"text" || "floor"((EXTRACT(epoch FROM "now"()) * (1000)::numeric))) || '_'::"text") || "substr"(("gen_random_uuid"())::"text", 1, 8)) NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" character varying(200) NOT NULL,
    "description" "text" NOT NULL,
    "auction_category" "public"."auction_category_enum" NOT NULL,
    "transaction_type" "public"."transaction_type_enum" DEFAULT 'normal'::"public"."transaction_type_enum" NOT NULL,
    "current_bid" numeric(15,2) DEFAULT 0,
    "starting_price" numeric(15,2) DEFAULT 0,
    "total_bid_amount" numeric(15,2) DEFAULT 0,
    "status" "public"."auction_status_enum" DEFAULT 'active'::"public"."auction_status_enum",
    "end_time" timestamp with time zone NOT NULL,
    "bidder_count" integer DEFAULT 0,
    "view_count" integer DEFAULT 0,
    "address_info" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."auctions" OWNER TO "postgres";


COMMENT ON TABLE "public"."auctions" IS '공통 경매 테이블 - 모든 카테고리의 기본 정보';



CREATE OR REPLACE VIEW "public"."auction_data_inconsistencies" AS
 SELECT "id" AS "auction_id",
    "title",
    "current_bid" AS "auction_current_bid",
    ( SELECT "max"("auction_bids"."amount") AS "max"
           FROM "public"."auction_bids"
          WHERE ("auction_bids"."auction_id" = "a"."id")) AS "actual_max_bid",
    ( SELECT "count"(*) AS "count"
           FROM "public"."auction_bids"
          WHERE (("auction_bids"."auction_id" = "a"."id") AND ("auction_bids"."is_top_bid" = true))) AS "top_bid_count",
        CASE
            WHEN ("current_bid" <> ( SELECT "max"("auction_bids"."amount") AS "max"
               FROM "public"."auction_bids"
              WHERE ("auction_bids"."auction_id" = "a"."id"))) THEN 'current_bid_mismatch'::"text"
            WHEN (( SELECT "count"(*) AS "count"
               FROM "public"."auction_bids"
              WHERE (("auction_bids"."auction_id" = "a"."id") AND ("auction_bids"."is_top_bid" = true))) <> 1) THEN 'top_bid_count_error'::"text"
            ELSE 'consistent'::"text"
        END AS "issue_type"
   FROM "public"."auctions" "a"
  WHERE (("status" = ANY (ARRAY['active'::"public"."auction_status_enum", 'ending'::"public"."auction_status_enum", 'ended'::"public"."auction_status_enum"])) AND (("current_bid" <> ( SELECT "max"("auction_bids"."amount") AS "max"
           FROM "public"."auction_bids"
          WHERE ("auction_bids"."auction_id" = "a"."id"))) OR (( SELECT "count"(*) AS "count"
           FROM "public"."auction_bids"
          WHERE (("auction_bids"."auction_id" = "a"."id") AND ("auction_bids"."is_top_bid" = true))) <> 1)));


ALTER VIEW "public"."auction_data_inconsistencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auction_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auction_id" "text" NOT NULL,
    "photo_url" "text" NOT NULL,
    "photo_type" character varying(20) DEFAULT 'full'::character varying,
    "photo_order" integer DEFAULT 0,
    "is_representative" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."auction_photos" OWNER TO "postgres";


COMMENT ON TABLE "public"."auction_photos" IS '경매 사진 정보';



CREATE TABLE IF NOT EXISTS "public"."demolition_auctions" (
    "auction_id" "text" NOT NULL,
    "product_type" "jsonb" NOT NULL,
    "demolition_area" numeric(10,2) NOT NULL,
    "area_unit" character varying(10) NOT NULL,
    "price_per_unit" numeric(10,2),
    "building_purpose" character varying(20) NOT NULL,
    "demolition_method" character varying(20) NOT NULL,
    "structure_type" character varying(30) NOT NULL,
    "waste_disposal" character varying(20) NOT NULL,
    "floor_count" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."demolition_auctions" OWNER TO "postgres";


COMMENT ON TABLE "public"."demolition_auctions" IS '철거 경매 특화 정보';



CREATE TABLE IF NOT EXISTS "public"."machinery_auctions" (
    "auction_id" "text" NOT NULL,
    "product_type" "jsonb" NOT NULL,
    "product_name" character varying(200) NOT NULL,
    "manufacturer" character varying(100),
    "model_name" character varying(100),
    "manufacturing_date" "date",
    "quantity" integer NOT NULL,
    "quantity_unit" character varying(10) DEFAULT '대'::character varying,
    "desired_price" numeric(15,2) NOT NULL,
    "sales_environment" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."machinery_auctions" OWNER TO "postgres";


COMMENT ON TABLE "public"."machinery_auctions" IS '중고기계 경매 특화 정보';



CREATE TABLE IF NOT EXISTS "public"."materials_auctions" (
    "auction_id" "text" NOT NULL,
    "product_type" "jsonb" NOT NULL,
    "quantity" integer NOT NULL,
    "quantity_unit" character varying(20) NOT NULL,
    "desired_price" numeric(15,2) NOT NULL,
    "sales_environment" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."materials_auctions" OWNER TO "postgres";


COMMENT ON TABLE "public"."materials_auctions" IS '중고자재 경매 특화 정보';



CREATE TABLE IF NOT EXISTS "public"."scrap_auctions" (
    "auction_id" "text" NOT NULL,
    "product_type" "jsonb" NOT NULL,
    "weight_kg" numeric(10,2) NOT NULL,
    "weight_unit" character varying(10) DEFAULT 'kg'::character varying,
    "price_per_unit" numeric(10,2),
    "sales_environment" "jsonb" NOT NULL,
    "special_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scrap_auctions" OWNER TO "postgres";


COMMENT ON TABLE "public"."scrap_auctions" IS '고철 경매 특화 정보';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone_number" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "address" "text",
    "address_detail" "text",
    "avatar_url" "text",
    "is_business" boolean DEFAULT false,
    "company_name" character varying(200),
    "business_number" character varying(50),
    "business_type" character varying(100),
    "is_phone_verified" boolean DEFAULT false,
    "verification_code" character varying(10),
    "verification_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_admin" boolean DEFAULT false,
    "expo_push_token" "text",
    CONSTRAINT "users_avatar_url_check" CHECK ((("avatar_url" IS NULL) OR ("char_length"("avatar_url") >= 50))),
    CONSTRAINT "users_business_number_check" CHECK ((("is_business" = false) OR (("is_business" = true) AND ("business_number" IS NOT NULL) AND ("char_length"(("business_number")::"text") >= 10)))),
    CONSTRAINT "users_business_type_check" CHECK ((("is_business" = false) OR (("is_business" = true) AND ("business_type" IS NOT NULL) AND ("char_length"(("business_type")::"text") >= 2)))),
    CONSTRAINT "users_company_name_check" CHECK ((("is_business" = false) OR (("is_business" = true) AND ("company_name" IS NOT NULL) AND ("char_length"(("company_name")::"text") >= 2)))),
    CONSTRAINT "users_name_check" CHECK (("char_length"(("name")::"text") >= 2)),
    CONSTRAINT "users_phone_number_check" CHECK (("char_length"(("phone_number")::"text") >= 10))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS '커스텀 사용자 테이블 - 개인/사업자 정보, 전화번호 인증 기반';



COMMENT ON COLUMN "public"."users"."avatar_url" IS '사용자 프로필 이미지 URL (선택적)';



COMMENT ON COLUMN "public"."users"."is_business" IS '사업자 여부';



COMMENT ON COLUMN "public"."users"."company_name" IS '회사명/업체명';



COMMENT ON COLUMN "public"."users"."business_number" IS '사업자등록번호';



COMMENT ON COLUMN "public"."users"."business_type" IS '업종';



COMMENT ON COLUMN "public"."users"."is_phone_verified" IS '전화번호 인증 완료 여부';



COMMENT ON COLUMN "public"."users"."verification_code" IS '인증 코드 (임시 저장)';



COMMENT ON COLUMN "public"."users"."verification_expires_at" IS '인증 코드 만료 시각';



CREATE OR REPLACE VIEW "public"."auction_list_view" AS
 SELECT "a"."id",
    "a"."user_id",
    "a"."title",
    "a"."description",
    "a"."auction_category",
    "a"."transaction_type",
    "a"."current_bid",
    "a"."starting_price",
    "a"."total_bid_amount",
    "a"."status",
    "a"."end_time",
    "a"."bidder_count",
    "a"."view_count",
    "a"."address_info",
    "a"."created_at",
    "a"."updated_at",
    "u"."name" AS "seller_name",
    "u"."phone_number" AS "seller_phone",
        CASE
            WHEN ("a"."auction_category" = 'scrap'::"public"."auction_category_enum") THEN "json_build_object"('productType', "s"."product_type", 'weightKg', "s"."weight_kg", 'weightUnit', "s"."weight_unit", 'pricePerUnit', "s"."price_per_unit", 'salesEnvironment', "s"."sales_environment", 'specialNotes', "s"."special_notes", 'quantity', "json_build_object"('quantity', "s"."weight_kg", 'unit', "s"."weight_unit"))
            WHEN ("a"."auction_category" = 'machinery'::"public"."auction_category_enum") THEN "json_build_object"('productType', "m"."product_type", 'productName', "m"."product_name", 'manufacturer', "m"."manufacturer", 'modelName', "m"."model_name", 'manufacturingDate', "m"."manufacturing_date", 'quantity', "json_build_object"('quantity', "m"."quantity", 'unit', "m"."quantity_unit"), 'desiredPrice', "m"."desired_price", 'salesEnvironment', "m"."sales_environment")
            WHEN ("a"."auction_category" = 'materials'::"public"."auction_category_enum") THEN "json_build_object"('productType', "mt"."product_type", 'quantity', "json_build_object"('quantity', "mt"."quantity", 'unit', "mt"."quantity_unit"), 'desiredPrice', "mt"."desired_price", 'salesEnvironment', "mt"."sales_environment")
            WHEN ("a"."auction_category" = 'demolition'::"public"."auction_category_enum") THEN "json_build_object"('productType', "d"."product_type", 'demolitionArea', "d"."demolition_area", 'areaUnit', "d"."area_unit", 'pricePerUnit', "d"."price_per_unit", 'quantity', "json_build_object"('quantity', "d"."demolition_area", 'unit', "d"."area_unit"), 'demolitionInfo', "json_build_object"('buildingPurpose', "d"."building_purpose", 'demolitionMethod', "d"."demolition_method", 'structureType', "d"."structure_type", 'wasteDisposal', "d"."waste_disposal", 'floorCount', "d"."floor_count"))
            ELSE NULL::json
        END AS "category_details",
    ( SELECT "json_agg"("json_build_object"('id', "ap"."id", 'photo_url', "ap"."photo_url", 'photo_type', "ap"."photo_type", 'photo_order', "ap"."photo_order", 'is_representative', "ap"."is_representative") ORDER BY "ap"."photo_order") AS "json_agg"
           FROM "public"."auction_photos" "ap"
          WHERE ("ap"."auction_id" = "a"."id")) AS "auction_photos",
    ( SELECT "json_agg"("json_build_object"('id', "ab"."id", 'user_id', "ab"."user_id", 'user_name', "ab"."user_name", 'amount', "ab"."amount", 'price_per_unit', "ab"."price_per_unit", 'location', "ab"."location", 'bid_time', "ab"."bid_time", 'is_top_bid', "ab"."is_top_bid", 'created_at', "ab"."created_at") ORDER BY "ab"."amount" DESC) AS "json_agg"
           FROM "public"."auction_bids" "ab"
          WHERE ("ab"."auction_id" = "a"."id")) AS "auction_bids"
   FROM ((((("public"."auctions" "a"
     LEFT JOIN "public"."users" "u" ON (("a"."user_id" = "u"."id")))
     LEFT JOIN "public"."scrap_auctions" "s" ON ((("a"."id" = "s"."auction_id") AND ("a"."auction_category" = 'scrap'::"public"."auction_category_enum"))))
     LEFT JOIN "public"."machinery_auctions" "m" ON ((("a"."id" = "m"."auction_id") AND ("a"."auction_category" = 'machinery'::"public"."auction_category_enum"))))
     LEFT JOIN "public"."materials_auctions" "mt" ON ((("a"."id" = "mt"."auction_id") AND ("a"."auction_category" = 'materials'::"public"."auction_category_enum"))))
     LEFT JOIN "public"."demolition_auctions" "d" ON ((("a"."id" = "d"."auction_id") AND ("a"."auction_category" = 'demolition'::"public"."auction_category_enum"))));


ALTER VIEW "public"."auction_list_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."auction_list_view" IS '통합 뷰 - 판매자 정보 포함, 기존 API 완전 호환성 보장';



CREATE TABLE IF NOT EXISTS "public"."auction_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auction_id" "text" NOT NULL,
    "result_type" "public"."auction_result_enum" NOT NULL,
    "winning_bid_id" "uuid",
    "winning_user_id" "uuid",
    "winning_amount" numeric(15,2),
    "processed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_successful_result" CHECK (((("result_type" = 'successful'::"public"."auction_result_enum") AND ("winning_bid_id" IS NOT NULL) AND ("winning_user_id" IS NOT NULL) AND ("winning_amount" IS NOT NULL)) OR ("result_type" <> 'successful'::"public"."auction_result_enum")))
);


ALTER TABLE "public"."auction_results" OWNER TO "postgres";


COMMENT ON TABLE "public"."auction_results" IS '경매 결과 정보 - 낙찰/유찰/취소 결과 저장';



COMMENT ON COLUMN "public"."auction_results"."result_type" IS '결과 타입: successful(낙찰), failed(유찰), cancelled(취소)';



CREATE TABLE IF NOT EXISTS "public"."auction_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auction_result_id" "uuid" NOT NULL,
    "transaction_status" "public"."transaction_status_enum" DEFAULT 'pending'::"public"."transaction_status_enum",
    "payment_method" character varying(50),
    "payment_confirmed_at" timestamp with time zone,
    "payment_amount" numeric(15,2),
    "delivery_status" character varying(50) DEFAULT 'pending'::character varying,
    "delivery_scheduled_at" timestamp with time zone,
    "delivery_completed_at" timestamp with time zone,
    "contact_info" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."auction_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."auction_transactions" IS '거래 추적 정보 - 결제 및 배송 상태 관리';



COMMENT ON COLUMN "public"."auction_transactions"."transaction_status" IS '거래 상태: pending → paid → delivered → completed';



CREATE TABLE IF NOT EXISTS "public"."crawling_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "status" character varying(20) DEFAULT 'running'::character varying,
    "total_metals_attempted" integer DEFAULT 0,
    "successful_extractions" integer DEFAULT 0,
    "failed_extractions" integer DEFAULT 0,
    "error_message" "text",
    "duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "crawling_logs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['running'::character varying, 'success'::character varying, 'failed'::character varying, 'partial'::character varying, 'timeout'::character varying])::"text"[])))
);


ALTER TABLE "public"."crawling_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."crawling_logs" IS '크롤링 실행 로그 (구버전 호환성)';



COMMENT ON COLUMN "public"."crawling_logs"."status" IS '실행 상태: running(실행중), success(성공), failed(실패), partial(부분성공), timeout(타임아웃)';



CREATE TABLE IF NOT EXISTS "public"."cron_execution_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_type" "text" NOT NULL,
    "job_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "success_count" integer DEFAULT 0,
    "error_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cron_execution_logs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'success'::"text", 'failed'::"text", 'timeout'::"text"])))
);


ALTER TABLE "public"."cron_execution_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."cron_execution_logs" IS '통합 크론 실행 로그';



CREATE TABLE IF NOT EXISTS "public"."lme_processed_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metal_code" character varying(10) NOT NULL,
    "metal_name_kr" character varying(20) NOT NULL,
    "price_krw_per_kg" numeric(12,2) NOT NULL,
    "price_usd_per_ton" numeric(12,4) NOT NULL,
    "change_percent" numeric(8,4),
    "change_type" character varying(10),
    "change_amount_krw" numeric(12,2),
    "exchange_rate" numeric(10,4) NOT NULL,
    "exchange_rate_source" character varying(50) DEFAULT 'manual'::character varying,
    "price_date" "date" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lme_processed_prices_change_type_check" CHECK ((("change_type")::"text" = ANY ((ARRAY['positive'::character varying, 'negative'::character varying, 'unchanged'::character varying])::"text"[])))
);


ALTER TABLE "public"."lme_processed_prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."lme_processed_prices" IS 'LME 가격 데이터 (처리된 형태)';



COMMENT ON COLUMN "public"."lme_processed_prices"."change_type" IS '가격 변화 방향: positive(상승), negative(하락), unchanged(변화없음)';



CREATE TABLE IF NOT EXISTS "public"."notification_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_read" boolean DEFAULT false,
    "notification_type" "text",
    "sent_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_history" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."notification_performance_stats" AS
 SELECT "count"(*) AS "total_notifications",
    "count"(*) FILTER (WHERE ("created_at" >= ("now"() - '1 day'::interval))) AS "notifications_today",
    "count"(*) FILTER (WHERE ("created_at" >= ("now"() - '7 days'::interval))) AS "notifications_this_week",
    "count"(*) FILTER (WHERE ("created_at" >= ("now"() - '30 days'::interval))) AS "notifications_this_month",
    "count"(DISTINCT "user_id") AS "active_users",
        CASE
            WHEN ("count"(DISTINCT "user_id") > 0) THEN (("count"(*))::numeric / ("count"(DISTINCT "user_id"))::numeric)
            ELSE (0)::numeric
        END AS "avg_notifications_per_user",
    "max"("created_at") AS "latest_notification",
    "min"("created_at") AS "oldest_notification"
   FROM "public"."notification_history";


ALTER VIEW "public"."notification_performance_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_request_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_request_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "photo_order" integer DEFAULT 0 NOT NULL,
    "is_representative" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."service_request_photos" OWNER TO "postgres";


COMMENT ON TABLE "public"."service_request_photos" IS '서비스 요청 관련 사진';



COMMENT ON COLUMN "public"."service_request_photos"."photo_order" IS '사진 순서 (0부터 시작)';



COMMENT ON COLUMN "public"."service_request_photos"."is_representative" IS '대표 이미지 여부';



CREATE TABLE IF NOT EXISTS "public"."service_request_status_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_request_id" "uuid" NOT NULL,
    "old_status" "text",
    "new_status" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."service_request_status_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."service_request_status_logs" IS '서비스 요청 상태 변경 이력';



CREATE OR REPLACE VIEW "public"."service_requests_summary" AS
 SELECT "sr"."id",
    "sr"."user_id",
    "sr"."service_type",
    "sr"."status",
    "sr"."contact_phone",
    "sr"."address",
    "sr"."address_detail",
    "sr"."description",
    "sr"."scheduled_date",
    "sr"."assigned_expert_id",
    "sr"."expert_notes",
    "sr"."estimated_value",
    "sr"."final_offer",
    "sr"."created_at",
    "sr"."updated_at",
    "sr"."completed_at",
        CASE
            WHEN ("sr"."user_id" IS NULL) THEN '비회원'::"text"
            ELSE '회원'::"text"
        END AS "user_type",
    "u"."name" AS "user_name",
    "u"."phone_number" AS "user_phone"
   FROM ("public"."service_requests" "sr"
     LEFT JOIN "public"."users" "u" ON (("sr"."user_id" = "u"."id")));


ALTER VIEW "public"."service_requests_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."service_requests_summary" IS '서비스 요청 요약 뷰 - 회원/비회원 구분 포함';



CREATE TABLE IF NOT EXISTS "public"."user_push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "device_type" "text",
    "token" "text" NOT NULL,
    CONSTRAINT "user_push_tokens_device_type_check" CHECK (("device_type" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."user_push_tokens" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."token_upsert_performance" AS
 SELECT "count"(*) AS "total_tokens",
    "count"(*) FILTER (WHERE ("is_active" = true)) AS "active_tokens",
    "count"(*) FILTER (WHERE ("is_active" = false)) AS "inactive_tokens",
    "count"(DISTINCT "user_id") AS "unique_users",
    "count"(DISTINCT "device_type") AS "device_types",
    "max"("created_at") AS "latest_token_created",
    "max"("updated_at") AS "latest_token_updated"
   FROM "public"."user_push_tokens";


ALTER VIEW "public"."token_upsert_performance" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_profiles" AS
 SELECT "id",
    "name",
    "phone_number",
    "address",
    "address_detail",
    "avatar_url",
    "is_business",
    "company_name",
    "business_type",
    "is_phone_verified",
    "created_at",
    "updated_at",
        CASE
            WHEN "is_business" THEN '사업자'::"text"
            ELSE '개인'::"text"
        END AS "user_type",
        CASE
            WHEN "is_phone_verified" THEN '인증완료'::"text"
            ELSE '인증대기'::"text"
        END AS "verification_status"
   FROM "public"."users";


ALTER VIEW "public"."user_profiles" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_profiles" IS '사용자 프로필 뷰 - 민감 정보 제외한 공개 정보';



ALTER TABLE ONLY "public"."auction_bids"
    ADD CONSTRAINT "auction_bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auction_photos"
    ADD CONSTRAINT "auction_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auction_results"
    ADD CONSTRAINT "auction_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auction_transactions"
    ADD CONSTRAINT "auction_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auctions"
    ADD CONSTRAINT "auctions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crawling_logs"
    ADD CONSTRAINT "crawling_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cron_execution_logs"
    ADD CONSTRAINT "cron_execution_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."demolition_auctions"
    ADD CONSTRAINT "demolition_auctions_pkey" PRIMARY KEY ("auction_id");



ALTER TABLE ONLY "public"."lme_processed_prices"
    ADD CONSTRAINT "lme_processed_prices_metal_code_price_date_key" UNIQUE ("metal_code", "price_date");



ALTER TABLE ONLY "public"."lme_processed_prices"
    ADD CONSTRAINT "lme_processed_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."machinery_auctions"
    ADD CONSTRAINT "machinery_auctions_pkey" PRIMARY KEY ("auction_id");



ALTER TABLE ONLY "public"."materials_auctions"
    ADD CONSTRAINT "materials_auctions_pkey" PRIMARY KEY ("auction_id");



ALTER TABLE ONLY "public"."notification_history"
    ADD CONSTRAINT "notification_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scrap_auctions"
    ADD CONSTRAINT "scrap_auctions_pkey" PRIMARY KEY ("auction_id");



ALTER TABLE ONLY "public"."service_request_photos"
    ADD CONSTRAINT "service_request_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_request_status_logs"
    ADD CONSTRAINT "service_request_status_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_requests"
    ADD CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_user_id_token_key" UNIQUE ("user_id", "token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_auction_bids_amount" ON "public"."auction_bids" USING "btree" ("auction_id", "amount" DESC);



CREATE INDEX "idx_auction_bids_auction_id" ON "public"."auction_bids" USING "btree" ("auction_id");



CREATE INDEX "idx_auction_bids_user_id" ON "public"."auction_bids" USING "btree" ("user_id");



CREATE INDEX "idx_auction_photos_auction_id" ON "public"."auction_photos" USING "btree" ("auction_id");



CREATE INDEX "idx_auction_photos_order" ON "public"."auction_photos" USING "btree" ("auction_id", "photo_order");



CREATE INDEX "idx_auction_photos_representative" ON "public"."auction_photos" USING "btree" ("auction_id", "is_representative");



CREATE INDEX "idx_auction_results_auction_id" ON "public"."auction_results" USING "btree" ("auction_id");



CREATE INDEX "idx_auction_results_processed_at" ON "public"."auction_results" USING "btree" ("processed_at");



CREATE INDEX "idx_auction_results_type" ON "public"."auction_results" USING "btree" ("result_type");



CREATE INDEX "idx_auction_results_winning_user" ON "public"."auction_results" USING "btree" ("winning_user_id");



CREATE INDEX "idx_auction_transactions_result_id" ON "public"."auction_transactions" USING "btree" ("auction_result_id");



CREATE INDEX "idx_auction_transactions_status" ON "public"."auction_transactions" USING "btree" ("transaction_status");



CREATE INDEX "idx_auctions_category" ON "public"."auctions" USING "btree" ("auction_category");



CREATE INDEX "idx_auctions_created_at" ON "public"."auctions" USING "btree" ("created_at");



CREATE INDEX "idx_auctions_end_time" ON "public"."auctions" USING "btree" ("end_time");



CREATE INDEX "idx_auctions_status" ON "public"."auctions" USING "btree" ("status");



CREATE INDEX "idx_auctions_user_id" ON "public"."auctions" USING "btree" ("user_id");



CREATE INDEX "idx_crawling_logs_status_started" ON "public"."crawling_logs" USING "btree" ("status", "started_at" DESC);



CREATE INDEX "idx_cron_logs_job_type_status" ON "public"."cron_execution_logs" USING "btree" ("job_type", "status", "started_at" DESC);



CREATE INDEX "idx_cron_logs_started_at" ON "public"."cron_execution_logs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_demolition_auctions_area" ON "public"."demolition_auctions" USING "btree" ("demolition_area");



CREATE INDEX "idx_lme_processed_prices_change_type" ON "public"."lme_processed_prices" USING "btree" ("change_type", "price_date" DESC);



CREATE INDEX "idx_lme_processed_prices_metal_date" ON "public"."lme_processed_prices" USING "btree" ("metal_code", "price_date" DESC);



CREATE INDEX "idx_lme_processed_prices_processed_at" ON "public"."lme_processed_prices" USING "btree" ("processed_at" DESC);



CREATE INDEX "idx_machinery_auctions_product_name" ON "public"."machinery_auctions" USING "btree" ("product_name");



CREATE INDEX "idx_materials_auctions_quantity" ON "public"."materials_auctions" USING "btree" ("quantity");



CREATE INDEX "idx_notification_history_created_at_desc" ON "public"."notification_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notification_history_is_read" ON "public"."notification_history" USING "btree" ("is_read");



CREATE INDEX "idx_notification_history_sent_at" ON "public"."notification_history" USING "btree" ("sent_at");



CREATE INDEX "idx_notification_history_user_created_desc" ON "public"."notification_history" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notification_history_user_id" ON "public"."notification_history" USING "btree" ("user_id");



CREATE INDEX "idx_notification_history_user_type" ON "public"."notification_history" USING "btree" ("user_id", "notification_type", "created_at" DESC);



CREATE INDEX "idx_notification_history_user_unread" ON "public"."notification_history" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_scrap_auctions_weight" ON "public"."scrap_auctions" USING "btree" ("weight_kg");



CREATE INDEX "idx_service_request_photos_order" ON "public"."service_request_photos" USING "btree" ("service_request_id", "photo_order");



CREATE INDEX "idx_service_request_photos_representative" ON "public"."service_request_photos" USING "btree" ("service_request_id", "is_representative");



CREATE INDEX "idx_service_request_photos_request_id" ON "public"."service_request_photos" USING "btree" ("service_request_id");



CREATE INDEX "idx_service_requests_created_at" ON "public"."service_requests" USING "btree" ("created_at");



CREATE INDEX "idx_service_requests_null_user_id" ON "public"."service_requests" USING "btree" ("created_at") WHERE ("user_id" IS NULL);



CREATE INDEX "idx_service_requests_service_type" ON "public"."service_requests" USING "btree" ("service_type");



CREATE INDEX "idx_service_requests_status" ON "public"."service_requests" USING "btree" ("status");



CREATE INDEX "idx_service_requests_user_id" ON "public"."service_requests" USING "btree" ("user_id");



CREATE INDEX "idx_status_logs_created_at" ON "public"."service_request_status_logs" USING "btree" ("created_at");



CREATE INDEX "idx_status_logs_request_id" ON "public"."service_request_status_logs" USING "btree" ("service_request_id");



CREATE INDEX "idx_user_push_tokens_active" ON "public"."user_push_tokens" USING "btree" ("is_active");



CREATE INDEX "idx_user_push_tokens_token_active" ON "public"."user_push_tokens" USING "btree" ("token", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_user_push_tokens_user_active" ON "public"."user_push_tokens" USING "btree" ("user_id", "is_active", "created_at" DESC) WHERE ("is_active" = true);



CREATE UNIQUE INDEX "idx_user_push_tokens_user_device_unique" ON "public"."user_push_tokens" USING "btree" ("user_id", "device_type");



CREATE INDEX "idx_user_push_tokens_user_id" ON "public"."user_push_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_users_avatar_url" ON "public"."users" USING "btree" ("avatar_url") WHERE ("avatar_url" IS NOT NULL);



CREATE INDEX "idx_users_business_number" ON "public"."users" USING "btree" ("business_number") WHERE ("business_number" IS NOT NULL);



CREATE INDEX "idx_users_created_at" ON "public"."users" USING "btree" ("created_at");



CREATE INDEX "idx_users_expo_push_token" ON "public"."users" USING "btree" ("expo_push_token") WHERE ("expo_push_token" IS NOT NULL);



CREATE INDEX "idx_users_is_admin" ON "public"."users" USING "btree" ("is_admin");



CREATE INDEX "idx_users_is_business" ON "public"."users" USING "btree" ("is_business");



CREATE INDEX "idx_users_phone_number" ON "public"."users" USING "btree" ("phone_number");



CREATE INDEX "idx_users_phone_verified" ON "public"."users" USING "btree" ("is_phone_verified", "created_at");



CREATE OR REPLACE TRIGGER "log_service_request_status_change" AFTER UPDATE ON "public"."service_requests" FOR EACH ROW EXECUTE FUNCTION "public"."log_status_change"();



CREATE OR REPLACE TRIGGER "set_service_request_completed_at" BEFORE UPDATE ON "public"."service_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_completed_at"();



CREATE OR REPLACE TRIGGER "trigger_create_transaction_record" AFTER INSERT ON "public"."auction_results" FOR EACH ROW EXECUTE FUNCTION "public"."create_transaction_record"();



CREATE OR REPLACE TRIGGER "trigger_new_auction_notification" AFTER INSERT ON "public"."auctions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_auction_create_notification"();



CREATE OR REPLACE TRIGGER "trigger_update_auction_on_bid" BEFORE INSERT ON "public"."auction_bids" FOR EACH ROW EXECUTE FUNCTION "public"."update_auction_on_bid"();



CREATE OR REPLACE TRIGGER "trigger_update_auction_result_updated_at" BEFORE UPDATE ON "public"."auction_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_auction_result_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_auction_transaction_updated_at" BEFORE UPDATE ON "public"."auction_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_auction_transaction_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_auction_updated_at" BEFORE UPDATE ON "public"."auctions" FOR EACH ROW EXECUTE FUNCTION "public"."update_auction_updated_at"();



CREATE OR REPLACE TRIGGER "update_service_requests_updated_at" BEFORE UPDATE ON "public"."service_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."auction_bids"
    ADD CONSTRAINT "auction_bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auction_bids"
    ADD CONSTRAINT "auction_bids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auction_photos"
    ADD CONSTRAINT "auction_photos_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auction_results"
    ADD CONSTRAINT "auction_results_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auction_results"
    ADD CONSTRAINT "auction_results_winning_bid_id_fkey" FOREIGN KEY ("winning_bid_id") REFERENCES "public"."auction_bids"("id");



ALTER TABLE ONLY "public"."auction_results"
    ADD CONSTRAINT "auction_results_winning_user_id_fkey" FOREIGN KEY ("winning_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."auction_transactions"
    ADD CONSTRAINT "auction_transactions_auction_result_id_fkey" FOREIGN KEY ("auction_result_id") REFERENCES "public"."auction_results"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auctions"
    ADD CONSTRAINT "auctions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."demolition_auctions"
    ADD CONSTRAINT "demolition_auctions_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."machinery_auctions"
    ADD CONSTRAINT "machinery_auctions_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."materials_auctions"
    ADD CONSTRAINT "materials_auctions_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_history"
    ADD CONSTRAINT "notification_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scrap_auctions"
    ADD CONSTRAINT "scrap_auctions_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_photos"
    ADD CONSTRAINT "service_request_photos_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_request_status_logs"
    ADD CONSTRAINT "service_request_status_logs_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view auction bids" ON "public"."auction_bids" FOR SELECT USING (true);



CREATE POLICY "Anyone can view auction photos" ON "public"."auction_photos" FOR SELECT USING (true);



CREATE POLICY "Anyone can view auction results" ON "public"."auction_results" FOR SELECT USING (true);



CREATE POLICY "Anyone can view auctions" ON "public"."auctions" FOR SELECT USING (true);



CREATE POLICY "Custom auth: Delete service requests" ON "public"."service_requests" FOR DELETE USING ((("user_id" IS NULL) OR ("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."id" = "service_requests"."user_id")))));



CREATE POLICY "Custom auth: Insert service requests" ON "public"."service_requests" FOR INSERT WITH CHECK ((("user_id" IS NULL) OR ("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"))));



CREATE POLICY "Custom auth: Manage request photos" ON "public"."service_request_photos" USING ((EXISTS ( SELECT 1
   FROM "public"."service_requests"
  WHERE (("service_requests"."id" = "service_request_photos"."service_request_id") AND (("service_requests"."user_id" IS NULL) OR ("service_requests"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users")))))));



CREATE POLICY "Custom auth: Update service requests" ON "public"."service_requests" FOR UPDATE USING ((("user_id" IS NULL) OR ("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."id" = "service_requests"."user_id")))));



CREATE POLICY "Custom auth: View service requests" ON "public"."service_requests" FOR SELECT USING ((("user_id" IS NULL) OR ("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."id" = "service_requests"."user_id")))));



CREATE POLICY "Custom auth: View status logs" ON "public"."service_request_status_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."service_requests"
  WHERE (("service_requests"."id" = "service_request_status_logs"."service_request_id") AND (("service_requests"."user_id" IS NULL) OR ("service_requests"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users")))))));



CREATE POLICY "Demolition auctions follow parent auction policy" ON "public"."demolition_auctions" USING (("auction_id" IN ( SELECT "auctions"."id"
   FROM "public"."auctions"
  WHERE ("auctions"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users")))));



CREATE POLICY "Enable delete for own records" ON "public"."users" FOR DELETE USING (true);



CREATE POLICY "Enable insert for everyone" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable select for authenticated users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."users" FOR UPDATE USING (true);



CREATE POLICY "Machinery auctions follow parent auction policy" ON "public"."machinery_auctions" USING (("auction_id" IN ( SELECT "auctions"."id"
   FROM "public"."auctions"
  WHERE ("auctions"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users")))));



CREATE POLICY "Materials auctions follow parent auction policy" ON "public"."materials_auctions" USING (("auction_id" IN ( SELECT "auctions"."id"
   FROM "public"."auctions"
  WHERE ("auctions"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users")))));



CREATE POLICY "Scrap auctions follow parent auction policy" ON "public"."scrap_auctions" USING (("auction_id" IN ( SELECT "auctions"."id"
   FROM "public"."auctions"
  WHERE ("auctions"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users")))));



CREATE POLICY "System only: Insert status logs" ON "public"."service_request_status_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "System only: Update status logs" ON "public"."service_request_status_logs" FOR UPDATE USING (true);



CREATE POLICY "Users can create their own auctions" ON "public"."auctions" FOR INSERT WITH CHECK (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users")));



CREATE POLICY "Users can delete their own auctions" ON "public"."auctions" FOR DELETE USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users")));



CREATE POLICY "Users can manage photos of their auctions" ON "public"."auction_photos" USING (("auction_id" IN ( SELECT "auctions"."id"
   FROM "public"."auctions"
  WHERE ("auctions"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users")))));



CREATE POLICY "Users can update their own auctions" ON "public"."auctions" FOR UPDATE USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users")));



CREATE POLICY "Users can view their transactions" ON "public"."auction_transactions" FOR SELECT USING (("auction_result_id" IN ( SELECT "ar"."id"
   FROM ("public"."auction_results" "ar"
     JOIN "public"."auctions" "a" ON (("ar"."auction_id" = "a"."id")))
  WHERE (("a"."user_id" IN ( SELECT "users"."id"
           FROM "public"."users")) OR ("ar"."winning_user_id" IN ( SELECT "users"."id"
           FROM "public"."users"))))));



CREATE POLICY "admin_read_all_crawling_logs" ON "public"."crawling_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "admin_read_all_cron_logs" ON "public"."cron_execution_logs" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."auction_bids" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auction_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auction_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auction_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auctions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_read_lme_processed_prices" ON "public"."lme_processed_prices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_read_recent_crawling_logs" ON "public"."crawling_logs" FOR SELECT TO "authenticated" USING (("started_at" >= (CURRENT_DATE - '7 days'::interval)));



CREATE POLICY "authenticated_read_recent_cron_logs" ON "public"."cron_execution_logs" FOR SELECT TO "authenticated" USING (("started_at" >= (CURRENT_DATE - '7 days'::interval)));



CREATE POLICY "basic_bid_policy" ON "public"."auction_bids" FOR INSERT WITH CHECK ((("user_id" IS NOT NULL) AND ("auction_id" IS NOT NULL) AND ("amount" > (0)::numeric)));



COMMENT ON POLICY "basic_bid_policy" ON "public"."auction_bids" IS '기본 입찰 정책: 데이터 무결성 체크. 자신의 경매 입찰 방지는 애플리케이션 레벨에서 처리';



ALTER TABLE "public"."crawling_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cron_execution_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."demolition_auctions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lme_processed_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."machinery_auctions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."materials_auctions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_read_lme_processed_prices" ON "public"."lme_processed_prices" FOR SELECT TO "anon" USING (("price_date" >= (CURRENT_DATE - '30 days'::interval)));



ALTER TABLE "public"."scrap_auctions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_request_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_request_status_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_update_crawling_logs" ON "public"."crawling_logs" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "service_role_update_cron_logs" ON "public"."cron_execution_logs" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "service_role_write_crawling_logs" ON "public"."crawling_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "service_role_write_cron_logs" ON "public"."cron_execution_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "service_role_write_lme_processed_prices" ON "public"."lme_processed_prices" TO "service_role" USING (true);



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."check_cron_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_cron_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_cron_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_self_bidding_violations"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_self_bidding_violations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_self_bidding_violations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_verification_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_verification_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_verification_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("retention_days" integer, "batch_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("retention_days" integer, "batch_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("retention_days" integer, "batch_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification_partition"("partition_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification_partition"("partition_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification_partition"("partition_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_transaction_record"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_transaction_record"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_transaction_record"() TO "service_role";



GRANT ALL ON FUNCTION "public"."diagnose_notification_system"() TO "anon";
GRANT ALL ON FUNCTION "public"."diagnose_notification_system"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."diagnose_notification_system"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auction_photo_count"("auction_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_auction_photo_count"("auction_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auction_photo_count"("auction_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auction_processing_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auction_processing_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auction_processing_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auction_representative_photo"("auction_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_auction_representative_photo"("auction_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auction_representative_photo"("auction_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_crawler_stats"("crawler_type_param" "text", "hours_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_crawler_stats"("crawler_type_param" "text", "hours_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_crawler_stats"("crawler_type_param" "text", "hours_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_crawling_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_crawling_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_crawling_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cron_jobs_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cron_jobs_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cron_jobs_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cron_system_health"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cron_system_health"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cron_system_health"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_environment"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_environment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_environment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_timezone_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_timezone_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_timezone_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_lme_prices"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_lme_prices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_lme_prices"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_executions"("job_type_param" "text", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_executions"("job_type_param" "text", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_executions"("job_type_param" "text", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_service_request_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_service_request_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_service_request_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_activity_summary"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_activity_summary"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_activity_summary"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_phone"("phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_phone"("phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_phone"("phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_notification_stats"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_notification_stats"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_notification_stats"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_unread_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_unread_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_unread_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile_summary"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile_summary"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile_summary"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."service_requests" TO "anon";
GRANT ALL ON TABLE "public"."service_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."service_requests" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_recent_requests"("user_uuid" "uuid", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_recent_requests"("user_uuid" "uuid", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_recent_requests"("user_uuid" "uuid", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_unread_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_unread_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_unread_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_admin"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_admin"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_admin"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_token_performance"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_token_performance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_token_performance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_ended_auctions"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_ended_auctions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_ended_auctions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."repair_auction_bids"("auction_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."repair_auction_bids"("auction_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."repair_auction_bids"("auction_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."run_lme_crawler"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_lme_crawler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_lme_crawler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_auction_create_notification"("auction_id" "text", "auction_title" "text", "auction_category" "text", "seller_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_auction_create_notification"("auction_id" "text", "auction_title" "text", "auction_category" "text", "seller_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_auction_create_notification"("auction_id" "text", "auction_title" "text", "auction_category" "text", "seller_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_auction_end_notification"("tokens" "text"[], "title" "text", "body" "text", "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."send_auction_end_notification"("tokens" "text"[], "title" "text", "body" "text", "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_auction_end_notification"("tokens" "text"[], "title" "text", "body" "text", "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_completed_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_completed_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_completed_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_current_user_id"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_user_id"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_user_id"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_admin_status"("user_uuid" "uuid", "admin_status" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_admin_status"("user_uuid" "uuid", "admin_status" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_admin_status"("user_uuid" "uuid", "admin_status" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_verification_code"("user_uuid" "uuid", "code" character varying, "expires_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."set_verification_code"("user_uuid" "uuid", "code" character varying, "expires_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_verification_code"("user_uuid" "uuid", "code" character varying, "expires_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."test_notification_manually"("test_title" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."test_notification_manually"("test_title" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_notification_manually"("test_title" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_auction_create_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_auction_create_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_auction_create_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_auction_on_bid"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_auction_on_bid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_auction_on_bid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_auction_result_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_auction_result_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_auction_result_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_auction_status_realtime"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_auction_status_realtime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_auction_status_realtime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_auction_transaction_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_auction_transaction_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_auction_transaction_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_auction_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_auction_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_auction_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_auction_bids"("auction_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_auction_bids"("auction_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_auction_bids"("auction_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_phone_code"("user_uuid" "uuid", "code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."verify_phone_code"("user_uuid" "uuid", "code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_phone_code"("user_uuid" "uuid", "code" character varying) TO "service_role";
























GRANT ALL ON TABLE "public"."auction_bids" TO "anon";
GRANT ALL ON TABLE "public"."auction_bids" TO "authenticated";
GRANT ALL ON TABLE "public"."auction_bids" TO "service_role";



GRANT ALL ON TABLE "public"."auctions" TO "anon";
GRANT ALL ON TABLE "public"."auctions" TO "authenticated";
GRANT ALL ON TABLE "public"."auctions" TO "service_role";



GRANT ALL ON TABLE "public"."auction_data_inconsistencies" TO "anon";
GRANT ALL ON TABLE "public"."auction_data_inconsistencies" TO "authenticated";
GRANT ALL ON TABLE "public"."auction_data_inconsistencies" TO "service_role";



GRANT ALL ON TABLE "public"."auction_photos" TO "anon";
GRANT ALL ON TABLE "public"."auction_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."auction_photos" TO "service_role";



GRANT ALL ON TABLE "public"."demolition_auctions" TO "anon";
GRANT ALL ON TABLE "public"."demolition_auctions" TO "authenticated";
GRANT ALL ON TABLE "public"."demolition_auctions" TO "service_role";



GRANT ALL ON TABLE "public"."machinery_auctions" TO "anon";
GRANT ALL ON TABLE "public"."machinery_auctions" TO "authenticated";
GRANT ALL ON TABLE "public"."machinery_auctions" TO "service_role";



GRANT ALL ON TABLE "public"."materials_auctions" TO "anon";
GRANT ALL ON TABLE "public"."materials_auctions" TO "authenticated";
GRANT ALL ON TABLE "public"."materials_auctions" TO "service_role";



GRANT ALL ON TABLE "public"."scrap_auctions" TO "anon";
GRANT ALL ON TABLE "public"."scrap_auctions" TO "authenticated";
GRANT ALL ON TABLE "public"."scrap_auctions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."auction_list_view" TO "anon";
GRANT ALL ON TABLE "public"."auction_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."auction_list_view" TO "service_role";



GRANT ALL ON TABLE "public"."auction_results" TO "anon";
GRANT ALL ON TABLE "public"."auction_results" TO "authenticated";
GRANT ALL ON TABLE "public"."auction_results" TO "service_role";



GRANT ALL ON TABLE "public"."auction_transactions" TO "anon";
GRANT ALL ON TABLE "public"."auction_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."auction_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."crawling_logs" TO "anon";
GRANT ALL ON TABLE "public"."crawling_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."crawling_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cron_execution_logs" TO "anon";
GRANT ALL ON TABLE "public"."cron_execution_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."cron_execution_logs" TO "service_role";



GRANT ALL ON TABLE "public"."lme_processed_prices" TO "anon";
GRANT ALL ON TABLE "public"."lme_processed_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."lme_processed_prices" TO "service_role";



GRANT ALL ON TABLE "public"."notification_history" TO "anon";
GRANT ALL ON TABLE "public"."notification_history" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_history" TO "service_role";



GRANT ALL ON TABLE "public"."notification_performance_stats" TO "anon";
GRANT ALL ON TABLE "public"."notification_performance_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_performance_stats" TO "service_role";



GRANT ALL ON TABLE "public"."service_request_photos" TO "anon";
GRANT ALL ON TABLE "public"."service_request_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."service_request_photos" TO "service_role";



GRANT ALL ON TABLE "public"."service_request_status_logs" TO "anon";
GRANT ALL ON TABLE "public"."service_request_status_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."service_request_status_logs" TO "service_role";



GRANT ALL ON TABLE "public"."service_requests_summary" TO "anon";
GRANT ALL ON TABLE "public"."service_requests_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."service_requests_summary" TO "service_role";



GRANT ALL ON TABLE "public"."user_push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."user_push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."token_upsert_performance" TO "anon";
GRANT ALL ON TABLE "public"."token_upsert_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."token_upsert_performance" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
