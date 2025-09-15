-- 계산 기준 테이블에 lme_type 컬럼 추가
-- lme_type: 계산용 LME 금속 타입 (구리, 알루미늄, 아연, 납, 주석, 니켈)
-- metal_type: 경매 필터링용 (기존 유지)

-- 1. lme_type 컬럼 추가
ALTER TABLE calculation_standards 
ADD COLUMN IF NOT EXISTS lme_type VARCHAR(20);

-- 2. lme_type 제약 조건 추가 (LME에서 지원하는 금속 + 특수금속 허용)
ALTER TABLE calculation_standards 
ADD CONSTRAINT calculation_standards_lme_type_check 
CHECK (lme_type IN ('구리', '알루미늄', '아연', '납', '주석', '니켈', '특수금속'));

-- 3. lme_type을 NOT NULL로 설정 (기본값 설정 후)
-- 먼저 기존 데이터에 기본값 설정
UPDATE calculation_standards 
SET lme_type = CASE 
    WHEN metal_type LIKE '%구리%' OR metal_type LIKE '%동%' THEN '구리'
    WHEN metal_type LIKE '%알루미늄%' THEN '알루미늄'
    WHEN metal_type LIKE '%아연%' THEN '아연'
    WHEN metal_type LIKE '%납%' THEN '납'
    WHEN metal_type LIKE '%주석%' THEN '주석'
    WHEN metal_type LIKE '%니켈%' THEN '니켈'
    ELSE '구리' -- 기본값
END
WHERE lme_type IS NULL;

-- 4. lme_type을 NOT NULL로 설정
ALTER TABLE calculation_standards 
ALTER COLUMN lme_type SET NOT NULL;

-- 5. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_calculation_standards_lme_type 
ON calculation_standards(lme_type);

-- 6. 복합 인덱스 추가 (lme_type + category 조합으로 빠른 검색)
CREATE INDEX IF NOT EXISTS idx_calculation_standards_lme_type_category 
ON calculation_standards(lme_type, category);

-- 7. 컬럼 코멘트 추가
COMMENT ON COLUMN calculation_standards.lme_type IS 'LME 계산용 금속 타입 (구리, 알루미늄, 아연, 납, 주석, 니켈, 특수금속)';
COMMENT ON COLUMN calculation_standards.metal_type IS '경매 필터링용 금속 종류 (A동, B동, 1급 알루미늄 등 세분화된 분류)';

-- 8. 테이블 코멘트 업데이트
COMMENT ON TABLE calculation_standards IS '비철 계산기 계산 기준 관리 테이블 - lme_type: 계산용, metal_type: 경매 필터링용';
