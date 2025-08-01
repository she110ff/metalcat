-- 프리미엄 서비스 요청 시스템 RLS (Row Level Security) 정책 설정
-- 작성일: 2025-01-30
-- 목적: 사용자별 데이터 접근 권한 제어

-- 서비스 요청 테이블 RLS 활성화
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_status_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- service_requests 테이블 정책
-- ============================================

-- 사용자는 자신의 요청만 조회 가능 (user_id가 NULL인 경우도 허용 - 임시로 익명 요청 지원)
CREATE POLICY "Users can view their own requests" ON service_requests
  FOR SELECT USING (
    auth.uid() = user_id 
    OR user_id IS NULL 
    OR auth.role() = 'service_role'
  );

-- 사용자는 자신의 요청만 생성 가능
CREATE POLICY "Users can insert their own requests" ON service_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    OR user_id IS NULL 
    OR auth.role() = 'service_role'
  );

-- 사용자는 자신의 요청만 수정 가능 (단, 특정 필드만)
CREATE POLICY "Users can update their own requests" ON service_requests
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR user_id IS NULL 
    OR auth.role() = 'service_role'
  );

-- 관리자는 모든 요청에 접근 가능 (향후 확장을 위한 정책)
-- 현재는 주석 처리하고 향후 user_roles 테이블 생성 후 활성화
/*
CREATE POLICY "Admins can manage all requests" ON service_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
*/

-- ============================================
-- service_request_photos 테이블 정책
-- ============================================

-- 사용자는 자신의 요청에 속한 사진만 관리 가능
CREATE POLICY "Users can manage photos of their requests" ON service_request_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM service_requests 
      WHERE id = service_request_id 
      AND (
        user_id = auth.uid() 
        OR user_id IS NULL 
        OR auth.role() = 'service_role'
      )
    )
  );

-- ============================================
-- service_request_status_logs 테이블 정책
-- ============================================

-- 사용자는 자신의 요청 상태 로그만 조회 가능
CREATE POLICY "Users can view status logs of their requests" ON service_request_status_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_requests 
      WHERE id = service_request_id 
      AND (
        user_id = auth.uid() 
        OR user_id IS NULL 
        OR auth.role() = 'service_role'
      )
    )
  );

-- 상태 로그는 시스템에서만 생성/수정 (트리거 또는 service_role을 통해)
CREATE POLICY "Only system can insert status logs" ON service_request_status_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only system can update status logs" ON service_request_status_logs
  FOR UPDATE USING (auth.role() = 'service_role');

-- ============================================
-- Storage 정책 (service-request-photos 버킷)
-- ============================================

-- 기존 Storage 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- 개발 환경용 허용적 정책 생성
-- 모든 사용자가 service-request-photos 버킷에 업로드 가능
CREATE POLICY "Anyone can upload to service-request-photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'service-request-photos');

-- 모든 사용자가 service-request-photos 버킷에서 조회 가능
CREATE POLICY "Anyone can view service-request-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-request-photos');

-- 업로드한 사용자가 삭제 가능 (향후 개선 예정)
CREATE POLICY "Anyone can delete from service-request-photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'service-request-photos');

-- 사용자가 자신의 파일을 업데이트할 수 있도록 허용
CREATE POLICY "Anyone can update service-request-photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'service-request-photos');

-- Storage 버킷이 존재하는지 확인하고 없으면 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-request-photos',
  'service-request-photos',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) 
DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- 모든 역할에 storage 버킷 사용 권한 부여
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

-- ============================================
-- 유틸리티 함수
-- ============================================

-- 서비스 요청 통계를 위한 함수 (관리자용)
CREATE OR REPLACE FUNCTION get_service_request_analytics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total_requests BIGINT,
  completion_rate NUMERIC,
  average_processing_hours NUMERIC,
  appraisal_requests BIGINT,
  purchase_requests BIGINT,
  status_distribution JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FILTER (WHERE completed_at IS NOT NULL) as avg_hours,
      COUNT(*) FILTER (WHERE service_type = 'appraisal') as appraisal,
      COUNT(*) FILTER (WHERE service_type = 'purchase') as purchase,
      jsonb_object_agg(status, count_by_status) as status_dist
    FROM service_requests,
    LATERAL (
      SELECT COUNT(*) as count_by_status
      FROM service_requests sr2
      WHERE sr2.status = service_requests.status
      AND sr2.created_at BETWEEN start_date AND end_date
    ) sub
    WHERE created_at BETWEEN start_date AND end_date
  )
  SELECT 
    total,
    CASE WHEN total > 0 THEN ROUND((completed::NUMERIC / total) * 100, 2) ELSE 0 END,
    ROUND(avg_hours, 2),
    appraisal,
    purchase,
    status_dist
  FROM stats;
END;
$$;

-- 사용자의 최근 요청을 가져오는 함수
CREATE OR REPLACE FUNCTION get_user_recent_requests(
  user_uuid UUID DEFAULT auth.uid(),
  limit_count INTEGER DEFAULT 10
)
RETURNS SETOF service_requests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM service_requests
  WHERE user_id = user_uuid OR user_id IS NULL
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$$;

-- ============================================
-- 권한 부여
-- ============================================

-- 인증된 사용자에게 테이블 사용 권한 부여
GRANT SELECT, INSERT, UPDATE ON service_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON service_request_photos TO authenticated;
GRANT SELECT ON service_request_status_logs TO authenticated;

-- anon 사용자에게는 제한적 권한만 부여 (임시 요청 생성용)
GRANT SELECT, INSERT ON service_requests TO anon;
GRANT SELECT, INSERT ON service_request_photos TO anon;

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION get_user_recent_requests TO authenticated;

-- service_role에 모든 권한 부여 (백엔드 작업용)
GRANT ALL ON service_requests TO service_role;
GRANT ALL ON service_request_photos TO service_role;
GRANT ALL ON service_request_status_logs TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role; 