-- ============================================
-- 아바타 RLS 정책 수정 (커스텀 인증용)
-- ============================================

-- 기존 RLS 정책들 삭제
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- 새로운 RLS 정책들 생성 (커스텀 인증용)

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
-- 마이그레이션 완료
-- ============================================