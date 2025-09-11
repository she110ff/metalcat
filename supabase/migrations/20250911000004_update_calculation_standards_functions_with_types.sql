-- 계산 기준 함수들을 계산 타입과 고정가격 지원하도록 업데이트

-- 1. 계산 기준 목록 조회 함수 업데이트
CREATE OR REPLACE FUNCTION get_calculation_standards()
RETURNS TABLE (
    id UUID,
    metal_type VARCHAR,
    category VARCHAR,
    calculation_type VARCHAR,
    lme_ratio DECIMAL,
    fixed_price DECIMAL,
    deviation DECIMAL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.metal_type,
        cs.category,
        cs.calculation_type,
        cs.lme_ratio,
        cs.fixed_price,
        cs.deviation,
        cs.created_at,
        cs.updated_at
    FROM calculation_standards cs
    ORDER BY cs.calculation_type, cs.metal_type, cs.category;
END;
$$ LANGUAGE plpgsql;

-- 2. 계산 기준 생성 함수 업데이트
CREATE OR REPLACE FUNCTION create_calculation_standard(
    p_user_id UUID,
    p_metal_type VARCHAR,
    p_category VARCHAR,
    p_calculation_type VARCHAR,
    p_lme_ratio DECIMAL,
    p_fixed_price DECIMAL,
    p_deviation DECIMAL
)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_new_id UUID;
BEGIN
    -- 관리자 권한 확인
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_user_id AND is_admin = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', '관리자 권한이 필요합니다.'
        );
    END IF;

    -- 입력값 유효성 검사
    IF p_metal_type IS NULL OR TRIM(p_metal_type) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', '금속 종류를 입력해주세요.'
        );
    END IF;

    IF p_category IS NULL OR TRIM(p_category) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', '금속 구분을 입력해주세요.'
        );
    END IF;

    -- 계산 타입 유효성 검사
    IF p_calculation_type IS NULL OR p_calculation_type NOT IN ('lme_based', 'fixed_price') THEN
        RETURN json_build_object(
            'success', false,
            'error', '계산 타입은 lme_based 또는 fixed_price여야 합니다.'
        );
    END IF;

    -- 계산 타입별 필드 유효성 검사
    IF p_calculation_type = 'lme_based' THEN
        IF p_lme_ratio IS NULL OR p_lme_ratio < 0 OR p_lme_ratio > 300 THEN
            RETURN json_build_object(
                'success', false,
                'error', 'LME 기반 타입에서는 LME 비율(0-300)이 필요합니다.'
            );
        END IF;
        IF p_fixed_price IS NOT NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'LME 기반 타입에서는 고정가격을 설정할 수 없습니다.'
            );
        END IF;
    ELSIF p_calculation_type = 'fixed_price' THEN
        IF p_fixed_price IS NULL OR p_fixed_price <= 0 THEN
            RETURN json_build_object(
                'success', false,
                'error', '고정가격 타입에서는 양수인 고정가격이 필요합니다.'
            );
        END IF;
        IF p_lme_ratio IS NOT NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', '고정가격 타입에서는 LME 비율을 설정할 수 없습니다.'
            );
        END IF;
    END IF;

    IF p_deviation IS NULL OR p_deviation < 0 OR p_deviation > 100 THEN
        RETURN json_build_object(
            'success', false,
            'error', '편차는 0-100 사이의 값이어야 합니다.'
        );
    END IF;

    -- 중복 확인
    IF EXISTS (
        SELECT 1 FROM calculation_standards 
        WHERE metal_type = TRIM(p_metal_type) AND category = TRIM(p_category)
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', '이미 존재하는 계산 기준입니다.'
        );
    END IF;

    -- 데이터 삽입
    INSERT INTO calculation_standards (metal_type, category, calculation_type, lme_ratio, fixed_price, deviation)
    VALUES (TRIM(p_metal_type), TRIM(p_category), p_calculation_type, p_lme_ratio, p_fixed_price, p_deviation)
    RETURNING id INTO v_new_id;

    RETURN json_build_object(
        'success', true,
        'data', json_build_object('id', v_new_id)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 3. 계산 기준 수정 함수 업데이트
CREATE OR REPLACE FUNCTION update_calculation_standard(
    p_user_id UUID,
    p_id UUID,
    p_metal_type VARCHAR,
    p_category VARCHAR,
    p_calculation_type VARCHAR,
    p_lme_ratio DECIMAL,
    p_fixed_price DECIMAL,
    p_deviation DECIMAL
)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
    v_existing_metal_type VARCHAR;
    v_existing_category VARCHAR;
BEGIN
    -- 관리자 권한 확인
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_user_id AND is_admin = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', '관리자 권한이 필요합니다.'
        );
    END IF;

    -- 입력값 유효성 검사
    IF p_metal_type IS NULL OR TRIM(p_metal_type) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', '금속 종류를 입력해주세요.'
        );
    END IF;

    IF p_category IS NULL OR TRIM(p_category) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', '금속 구분을 입력해주세요.'
        );
    END IF;

    -- 계산 타입 유효성 검사
    IF p_calculation_type IS NULL OR p_calculation_type NOT IN ('lme_based', 'fixed_price') THEN
        RETURN json_build_object(
            'success', false,
            'error', '계산 타입은 lme_based 또는 fixed_price여야 합니다.'
        );
    END IF;

    -- 계산 타입별 필드 유효성 검사
    IF p_calculation_type = 'lme_based' THEN
        IF p_lme_ratio IS NULL OR p_lme_ratio < 0 OR p_lme_ratio > 300 THEN
            RETURN json_build_object(
                'success', false,
                'error', 'LME 기반 타입에서는 LME 비율(0-300)이 필요합니다.'
            );
        END IF;
        IF p_fixed_price IS NOT NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'LME 기반 타입에서는 고정가격을 설정할 수 없습니다.'
            );
        END IF;
    ELSIF p_calculation_type = 'fixed_price' THEN
        IF p_fixed_price IS NULL OR p_fixed_price <= 0 THEN
            RETURN json_build_object(
                'success', false,
                'error', '고정가격 타입에서는 양수인 고정가격이 필요합니다.'
            );
        END IF;
        IF p_lme_ratio IS NOT NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', '고정가격 타입에서는 LME 비율을 설정할 수 없습니다.'
            );
        END IF;
    END IF;

    IF p_deviation IS NULL OR p_deviation < 0 OR p_deviation > 100 THEN
        RETURN json_build_object(
            'success', false,
            'error', '편차는 0-100 사이의 값이어야 합니다.'
        );
    END IF;

    -- 기존 데이터 확인
    SELECT metal_type, category INTO v_existing_metal_type, v_existing_category
    FROM calculation_standards 
    WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', '해당 계산 기준을 찾을 수 없습니다.'
        );
    END IF;

    -- 중복 확인 (자기 자신 제외)
    IF EXISTS (
        SELECT 1 FROM calculation_standards 
        WHERE metal_type = TRIM(p_metal_type) 
        AND category = TRIM(p_category)
        AND id != p_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', '이미 존재하는 계산 기준입니다.'
        );
    END IF;

    -- 데이터 업데이트
    UPDATE calculation_standards 
    SET 
        metal_type = TRIM(p_metal_type),
        category = TRIM(p_category),
        calculation_type = p_calculation_type,
        lme_ratio = p_lme_ratio,
        fixed_price = p_fixed_price,
        deviation = p_deviation,
        updated_at = NOW()
    WHERE id = p_id;

    RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 4. 특정 금속의 계산 기준 조회 함수 업데이트
