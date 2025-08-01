-- ============================================
-- 경매 사진 Storage 버킷 설정
-- 작성일: 2025-02-01
-- 목적: 경매 사진 업로드를 위한 Storage 버킷 및 정책 생성
-- ============================================

-- auction-photos 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'auction-photos',
  'auction-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) 
DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- ============================================
-- Storage RLS 정책 (경매 사진용)
-- ============================================

-- 모든 사용자가 경매 사진 조회 가능
CREATE POLICY "Anyone can view auction photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'auction-photos');

-- 모든 사용자가 경매 사진 업로드 가능 (애플리케이션 레벨에서 권한 처리)
CREATE POLICY "Anyone can upload auction photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'auction-photos');

-- 모든 사용자가 경매 사진 업데이트 가능
CREATE POLICY "Anyone can update auction photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'auction-photos');

-- 모든 사용자가 경매 사진 삭제 가능 (향후 개선 예정)
CREATE POLICY "Anyone can delete auction photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'auction-photos');

-- ============================================
-- Storage 권한 부여 (중복 실행 가능)
-- ============================================

-- 모든 역할에 storage 버킷 사용 권한 부여
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

-- ============================================
-- 경매 사진 관련 유틸리티 함수
-- ============================================

-- 경매별 사진 개수 확인 함수
CREATE OR REPLACE FUNCTION get_auction_photo_count(auction_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM auction_photos 
    WHERE auction_photos.auction_id = get_auction_photo_count.auction_id
  );
END;
$$;

-- 경매 대표 사진 URL 가져오기 함수
CREATE OR REPLACE FUNCTION get_auction_representative_photo(auction_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT photo_url
    FROM auction_photos 
    WHERE auction_photos.auction_id = get_auction_representative_photo.auction_id 
    AND is_representative = true
    ORDER BY photo_order
    LIMIT 1
  );
END;
$$;

-- ============================================
-- 인덱스 추가 (성능 향상)
-- ============================================

-- 경매별 사진 조회 성능 향상
CREATE INDEX IF NOT EXISTS idx_auction_photos_auction_id ON auction_photos(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_photos_representative ON auction_photos(auction_id, is_representative);
CREATE INDEX IF NOT EXISTS idx_auction_photos_order ON auction_photos(auction_id, photo_order);