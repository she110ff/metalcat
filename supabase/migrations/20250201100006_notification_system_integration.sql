-- 알림 시스템 통합 마이그레이션
-- 20250201100006_notification_system_integration.sql

-- 실시간 알림 발송 함수
CREATE OR REPLACE FUNCTION send_auction_end_notification(
  tokens TEXT[],
  title TEXT,
  body TEXT,
  data JSONB
) RETURNS void AS $$
DECLARE
  current_env TEXT;
  supabase_url TEXT;
  function_url TEXT;
  response_id BIGINT;
BEGIN
  -- 현재 환경 확인
  SELECT get_current_environment() INTO current_env;
  
  -- 토큰이 없으면 처리하지 않음
  IF tokens IS NULL OR array_length(tokens, 1) IS NULL OR array_length(tokens, 1) = 0 THEN
    RAISE NOTICE '📱 알림 전송 건너뜀: 유효한 토큰이 없음';
    RETURN;
  END IF;
  
  RAISE NOTICE '📱 알림 발송: % - % (토큰 수: %)', title, body, array_length(tokens, 1);
  
  -- 환경별 처리
  IF current_env = 'local' THEN
    -- 로컬 환경에서는 로그만 출력
    RAISE NOTICE '🏠 로컬 환경: 실제 알림 전송 생략';
  ELSE
    -- 프로덕션/스테이징에서는 실제 Edge Function 호출
    BEGIN
      -- Supabase URL 가져오기
      SELECT config_value INTO supabase_url 
      FROM app_config 
      WHERE config_key = 'supabase_url' AND environment = current_env;
      
      -- URL이 없으면 기본값 사용
      IF supabase_url IS NULL THEN
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      END IF;
      
      function_url := supabase_url || '/functions/v1/send-auction-notification';
      
      RAISE NOTICE '🚀 Edge Function 호출: %', function_url;
      
      -- pg_net을 사용해서 Edge Function 호출
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT config_value 
            FROM app_config 
            WHERE config_key = 'service_role_key' AND environment = current_env
          )
        ),
        body := jsonb_build_object(
          'tokens', tokens, 
          'title', title, 
          'body', body, 
          'data', data
        ),
        timeout_milliseconds := 30000
      ) INTO response_id;
      
      RAISE NOTICE '✅ 알림 전송 요청 완료 (request_id: %)', response_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ 알림 전송 실패: %', SQLERRM;
      -- 알림 실패가 경매 처리를 중단시키지 않도록 예외를 흡수
    END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 기존 process_ended_auctions 함수에 알림 로직 추가
