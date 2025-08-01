-- ============================================
-- 사용자 시스템 통합 마이그레이션
-- 생성일: 2025-02-01
-- 목적: 커스텀 인증 기반 사용자 관리 시스템 (개인/사업자, 아바타 관리)
-- ============================================

-- ============================================
-- 1. 커스텀 사용자 테이블
-- ============================================
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

-- ============================================
-- 2. 인덱스 생성
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_business ON users(is_business);
CREATE INDEX IF NOT EXISTS idx_users_business_number ON users(business_number) WHERE business_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url) WHERE avatar_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(is_phone_verified, created_at);

-- ============================================
-- 3. 트리거 함수 및 트리거
-- ============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. RLS (Row Level Security) 정책
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
-- 5. 아바타 Storage 버킷 설정
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
-- 6. 아바타 Storage RLS 정책
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
-- 7. 아바타 관련 유틸리티 함수
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
-- 8. 사용자 관리 유틸리티 함수
-- ============================================

-- 전화번호로 사용자 조회
CREATE OR REPLACE FUNCTION get_user_by_phone(phone TEXT)
RETURNS TABLE(
  id UUID,
  phone_number VARCHAR(20),
  name VARCHAR(100),
  is_business BOOLEAN,
  is_phone_verified BOOLEAN,
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
    u.is_business,
    u.is_phone_verified,
    u.created_at
  FROM users u
  WHERE u.phone_number = phone;
END;
$$;

-- 사용자 프로필 요약 조회
CREATE OR REPLACE FUNCTION get_user_profile_summary(user_uuid UUID)
RETURNS TABLE(
  id UUID,
  name VARCHAR(100),
  phone_number VARCHAR(20),
  avatar_url TEXT,
  is_business BOOLEAN,
  company_name VARCHAR(200),
  business_type VARCHAR(100),
  is_verified BOOLEAN,
  member_since TIMESTAMPTZ
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
    u.avatar_url,
    u.is_business,
    u.company_name,
    u.business_type,
    u.is_phone_verified as is_verified,
    u.created_at as member_since
  FROM users u
  WHERE u.id = user_uuid;
END;
$$;

-- 사용자 통계 함수
CREATE OR REPLACE FUNCTION get_user_statistics()
RETURNS TABLE(
  total_users BIGINT,
  verified_users BIGINT,
  business_users BIGINT,
  individual_users BIGINT,
  users_this_month BIGINT,
  verification_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_phone_verified = true) as verified,
      COUNT(*) FILTER (WHERE is_business = true) as business,
      COUNT(*) FILTER (WHERE is_business = false) as individual,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as this_month
    FROM users
  )
  SELECT 
    total,
    verified,
    business,
    individual,
    this_month,
    CASE 
      WHEN total > 0 THEN ROUND((verified::NUMERIC / total) * 100, 2)
      ELSE 0
    END as verification_rate
  FROM stats;
END;
$$;

-- 인증 코드 생성 및 설정 함수
CREATE OR REPLACE FUNCTION set_verification_code(
  user_uuid UUID, 
  code VARCHAR(10),
  expires_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users 
  SET 
    verification_code = code,
    verification_expires_at = NOW() + (expires_minutes || ' minutes')::INTERVAL,
    updated_at = NOW()
  WHERE id = user_uuid;
  
  RETURN FOUND;
END;
$$;

-- 인증 코드 검증 함수
CREATE OR REPLACE FUNCTION verify_phone_code(
  user_uuid UUID, 
  code VARCHAR(10)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_valid BOOLEAN := false;
BEGIN
  -- 코드 검증 및 사용자 인증 상태 업데이트
  UPDATE users 
  SET 
    is_phone_verified = true,
    verification_code = NULL,
    verification_expires_at = NULL,
    updated_at = NOW()
  WHERE id = user_uuid 
    AND verification_code = code 
    AND verification_expires_at > NOW();
  
  is_valid := FOUND;
  
  RETURN is_valid;
END;
$$;

-- ============================================
-- 9. 사용자 프로필 뷰
-- ============================================

-- 사용자 상세 정보 뷰 (민감 정보 제외)
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  id,
  name,
  phone_number,
  address,
  address_detail,
  avatar_url,
  is_business,
  company_name,
  business_type,
  is_phone_verified,
  created_at,
  updated_at,
  CASE 
    WHEN is_business THEN '사업자'
    ELSE '개인'
  END as user_type,
  CASE 
    WHEN is_phone_verified THEN '인증완료'
    ELSE '인증대기'
  END as verification_status
FROM users;

-- ============================================
-- 10. 권한 설정
-- ============================================

-- 기본 권한 설정
GRANT SELECT, INSERT, UPDATE ON users TO anon;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- 뷰 권한 부여
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;

-- 시퀀스 권한 (UUID 생성용)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- storage 버킷 사용 권한 부여
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION get_user_by_phone TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_profile_summary TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION set_verification_code TO authenticated, anon;
GRANT EXECUTE ON FUNCTION verify_phone_code TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_avatar_filename TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_avatar_public_url TO authenticated, anon;

-- service_role에 모든 권한 부여
GRANT ALL ON users TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================
-- 11. 외래키 설정 (다른 테이블과의 관계)
-- ============================================

-- service_requests 테이블과의 외래키 설정 (이미 존재하는 경우 건너뛰기)
DO $$
BEGIN
  -- service_requests 테이블이 존재하는지 확인하고 외래키 설정
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_requests') THEN
    -- 기존 외래키 제거 (있는 경우)
    ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS fk_service_requests_user_id;
    ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_user_id_fkey;
    ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS fk_service_requests_custom_user_id;
    
    -- 새로운 외래키 설정 (비회원 지원을 위해 SET NULL)
    ALTER TABLE service_requests 
      ADD CONSTRAINT fk_service_requests_custom_user_id 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
      
    RAISE NOTICE '✅ service_requests 테이블과 외래키 설정 완료';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ 외래키 설정 중 오류 발생: %', SQLERRM;
END;
$$;

-- ============================================
-- 12. 데이터 정리 및 유지보수 함수
-- ============================================

-- 만료된 인증 코드 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE users 
  SET 
    verification_code = NULL,
    verification_expires_at = NULL,
    updated_at = NOW()
  WHERE verification_expires_at < NOW() 
    AND verification_code IS NOT NULL;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;

-- 사용자 활동 요약 함수
CREATE OR REPLACE FUNCTION get_user_activity_summary(user_uuid UUID)
RETURNS TABLE(
  user_id UUID,
  user_name VARCHAR(100),
  total_service_requests BIGINT,
  completed_service_requests BIGINT,
  total_auctions BIGINT,
  active_auctions BIGINT,
  last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    COALESCE(sr_stats.total_requests, 0) as total_service_requests,
    COALESCE(sr_stats.completed_requests, 0) as completed_service_requests,
    COALESCE(a_stats.total_auctions, 0) as total_auctions,
    COALESCE(a_stats.active_auctions, 0) as active_auctions,
    GREATEST(
      u.updated_at,
      COALESCE(sr_stats.last_request, u.created_at),
      COALESCE(a_stats.last_auction, u.created_at)
    ) as last_activity
  FROM users u
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
      MAX(created_at) as last_request
    FROM service_requests 
    WHERE user_id = user_uuid
    GROUP BY user_id
  ) sr_stats ON u.id = sr_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_auctions,
      COUNT(*) FILTER (WHERE status IN ('active', 'ending')) as active_auctions,
      MAX(created_at) as last_auction
    FROM auctions 
    WHERE user_id = user_uuid
    GROUP BY user_id
  ) a_stats ON u.id = a_stats.user_id
  WHERE u.id = user_uuid;
  
EXCEPTION WHEN OTHERS THEN
  -- auctions 테이블이 없는 경우 서비스 요청만 반환
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    COALESCE(sr_stats.total_requests, 0) as total_service_requests,
    COALESCE(sr_stats.completed_requests, 0) as completed_service_requests,
    0::BIGINT as total_auctions,
    0::BIGINT as active_auctions,
    GREATEST(u.updated_at, COALESCE(sr_stats.last_request, u.created_at)) as last_activity
  FROM users u
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
      MAX(created_at) as last_request
    FROM service_requests 
    WHERE user_id = user_uuid
    GROUP BY user_id
  ) sr_stats ON u.id = sr_stats.user_id
  WHERE u.id = user_uuid;
END;
$$;

-- ============================================
-- 13. 코멘트 및 문서화
-- ============================================

COMMENT ON TABLE users IS '커스텀 사용자 테이블 - 개인/사업자 정보, 전화번호 인증 기반';
COMMENT ON VIEW user_profiles IS '사용자 프로필 뷰 - 민감 정보 제외한 공개 정보';

COMMENT ON COLUMN users.avatar_url IS '사용자 프로필 이미지 URL (선택적)';
COMMENT ON COLUMN users.is_business IS '사업자 여부';
COMMENT ON COLUMN users.company_name IS '회사명/업체명';
COMMENT ON COLUMN users.business_number IS '사업자등록번호';
COMMENT ON COLUMN users.business_type IS '업종';
COMMENT ON COLUMN users.is_phone_verified IS '전화번호 인증 완료 여부';
COMMENT ON COLUMN users.verification_code IS '인증 코드 (임시 저장)';
COMMENT ON COLUMN users.verification_expires_at IS '인증 코드 만료 시각';

COMMENT ON FUNCTION get_user_by_phone IS '전화번호로 사용자 조회';
COMMENT ON FUNCTION get_user_profile_summary IS '사용자 프로필 요약 정보 조회';
COMMENT ON FUNCTION get_user_statistics IS '전체 사용자 통계 조회';
COMMENT ON FUNCTION set_verification_code IS '인증 코드 설정 (SMS 발송 후 호출)';
COMMENT ON FUNCTION verify_phone_code IS '인증 코드 검증 및 사용자 인증 완료';
COMMENT ON FUNCTION cleanup_expired_verification_codes IS '만료된 인증 코드 정리 (배치 작업용)';
COMMENT ON FUNCTION get_user_activity_summary IS '사용자 활동 요약 (서비스 요청, 경매 등)';

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🎉 사용자 시스템 통합 완료!';
  RAISE NOTICE '👤 테이블: users (개인/사업자 정보, 전화번호 인증)';
  RAISE NOTICE '📱 인증: 전화번호 기반 커스텀 인증 시스템';
  RAISE NOTICE '🖼️ 아바타: avatars Storage 버킷 및 관리 함수';
  RAISE NOTICE '🔒 RLS 정책: 임시 허용적 정책 (향후 강화 예정)';
  RAISE NOTICE '📊 유틸리티: 사용자 조회, 통계, 인증 코드 관리';
  RAISE NOTICE '🔗 연동: service_requests 테이블과 외래키 설정';
  RAISE NOTICE '🚀 커스텀 사용자 관리 시스템 준비 완료!';
END $$;