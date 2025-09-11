-- 계산 기준 테이블에 계산 타입과 고정가격 필드 추가
-- 기존 테이블 구조를 확장하여 LME 기반과 고정가격 두 가지 타입 지원

-- 1. 새로운 컬럼들 추가
ALTER TABLE calculation_standards 
ADD COLUMN IF NOT EXISTS calculation_type VARCHAR(20) DEFAULT 'lme_based';

ALTER TABLE calculation_standards 
ADD COLUMN IF NOT EXISTS fixed_price DECIMAL(10,2);

-- 2. 기존 lme_ratio 컬럼을 nullable로 변경
ALTER TABLE calculation_standards 
ALTER COLUMN lme_ratio DROP NOT NULL;

-- 3. 계산 타입 제약 조건 추가
ALTER TABLE calculation_standards 
ADD CONSTRAINT calculation_standards_calculation_type_check 
CHECK (calculation_type IN ('lme_based', 'fixed_price'));

-- 4. 고정가격 제약 조건 추가
ALTER TABLE calculation_standards 
ADD CONSTRAINT calculation_standards_fixed_price_check 
CHECK (fixed_price IS NULL OR fixed_price >= 0);

-- 5. 계산 타입별 필수 필드 검증 제약 조건
ALTER TABLE calculation_standards 
ADD CONSTRAINT calculation_standards_type_fields_check 
CHECK (
    (calculation_type = 'lme_based' AND lme_ratio IS NOT NULL AND fixed_price IS NULL) OR
    (calculation_type = 'fixed_price' AND fixed_price IS NOT NULL AND lme_ratio IS NULL)
);

-- 6. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_calculation_standards_calculation_type 
ON calculation_standards(calculation_type);

-- 7. 컬럼 코멘트 추가
COMMENT ON COLUMN calculation_standards.calculation_type IS '계산 타입 (lme_based: LME 기반, fixed_price: 고정가격)';
COMMENT ON COLUMN calculation_standards.fixed_price IS '고정 가격 (고정가격 타입에서만 사용, 원/kg)';

-- 8. 기존 데이터 업데이트 (모든 기존 데이터는 LME 기반으로 설정)
UPDATE calculation_standards 
SET calculation_type = 'lme_based' 
WHERE calculation_type IS NULL;
