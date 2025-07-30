-- 프리미엄 서비스 요청 시스템 데이터베이스 스키마
-- 작성일: 2025-01-30
-- 목적: 현장 방문 감정 및 즉시 매입 서비스 요청 관리

-- 서비스 요청 메인 테이블
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), -- 향후 인증 시스템 연동
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

-- 서비스 요청 사진 테이블
CREATE TABLE service_request_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_order INTEGER NOT NULL DEFAULT 0,
  is_representative BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상태 변경 로그 테이블
CREATE TABLE service_request_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 인덱스 생성
CREATE INDEX idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_created_at ON service_requests(created_at);
CREATE INDEX idx_service_requests_service_type ON service_requests(service_type);

CREATE INDEX idx_service_request_photos_request_id ON service_request_photos(service_request_id);
CREATE INDEX idx_service_request_photos_order ON service_request_photos(service_request_id, photo_order);

CREATE INDEX idx_status_logs_request_id ON service_request_status_logs(service_request_id);
CREATE INDEX idx_status_logs_created_at ON service_request_status_logs(created_at);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_requests_updated_at 
    BEFORE UPDATE ON service_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 상태 변경 시 자동 로그 생성 트리거
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

CREATE TRIGGER log_service_request_status_change
    AFTER UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- 완료 시간 자동 설정 트리거
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

CREATE TRIGGER set_service_request_completed_at
    BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION set_completed_at();

-- 코멘트 추가
COMMENT ON TABLE service_requests IS '프리미엄 서비스 요청 메인 테이블';
COMMENT ON TABLE service_request_photos IS '서비스 요청 관련 사진';
COMMENT ON TABLE service_request_status_logs IS '서비스 요청 상태 변경 이력';

COMMENT ON COLUMN service_requests.service_type IS 'appraisal: 감정 서비스, purchase: 매입 서비스';
COMMENT ON COLUMN service_requests.status IS 'pending: 접수대기, assigned: 담당자배정, in_progress: 진행중, completed: 완료, cancelled: 취소';
COMMENT ON COLUMN service_request_photos.is_representative IS '대표 이미지 여부';
COMMENT ON COLUMN service_request_photos.photo_order IS '사진 순서 (0부터 시작)'; 