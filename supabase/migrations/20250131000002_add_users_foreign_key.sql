-- ============================================
-- service_requests 테이블에 users 외래키 추가
-- ============================================

-- ============================================
-- 1단계: 기존 RLS 정책 삭제 (컬럼 타입 변경을 위해)
-- ============================================

-- 기존 정책 삭제 (정확한 정책명 사용)
DROP POLICY IF EXISTS "Users can view their own requests" ON service_requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON service_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON service_requests;

-- Photos와 status_logs 테이블의 의존 정책도 삭제
DROP POLICY IF EXISTS "Users can manage photos of their requests" ON service_request_photos;
DROP POLICY IF EXISTS "Users can view status logs of their requests" ON service_request_status_logs;

-- ============================================
-- 2단계: 컬럼 타입 변경
-- ============================================

-- 기존 service_requests 테이블의 user_id 컬럼 타입 변경
-- (기존에는 TEXT였지만 UUID로 변경)
ALTER TABLE service_requests 
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- users 테이블과의 외래키 제약 추가
ALTER TABLE service_requests 
  ADD CONSTRAINT fk_service_requests_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- user_id 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);

-- ============================================
-- 3단계: RLS 정책 재생성
-- ============================================

-- ============================================
-- 4단계: RLS 정책 재생성 (UUID 기반)
-- ============================================

-- service_requests 테이블 정책
CREATE POLICY "Users can view their own requests" ON service_requests
  FOR SELECT USING (
    auth.uid() = user_id 
    OR user_id IS NULL 
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can insert their own requests" ON service_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    OR user_id IS NULL 
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can update their own requests" ON service_requests
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR user_id IS NULL 
    OR auth.role() = 'service_role'
  );

-- service_request_photos 테이블 정책
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

-- service_request_status_logs 테이블 정책
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