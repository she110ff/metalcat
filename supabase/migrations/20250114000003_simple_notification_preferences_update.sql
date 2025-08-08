-- 기존 알림 함수에 설정 필터 추가
-- 목적: 기존의 잘 작동하는 알림 시스템에 사용자 설정 필터만 추가
-- 기반: 20250108162200_optimize_notification_batch_insert.sql
-- 작성일: 2025-01-14

-- ============================================
-- 1. 경매 등록 알림 함수 업데이트 (최소 변경)
-- ============================================

CREATE OR REPLACE FUNCTION send_auction_create_notification(
  auction_id TEXT,
  auction_title TEXT,
  auction_category TEXT,
  seller_name TEXT
) RETURNS void AS $$
DECLARE
  current_env TEXT;
  supabase_url TEXT;
  function_url TEXT;
  response_id BIGINT;
  all_tokens TEXT[];
  notification_title TEXT;
  notification_body TEXT;
  active_user_count INTEGER;
  enabled_user_count INTEGER;
BEGIN
  -- 현재 환경 확인
  SELECT get_current_environment() INTO current_env;
  
  -- 경매 등록 알림을 활성화한 사용자들의 푸시 토큰 가져오기 (새로운 설정 반영)
  SELECT array_agg(token) INTO all_tokens
  FROM user_push_tokens 
  WHERE is_active = true 
    AND auction_registration_enabled = true; -- 새로운 설정 조건 추가
  
  -- 활성 사용자 수 확인
  SELECT COUNT(*) INTO active_user_count
  FROM user_push_tokens 
  WHERE is_active = true;
  
  SELECT COUNT(*) INTO enabled_user_count
  FROM user_push_tokens 
  WHERE is_active = true AND auction_registration_enabled = true;
  
  -- 토큰이 없으면 처리하지 않음
  IF all_tokens IS NULL OR array_length(all_tokens, 1) IS NULL OR array_length(all_tokens, 1) = 0 THEN
    RAISE NOTICE '📱 새 경매 알림 전송 건너뜀: 경매 등록 알림을 활성화한 사용자가 없음';
    RAISE NOTICE '   • 전체 활성 사용자: %, 경매 등록 알림 활성화: %', active_user_count, enabled_user_count;
    RETURN;
  END IF;
  
  -- 알림 내용 구성
  notification_title := '새로운 경매가 등록되었습니다!';
  notification_body := auction_title || ' 경매가 새로 등록되었습니다.';
  
  RAISE NOTICE '📢 새 경매 알림 발송: % - % (토큰 수: %)', notification_title, notification_body, array_length(all_tokens, 1);
  
  -- 🚀 배치 INSERT로 성능 개선: 경매 등록 알림을 활성화한 사용자들에게만 히스토리 저장
  INSERT INTO notification_history (user_id, notification_type, title, body, data, created_at)
  SELECT 
    user_id,
    'auction_created',
    notification_title,
    notification_body,
    jsonb_build_object(
      'auction_id', auction_id,
      'auction_title', auction_title,
      'auction_category', auction_category,
      'seller_name', seller_name,
      'notification_type', 'auction_created'
    ),
    NOW()
  FROM user_push_tokens 
  WHERE is_active = true 
    AND auction_registration_enabled = true; -- 새로운 설정 조건 추가
  
  RAISE NOTICE '✅ 배치 INSERT로 %명의 사용자에게 알림 히스토리 저장 완료', enabled_user_count;
  
  -- 환경별 처리
  IF current_env = 'local' THEN
    -- 로컬 환경에서는 로그만 출력
    RAISE NOTICE '🏠 로컬 환경: 실제 새 경매 알림 전송 생략';
  ELSE
    -- 프로덕션/스테이징에서는 실제 Edge Function 호출
    BEGIN
      -- 환경별 Supabase URL 설정
      IF current_env = 'production' THEN
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      ELSE
        -- 스테이징이나 기타 환경
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      END IF;
      
      function_url := supabase_url || '/functions/v1/send-auction-notification';
      
      RAISE NOTICE '🚀 새 경매 알림 Edge Function 호출: %', function_url;
      
      -- pg_net을 사용해서 Edge Function 호출
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZG5jc3d2YmhlbHN0cGtmY3Z2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDEyMzIxMiwiZXhwIjoyMDY5Njk5MjEyfQ.oAOAE-0vaU0ph5bkX9DBWfCwFEJha9wo8W1kATeAHTI'
        ),
        body := jsonb_build_object(
          'tokens', all_tokens, 
          'title', notification_title, 
          'body', notification_body, 
          'data', jsonb_build_object(
            'auction_id', auction_id,
            'auction_title', auction_title,
            'auction_category', auction_category,
            'seller_name', seller_name,
            'notification_type', 'auction_created'
          )
        ),
        timeout_milliseconds := 30000
      ) INTO response_id;
      
      RAISE NOTICE '✅ 새 경매 알림 전송 요청 완료 (request_id: %)', response_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ 새 경매 알림 전송 실패: %', SQLERRM;
      -- 알림 실패가 경매 등록을 중단시키지 않도록 예외를 흡수
    END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. 경매 종료 알림 함수들은 기존대로 유지
-- ============================================

-- process_ended_auctions 함수는 수정 없이 기존 그대로 유지
-- 이미 최적화되어 있고 잘 작동하므로 변경하지 않음

-- ============================================
-- 3. 사용자 알림 설정 함수 권한 설정
-- ============================================

-- 새로운 함수들에 대한 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_notification_preferences(UUID, BOOLEAN, BOOLEAN) TO authenticated;

-- 통계 함수는 관리자 전용
GRANT EXECUTE ON FUNCTION get_notification_preferences_stats() TO service_role;

-- ============================================
-- 4. 완료 로그
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🎯 알림 시스템 설정 업데이트 완료!';
    RAISE NOTICE '   ✅ 기존 최적화된 함수 기반으로 설정 필터 추가';
    RAISE NOTICE '   ✅ 경매 등록 알림: auction_registration_enabled 설정 반영';
    RAISE NOTICE '   ✅ 경매 종료 알림: 기존 함수 그대로 유지';
    RAISE NOTICE '   ✅ 사용자 설정 함수 권한 설정 완료';
    RAISE NOTICE '';
    RAISE NOTICE '🔥 핵심 변경 사항:';
    RAISE NOTICE '   • 기존 알림 시스템 안정성 유지';
    RAISE NOTICE '   • 최소한의 변경으로 설정 기능 추가';
    RAISE NOTICE '   • 성능 최적화된 배치 처리 그대로 유지';
END $$;
