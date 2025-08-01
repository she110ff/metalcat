-- ============================================
-- 경매 종료 처리 및 크론 시스템 구축
-- 작성일: 2025-02-01
-- 목적: 자동 경매 종료 처리 및 낙찰/유찰 결정
-- ============================================

-- 1. 경매 종료 처리 메인 함수
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
      
      -- 낙찰/유찰 결정
      IF ended_auction.winning_amount IS NOT NULL 
         AND ended_auction.winning_amount >= ended_auction.starting_price THEN
        
        -- 낙찰 처리
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
        
        total_successful := total_successful + 1;
        
        RAISE NOTICE '✅ 낙찰 처리: % (₩%)', ended_auction.title, ended_auction.winning_amount;
        
      ELSE
        -- 유찰 처리
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
        
        total_failed := total_failed + 1;
        
        RAISE NOTICE '❌ 유찰 처리: % (최고가: ₩%, 시작가: ₩%)', 
          ended_auction.title, 
          COALESCE(ended_auction.winning_amount, 0), 
          ended_auction.starting_price;
      END IF;
      
      -- 경매 상태 업데이트
      UPDATE auctions 
      SET 
        status = 'ended',
        updated_at = NOW()
      WHERE id = ended_auction.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- 개별 경매 처리 오류 로깅
        total_errors := total_errors + 1;
        auction_error := SQLERRM;
        
        RAISE WARNING '⚠️ 경매 처리 오류 [%]: %', ended_auction.id, auction_error;
        
        -- 오류 로그 저장
        INSERT INTO cron_execution_logs (job_type, job_name, status, error_message, metadata)
        VALUES ('auction', 'auction-end-processor-error', 'failed', auction_error,
                jsonb_build_object(
                  'auction_id', ended_auction.id,
                  'auction_title', ended_auction.title,
                  'error_time', NOW()
                ));
    END;
  END LOOP;

  -- 성공 로그 기록
  UPDATE cron_execution_logs 
  SET 
    status = 'success',
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    success_count = total_processed,
    metadata = metadata || jsonb_build_object(
      'processed_count', total_processed,
      'successful_count', total_successful,
      'failed_count', total_failed,
      'error_count', total_errors,
      'completed_at', NOW()
    )
  WHERE job_type = 'auction' 
    AND job_name = 'auction-end-processor' 
    AND status = 'running'
    AND started_at = (
      SELECT MAX(started_at) 
      FROM cron_execution_logs 
      WHERE job_type = 'auction' AND job_name = 'auction-end-processor'
    );

  -- 결과 반환
  RETURN QUERY SELECT total_processed, total_successful, total_failed, total_errors;
  
  RAISE NOTICE '🏁 경매 종료 처리 완료: 처리(%)/낙찰(%)/유찰(%)/오류(%)', 
    total_processed, total_successful, total_failed, total_errors;

EXCEPTION
  WHEN OTHERS THEN
    -- 전체 함수 실행 오류
    INSERT INTO cron_execution_logs (job_type, job_name, status, error_message, metadata)
    VALUES ('auction', 'auction-end-processor', 'failed', SQLERRM,
            jsonb_build_object(
              'total_processed', total_processed,
              'error_time', NOW(),
              'function_error', true
            ));
    
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 경매 상태 실시간 업데이트 함수 (ending 상태 관리)
CREATE OR REPLACE FUNCTION update_auction_status_realtime()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- ending 상태로 변경 (종료 1시간 전)
  UPDATE auctions 
  SET 
    status = 'ending',
    updated_at = NOW()
  WHERE 
    end_time <= NOW() + INTERVAL '1 hour' 
    AND end_time > NOW()
    AND status = 'active';
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE '⏰ % 개 경매가 ending 상태로 변경됨', updated_count;
  END IF;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 결제 기한 관리 함수
CREATE OR REPLACE FUNCTION process_payment_deadlines()
RETURNS TABLE(
  overdue_count INTEGER,
  warning_count INTEGER
) AS $$
DECLARE
  total_overdue INTEGER := 0;
  total_warnings INTEGER := 0;
