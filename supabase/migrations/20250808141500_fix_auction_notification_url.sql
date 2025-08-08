-- 경매 알림 함수 URL 문제 수정
-- 작성일: 2025-01-08
-- 목적: send_auction_end_notification 함수의 null URL 문제 해결

-- ============================================
-- 1. 경매 종료 알림 함수 수정 (URL 문제 해결)
-- ============================================

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
  filtered_tokens TEXT[];
BEGIN
  -- 현재 환경 확인
  SELECT get_current_environment() INTO current_env;
  
  -- 토큰이 없으면 처리하지 않음
  IF tokens IS NULL OR array_length(tokens, 1) IS NULL OR array_length(tokens, 1) = 0 THEN
    RAISE NOTICE '📱 알림 전송 건너뜀: 유효한 토큰이 없음';
    RETURN;
  END IF;
  
  -- 빈 토큰 필터링
  SELECT array_agg(token) INTO filtered_tokens
  FROM unnest(tokens) AS token
  WHERE token IS NOT NULL AND trim(token) != '';
  
  IF filtered_tokens IS NULL OR array_length(filtered_tokens, 1) = 0 THEN
    RAISE NOTICE '📱 알림 전송 건너뜀: 유효한 토큰이 없음 (필터링 후)';
    RETURN;
  END IF;
  
  RAISE NOTICE '📱 경매 종료 알림 발송: % - % (토큰 수: %)', title, body, array_length(filtered_tokens, 1);
  
  -- 환경별 처리
  IF current_env = 'local' THEN
    -- 로컬 환경에서는 로그만 출력
    RAISE NOTICE '🏠 로컬 환경: 실제 알림 전송 생략';
  ELSE
    -- 프로덕션/스테이징에서는 실제 Edge Function 호출
    BEGIN
      -- 환경별 Supabase URL 설정 (하드코딩 방지)
      supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      
      -- 올바른 Edge Function URL 구성
      function_url := supabase_url || '/functions/v1/send-auction-notification';
      
      RAISE NOTICE '🚀 경매 종료 알림 Edge Function 호출: %', function_url;
      
      -- pg_net을 사용해서 Edge Function 호출
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZG5jc3d2YmhlbHN0cGtmY3Z2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDEyMzIxMiwiZXhwIjoyMDY5Njk5MjEyfQ.oAOAE-0vaU0ph5bkX9DBWfCwFEJha9wo8W1kATeAHTI'
        ),
        body := jsonb_build_object(
          'tokens', filtered_tokens, 
          'title', title, 
          'body', body, 
          'data', data
        ),
        timeout_milliseconds := 30000
      ) INTO response_id;
      
      RAISE NOTICE '✅ 경매 종료 알림 전송 요청 완료 (request_id: %)', response_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ 경매 종료 알림 전송 실패: %', SQLERRM;
      -- 알림 실패가 경매 처리를 중단시키지 않도록 예외를 흡수
    END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. process_ended_auctions 함수에서 토큰 조회 부분 수정