CREATE OR REPLACE FUNCTION get_calculation_standard_by_metal(
    p_metal_type VARCHAR,
    p_category VARCHAR
)
RETURNS TABLE (
    id UUID,
    metal_type VARCHAR,
    category VARCHAR,
    calculation_type VARCHAR,
    lme_ratio DECIMAL,
    fixed_price DECIMAL,
    deviation DECIMAL
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.metal_type,
        cs.category,
        cs.calculation_type,
        cs.lme_ratio,
        cs.fixed_price,
        cs.deviation
    FROM calculation_standards cs
    WHERE cs.metal_type = p_metal_type 
    AND cs.category = p_category;
END;
$$ LANGUAGE plpgsql;

-- 5. 금속 종류별 구분 목록 조회 함수 업데이트
CREATE OR REPLACE FUNCTION get_categories_by_metal(p_metal_type VARCHAR)
RETURNS TABLE (
    category VARCHAR,
    calculation_type VARCHAR,
    lme_ratio DECIMAL,
    fixed_price DECIMAL,
    deviation DECIMAL
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.category,
        cs.calculation_type,
        cs.lme_ratio,
        cs.fixed_price,
        cs.deviation
    FROM calculation_standards cs
    WHERE cs.metal_type = p_metal_type
    ORDER BY cs.calculation_type, cs.category;
END;
$$ LANGUAGE plpgsql;

-- 6. 함수 코멘트 업데이트
COMMENT ON FUNCTION create_calculation_standard(UUID, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL) IS '새로운 계산 기준 생성 (계산 타입 지원)';
COMMENT ON FUNCTION update_calculation_standard(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL) IS '계산 기준 수정 (계산 타입 지원)';
COMMENT ON FUNCTION get_calculation_standard_by_metal(VARCHAR, VARCHAR) IS '특정 금속의 계산 기준 조회 (계산 타입 포함)';
COMMENT ON FUNCTION get_categories_by_metal(VARCHAR) IS '금속 종류별 구분 목록 조회 (계산 타입 포함)';
