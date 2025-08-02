-- 알림 시스템 통합 마이그레이션
-- 20250201100006_notification_system_integration.sql

-- 실시간 알림 발송 함수
CREATE OR REPLACE FUNCTION send_auction_end_notification(
  tokens TEXT[],
  title TEXT,
  body TEXT,
  data JSONB
) RETURNS void AS $$
BEGIN
  -- 로컬 개발 환경에서는 로그만 출력
  RAISE NOTICE '📱 알림 발송: % - % (토큰 수: %)', title, body, array_length(tokens, 1);
  
  -- 프로덕션에서는 Edge Function 호출
  -- PERFORM net.http_post(
  --   url := 'https://your-project.supabase.co/functions/v1/send-auction-notification',
  --   headers := jsonb_build_object('Content-Type', 'application/json'),
  --   body := jsonb_build_object('tokens', tokens, 'title', title, 'body', body, 'data', data)
  -- );
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
      VALUES ('auction', 'auction-end-processor', 'error', 
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'error', auction_error,
                'timestamp', NOW()
              ));
    END;
  END LOOP;

  -- 로그 완료
  INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
  VALUES ('auction', 'auction-end-processor', 'completed', 
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

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION send_auction_end_notification(TEXT[], TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_ended_auctions() TO anon, authenticated;

-- 함수 설명 추가
COMMENT ON FUNCTION send_auction_end_notification IS '경매 종료 시 실시간 알림 발송 함수';
COMMENT ON FUNCTION process_ended_auctions IS '종료된 경매들의 낙찰/유찰 처리 및 알림 발송 - 매분 실행'; 