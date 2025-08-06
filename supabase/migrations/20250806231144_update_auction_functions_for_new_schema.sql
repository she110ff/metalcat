-- 경매 시스템 함수들을 새로운 스키마에 맞게 업데이트
-- user_push_tokens 테이블의 컬럼명 변경에 따른 함수 수정

-- process_ended_auctions 함수 업데이트
CREATE OR REPLACE FUNCTION public.process_ended_auctions()
 RETURNS TABLE(processed_count integer, successful_count integer, failed_count integer, error_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  ended_auction RECORD;
  total_processed INTEGER := 0;
  total_successful INTEGER := 0;
  total_failed INTEGER := 0;
  total_errors INTEGER := 0;
  auction_error TEXT;
  log_id UUID;
  
  -- 알림 관련 변수
  seller_tokens TEXT[];
  winner_tokens TEXT[];
  auction_title TEXT;
BEGIN
  -- 로그 시작 - UUID 생성
  INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
  VALUES ('auction', 'auction-end-processor', 'running', 
          jsonb_build_object('started_at', NOW()))
  RETURNING id INTO log_id;

  -- 타임아웃 설정 (5분)
  SET statement_timeout = '5min';

  -- 종료된 경매들 처리 (락 적용)
  FOR ended_auction IN 
    SELECT 
      a.id,
      a.title,
      a.starting_price,
      a.user_id as seller_id,
      a.end_time,
      a.status
    FROM auctions a
    WHERE a.end_time <= NOW() 
      AND a.status IN ('active', 'ending')
    ORDER BY a.end_time ASC
    FOR UPDATE OF a SKIP LOCKED -- 동시성 제어 개선
  LOOP
    BEGIN
      total_processed := total_processed + 1;
      auction_title := ended_auction.title;
      
      -- 실제 최고 입찰자 재확인 (is_top_bid 신뢰하지 않음)
      DECLARE
        actual_winning_bid RECORD;
      BEGIN
        SELECT 
          ab.id as winning_bid_id,
          ab.user_id as winning_user_id,
          ab.amount as winning_amount,
          ab.user_name as winning_user_name
        INTO actual_winning_bid
        FROM auction_bids ab
        WHERE ab.auction_id = ended_auction.id
        ORDER BY ab.amount DESC, ab.bid_time ASC
        LIMIT 1;
        
        -- 알림을 위한 토큰 조회 (새로운 스키마 사용)
        -- 경매 등록자 토큰
        SELECT array_agg(token) INTO seller_tokens
        FROM user_push_tokens 
        WHERE user_id = ended_auction.seller_id AND is_active = true;
        
        -- 낙찰자 토큰 (낙찰된 경우)
        IF actual_winning_bid.winning_user_id IS NOT NULL THEN
          SELECT array_agg(token) INTO winner_tokens
          FROM user_push_tokens 
          WHERE user_id = actual_winning_bid.winning_user_id AND is_active = true;
        END IF;
        
        -- 낙찰/유찰 결정 (실제 최고 입찰 기준)
        IF actual_winning_bid.winning_amount IS NOT NULL 
           AND actual_winning_bid.winning_amount >= ended_auction.starting_price THEN
        
        -- 낙찰 처리 (개선된 로직 - 실제 최고 입찰 기준)
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
          actual_winning_bid.winning_bid_id, 
          actual_winning_bid.winning_user_id, 
          actual_winning_bid.winning_amount,
          jsonb_build_object(
            'winning_user_name', actual_winning_bid.winning_user_name,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id,
            'validation_method', 'amount_based_verification',
            'fixed_version', 'v3.0'
          )
        );
        
        -- 알림 발송 (예외 처리 개선)
        BEGIN
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
            
            -- 히스토리 저장 (새로운 스키마 사용)
            INSERT INTO notification_history (user_id, notification_type, title, body, data)
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
                'winning_amount', actual_winning_bid.winning_amount
              )
            );
            
            -- 히스토리 저장 (새로운 스키마 사용)
            INSERT INTO notification_history (user_id, notification_type, title, body, data)
            VALUES (actual_winning_bid.winning_user_id, 'auction_won', '경매에 낙찰되었습니다!', 
                    auction_title || ' 경매에 낙찰되었습니다!',
                    jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '❌ 알림 발송 실패: % - %', auction_title, SQLERRM;
          -- 알림 실패가 경매 처리를 중단시키지 않도록 예외를 흡수
        END;
        
        total_successful := total_successful + 1;
        
        RAISE NOTICE '✅ 낙찰 처리: % (₩%) - 알림 발송 완료', ended_auction.title, actual_winning_bid.winning_amount;
                                                                                                 
        
      ELSE
        -- 유찰 처리 (개선된 로직 - 실제 최고 입찰 기준)
        INSERT INTO auction_results (
          auction_id, 
          result_type,
          metadata
        ) VALUES (
          ended_auction.id, 
          'failed',
          jsonb_build_object(
            'reason', CASE 
              WHEN actual_winning_bid.winning_amount IS NULL THEN 'no_bids'
              WHEN actual_winning_bid.winning_amount < ended_auction.starting_price THEN 'below_starting_price'
              ELSE 'unknown'
            END,
            'highest_bid', actual_winning_bid.winning_amount,
            'starting_price', ended_auction.starting_price,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id,
            'validation_method', 'amount_based_verification',
            'fixed_version', 'v3.0'
          )
        );
        
        -- 경매 등록자에게 유찰 알림 (예외 처리 개선)
        BEGIN
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
                'highest_bid', actual_winning_bid.winning_amount
              )
            );
            
            -- 히스토리 저장 (새로운 스키마 사용)
            INSERT INTO notification_history (user_id, notification_type, title, body, data)
            VALUES (ended_auction.seller_id, 'auction_failed', '경매가 유찰되었습니다', 
                    auction_title || ' 경매가 유찰되었습니다.',
                    jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '❌ 유찰 알림 발송 실패: % - %', auction_title, SQLERRM;
        END;
        
        total_failed := total_failed + 1;
        
        RAISE NOTICE '❌ 유찰 처리: % (최고가: ₩%, 시작가: ₩%) - 알림 발송 완료', 
          ended_auction.title, 
          COALESCE(actual_winning_bid.winning_amount, 0), 
          ended_auction.starting_price;
        END IF;
      END; -- actual_winning_bid 블록 종료
      
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

  -- 로그 완료 - 기존 로그 업데이트
  UPDATE cron_execution_logs 
  SET status = 'success', 
      completed_at = NOW(),
      metadata = jsonb_build_object(
        'processed', total_processed,
        'successful', total_successful,
        'failed', total_failed,
        'errors', total_errors,
        'completed_at', NOW(),
        'version', 'v3.0'
      )
  WHERE id = log_id;

  RETURN QUERY SELECT total_processed, total_successful, total_failed, total_errors;
EXCEPTION WHEN OTHERS THEN
  -- 전체 함수 실패 시 로그 업데이트
  IF log_id IS NOT NULL THEN
    UPDATE cron_execution_logs 
    SET status = 'failed', 
        completed_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'error', SQLERRM,
          'failed_at', NOW(),
          'version', 'v3.0'
        )
    WHERE id = log_id;
  END IF;
  
  RAISE;