BEGIN
  -- 결제 기한 초과된 거래 처리
  UPDATE auction_transactions 
  SET 
    transaction_status = 'failed',
    updated_at = NOW(),
    notes = COALESCE(notes, '') || '[' || NOW() || '] 결제 기한 초과로 자동 취소됨. '
  FROM auction_results ar
  WHERE 
    auction_transactions.auction_result_id = ar.id
    AND auction_transactions.transaction_status = 'pending'
    AND ar.payment_deadline < NOW();
    
  GET DIAGNOSTICS total_overdue = ROW_COUNT;
  
  -- 결제 기한 24시간 전 경고 대상 카운트 (실제 알림은 향후 구현)
  SELECT COUNT(*) INTO total_warnings
  FROM auction_transactions at
  JOIN auction_results ar ON at.auction_result_id = ar.id
  WHERE 
    at.transaction_status = 'pending'
    AND ar.payment_deadline BETWEEN NOW() AND NOW() + INTERVAL '24 hours';
  
  -- 로그 기록
  INSERT INTO cron_execution_logs (job_type, job_name, status, success_count, metadata)
  VALUES ('auction', 'payment-deadline-checker', 'success', total_overdue,
          jsonb_build_object(
            'overdue_processed', total_overdue,
            'warnings_pending', total_warnings,
            'processed_at', NOW()
          ));
  
  RETURN QUERY SELECT total_overdue, total_warnings;
  
  IF total_overdue > 0 THEN
    RAISE NOTICE '💳 결제 기한 초과 처리: % 건', total_overdue;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 통계 조회 함수
CREATE OR REPLACE FUNCTION get_auction_processing_stats()
RETURNS TABLE(
  today_processed INTEGER,
  today_successful INTEGER,
  today_failed INTEGER,
  this_week_processed INTEGER,
  success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH today_stats AS (
    SELECT 
      COUNT(*) as processed,
      COUNT(*) FILTER (WHERE result_type = 'successful') as successful,
      COUNT(*) FILTER (WHERE result_type = 'failed') as failed
    FROM auction_results
    WHERE DATE(processed_at) = CURRENT_DATE
  ),
  week_stats AS (
    SELECT COUNT(*) as processed
    FROM auction_results
    WHERE processed_at >= DATE_TRUNC('week', NOW())
  ),
  overall_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND(COUNT(*) FILTER (WHERE result_type = 'successful') * 100.0 / COUNT(*), 2)
        ELSE 0
      END as rate
    FROM auction_results
    WHERE processed_at >= NOW() - INTERVAL '30 days'
  )
  SELECT 
    ts.processed::INTEGER,
    ts.successful::INTEGER, 
    ts.failed::INTEGER,
    ws.processed::INTEGER,
    os.rate
  FROM today_stats ts, week_stats ws, overall_stats os;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 크론 작업 스케줄 설정
DO $$
BEGIN
  -- 기존 경매 관련 크론 작업 제거 (존재하는 경우에만)
  BEGIN
    PERFORM cron.unschedule('auction-end-processor');
  EXCEPTION WHEN OTHERS THEN
    -- 작업이 없으면 무시
    NULL;
  END;
  
  BEGIN
    PERFORM cron.unschedule('auction-status-updater');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    PERFORM cron.unschedule('payment-deadline-checker');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- 새로운 크론 작업 등록
  
  -- 매분마다 경매 종료 처리
  PERFORM cron.schedule(
    'auction-end-processor',
    '* * * * *',
    'SELECT process_ended_auctions();'
  );
  
  -- 매 5분마다 경매 상태 업데이트 (ending 상태 전환)
  PERFORM cron.schedule(
    'auction-status-updater', 
    '*/5 * * * *',
    'SELECT update_auction_status_realtime();'
  );
  
  -- 매시간마다 결제 기한 체크
  PERFORM cron.schedule(
    'payment-deadline-checker',
    '0 * * * *', 
    'SELECT process_payment_deadlines();'
  );
  
  RAISE NOTICE '⏰ 크론 작업 스케줄 설정 완료';
  RAISE NOTICE '   • auction-end-processor: 매분 실행';
  RAISE NOTICE '   • auction-status-updater: 5분마다 실행';
  RAISE NOTICE '   • payment-deadline-checker: 매시간 실행';
END
$$;

-- 6. 권한 설정 (API에서 호출 가능하도록)
GRANT EXECUTE ON FUNCTION process_ended_auctions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_auction_status_realtime() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auction_processing_stats() TO anon, authenticated;

-- 7. 문서화
COMMENT ON FUNCTION process_ended_auctions() IS '종료된 경매들의 낙찰/유찰 처리 - 매분 실행';
COMMENT ON FUNCTION update_auction_status_realtime() IS '경매 상태 실시간 업데이트 (ending 전환) - 5분마다 실행';
COMMENT ON FUNCTION process_payment_deadlines() IS '결제 기한 관리 및 초과 처리 - 매시간 실행';
COMMENT ON FUNCTION get_auction_processing_stats() IS '경매 처리 통계 조회 함수';

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🎉 경매 처리 시스템 구축 완료!';
  RAISE NOTICE '🔧 생성된 함수: process_ended_auctions, update_auction_status_realtime, process_payment_deadlines';
  RAISE NOTICE '⏰ 크론 스케줄: 매분/5분/매시간 자동 실행';
  RAISE NOTICE '📊 통계 함수: get_auction_processing_stats';
END
$$;