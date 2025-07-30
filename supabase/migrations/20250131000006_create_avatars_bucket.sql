-- ============================================
-- 아바타 Storage 버킷 생성 마이그레이션
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
-- RLS (Row Level Security) 정책 설정
-- ============================================

-- 모든 사용자가 아바타 조회 가능
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 인증된 사용자만 아바타 업로드 가능
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

-- 사용자는 자신의 아바타만 업데이트 가능
CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 사용자는 자신의 아바타만 삭제 가능
CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- Storage 권한 부여
-- ============================================

-- 모든 역할에 storage 버킷 사용 권한 부여
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

-- ============================================
-- 유틸리티 함수
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
-- 마이그레이션 완료
-- ============================================