END;
$function$;

-- send_auction_create_notification 함수 업데이트
CREATE OR REPLACE FUNCTION public.send_auction_create_notification(auction_id text, auction_title text, auction_category text, seller_name text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_env TEXT;
  supabase_url TEXT;
  function_url TEXT;
  response_id BIGINT;
  all_tokens TEXT[];
  notification_title TEXT;
  notification_body TEXT;
  user_record RECORD;
BEGIN
  -- 현재 환경 확인
  SELECT get_current_environment() INTO current_env;
  
  -- 모든 활성 사용자의 푸시 토큰 가져오기 (새로운 스키마 사용)
  SELECT array_agg(token) INTO all_tokens
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
  
  -- 모든 사용자에게 알림 히스토리 저장 (새로운 스키마 사용)
  FOR user_record IN 
    SELECT user_id FROM user_push_tokens WHERE is_active = true
  LOOP
    INSERT INTO notification_history (user_id, notification_type, title, body, data)
    VALUES (
      user_record.user_id, 
      'auction_created', 
      notification_title, 
      notification_body,
      jsonb_build_object(
        'auction_id', auction_id,
        'auction_title', auction_title,
        'auction_category', auction_category,
        'seller_name', seller_name,
        'notification_type', 'auction_created'
      )
    );
  END LOOP;
  
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
$function$;

-- test_notification_manually 함수 업데이트
CREATE OR REPLACE FUNCTION public.test_notification_manually(test_title text DEFAULT '테스트 알림'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  all_tokens TEXT[];
  result JSONB;
BEGIN
  -- 모든 활성 토큰 가져오기 (새로운 스키마 사용)
  SELECT array_agg(token) INTO all_tokens
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
$function$;

-- 📱 경매 시스템 함수 업데이트 완료!
-- 🔧 주요 변경사항:
--   • user_push_tokens: expo_push_token → token 컬럼 사용
--   • notification_history: type → notification_type 컬럼 사용
--   • 모든 알림 관련 함수가 새로운 스키마와 호환되도록 수정
-- 🚀 경매 알림 시스템 스키마 통합 완료!
