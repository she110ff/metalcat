-- 경매 등록 성능 최적화: 알림 트리거 비동기화
-- 작성일: 2025-01-08
-- 목적: 경매 등록 시 알림 발송을 비동기로 처리하여 등록 시간 단축

-- ============================================
-- 1. 기존 동기 트리거 제거
-- ============================================

-- 기존 트리거 제거
DROP TRIGGER IF EXISTS trigger_new_auction_notification ON auctions;

-- ============================================
-- 2. 비동기 알림 처리를 위한 대기열 테이블 생성
-- ============================================

-- 알림 대기열 테이블 생성
CREATE TABLE IF NOT EXISTS auction_notification_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id text NOT NULL,
    auction_title text NOT NULL,
    auction_category text NOT NULL,
    seller_name text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count integer DEFAULT 0,
    error_message text,
    created_at timestamptz DEFAULT NOW(),
    processed_at timestamptz,
    
    -- 인덱스
    UNIQUE(auction_id)
);

-- 대기열 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_auction_notification_queue_status 
ON auction_notification_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_auction_notification_queue_retry 
ON auction_notification_queue(retry_count, created_at) 
WHERE status = 'failed';

-- ============================================
-- 3. 경량화된 동기 트리거 함수 (빠른 INSERT만)
-- ============================================

CREATE OR REPLACE FUNCTION trigger_auction_notification_queue()
RETURNS TRIGGER AS $$
DECLARE
  seller_name TEXT;
  category_text TEXT;
BEGIN
  -- 판매자 이름 가져오기 (간단한 조회만)
  SELECT COALESCE(name, phone_number, 'Unknown') INTO seller_name
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
  
  -- 대기열에 알림 작업 추가 (매우 빠른 INSERT)
  INSERT INTO auction_notification_queue (
    auction_id,
    auction_title,
    auction_category,
    seller_name,
    status
  ) VALUES (
    NEW.id,
    NEW.title,
    category_text,
    COALESCE(seller_name, 'Unknown'),
    'pending'
  ) ON CONFLICT (auction_id) DO NOTHING; -- 중복 방지
  
  RAISE NOTICE '📋 경매 알림이 대기열에 추가됨: % (ID: %)', NEW.title, NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. 새로운 경량화된 트리거 생성
-- ============================================

CREATE TRIGGER trigger_auction_notification_queue
  AFTER INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auction_notification_queue();

-- ============================================
-- 5. 대기열 처리 함수 (비동기 실행용)
-- ============================================

CREATE OR REPLACE FUNCTION process_auction_notification_queue()
RETURNS TABLE (
    processed_count integer,
    success_count integer,
    failed_count integer,
    error_count integer
) AS $$
DECLARE
    queue_item RECORD;
    total_processed integer := 0;
    total_success integer := 0;
    total_failed integer := 0;
    total_errors integer := 0;
    processing_error text;
BEGIN
    RAISE NOTICE '🔄 경매 알림 대기열 처리 시작';
    
    -- 대기 중인 항목들을 처리 (최대 20개씩)
    FOR queue_item IN 
        SELECT id, auction_id, auction_title, auction_category, seller_name, retry_count
        FROM auction_notification_queue 
        WHERE status = 'pending' OR (status = 'failed' AND retry_count < 3)
        ORDER BY created_at ASC
        LIMIT 20
    LOOP
        BEGIN
            total_processed := total_processed + 1;
            
            -- 처리 중 상태로 변경
            UPDATE auction_notification_queue 
            SET status = 'processing', processed_at = NOW()
            WHERE id = queue_item.id;
            
            -- 실제 알림 발송 함수 호출
            PERFORM send_auction_create_notification(
                queue_item.auction_id,
                queue_item.auction_title, 
                queue_item.auction_category,
                queue_item.seller_name
            );
            
            -- 성공 시 완료 상태로 변경
            UPDATE auction_notification_queue 
            SET status = 'completed', processed_at = NOW()
            WHERE id = queue_item.id;
            
            total_success := total_success + 1;
            
            RAISE NOTICE '✅ 경매 알림 처리 성공: %', queue_item.auction_title;
            
        EXCEPTION WHEN OTHERS THEN
            total_errors := total_errors + 1;
            processing_error := SQLERRM;
            
            -- 실패 시 재시도 카운트 증가
            UPDATE auction_notification_queue 
            SET status = CASE 
                    WHEN queue_item.retry_count >= 2 THEN 'failed'
                    ELSE 'pending'
                END,
                retry_count = queue_item.retry_count + 1,
                error_message = processing_error,
                processed_at = NOW()
            WHERE id = queue_item.id;
            
            IF queue_item.retry_count >= 2 THEN
                total_failed := total_failed + 1;
                RAISE WARNING '❌ 경매 알림 최종 실패: % - %', queue_item.auction_title, processing_error;
            ELSE
                RAISE WARNING '⚠️ 경매 알림 재시도 예정: % - %', queue_item.auction_title, processing_error;
            END IF;
        END;
    END LOOP;
    
    -- 완료된 항목들 정리 (7일 이상 된 것)
    DELETE FROM auction_notification_queue 
    WHERE status = 'completed' 
    AND processed_at < NOW() - INTERVAL '7 days';
    
    RAISE NOTICE '🔄 경매 알림 대기열 처리 완료: 처리 %개, 성공 %개, 실패 %개, 오류 %개', 
                 total_processed, total_success, total_failed, total_errors;
    
    RETURN QUERY SELECT total_processed, total_success, total_failed, total_errors;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. 권한 설정
-- ============================================

-- 테이블 권한
GRANT SELECT, INSERT, UPDATE, DELETE ON auction_notification_queue TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON auction_notification_queue TO service_role;

-- 함수 권한
GRANT EXECUTE ON FUNCTION trigger_auction_notification_queue() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION process_auction_notification_queue() TO authenticated, anon, service_role;

-- ============================================
-- 7. 크론 작업 생성 (1분마다 대기열 처리)
-- ============================================

-- 기존 알림 처리 크론이 있으면 제거 (안전한 방식)
DO $$
BEGIN
    -- 기존 크론 작업이 존재하는지 확인 후 제거
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auction-notification-processor') THEN
        PERFORM cron.unschedule('auction-notification-processor');
        RAISE NOTICE '기존 auction-notification-processor 크론 작업 제거됨';
    END IF;
END $$;

-- 새로운 크론 작업 생성
SELECT cron.schedule(
    'auction-notification-processor',
    '*/1 * * * *', -- 1분마다 실행
    'SELECT process_auction_notification_queue();'
);

-- ============================================
-- 8. 로깅 및 알림
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🚀 경매 알림 시스템 비동기화 완료!';
    RAISE NOTICE '   ✅ 기존 동기 트리거 제거됨';
    RAISE NOTICE '   ✅ 알림 대기열 시스템 구축됨';
    RAISE NOTICE '   ✅ 경량화된 트리거 적용됨 (빠른 INSERT만)';
    RAISE NOTICE '   ✅ 1분마다 대기열 처리 크론 작업 시작됨';
    RAISE NOTICE '   📈 예상 성능 개선: 경매 등록 시간 ~30초 단축';
END $$;
