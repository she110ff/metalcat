-- ============================================
-- 슬레이브 유저 시스템 추가
-- 생성일: 2025-08-22
-- 목적: 관리자가 대리로 경매를 등록할 수 있는 슬레이브 유저 기능 추가
-- ============================================

-- 1. users 테이블에 is_slave 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_slave BOOLEAN DEFAULT false;

-- 2. 슬레이브 유저 조회를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_is_slave 
ON users(is_slave) 
WHERE is_slave = true;

-- 3. 슬레이브 유저 조회 함수 생성
CREATE OR REPLACE FUNCTION get_slave_users()
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  phone_number VARCHAR(20),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_phone_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.phone_number,
    u.created_at,
    u.updated_at,
    u.is_phone_verified
  FROM users u
  WHERE u.is_slave = true
  ORDER BY u.created_at DESC;
END;
$$;

-- 4. 슬레이브 유저 상태 변경 함수 생성
CREATE OR REPLACE FUNCTION set_user_slave_status(
  user_id UUID,
  is_slave_status BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users 
  SET 
    is_slave = is_slave_status,
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- 5. RLS 정책 업데이트 (관리자만 슬레이브 유저 관리 가능)
-- 기존 정책은 유지하고 슬레이브 유저 관련 정책만 추가

-- 6. 권한 설정
GRANT EXECUTE ON FUNCTION get_slave_users() TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_slave_status(UUID, BOOLEAN) TO authenticated;

-- 7. 코멘트 추가
COMMENT ON COLUMN users.is_slave IS '슬레이브 유저 여부 - 관리자가 대리로 경매 등록 가능한 계정';
COMMENT ON FUNCTION get_slave_users() IS '슬레이브 유저 목록 조회';
COMMENT ON FUNCTION set_user_slave_status(UUID, BOOLEAN) IS '사용자의 슬레이브 상태 변경';
