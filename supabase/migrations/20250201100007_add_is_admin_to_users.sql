-- ============================================
-- 사용자 테이블에 관리자 권한 필드 추가
-- 생성일: 2025-02-01
-- 목적: 전화번호 기반 관리자 권한을 isAdmin 필드 기반으로 변경
-- ============================================

-- ============================================
-- 1. users 테이블에 isAdmin 필드 추가
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- ============================================
-- 2. isAdmin 필드에 대한 인덱스 생성
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- ============================================
-- 3. 기존 관리자 전화번호를 isAdmin으로 설정
-- ============================================
-- 기존 관리자 전화번호 목록 (useAdminAuth.tsx에서 가져옴)
UPDATE users 
SET is_admin = true 
WHERE phone_number IN (
  '01012345678', -- 테스트용 관리자 번호
  '01087654321'  -- 추가 관리자 번호
);

-- ============================================
-- 4. 관리자 권한 확인 함수 생성
-- ============================================
CREATE OR REPLACE FUNCTION is_user_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================
-- 5. 관리자 목록 조회 함수 생성
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(
  id UUID,
  phone_number VARCHAR(20),
  name VARCHAR(100),
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================
-- 6. 관리자 권한 부여/해제 함수 생성
-- ============================================
CREATE OR REPLACE FUNCTION set_user_admin_status(
  user_uuid UUID,
  admin_status BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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
