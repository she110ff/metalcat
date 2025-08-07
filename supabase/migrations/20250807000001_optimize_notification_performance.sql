-- 알림 히스토리 성능 최적화
-- 대용량 데이터 처리를 위한 인덱스 및 정책 개선

-- ============================================
-- 1. 복합 인덱스 추가 (성능 최적화)
-- ============================================

-- 사용자별 최신 알림 조회 최적화 (가장 중요한 쿼리)
CREATE INDEX IF NOT EXISTS idx_notification_history_user_created_desc 
ON notification_history(user_id, created_at DESC);

-- 사용자별 읽지 않은 알림 조회 최적화
CREATE INDEX IF NOT EXISTS idx_notification_history_user_unread 
ON notification_history(user_id, is_read) 
WHERE is_read = false;

-- 사용자별 알림 타입별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_notification_history_user_type 
ON notification_history(user_id, notification_type, created_at DESC);

-- 오래된 알림 정리용 인덱스 (7일)
-- NOW() 함수는 인덱스 조건에서 사용할 수 없으므로 제거
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at_desc 
ON notification_history(created_at DESC);

-- ============================================
-- 2. 파티셔닝 준비 (선택적)
-- ============================================

-- 월별 파티셔닝을 위한 함수 (향후 대용량 시 사용)
CREATE OR REPLACE FUNCTION create_notification_partition(partition_date DATE)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. 자동 정리 함수 (데이터 보관 정책)
-- ============================================

-- 오래된 알림 자동 삭제 함수 (7일 보관)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(
    retention_days INTEGER DEFAULT 7,
    batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE(
    deleted_count INTEGER,
    remaining_count INTEGER
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 성능 최적화된 조회 함수
-- ============================================

-- 사용자별 알림 조회 최적화 함수
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    body TEXT,
    data JSONB,
    notification_type TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자별 미읽 알림 개수 조회 최적화
CREATE OR REPLACE FUNCTION get_user_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notification_history 
    WHERE user_id = p_user_id 
    AND is_read = false;
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 알림 통계 함수
-- ============================================

-- 사용자별 알림 통계
CREATE OR REPLACE FUNCTION get_user_notification_stats(p_user_id UUID)
RETURNS TABLE(
    total_count BIGINT,
    unread_count BIGINT,
    read_count BIGINT,
    oldest_notification TIMESTAMP WITH TIME ZONE,
    newest_notification TIMESTAMP WITH TIME ZONE
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 크론 작업 등록 (자동 정리)
-- ============================================

-- 일일 자동 정리 크론 작업 (7일 보관)
SELECT cron.schedule(
    'cleanup-old-notifications',
    '0 3 * * *', -- 매일 새벽 3시
    'SELECT cleanup_old_notifications(7, 1000);'
);

-- ============================================
-- 7. 권한 설정
-- ============================================

GRANT EXECUTE ON FUNCTION cleanup_old_notifications(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_notifications(UUID, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_unread_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification_partition(DATE) TO service_role;

-- ============================================
-- 8. 성능 모니터링 뷰
-- ============================================

-- 알림 히스토리 성능 모니터링 뷰
CREATE OR REPLACE VIEW notification_performance_stats AS
SELECT 
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as notifications_today,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as notifications_this_week,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as notifications_this_month,
    COUNT(DISTINCT user_id) as active_users,
    CASE 
        WHEN COUNT(DISTINCT user_id) > 0 
        THEN COUNT(*)::DECIMAL / COUNT(DISTINCT user_id) 
        ELSE 0 
    END as avg_notifications_per_user,
    MAX(created_at) as latest_notification,
    MIN(created_at) as oldest_notification
FROM notification_history;

GRANT SELECT ON notification_performance_stats TO service_role;

-- ============================================
-- 📊 성능 최적화 완료!
-- ============================================

COMMENT ON FUNCTION cleanup_old_notifications(INTEGER, INTEGER) IS '오래된 알림 자동 정리 (기본 7일 보관, 배치 1000개)';
COMMENT ON FUNCTION get_user_notifications(UUID, INTEGER, INTEGER, BOOLEAN) IS '사용자별 알림 조회 최적화 함수';
COMMENT ON FUNCTION get_user_unread_count(UUID) IS '사용자별 미읽 알림 개수 조회 최적화';
COMMENT ON FUNCTION get_user_notification_stats(UUID) IS '사용자별 알림 통계 조회';

-- 🔧 주요 최적화 사항:
--   • 복합 인덱스로 조회 성능 향상
--   • 자동 정리 함수로 데이터 크기 관리
--   • 배치 처리로 메모리 효율성 개선
--   • 파티셔닝 준비 (대용량 시 활용)
--   • 성능 모니터링 뷰 제공
-- �� 알림 시스템 성능 최적화 완료!
