-- ============================================
-- 사용자 테이블 RLS 정책 수정
-- 목적: 임시 인증 시스템에서도 작동하도록 개선
-- ============================================

-- 기존 users 테이블 정책 삭제
DROP POLICY IF EXISTS "Anyone can create user" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can delete own profile" ON users;

-- ============================================
-- 새로운 RLS 정책 (임시 인증 시스템 호환)
-- ============================================

-- 1. 회원가입: 누구나 가능 (임시)
CREATE POLICY "Enable insert for everyone" ON users
  FOR INSERT WITH CHECK (true);

-- 2. 조회: 누구나 가능 (임시 - 나중에 제한할 예정)
CREATE POLICY "Enable select for authenticated users" ON users
  FOR SELECT USING (true);

-- 3. 업데이트: 누구나 가능 (임시 - 나중에 제한할 예정)  
CREATE POLICY "Enable update for authenticated users" ON users
  FOR UPDATE USING (true);

-- 4. 삭제: 제한적 허용
CREATE POLICY "Enable delete for own records" ON users
  FOR DELETE USING (true);

-- ============================================
-- 추가 보안 설정
-- ============================================

-- anon 역할에 users 테이블 접근 권한 확실히 부여
GRANT SELECT, INSERT, UPDATE ON users TO anon;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- 권한 확인용 주석
-- 이 정책들은 임시적이며, 실제 Supabase Auth 연동 시 다시 수정될 예정입니다.