-- UPSERT 성능을 위한 인덱스 추가
-- user_push_tokens 테이블의 UPSERT 성능 최적화

-- 기존 인덱스 확인
DO $$
BEGIN
    -- user_id, device_type 조합의 유니크 인덱스 (UPSERT용)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_user_push_tokens_user_device_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_user_push_tokens_user_device_unique 
        ON user_push_tokens(user_id, device_type);
        RAISE NOTICE '✅ UPSERT용 유니크 인덱스 생성 완료';
    ELSE
        RAISE NOTICE 'ℹ️ UPSERT용 유니크 인덱스가 이미 존재합니다';
    END IF;
END $$;

-- 토큰 조회 성능을 위한 추가 인덱스
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_token_active 
ON user_push_tokens(token, is_active) 
WHERE is_active = true;

-- 사용자별 활성 토큰 조회 최적화
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_active 
ON user_push_tokens(user_id, is_active, created_at DESC) 
WHERE is_active = true;

-- UPSERT 성능 모니터링 뷰
CREATE OR REPLACE VIEW token_upsert_performance AS
SELECT 
    COUNT(*) as total_tokens,
    COUNT(*) FILTER (WHERE is_active = true) as active_tokens,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_tokens,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT device_type) as device_types,
    MAX(created_at) as latest_token_created,
    MAX(updated_at) as latest_token_updated
FROM user_push_tokens;

-- 성능 통계 로그 함수
CREATE OR REPLACE FUNCTION log_token_performance()
RETURNS TABLE(
    total_tokens INTEGER,
    active_tokens INTEGER,
    unique_users INTEGER,
    performance_note TEXT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 성능 최적화 완료 알림
DO $$
BEGIN
    RAISE NOTICE '🎯 토큰 UPSERT 성능 최적화 완료!';
    RAISE NOTICE '📊 인덱스: user_device 유니크, token_active, user_active';
    RAISE NOTICE '📈 모니터링: token_upsert_performance 뷰, log_token_performance 함수';
    RAISE NOTICE '⚡ UPSERT 성능이 크게 향상되었습니다!';
END $$;
