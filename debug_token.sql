-- 특정 사용자의 토큰 상태 확인
SELECT 
    id,
    user_id,
    token,
    device_type,
    is_active,
    created_at,
    updated_at
FROM user_push_tokens 
WHERE user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' 
ORDER BY created_at DESC;

-- 사용자 존재 여부 확인
SELECT 
    id,
    phone,
    created_at
FROM users 
WHERE id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e';

-- 전체 토큰 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_push_tokens' 
ORDER BY ordinal_position;
