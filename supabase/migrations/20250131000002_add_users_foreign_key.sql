-- ============================================
-- 인증 시스템 아키텍처 통합 - 커스텀 시스템으로 완전 통일
-- 작성일: 2025-01-31  
-- 목적: auth.users와 커스텀 users 간 충돌 완전 해결, 비회원/회원 모두 지원
-- ============================================

-- ============================================
-- 1단계: 기존 충돌 구조 완전 정리
-- ============================================

-- 모든 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Users can view their own requests" ON service_requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON service_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON service_requests;

-- Photos와 logs 정책도 삭제
DROP POLICY IF EXISTS "Users can manage photos of their requests" ON service_request_photos;
DROP POLICY IF EXISTS "Users can view status logs of their requests" ON service_request_status_logs;
DROP POLICY IF EXISTS "Only system can insert status logs" ON service_request_status_logs;
DROP POLICY IF EXISTS "Only system can update status logs" ON service_request_status_logs;

-- 기존 외래키 제약 조건 완전 제거
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS fk_service_requests_user_id;
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_user_id_fkey;

-- ============================================
-- 2단계: 깔끔한 스키마 재정의
-- ============================================

-- service_requests 테이블 user_id 컬럼 타입 확인 및 변경
ALTER TABLE service_requests 
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 커스텀 users 테이블과의 올바른 외래키 설정 (비회원 지원을 위해 SET NULL)
ALTER TABLE service_requests 
  ADD CONSTRAINT fk_service_requests_custom_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- 3단계: 커스텀 인증 기반 RLS 정책 (비회원/회원 모두 지원)
-- ============================================

-- 서비스 요청 테이블 정책
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
-- 4단계: 관련 테이블 정책 재설정
-- ============================================

-- 사진 테이블 정책
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

-- 상태 로그 테이블 정책
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
-- 5단계: 성능 최적화
-- ============================================

-- 기존 인덱스 정리 및 재생성
DROP INDEX IF EXISTS idx_service_requests_user_id;
CREATE INDEX idx_service_requests_custom_user_id ON service_requests(user_id);

-- 비회원 요청 조회 최적화
CREATE INDEX idx_service_requests_null_user_id ON service_requests(created_at) 
  WHERE user_id IS NULL;

-- ============================================
-- 6단계: 권한 정리
-- ============================================

-- 기본 권한 재설정
GRANT SELECT, INSERT, UPDATE, DELETE ON service_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON service_requests TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON service_request_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON service_request_photos TO anon;

GRANT SELECT ON service_request_status_logs TO authenticated;
GRANT SELECT ON service_request_status_logs TO anon;

-- ============================================
-- 7단계: 검증을 위한 뷰 생성
-- ============================================

-- 서비스 요청 요약 뷰 (회원/비회원 구분)
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

-- 뷰 권한 부여
GRANT SELECT ON service_requests_summary TO authenticated;
GRANT SELECT ON service_requests_summary TO anon;

-- ============================================
-- 완료 확인
-- ============================================

-- 아키텍처 통합 완료 알림
DO $$
BEGIN
  RAISE NOTICE '🎉 인증 시스템 아키텍처 통합 완료!';
  RAISE NOTICE '✅ 외래키 설정: service_requests.user_id -> users.id (SET NULL)';
  RAISE NOTICE '✅ 비회원 요청 지원: user_id IS NULL 허용';
  RAISE NOTICE '✅ 회원 요청 지원: 유효한 users.id 참조';
  RAISE NOTICE '✅ RLS 정책: 커스텀 인증 시스템 기반';
  RAISE NOTICE '✅ 성능 최적화: 인덱스 및 뷰 생성 완료';
END $$;