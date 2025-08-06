-- ============================================
-- 시간대 설정: 서울 (Asia/Seoul)
-- 생성일: 2025-08-06
-- 목적: 데이터베이스 기본 시간대를 한국 표준시로 설정
-- ============================================

-- 데이터베이스 기본 시간대를 서울로 설정
ALTER DATABASE postgres SET timezone = 'Asia/Seoul';

-- 현재 세션에서도 즉시 적용
SET timezone = 'Asia/Seoul';

-- 시간대 설정 확인을 위한 함수
CREATE OR REPLACE FUNCTION get_current_timezone_info()
RETURNS TABLE (
    current_timezone text,
    current_time_utc timestamptz,
    current_time_seoul timestamptz,
    offset_hours text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        current_setting('TIMEZONE') as current_timezone,
        NOW() as current_time_utc,
        NOW() AT TIME ZONE 'Asia/Seoul' as current_time_seoul,
        to_char(EXTRACT(TIMEZONE_HOUR FROM NOW()), 'FM+00') || ':' || 
        to_char(EXTRACT(TIMEZONE_MINUTE FROM NOW()), 'FM00') as offset_hours;
END;
$$ LANGUAGE plpgsql;

-- 시간대 변경 로그 (주석으로 기록)
-- 데이터베이스 시간대: Asia/Seoul
-- 변경 일시: NOW()
-- 설명: 데이터베이스 기본 시간대를 한국 표준시로 설정

-- 시간대 설정 확인
SELECT 
    '시간대 변경 완료' as status,
    current_setting('TIMEZONE') as new_timezone,
    NOW() as current_time_with_new_timezone;
