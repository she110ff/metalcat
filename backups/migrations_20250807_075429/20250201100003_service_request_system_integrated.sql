-- ============================================
-- 서비스 요청 시스템 통합 마이그레이션
-- 생성일: 2025-02-01
-- 목적: 프리미엄 서비스 요청 (현장 방문 감정 및 즉시 매입) 전체 시스템
-- ============================================

-- ============================================
-- 1. 서비스 요청 메인 테이블
-- ============================================
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- 커스텀 users 테이블 참조 (비회원 지원을 위해 NULL 허용)
  service_type TEXT NOT NULL CHECK (service_type IN ('appraisal', 'purchase')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),

  -- 연락처 정보
  contact_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  address_detail TEXT,
  description TEXT NOT NULL,

  -- 일정 및 처리 정보
  scheduled_date TIMESTAMPTZ,
  assigned_expert_id UUID,
  expert_notes TEXT,
  estimated_value NUMERIC(15,2),
  final_offer NUMERIC(15,2),

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- 2. 서비스 요청 사진 테이블
-- ============================================
CREATE TABLE service_request_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_order INTEGER NOT NULL DEFAULT 0,
  is_representative BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 상태 변경 로그 테이블
-- ============================================
CREATE TABLE service_request_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID -- 이후 users 테이블과 연결 예정
);

-- ============================================
-- 4. 인덱스 생성
-- ============================================
CREATE INDEX idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_created_at ON service_requests(created_at);
CREATE INDEX idx_service_requests_service_type ON service_requests(service_type);

CREATE INDEX idx_service_request_photos_request_id ON service_request_photos(service_request_id);
CREATE INDEX idx_service_request_photos_order ON service_request_photos(service_request_id, photo_order);

CREATE INDEX idx_status_logs_request_id ON service_request_status_logs(service_request_id);
CREATE INDEX idx_status_logs_created_at ON service_request_status_logs(created_at);

-- ============================================
-- 5. 트리거 함수들
-- ============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 상태 변경 시 자동 로그 생성 함수
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 상태가 변경된 경우에만 로그 생성
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO service_request_status_logs (
            service_request_id,
            old_status,
            new_status,
            note,
            created_by
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            CASE 
                WHEN NEW.status = 'assigned' THEN '담당자가 배정되었습니다.'
                WHEN NEW.status = 'in_progress' THEN '서비스가 진행 중입니다.'
                WHEN NEW.status = 'completed' THEN '서비스가 완료되었습니다.'
                WHEN NEW.status = 'cancelled' THEN '서비스가 취소되었습니다.'
                ELSE '상태가 변경되었습니다.'
            END,
            NULL -- created_by는 애플리케이션에서 설정
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 완료 시간 자동 설정 함수
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- 상태가 completed로 변경된 경우 완료 시간 설정
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        NEW.completed_at = NOW();
    -- 상태가 completed에서 다른 상태로 변경된 경우 완료 시간 제거
    ELSIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 6. 트리거 생성
-- ============================================

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_service_requests_updated_at 
    BEFORE UPDATE ON service_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 상태 변경 자동 로그 트리거
CREATE TRIGGER log_service_request_status_change
    AFTER UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- 완료 시간 자동 설정 트리거
CREATE TRIGGER set_service_request_completed_at
    BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION set_completed_at();

-- ============================================
-- 7. RLS (Row Level Security) 설정
-- ============================================

-- RLS 활성화
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_status_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. 서비스 요청 테이블 RLS 정책 (커스텀 인증 지원)
-- ============================================

-- 조회: 비회원 요청은 누구나, 회원 요청은 해당 회원만
CREATE POLICY "Custom auth: View service requests" ON service_requests
  FOR SELECT USING (
    user_id IS NULL 
    OR (
      user_id IN (
        SELECT id FROM users 
        WHERE id = service_requests.user_id
      )
    )
  );

-- 생성: 비회원(NULL) 또는 유효한 회원 ID만
CREATE POLICY "Custom auth: Insert service requests" ON service_requests
  FOR INSERT WITH CHECK (
    user_id IS NULL 
    OR (
      user_id IN (SELECT id FROM users)
    )
  );

-- 수정: 비회원 요청은 누구나, 회원 요청은 해당 회원만  
CREATE POLICY "Custom auth: Update service requests" ON service_requests
  FOR UPDATE USING (
    user_id IS NULL
    OR (
      user_id IN (
        SELECT id FROM users 
        WHERE id = service_requests.user_id
      )
    )
  );

-- 삭제: 제한적 허용
CREATE POLICY "Custom auth: Delete service requests" ON service_requests
  FOR DELETE USING (
    user_id IS NULL
    OR (
      user_id IN (
        SELECT id FROM users 
        WHERE id = service_requests.user_id
      )
    )
  );

-- ============================================
-- 9. 서비스 요청 사진 테이블 RLS 정책
-- ============================================

-- 사용자는 자신의 요청에 속한 사진만 관리 가능
CREATE POLICY "Custom auth: Manage request photos" ON service_request_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM service_requests 
      WHERE id = service_request_id 
      AND (
        user_id IS NULL 
        OR user_id IN (SELECT id FROM users)
      )
    )
  );

-- ============================================
-- 10. 상태 로그 테이블 RLS 정책
-- ============================================

