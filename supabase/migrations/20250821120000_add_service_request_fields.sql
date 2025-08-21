-- ============================================
-- 서비스 요청 필드 추가 및 필수 제약 조건 수정
-- 생성일: 2025-08-21
-- 목적: 안심번호, 종류, 수량 필드 추가 및 필수 입력 요소 변경
-- ============================================

-- 기존 필수 제약 조건 제거 (주소, 설명을 비필수로 변경)
ALTER TABLE service_requests ALTER COLUMN address DROP NOT NULL;
ALTER TABLE service_requests ALTER COLUMN description DROP NOT NULL;

-- 새 필드 추가
ALTER TABLE service_requests ADD COLUMN use_safe_number BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE service_requests ADD COLUMN item_type TEXT;
ALTER TABLE service_requests ADD COLUMN quantity INTEGER;

-- 제약 조건 추가
ALTER TABLE service_requests ADD CONSTRAINT check_quantity_positive 
  CHECK (quantity IS NULL OR quantity > 0);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_service_requests_use_safe_number ON service_requests(use_safe_number);
CREATE INDEX idx_service_requests_item_type ON service_requests(item_type) WHERE item_type IS NOT NULL;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN service_requests.use_safe_number IS '안심번호 사용 여부 (필수)';
COMMENT ON COLUMN service_requests.item_type IS '금속 종류 (선택사항)';
COMMENT ON COLUMN service_requests.quantity IS '수량 (선택사항, 양수만 허용)';

-- 변경 사항 로그
DO $$
BEGIN
  RAISE NOTICE '✅ 서비스 요청 테이블 필드 추가 완료';
  RAISE NOTICE '📋 새 필드: use_safe_number(필수), item_type(선택), quantity(선택)';
  RAISE NOTICE '🔧 필수 제약 조건 변경: address, description → 선택사항으로 변경';
END;
$$;