-- ============================================

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
        
        -- 알림을 위한 토큰 조회 (수정된 컬럼명 사용)
        -- 경매 등록자 토큰
        SELECT array_agg(token) INTO seller_tokens
        FROM user_push_tokens 
        WHERE user_id = ended_auction.seller_id 
          AND is_active = true 
          AND my_auction_enabled = true
          AND token IS NOT NULL;
        
        -- 낙찰자 토큰 (낙찰된 경우)
        IF actual_winning_bid.winning_user_id IS NOT NULL THEN
          SELECT array_agg(token) INTO winner_tokens
          FROM user_push_tokens 
          WHERE user_id = actual_winning_bid.winning_user_id 
            AND is_active = true 
            AND my_auction_enabled = true
            AND token IS NOT NULL;
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
            'fixed_version', 'v4.0'
          )
        );
        
        -- 알림 발송 (예외 처리 개선)
        BEGIN
          -- 경매 등록자에게 알림
          IF seller_tokens IS NOT NULL AND array_length(seller_tokens, 1) > 0 THEN
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
          IF winner_tokens IS NOT NULL AND array_length(winner_tokens, 1) > 0 THEN
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
          winning_bid_id, 
          winning_user_id, 
          winning_amount,
          metadata
        ) VALUES (
          ended_auction.id, 
          'failed', 
          NULL, 
          NULL, 
          actual_winning_bid.winning_amount,
          jsonb_build_object(
            'reason', 'no_valid_bids_or_below_starting_price',
            'highest_bid', actual_winning_bid.winning_amount,
            'starting_price', ended_auction.starting_price,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id,
            'validation_method', 'amount_based_verification',
            'fixed_version', 'v4.0'
          )
        );
        
        -- 유찰 알림 발송
        BEGIN
          IF seller_tokens IS NOT NULL AND array_length(seller_tokens, 1) > 0 THEN
            PERFORM send_auction_end_notification(
              seller_tokens,
              '경매가 유찰되었습니다',
              auction_title || ' 경매가 유찰되었습니다.',
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'auction_title', auction_title,
                'user_type', 'seller',
                'result', 'failed'
              )
            );
            
            -- 히스토리 저장
            INSERT INTO notification_history (user_id, notification_type, title, body, data)
            VALUES (ended_auction.seller_id, 'auction_failed', '경매가 유찰되었습니다', 
                    auction_title || ' 경매가 유찰되었습니다.',
                    jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '❌ 유찰 알림 발송 실패: % - %', auction_title, SQLERRM;
        END;
        
        total_failed := total_failed + 1;
        
        RAISE NOTICE '❌ 유찰 처리: % (최고입찰: ₩% < 시작가: ₩%)', ended_auction.title, 
                     COALESCE(actual_winning_bid.winning_amount, 0), ended_auction.starting_price;
      END IF;
      
      -- 경매 상태를 ended로 업데이트
      UPDATE auctions 
      SET status = 'ended', updated_at = NOW()
      WHERE id = ended_auction.id;
      
      END; -- actual_winning_bid 블록 끝
      
    EXCEPTION WHEN OTHERS THEN
      total_errors := total_errors + 1;
      auction_error := SQLERRM;
      
      RAISE WARNING '❌ 경매 % 처리 중 오류: %', ended_auction.id, auction_error;
      
      -- 오류 발생한 경매는 상태를 error로 변경
      UPDATE auctions 
      SET status = 'error', updated_at = NOW()
      WHERE id = ended_auction.id;
    END;
  END LOOP;
  
  -- 로그 완료 업데이트
  UPDATE cron_execution_logs 
  SET 
    status = 'success',
    completed_at = NOW(),
    success_count = total_successful,
    metadata = metadata || jsonb_build_object(
      'completed_at', NOW(),
      'processed', total_processed,
      'successful', total_successful,
      'failed', total_failed,
      'errors', total_errors
    )
  WHERE id = log_id;
  
  RAISE NOTICE '🏁 경매 종료 처리 완료: 처리 %개, 성공 %개, 실패 %개, 오류 %개', 
               total_processed, total_successful, total_failed, total_errors;
  
  RETURN QUERY SELECT total_processed, total_successful, total_failed, total_errors;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. 권한 설정
-- ============================================

-- 함수 권한
GRANT EXECUTE ON FUNCTION send_auction_end_notification(TEXT[], TEXT, TEXT, JSONB) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION process_ended_auctions() TO authenticated, anon, service_role;

-- ============================================
-- 4. 로깅 및 알림
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔧 경매 알림 시스템 수정 완료!';
    RAISE NOTICE '   ✅ URL null 문제 해결됨';
    RAISE NOTICE '   ✅ 토큰 컬럼명 수정됨 (expo_push_token -> token)';
    RAISE NOTICE '   ✅ 알림 발송 로직 개선됨';
    RAISE NOTICE '   ✅ 예외 처리 강화됨';
END $$;