-- 상태 로그 조회 정책
CREATE POLICY "Custom auth: View status logs" ON service_request_status_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_requests 
      WHERE id = service_request_id 
      AND (
        user_id IS NULL 
        OR user_id IN (SELECT id FROM users)
      )
    )
  );

-- 시스템만 상태 로그 생성/수정 가능
CREATE POLICY "System only: Insert status logs" ON service_request_status_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System only: Update status logs" ON service_request_status_logs
  FOR UPDATE USING (true);

-- ============================================
-- 11. Storage 버킷 설정 (service-request-photos)
-- ============================================

-- service-request-photos 버킷 생성
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

-- ============================================
-- 12. Storage RLS 정책
-- ============================================

-- 모든 사용자가 service-request-photos 버킷에 업로드 가능
CREATE POLICY "Anyone can upload to service-request-photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'service-request-photos');

-- 모든 사용자가 service-request-photos 버킷에서 조회 가능
CREATE POLICY "Anyone can view service-request-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-request-photos');

-- 업로드한 사용자가 삭제 가능
CREATE POLICY "Anyone can delete from service-request-photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'service-request-photos');

-- 사용자가 자신의 파일을 업데이트할 수 있도록 허용
CREATE POLICY "Anyone can update service-request-photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'service-request-photos');

-- ============================================
-- 13. 유틸리티 함수들
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
  user_uuid UUID DEFAULT NULL,
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
-- 14. 서비스 요청 요약 뷰 (회원/비회원 구분)
-- ============================================
CREATE OR REPLACE VIEW service_requests_summary AS
SELECT 
  sr.*,
  CASE 
    WHEN sr.user_id IS NULL THEN '비회원'
    ELSE '회원'
  END as user_type,
  u.name as user_name,
  u.phone_number as user_phone
FROM service_requests sr
LEFT JOIN users u ON sr.user_id = u.id;

-- ============================================
-- 15. 권한 설정
-- ============================================

-- 테이블 사용 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON service_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON service_requests TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON service_request_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON service_request_photos TO anon;

GRANT SELECT ON service_request_status_logs TO authenticated;
GRANT SELECT ON service_request_status_logs TO anon;

-- 뷰 권한 부여
GRANT SELECT ON service_requests_summary TO authenticated;
GRANT SELECT ON service_requests_summary TO anon;

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION get_user_recent_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_request_analytics TO authenticated;

-- storage 버킷 사용 권한 부여
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

-- service_role에 모든 권한 부여 (백엔드 작업용)
GRANT ALL ON service_requests TO service_role;
GRANT ALL ON service_request_photos TO service_role;
GRANT ALL ON service_request_status_logs TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================
-- 16. 성능 최적화 인덱스 추가
-- ============================================

-- 비회원 요청 조회 최적화
CREATE INDEX idx_service_requests_null_user_id ON service_requests(created_at) 
  WHERE user_id IS NULL;

-- 대표 사진 조회 최적화
CREATE INDEX idx_service_request_photos_representative ON service_request_photos(service_request_id, is_representative);

-- ============================================
-- 17. 코멘트 및 문서화
-- ============================================

COMMENT ON TABLE service_requests IS '프리미엄 서비스 요청 메인 테이블 - 비회원/회원 모두 지원';
COMMENT ON TABLE service_request_photos IS '서비스 요청 관련 사진';
COMMENT ON TABLE service_request_status_logs IS '서비스 요청 상태 변경 이력';
COMMENT ON VIEW service_requests_summary IS '서비스 요청 요약 뷰 - 회원/비회원 구분 포함';

COMMENT ON COLUMN service_requests.service_type IS 'appraisal: 감정 서비스, purchase: 매입 서비스';
COMMENT ON COLUMN service_requests.status IS 'pending: 접수대기, assigned: 담당자배정, in_progress: 진행중, completed: 완료, cancelled: 취소';
COMMENT ON COLUMN service_requests.user_id IS '사용자 ID (NULL: 비회원 요청, UUID: 회원 요청)';
COMMENT ON COLUMN service_request_photos.is_representative IS '대표 이미지 여부';
COMMENT ON COLUMN service_request_photos.photo_order IS '사진 순서 (0부터 시작)';

COMMENT ON FUNCTION get_service_request_analytics IS '서비스 요청 통계 분석 함수 (관리자용)';
COMMENT ON FUNCTION get_user_recent_requests IS '사용자별 최근 서비스 요청 조회 함수';

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🎉 서비스 요청 시스템 통합 완료!';
  RAISE NOTICE '📋 테이블: service_requests, service_request_photos, service_request_status_logs';
  RAISE NOTICE '👥 인증: 커스텀 시스템 기반 비회원/회원 모두 지원';
  RAISE NOTICE '🔒 RLS 정책: 사용자별 데이터 접근 제어';
  RAISE NOTICE '📁 Storage: service-request-photos 버킷 설정';
  RAISE NOTICE '🔧 트리거: 자동 상태 로그, 완료 시간 설정';
  RAISE NOTICE '📊 유틸리티: 통계 분석, 최근 요청 조회';
  RAISE NOTICE '🚀 프리미엄 서비스 요청 시스템 준비 완료!';
END $$;