CREATE OR REPLACE FUNCTION process_ended_auctions()
RETURNS TABLE(
  processed_count INTEGER,
  successful_count INTEGER,
  failed_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  ended_auction RECORD;
  total_processed INTEGER := 0;
  total_successful INTEGER := 0;
  total_failed INTEGER := 0;
  total_errors INTEGER := 0;
  auction_error TEXT;
  
  -- 알림 관련 변수
  seller_tokens TEXT[];
  winner_tokens TEXT[];
  auction_title TEXT;
BEGIN
  -- 로그 시작
  INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
  VALUES ('auction', 'auction-end-processor', 'running', 
          jsonb_build_object('started_at', NOW()));

  -- 종료된 경매들 처리 (락 적용)
  FOR ended_auction IN 
    SELECT 
      a.id,
      a.title,
      a.starting_price,
      a.user_id as seller_id,
      a.end_time,
      a.status,
      ab.id as winning_bid_id,
      ab.user_id as winning_user_id,
      ab.amount as winning_amount,
      ab.user_name as winning_user_name
    FROM auctions a
    LEFT JOIN auction_bids ab ON a.id = ab.auction_id AND ab.is_top_bid = true
    WHERE a.end_time <= NOW() 
      AND a.status IN ('active', 'ending')
    ORDER BY a.end_time ASC
    FOR UPDATE OF a -- 동시성 제어를 위한 락
  LOOP
    BEGIN
      total_processed := total_processed + 1;
      auction_title := ended_auction.title;
      
      -- 알림을 위한 토큰 조회
      -- 경매 등록자 토큰
      SELECT array_agg(expo_push_token) INTO seller_tokens
      FROM user_push_tokens 
      WHERE user_id = ended_auction.seller_id AND is_active = true;
      
      -- 낙찰자 토큰 (낙찰된 경우)
      IF ended_auction.winning_user_id IS NOT NULL THEN
        SELECT array_agg(expo_push_token) INTO winner_tokens
        FROM user_push_tokens 
        WHERE user_id = ended_auction.winning_user_id AND is_active = true;
      END IF;
      
      -- 낙찰/유찰 결정
      IF ended_auction.winning_amount IS NOT NULL 
         AND ended_auction.winning_amount >= ended_auction.starting_price THEN
        
        -- 낙찰 처리 (기존 로직)
        INSERT INTO auction_results (
          auction_id, 
          result_type, 
          winning_bid_id, 
          winning_user_id, 
          winning_amount,
          metadata
        ) VALUES (
          ended_auction.id, 
          'successful', 
          ended_auction.winning_bid_id, 
          ended_auction.winning_user_id, 
          ended_auction.winning_amount,
          jsonb_build_object(
            'winning_user_name', ended_auction.winning_user_name,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id
          )
        );
        
        -- 알림 발송
        -- 경매 등록자에게 알림
        IF array_length(seller_tokens, 1) > 0 THEN
          PERFORM send_auction_end_notification(
            seller_tokens,
            '경매가 종료되었습니다',
            auction_title || ' 경매가 종료되었습니다.',
            jsonb_build_object(
              'auction_id', ended_auction.id,
              'auction_title', auction_title,
              'user_type', 'seller',
              'result', 'successful'
            )
          );
          
          -- 히스토리 저장
          INSERT INTO notification_history (user_id, type, title, body, data)
          VALUES (ended_auction.seller_id, 'auction_ended', '경매가 종료되었습니다', 
                  auction_title || ' 경매가 종료되었습니다.',
                  jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
        END IF;
        
        -- 낙찰자에게 알림
        IF array_length(winner_tokens, 1) > 0 THEN
          PERFORM send_auction_end_notification(
            winner_tokens,
            '경매에 낙찰되었습니다!',
            auction_title || ' 경매에 낙찰되었습니다!',
            jsonb_build_object(
              'auction_id', ended_auction.id,
              'auction_title', auction_title,
              'user_type', 'winner',
              'result', 'successful',
              'winning_amount', ended_auction.winning_amount
            )
          );
          
          -- 히스토리 저장
          INSERT INTO notification_history (user_id, type, title, body, data)
          VALUES (ended_auction.winning_user_id, 'auction_won', '경매에 낙찰되었습니다!', 
                  auction_title || ' 경매에 낙찰되었습니다!',
                  jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
        END IF;
        
        total_successful := total_successful + 1;
        
        RAISE NOTICE '✅ 낙찰 처리: % (₩%) - 알림 발송 완료', ended_auction.title, ended_auction.winning_amount;
        
      ELSE
        -- 유찰 처리 (기존 로직)
        INSERT INTO auction_results (
          auction_id, 
          result_type,
          metadata
        ) VALUES (
          ended_auction.id, 
          'failed',
          jsonb_build_object(
            'reason', CASE 
              WHEN ended_auction.winning_amount IS NULL THEN 'no_bids'
              WHEN ended_auction.winning_amount < ended_auction.starting_price THEN 'below_starting_price'
              ELSE 'unknown'
            END,
            'highest_bid', ended_auction.winning_amount,
            'starting_price', ended_auction.starting_price,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id
          )
        );
        
        -- 경매 등록자에게 유찰 알림
        IF array_length(seller_tokens, 1) > 0 THEN
          PERFORM send_auction_end_notification(
            seller_tokens,
            '경매가 유찰되었습니다',
            auction_title || ' 경매가 유찰되었습니다.',
            jsonb_build_object(
              'auction_id', ended_auction.id,
              'auction_title', auction_title,
              'user_type', 'seller',
              'result', 'failed',
              'highest_bid', ended_auction.winning_amount
            )
          );
          
          -- 히스토리 저장
          INSERT INTO notification_history (user_id, type, title, body, data)
          VALUES (ended_auction.seller_id, 'auction_failed', '경매가 유찰되었습니다', 
                  auction_title || ' 경매가 유찰되었습니다.',
                  jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
        END IF;
        
        total_failed := total_failed + 1;
        
        RAISE NOTICE '❌ 유찰 처리: % (최고가: ₩%, 시작가: ₩%) - 알림 발송 완료', 
          ended_auction.title, 
          COALESCE(ended_auction.winning_amount, 0), 
          ended_auction.starting_price;
      END IF;
      
      -- 경매 상태를 ended로 업데이트
      UPDATE auctions 
      SET status = 'ended', updated_at = NOW()
      WHERE id = ended_auction.id;
      
    EXCEPTION WHEN OTHERS THEN
      total_errors := total_errors + 1;
      auction_error := SQLERRM;
      
      RAISE NOTICE '❌ 경매 처리 오류: % - %', ended_auction.title, auction_error;
      
      -- 오류 로그 저장
      INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
      VALUES ('auction', 'auction-end-processor', 'failed', 
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'error', auction_error,
                'timestamp', NOW()
              ));
    END;
  END LOOP;

  -- 로그 완료
  INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
  VALUES ('auction', 'auction-end-processor', 'success', 
          jsonb_build_object(
            'processed', total_processed,
            'successful', total_successful,
            'failed', total_failed,
            'errors', total_errors,
            'completed_at', NOW()
          ));

  RETURN QUERY SELECT total_processed, total_successful, total_failed, total_errors;
END;
$$ LANGUAGE plpgsql;

-- 경매 등록 시 모든 사용자에게 알림 발송 함수
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
BEGIN
  -- 현재 환경 확인
  SELECT get_current_environment() INTO current_env;
  
  -- 모든 활성 사용자의 푸시 토큰 가져오기
  SELECT array_agg(expo_push_token) INTO all_tokens
  FROM user_push_tokens 
  WHERE is_active = true;
  
  -- 토큰이 없으면 처리하지 않음
  IF all_tokens IS NULL OR array_length(all_tokens, 1) IS NULL OR array_length(all_tokens, 1) = 0 THEN
    RAISE NOTICE '📱 새 경매 알림 전송 건너뜀: 활성 토큰이 없음';
    RETURN;
  END IF;
  
  -- 알림 내용 구성
  notification_title := '새로운 경매가 등록되었습니다!';
  notification_body := auction_title || ' 경매가 새로 등록되었습니다.';
  
  RAISE NOTICE '📢 새 경매 알림 발송: % - % (토큰 수: %)', notification_title, notification_body, array_length(all_tokens, 1);
  
  -- 환경별 처리
  IF current_env = 'local' THEN
    -- 로컬 환경에서는 로그만 출력
    RAISE NOTICE '🏠 로컬 환경: 실제 새 경매 알림 전송 생략';
  ELSE
    -- 프로덕션/스테이징에서는 실제 Edge Function 호출
    BEGIN
      -- Supabase URL 가져오기
      SELECT config_value INTO supabase_url 
      FROM app_config 
      WHERE config_key = 'supabase_url' AND environment = current_env;
      
      -- URL이 없으면 기본값 사용
      IF supabase_url IS NULL THEN
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      END IF;
      
      function_url := supabase_url || '/functions/v1/send-auction-notification';
      
      RAISE NOTICE '🚀 새 경매 알림 Edge Function 호출: %', function_url;
      
      -- pg_net을 사용해서 Edge Function 호출
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT config_value 
            FROM app_config 
            WHERE config_key = 'service_role_key' AND environment = current_env
          )
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

-- 경매 등록 시 자동 알림 발송 트리거 함수
CREATE OR REPLACE FUNCTION trigger_auction_create_notification()
RETURNS TRIGGER AS $$
DECLARE
  seller_name TEXT;
  category_text TEXT;
BEGIN
  -- 판매자 이름 가져오기 (users 테이블에서)
  SELECT COALESCE(full_name, email, 'Unknown') INTO seller_name
  FROM users 
  WHERE id = NEW.user_id;
  
  -- 카테고리 텍스트 변환
  category_text := CASE NEW.auction_category
    WHEN 'scrap' THEN '고철'
    WHEN 'machinery' THEN '중고기계'
    WHEN 'materials' THEN '중고자재'
    WHEN 'demolition' THEN '철거'
    ELSE NEW.auction_category::text
  END;
  
  -- 새 경매 알림 발송 (비동기)
  PERFORM send_auction_create_notification(
    NEW.id,
    NEW.title,
    category_text,
    COALESCE(seller_name, 'Unknown')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 경매 테이블에 트리거 생성
DROP TRIGGER IF EXISTS trigger_new_auction_notification ON auctions;
CREATE TRIGGER trigger_new_auction_notification
  AFTER INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auction_create_notification();

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION send_auction_end_notification(TEXT[], TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION send_auction_create_notification(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_ended_auctions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trigger_auction_create_notification() TO anon, authenticated;

-- 함수 설명 추가
COMMENT ON FUNCTION send_auction_end_notification IS '경매 종료 시 실시간 알림 발송 함수';
COMMENT ON FUNCTION send_auction_create_notification IS '새 경매 등록 시 모든 사용자에게 알림 발송 함수';
COMMENT ON FUNCTION trigger_auction_create_notification IS '경매 등록 시 자동 알림 발송 트리거 함수';
COMMENT ON FUNCTION process_ended_auctions IS '종료된 경매들의 낙찰/유찰 처리 및 알림 발송 - 매분 실행'; 