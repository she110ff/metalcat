-- Users 테이블에 Expo Push Token 컬럼 추가
-- 알림 시스템을 위한 푸시 토큰 저장

-- expo_push_token 컬럼 추가 (기존 호환성을 위해)
ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_expo_push_token ON users(expo_push_token) WHERE expo_push_token IS NOT NULL;

-- 기존 user_push_tokens 테이블과의 호환성을 위한 함수
CREATE OR REPLACE FUNCTION get_user_expo_push_tokens(user_ids UUID[])
RETURNS TABLE(user_id UUID, expo_push_token TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.expo_push_token
  FROM users u
  WHERE u.id = ANY(user_ids)
    AND u.expo_push_token IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 푸시 토큰 업데이트 함수 (기존 호환성)
CREATE OR REPLACE FUNCTION update_user_expo_push_token(
  p_user_id UUID,
  p_expo_push_token TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET expo_push_token = p_expo_push_token,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 📱 Expo Push Token 시스템 통합 완료!
-- 🔧 주요 기능:
--   • Users 테이블에 expo_push_token 컬럼 추가
--   • 기존 알림 시스템과의 호환성 유지
--   • 성능 최적화를 위한 인덱스 생성
--   • 유틸리티 함수 제공
-- 🚀 푸시 알림 시스템 완전 통합!
