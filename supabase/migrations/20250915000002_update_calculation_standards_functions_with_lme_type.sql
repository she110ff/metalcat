-- 계산 기준 함수들을 lme_type 컬럼 지원하도록 업데이트

-- 1. 계산 기준 목록 조회 함수 업데이트 (lme_type 포함)
CREATE OR REPLACE FUNCTION get_calculation_standards()
RETURNS TABLE (
    id UUID,
    metal_type VARCHAR,
    category VARCHAR,
    lme_type VARCHAR,
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
        cs.lme_type,
        cs.calculation_type,
        cs.lme_ratio,
        cs.fixed_price,
        cs.deviation,
        cs.created_at,
        cs.updated_at
    FROM calculation_standards cs
    ORDER BY cs.lme_type, cs.calculation_type, cs.metal_type, cs.category;
END;
$$ LANGUAGE plpgsql;

-- 2. 계산 기준 생성 함수 업데이트 (lme_type 파라미터 추가)
CREATE OR REPLACE FUNCTION create_calculation_standard(
    p_user_id UUID,
    p_metal_type VARCHAR,
    p_category VARCHAR,
    p_lme_type VARCHAR,
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

    -- lme_type 유효성 검증
    IF p_lme_type NOT IN ('구리', '알루미늄', '아연', '납', '주석', '니켈', '특수금속') THEN
        RETURN json_build_object(
            'success', false,
            'error', '유효하지 않은 LME 타입입니다.'
        );
    END IF;

    -- 계산 타입별 필수 필드 검증
    IF p_calculation_type = 'lme_based' AND p_lme_ratio IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'LME 기반 타입에는 LME 비율이 필요합니다.'
        );
    END IF;

    IF p_calculation_type = 'fixed_price' AND p_fixed_price IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', '고정가격 타입에는 고정 가격이 필요합니다.'
        );
    END IF;

    -- 중복 확인 (metal_type + category 조합)
    IF EXISTS (
        SELECT 1 FROM calculation_standards 
        WHERE metal_type = p_metal_type AND category = p_category
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', '이미 존재하는 금속 종류와 구분 조합입니다.'
        );
    END IF;

    -- 새 계산 기준 생성
    INSERT INTO calculation_standards (
        metal_type, 
        category, 
        lme_type,
        calculation_type,
        lme_ratio, 
        fixed_price,
        deviation
    ) VALUES (
        p_metal_type, 
        p_category, 
        p_lme_type,
        p_calculation_type,
        p_lme_ratio, 
        p_fixed_price,
        p_deviation
    ) RETURNING id INTO v_new_id;

    RETURN json_build_object(
        'success', true,
        'id', v_new_id,
        'message', '계산 기준이 성공적으로 생성되었습니다.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 3. 계산 기준 수정 함수 업데이트 (lme_type 파라미터 추가)
CREATE OR REPLACE FUNCTION update_calculation_standard(
    p_user_id UUID,
    p_standard_id UUID,
    p_metal_type VARCHAR,
    p_category VARCHAR,
    p_lme_type VARCHAR,
    p_calculation_type VARCHAR,
    p_lme_ratio DECIMAL,
    p_fixed_price DECIMAL,
    p_deviation DECIMAL
)
RETURNS JSON
SECURITY DEFINER
AS $$
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

    -- lme_type 유효성 검증
    IF p_lme_type NOT IN ('구리', '알루미늄', '아연', '납', '주석', '니켈', '특수금속') THEN
        RETURN json_build_object(
            'success', false,
            'error', '유효하지 않은 LME 타입입니다.'
        );
    END IF;

    -- 계산 타입별 필수 필드 검증
    IF p_calculation_type = 'lme_based' AND p_lme_ratio IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'LME 기반 타입에는 LME 비율이 필요합니다.'
        );
    END IF;

    IF p_calculation_type = 'fixed_price' AND p_fixed_price IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', '고정가격 타입에는 고정 가격이 필요합니다.'
        );
    END IF;

    -- 중복 확인 (자기 자신 제외)
    IF EXISTS (
        SELECT 1 FROM calculation_standards 
        WHERE metal_type = p_metal_type 
        AND category = p_category 
        AND id != p_standard_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', '이미 존재하는 금속 종류와 구분 조합입니다.'
        );
    END IF;

    -- 계산 기준 수정
    UPDATE calculation_standards 
    SET 
        metal_type = p_metal_type,
        category = p_category,
        lme_type = p_lme_type,
        calculation_type = p_calculation_type,
        lme_ratio = p_lme_ratio,
        fixed_price = p_fixed_price,
        deviation = p_deviation,
        updated_at = NOW()
    WHERE id = p_standard_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', '해당 계산 기준을 찾을 수 없습니다.'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', '계산 기준이 성공적으로 수정되었습니다.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 4. LME 타입별 계산 기준 조회 함수 추가
CREATE OR REPLACE FUNCTION get_calculation_standards_by_lme_type(p_lme_type VARCHAR)
RETURNS TABLE (
    id UUID,
    metal_type VARCHAR,
    category VARCHAR,
    lme_type VARCHAR,
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
        cs.lme_type,
        cs.calculation_type,
        cs.lme_ratio,
        cs.fixed_price,
        cs.deviation
    FROM calculation_standards cs
    WHERE cs.lme_type = p_lme_type
    ORDER BY cs.calculation_type, cs.category;
END;
$$ LANGUAGE plpgsql;

-- 5. 특정 금속의 계산 기준 조회 함수 업데이트 (lme_type 포함)
CREATE OR REPLACE FUNCTION get_calculation_standard_by_metal(
    p_metal_type VARCHAR,
    p_category VARCHAR
)
RETURNS TABLE (
    id UUID,
    metal_type VARCHAR,
    category VARCHAR,
    lme_type VARCHAR,
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
        cs.lme_type,
        cs.calculation_type,
        cs.lme_ratio,
        cs.fixed_price,
        cs.deviation
    FROM calculation_standards cs
    WHERE cs.metal_type = p_metal_type 
    AND cs.category = p_category;
END;
$$ LANGUAGE plpgsql;

-- 6. 함수 코멘트 업데이트
COMMENT ON FUNCTION create_calculation_standard(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL) IS '새로운 계산 기준 생성 (lme_type 지원)';
COMMENT ON FUNCTION update_calculation_standard(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, DECIMAL, DECIMAL, DECIMAL) IS '계산 기준 수정 (lme_type 지원)';
COMMENT ON FUNCTION get_calculation_standards_by_lme_type(VARCHAR) IS 'LME 타입별 계산 기준 조회';
COMMENT ON FUNCTION get_calculation_standard_by_metal(VARCHAR, VARCHAR) IS '특정 금속의 계산 기준 조회 (lme_type 포함)';
