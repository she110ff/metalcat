-- 알림 문제 진단을 위한 함수
CREATE OR REPLACE FUNCTION diagnose_notification_system()
RETURNS TABLE (
  check_type TEXT,
  status TEXT,
  details JSONB
) AS $$
BEGIN
  -- 1. 트리거 존재 여부 확인
  RETURN QUERY
  SELECT 
    'trigger_check'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'MISSING' END::TEXT,
    jsonb_build_object(
      'trigger_count', COUNT(*),
      'triggers', jsonb_agg(trigger_name)
    )
  FROM information_schema.triggers 
  WHERE trigger_name = 'trigger_new_auction_notification';

  -- 2. 알림 함수 존재 여부 확인
  RETURN QUERY
  SELECT 
    'function_check'::TEXT,
    CASE WHEN COUNT(*) >= 2 THEN 'OK' ELSE 'MISSING' END::TEXT,
    jsonb_build_object(
      'function_count', COUNT(*),
      'functions', jsonb_agg(proname)
    )
  FROM pg_proc 
  WHERE proname IN ('send_auction_create_notification', 'trigger_auction_create_notification');

  -- 3. 활성 푸시 토큰 확인
  RETURN QUERY
  SELECT 
    'push_tokens'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'NO_TOKENS' END::TEXT,
    jsonb_build_object(
      'active_token_count', COUNT(*),
      'total_users_with_tokens', COUNT(DISTINCT user_id)
    )
  FROM user_push_tokens 
  WHERE is_active = true;

  -- 4. 최근 경매 확인
  RETURN QUERY
  SELECT 
    'recent_auctions'::TEXT,
    'INFO'::TEXT,
    jsonb_build_object(
      'auction_count', COUNT(*),
      'recent_auctions', jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'created_at', created_at
        )
      )
    )
  FROM (
    SELECT id, title, created_at 
    FROM auctions 
    ORDER BY created_at DESC 
    LIMIT 5
  ) recent;

  -- 5. 최근 알림 히스토리 확인
  RETURN QUERY
  SELECT 
    'notification_history'::TEXT,
    'INFO'::TEXT,
    jsonb_build_object(
      'notification_count', COUNT(*),
      'recent_notifications', jsonb_agg(
        jsonb_build_object(
          'type', type,
          'title', title,
          'created_at', created_at
        )
      )
    )
  FROM (
    SELECT type, title, created_at 
    FROM notification_history 
    ORDER BY created_at DESC 
    LIMIT 5
  ) recent_notifications;

  -- 6. 환경 확인
  RETURN QUERY
  SELECT 
    'environment'::TEXT,
    'INFO'::TEXT,
    jsonb_build_object(
      'current_environment', get_current_environment()
    );
END;
$$ LANGUAGE plpgsql;

-- 푸시 토큰 테스트용 함수
CREATE OR REPLACE FUNCTION test_notification_manually(test_title TEXT DEFAULT '테스트 알림')
RETURNS JSONB AS $$
DECLARE
  all_tokens TEXT[];
  result JSONB;
BEGIN
  -- 모든 활성 토큰 가져오기
  SELECT array_agg(expo_push_token) INTO all_tokens
  FROM user_push_tokens 
  WHERE is_active = true;
  
  -- 알림 함수 호출
  PERFORM send_auction_create_notification(
    'test_auction_123',
    test_title,
    '테스트',
    '테스트 사용자'
  );
  
  result := jsonb_build_object(
    'token_count', COALESCE(array_length(all_tokens, 1), 0),
    'test_executed', true,
    'environment', get_current_environment()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 권한 설정
GRANT EXECUTE ON FUNCTION diagnose_notification_system() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION test_notification_manually(TEXT) TO authenticated, anon;
