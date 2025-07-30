-- ============================================
-- 사용자 테이블 생성 마이그레이션
-- ============================================

-- users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  address_detail TEXT,
  
  -- 인증 관련
  is_phone_verified BOOLEAN DEFAULT false,
  verification_code VARCHAR(10),
  verification_expires_at TIMESTAMPTZ,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- 인덱스
  CONSTRAINT users_phone_number_check CHECK (char_length(phone_number) >= 10),
  CONSTRAINT users_name_check CHECK (char_length(name) >= 2)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================

-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 정보만 조회 가능
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- 사용자는 자신의 정보만 업데이트 가능  
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- 신규 사용자 생성은 누구나 가능 (회원가입)
CREATE POLICY "Anyone can create user" ON users
  FOR INSERT WITH CHECK (true);

-- 사용자 삭제는 본인만 가능
CREATE POLICY "Users can delete own profile" ON users
  FOR DELETE USING (auth.uid()::text = id::text);

-- ============================================
-- 기본 권한 설정
-- ============================================

-- authenticated 사용자에게 테이블 접근 권한 부여
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon; -- 회원가입을 위해 anon에게도 INSERT 권한

-- 시퀀스 권한 (UUID 생성용)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;