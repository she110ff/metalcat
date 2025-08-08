-- ============================================
-- cron_execution_logs 7일 데이터 자동 정리 시스템
-- 2025-01-28: 로그 테이블 자동 정리 기능 구현
-- ============================================

-- 1. 성능 최적화를 위한 인덱스 추가 (단순 인덱스로 수정)
CREATE INDEX IF NOT EXISTS idx_cron_logs_created_at_cleanup 
ON cron_execution_logs(created_at);

-- 2. 오래된 크론 로그 정리 함수
CREATE OR REPLACE FUNCTION cleanup_old_cron_logs(
    retention_days INTEGER DEFAULT 7,
    batch_size INTEGER DEFAULT 1000,
    dry_run BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    deleted_count INTEGER,
    job_type_breakdown JSONB,
    execution_time_ms INTEGER,
    oldest_deleted_date TIMESTAMPTZ,
    newest_deleted_date TIMESTAMPTZ,
    operation_type TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_deleted INTEGER := 0;
    batch_deleted INTEGER;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_duration INTEGER;
    cutoff_date TIMESTAMPTZ;
    breakdown JSONB := '{}';
    oldest_date TIMESTAMPTZ;
    newest_date TIMESTAMPTZ;
    log_id UUID;
    operation_desc TEXT;
BEGIN
    -- 시작 시간 기록
    start_time := NOW();
    
    -- 입력 검증
    IF retention_days < 1 THEN
        RAISE EXCEPTION '보관 기간은 최소 1일 이상이어야 합니다.';
    END IF;
    
    IF batch_size < 100 OR batch_size > 10000 THEN
        RAISE EXCEPTION '배치 크기는 100-10000 사이여야 합니다.';
    END IF;
    
    -- 삭제 기준 날짜 설정
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- 작업 타입 설정
    operation_desc := CASE 
        WHEN dry_run THEN 'dry-run' 
        ELSE 'cleanup' 
    END;
    
    -- 로그 시작 기록
    INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
    VALUES ('system', 'cron-logs-cleanup', 'running', 
            jsonb_build_object(
                'started_at', start_time,
                'retention_days', retention_days,
                'batch_size', batch_size,
                'dry_run', dry_run,
                'cutoff_date', cutoff_date
            ))
    RETURNING id INTO log_id;
    
    -- 삭제할 데이터의 통계 정보 수집 (수정된 쿼리)
    SELECT 
        jsonb_object_agg(job_type, count) as breakdown_result
    INTO breakdown
    FROM (
        SELECT 
            job_type,
            COUNT(*) as count
        FROM cron_execution_logs 
        WHERE created_at < cutoff_date
        GROUP BY job_type
    ) t;
    
    -- 전체 범위 날짜 정보 별도 조회
    SELECT MIN(created_at), MAX(created_at)
    INTO oldest_date, newest_date
    FROM cron_execution_logs 
    WHERE created_at < cutoff_date;
    
    -- dry_run 모드인 경우 실제 삭제 없이 통계만 반환
    IF dry_run THEN
        end_time := NOW();
        execution_duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        -- 로그 완료 업데이트
        UPDATE cron_execution_logs 
        SET 
            status = 'success',
            completed_at = end_time,
            duration_ms = execution_duration,
            success_count = (
                SELECT COUNT(*)::INTEGER 
                FROM cron_execution_logs 
                WHERE created_at < cutoff_date
            ),
            metadata = metadata || jsonb_build_object(
                'completed_at', end_time,
                'job_type_breakdown', breakdown,
                'dry_run_result', true
            )
        WHERE id = log_id;
        
        RETURN QUERY SELECT 
            (SELECT COUNT(*)::INTEGER FROM cron_execution_logs WHERE created_at < cutoff_date) as deleted_count,
            COALESCE(breakdown, '{}'::jsonb) as job_type_breakdown,
            execution_duration as execution_time_ms,
            oldest_date as oldest_deleted_date,
            newest_date as newest_deleted_date,
            'dry-run'::TEXT as operation_type;
        RETURN;
    END IF;
    
    -- 실제 삭제 작업 (배치 처리)
    LOOP
        -- 배치 단위로 삭제
        WITH deleted_batch AS (
            DELETE FROM cron_execution_logs 
            WHERE id IN (
                SELECT id 
                FROM cron_execution_logs 
                WHERE created_at < cutoff_date
                ORDER BY created_at ASC
                LIMIT batch_size
            )
            RETURNING *
        )
        SELECT COUNT(*) INTO batch_deleted FROM deleted_batch;
        
        total_deleted := total_deleted + batch_deleted;
        
        -- 더 이상 삭제할 데이터가 없으면 종료
        EXIT WHEN batch_deleted = 0;
        
        -- 안전 장치: 한 번에 너무 많이 삭제하지 않도록 제한
        IF total_deleted >= 50000 THEN
            RAISE NOTICE '안전상 한 번에 50,000개 이상 삭제하지 않습니다. 현재 삭제: %', total_deleted;
            EXIT;
        END IF;
        
        -- 배치 간 잠시 대기 (시스템 부하 완화)
        IF batch_deleted = batch_size THEN
            PERFORM pg_sleep(0.1);
        END IF;
    END LOOP;
    
    -- 실행 시간 계산
    end_time := NOW();
    execution_duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- 테이블 통계 업데이트 (성능 최적화)
    ANALYZE cron_execution_logs;
    
    -- 로그 완료 업데이트
    UPDATE cron_execution_logs 
    SET 
        status = 'success',
        completed_at = end_time,
        duration_ms = execution_duration,
        success_count = total_deleted,
        metadata = metadata || jsonb_build_object(
            'completed_at', end_time,
            'deleted_count', total_deleted,
            'job_type_breakdown', breakdown
        )
    WHERE id = log_id;
    
    -- 결과 반환
    RETURN QUERY SELECT 
        total_deleted as deleted_count,
        COALESCE(breakdown, '{}'::jsonb) as job_type_breakdown,
        execution_duration as execution_time_ms,
        oldest_date as oldest_deleted_date,
        newest_date as newest_deleted_date,
        'cleanup'::TEXT as operation_type;
        
EXCEPTION WHEN OTHERS THEN
    -- 오류 발생 시 로그 업데이트
    UPDATE cron_execution_logs 
    SET 
        status = 'failed',
        completed_at = NOW(),
        error_message = SQLERRM,
        metadata = metadata || jsonb_build_object(
            'error_occurred_at', NOW(),
            'error_detail', SQLERRM
        )
    WHERE id = log_id;
    
    RAISE;
END;
$$ LANGUAGE plpgsql;
