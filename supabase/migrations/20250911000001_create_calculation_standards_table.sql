-- 계산 기준 테이블 생성
-- 비철 계산기에서 사용할 금속별 계산 기준을 관리하는 테이블

-- 계산 기준 테이블 생성
CREATE TABLE calculation_standards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metal_type VARCHAR(50) NOT NULL,           -- 종류 (구리, 알루미늄, 아연 등)
    category VARCHAR(50) NOT NULL,             -- 구분 (A동, B동, 1급 등)
    lme_ratio DECIMAL(5,2) NOT NULL CHECK (lme_ratio >= 0 AND lme_ratio <= 300),  -- LME비율 (0-300%)
    deviation DECIMAL(5,2) NOT NULL CHECK (deviation >= 0 AND deviation <= 100),  -- 편차 (0-100%)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 중복 방지를 위한 유니크 제약조건
    UNIQUE(metal_type, category)
);

-- 업데이트 시간 자동 갱신 트리거 (기존 함수 재사용)
CREATE TRIGGER update_calculation_standards_updated_at 
    BEFORE UPDATE ON calculation_standards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 정책 설정
ALTER TABLE calculation_standards ENABLE ROW LEVEL SECURITY;

-- 관리자만 모든 작업 가능
CREATE POLICY "관리자만 계산기준 관리 가능" ON calculation_standards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = current_setting('app.current_user_id')::UUID 
            AND users.is_admin = true
        )
    );

-- 모든 사용자는 조회만 가능 (향후 계산기 연동 시 사용)
CREATE POLICY "모든 사용자 계산기준 조회 가능" ON calculation_standards
    FOR SELECT USING (true);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_calculation_standards_metal_type ON calculation_standards(metal_type);
CREATE INDEX idx_calculation_standards_category ON calculation_standards(category);
CREATE INDEX idx_calculation_standards_metal_category ON calculation_standards(metal_type, category);

-- 초기 데이터는 관리자 대시보드에서 직접 입력

-- 코멘트 추가
COMMENT ON TABLE calculation_standards IS '비철 계산기 계산 기준 관리 테이블';
COMMENT ON COLUMN calculation_standards.metal_type IS '금속 종류 (구리, 알루미늄, 아연 등)';
COMMENT ON COLUMN calculation_standards.category IS '금속 구분 (A동, B동, 1급 등)';
COMMENT ON COLUMN calculation_standards.lme_ratio IS 'LME 가격 적용 비율 (0-300%)';
COMMENT ON COLUMN calculation_standards.deviation IS '가격 편차 범위 (0-100%)';
