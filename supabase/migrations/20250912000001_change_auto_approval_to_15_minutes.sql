-- ============================================
-- 자동 승인 시간을 30분에서 15분으로 변경
-- 생성일: 2025-09-12
-- 목적: 경매 등록 후 15분 후 자동 승인되도록 시스템 수정
-- ============================================

-- ============================================
-- 1. 자동 승인 처리 함수 수정 (30분 → 15분)
-- ============================================

CREATE OR REPLACE FUNCTION process_auto_approval_queue()
RETURNS TABLE (
    processed_count integer,
    approved_count integer
) AS $$
DECLARE
  auction_record RECORD;
  total_processed integer := 0;
  total_approved integer := 0;
BEGIN
  RAISE NOTICE '🔄 자동 승인 처리 시작';
  
  -- 15분 이상 대기 중인 경매들 처리 (30분에서 15분으로 변경)
  FOR auction_record IN 
    SELECT id, title, user_id, auction_category
    FROM auctions 
    WHERE approval_status = 'pending_approval'
    AND created_at <= NOW() - INTERVAL '15 minutes'
  LOOP
    total_processed := total_processed + 1;
    
    -- 경매 상태를 approved로 변경
    UPDATE auctions 
    SET 
      approval_status = 'approved',
      approved_at = NOW(),
      updated_at = NOW()
    WHERE id = auction_record.id;
    
    -- 승인 히스토리 기록 (메시지 수정)
    INSERT INTO auction_approval_history (
      auction_id, action, reason, created_at
    ) VALUES (
      auction_record.id, 'auto_approved', '15분 자동 승인', NOW()
    );
    
    -- 일반 사용자 알림 큐에 추가
    INSERT INTO auction_notification_queue (
      auction_id,
      auction_title,
      auction_category,
      seller_name,
      status
    ) VALUES (
      auction_record.id,
      auction_record.title,
      CASE auction_record.auction_category
        WHEN 'scrap' THEN '고철'
        WHEN 'machinery' THEN '중고기계'
        WHEN 'materials' THEN '중고자재'
        WHEN 'demolition' THEN '철거'
        ELSE auction_record.auction_category::text
      END,
      (SELECT COALESCE(name, phone_number, 'Unknown') FROM users WHERE id = auction_record.user_id),
      'pending'
    ) ON CONFLICT (auction_id) DO NOTHING; -- 중복 방지
    
    total_approved := total_approved + 1;
    RAISE NOTICE '✅ 자동 승인 완료: % (ID: %)', auction_record.title, auction_record.id;
  END LOOP;
  
  RAISE NOTICE '🎯 자동 승인 처리 완료: 처리 %개, 승인 %개', total_processed, total_approved;
  
  RETURN QUERY SELECT total_processed, total_approved;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. 승인 통계 함수 수정 (임박 알림 기준 25분 → 10분)
-- ============================================

CREATE OR REPLACE FUNCTION get_approval_stats()
RETURNS TABLE (
  total_pending INTEGER,
  auto_approval_soon INTEGER,
  today_approved INTEGER,
  today_hidden INTEGER,
  today_rejected INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM auctions WHERE approval_status = 'pending_approval'),
    (SELECT COUNT(*)::INTEGER FROM auctions WHERE approval_status = 'pending_approval' AND created_at <= NOW() - INTERVAL '10 minutes'),
    (SELECT COUNT(*)::INTEGER FROM auction_approval_history WHERE action = 'approved' AND DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*)::INTEGER FROM auction_approval_history WHERE action = 'hidden' AND DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*)::INTEGER FROM auction_approval_history WHERE action = 'rejected' AND DATE(created_at) = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. 권한 설정 (기존 권한 유지)
-- ============================================

GRANT EXECUTE ON FUNCTION process_auto_approval_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION get_approval_stats() TO authenticated;

-- ============================================
-- 4. 변경 사항 로그
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🚀 자동 승인 시간 변경 완료!';
  RAISE NOTICE '   ✅ 자동 승인 시간: 30분 → 15분으로 변경';
  RAISE NOTICE '   ✅ 임박 알림 기준: 25분 → 10분으로 변경';
  RAISE NOTICE '   ✅ 승인 히스토리 메시지 업데이트';
  RAISE NOTICE '   📊 새로운 워크플로우:';
  RAISE NOTICE '      1. 경매 등록 → pending_approval 상태';
  RAISE NOTICE '      2. 관리자 알림 발송 (2분마다)';
  RAISE NOTICE '      3. 15분 후 자동 승인 (5분마다 체크)';
  RAISE NOTICE '      4. 승인 후 일반 사용자 알림 발송';
  RAISE NOTICE '   ⏰ 자동 승인 임박 알림: 10분 경과 시점';
  RAISE NOTICE '   🔧 크론 작업: 기존 5분 주기 유지';
END $$;
