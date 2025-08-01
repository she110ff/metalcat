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
  avatar_url TEXT,
  
  -- 사업자 정보
  is_business BOOLEAN DEFAULT false,
  company_name VARCHAR(200),
  business_number VARCHAR(50),
  business_type VARCHAR(100),
  
  -- 인증 관련
  is_phone_verified BOOLEAN DEFAULT false,
  verification_code VARCHAR(10),
  verification_expires_at TIMESTAMPTZ,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- 유효성 검사
  CONSTRAINT users_phone_number_check CHECK (char_length(phone_number) >= 10),
  CONSTRAINT users_name_check CHECK (char_length(name) >= 2),
  CONSTRAINT users_avatar_url_check CHECK (avatar_url IS NULL OR char_length(avatar_url) >= 10),
  CONSTRAINT users_company_name_check CHECK (is_business = false OR (is_business = true AND company_name IS NOT NULL AND char_length(company_name) >= 2)),
  CONSTRAINT users_business_number_check CHECK (is_business = false OR (is_business = true AND business_number IS NOT NULL AND char_length(business_number) >= 10)),
  CONSTRAINT users_business_type_check CHECK (is_business = false OR (is_business = true AND business_type IS NOT NULL AND char_length(business_type) >= 2))
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_business ON users(is_business);
CREATE INDEX IF NOT EXISTS idx_users_business_number ON users(business_number) WHERE business_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url) WHERE avatar_url IS NOT NULL;

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
-- RLS (Row Level Security) 정책 (커스텀 인증용)
-- ============================================

-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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
-- 기본 권한 설정
-- ============================================

-- anon 역할에 users 테이블 접근 권한 확실히 부여
GRANT SELECT, INSERT, UPDATE ON users TO anon;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- 시퀀스 권한 (UUID 생성용)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- 컬럼 주석
-- ============================================

COMMENT ON COLUMN users.avatar_url IS '사용자 프로필 이미지 URL (선택적)';
COMMENT ON COLUMN users.is_business IS '사업자 여부';
COMMENT ON COLUMN users.company_name IS '회사명/업체명';
COMMENT ON COLUMN users.business_number IS '사업자등록번호';
COMMENT ON COLUMN users.business_type IS '업종';

-- ============================================
-- 아바타 Storage 버킷 설정
-- ============================================

-- avatars 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) 
DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- ============================================
-- 아바타 Storage RLS 정책 (커스텀 인증용)
-- ============================================

-- 모든 사용자가 아바타 조회 가능
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 모든 사용자가 아바타 업로드 가능 (애플리케이션 레벨에서 인증 처리)
CREATE POLICY "Anyone can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

-- 모든 사용자가 아바타 업데이트 가능 (애플리케이션 레벨에서 인증 처리)
CREATE POLICY "Anyone can update avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars');

-- 모든 사용자가 아바타 삭제 가능 (애플리케이션 레벨에서 인증 처리)
CREATE POLICY "Anyone can delete avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars');

-- ============================================
-- Storage 권한 부여
-- ============================================

-- 모든 역할에 storage 버킷 사용 권한 부여
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

-- ============================================
-- 아바타 관련 유틸리티 함수
-- ============================================

-- 아바타 파일명 생성 함수
CREATE OR REPLACE FUNCTION generate_avatar_filename(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN user_id::text || '/' || extract(epoch from now())::bigint || '.jpg';
END;
$$;

-- 아바타 URL 생성 함수
CREATE OR REPLACE FUNCTION get_avatar_public_url(file_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_url TEXT;
BEGIN
  -- Supabase URL 가져오기 (환경변수 또는 설정에서)
  base_url := current_setting('app.supabase_url', true);
  IF base_url IS NULL THEN
    base_url := 'http://127.0.0.1:54331'; -- 로컬 개발환경 기본값
  END IF;
  
  RETURN base_url || '/storage/v1/object/public/avatars/' || file_path;
END;
$$;

-- 사용자 아바타 정리 함수 (이전 아바타 파일 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_avatars(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 해당 사용자의 이전 아바타 파일들을 storage에서 삭제
  -- 실제 구현은 애플리케이션 레벨에서 처리하는 것을 권장
  -- 이 함수는 향후 배치 작업용으로 사용 가능
  NULL;
END;
$$;

-- ============================================
-- 권한 확인용 주석
-- ============================================
-- 이 정책들은 임시적이며, 실제 Supabase Auth 연동 시 다시 수정될 예정입니다.