-- Push Token 테이블에 알림 설정 컬럼 추가
-- 목적: 사용자별 경매 알림 수신 설정을 세분화하여 관리
-- 작성일: 2025-01-14

-- ============================================
-- 1. user_push_tokens 테이블에 컬럼 추가
-- ============================================

ALTER TABLE user_push_tokens
ADD COLUMN IF NOT EXISTS auction_registration_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS my_auction_enabled BOOLEAN DEFAULT true;

-- ============================================
-- 2. 기존 데이터 마이그레이션 (선택적)
-- ============================================

-- 기존 활성 토큰을 가진 사용자들은 기본적으로 모든 새로운 알림을 활성화 상태로 설정
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE user_push_tokens
    SET
        auction_registration_enabled = TRUE,
        my_auction_enabled = TRUE
    WHERE
        is_active = TRUE
        AND (auction_registration_enabled IS NULL OR my_auction_enabled IS NULL); -- NULL인 경우만 업데이트

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '📱 알림 설정 마이그레이션 완료';
    RAISE NOTICE '   • 전체 토큰 수: %', (SELECT COUNT(*) FROM user_push_tokens);
    RAISE NOTICE '   • 업데이트된 토큰 수: %', updated_count;
    RAISE NOTICE '   • 모든 기존 사용자는 전체 알림 활성화 상태로 설정됨';
END $$;

-- ============================================
-- 3. 성능 최적화를 위한 인덱스 추가
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_auction_settings
ON user_push_tokens(is_active, auction_registration_enabled, my_auction_enabled);

-- ============================================
-- 4. RLS 정책 업데이트 (필요시)
-- ============================================

-- 기존 RLS 정책은 user_id 기반이므로 추가 컬럼에 대한 별도 수정은 필요 없음
-- "Users can manage their own push tokens" 정책이 이미 존재함

-- ============================================
-- 5. 알림 설정 조회 및 업데이트 함수 추가 (Frontend 연동용)
-- ============================================

-- 사용자 알림 설정 조회 함수
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE (
    auction_registration_enabled BOOLEAN,
    my_auction_enabled BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(upt.auction_registration_enabled, TRUE),
        COALESCE(upt.my_auction_enabled, TRUE)
    FROM user_push_tokens upt
    WHERE upt.user_id = p_user_id
    LIMIT 1; -- 한 사용자당 여러 토큰이 있을 수 있으나, 설정은 동일하다고 가정
END;
$$;

-- 사용자 알림 설정 업데이트 함수
CREATE OR REPLACE FUNCTION update_user_notification_preferences(
    p_user_id UUID,
    p_auction_registration_enabled BOOLEAN,
    p_my_auction_enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- 해당 user_id의 모든 활성 토큰에 대해 설정 업데이트
    UPDATE user_push_tokens
    SET
        auction_registration_enabled = p_auction_registration_enabled,
        my_auction_enabled = p_my_auction_enabled,
        updated_at = NOW()
    WHERE
        user_id = p_user_id
        AND is_active = TRUE;

    -- 만약 해당 user_id에 활성 토큰이 없어서 업데이트되지 않았다면,
    -- 새로운 토큰이 등록될 때 기본값이 적용되므로 별도 INSERT는 하지 않음.
    -- (토큰 등록 시점에 기본값이 true로 설정되도록 가정)
END;
$$;

-- 알림 설정 통계 조회 함수 (선택적)
CREATE OR REPLACE FUNCTION get_notification_preferences_stats()
RETURNS TABLE (
    total_active_users BIGINT,
    registration_enabled_count BIGINT,
    my_auction_enabled_count BIGINT,
    both_enabled_count BIGINT,
    none_enabled_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT user_id) AS total_active_users,
        COUNT(DISTINCT CASE WHEN auction_registration_enabled = TRUE THEN user_id END) AS registration_enabled_count,
        COUNT(DISTINCT CASE WHEN my_auction_enabled = TRUE THEN user_id END) AS my_auction_enabled_count,
        COUNT(DISTINCT CASE WHEN auction_registration_enabled = TRUE AND my_auction_enabled = TRUE THEN user_id END) AS both_enabled_count,
        COUNT(DISTINCT CASE WHEN auction_registration_enabled = FALSE AND my_auction_enabled = FALSE THEN user_id END) AS none_enabled_count
    FROM user_push_tokens
    WHERE is_active = TRUE;
END;
$$;

-- ============================================
-- 6. 검증 쿼리
-- ============================================

-- 설정별 사용자 분포 확인
DO $$
DECLARE
    total_active INTEGER;
    registration_enabled_count INTEGER;
    my_auction_enabled_count INTEGER;
    both_enabled_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_active
    FROM user_push_tokens WHERE is_active = true;

    SELECT COUNT(*) INTO registration_enabled_count
    FROM user_push_tokens
    WHERE is_active = true AND auction_registration_enabled = true;

    SELECT COUNT(*) INTO my_auction_enabled_count
    FROM user_push_tokens
    WHERE is_active = true AND my_auction_enabled = true;

    SELECT COUNT(*) INTO both_enabled_count
    FROM user_push_tokens
    WHERE is_active = true
      AND auction_registration_enabled = true
      AND my_auction_enabled = true;

    RAISE NOTICE '📊 알림 설정 현황:';
    RAISE NOTICE '   • 활성 토큰 수: %', total_active;
    RAISE NOTICE '   • 경매 등록 알림 활성화: %', registration_enabled_count;
    RAISE NOTICE '   • 내 경매 알림 활성화: %', my_auction_enabled_count;
    RAISE NOTICE '   • 모든 알림 활성화: %', both_enabled_count;
END $$;

-- ============================================
-- 7. 완료 로그
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🚀 알림 설정 확장 완료!';
    RAISE NOTICE '   ✅ user_push_tokens 테이블에 알림 설정 컬럼 추가됨';
    RAISE NOTICE '   ✅ 성능 최적화 인덱스 생성됨';
    RAISE NOTICE '   ✅ 기존 사용자 데이터 마이그레이션 완료';
    RAISE NOTICE '   ✅ 새로운 알림 시스템 준비 완료';
END $$;
