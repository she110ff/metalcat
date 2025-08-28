-- ============================================
-- 히든 경매 관리 함수 추가
-- 생성일: 2025-08-28
-- 목적: 관리자 대시보드에서 히든 경매 관리를 위한 함수들 추가
-- ============================================

-- ============================================
-- 1. 히든 경매 목록 조회 함수
-- ============================================

-- 히든 경매 목록 조회
CREATE OR REPLACE FUNCTION get_hidden_auctions()
RETURNS TABLE (
  auction_id TEXT,
  title TEXT,
  category TEXT,
  seller_name TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  hidden_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  days_hidden INTEGER
) AS $$
BEGIN
  -- 기존 방식: 권한 체크 없음 (모든 사용자 접근 가능)
  
  RETURN QUERY
  SELECT 
    a.id,
    a.title::TEXT,
    CASE a.auction_category
      WHEN 'scrap' THEN '고철'
      WHEN 'machinery' THEN '중고기계'
      WHEN 'materials' THEN '중고자재'
      WHEN 'demolition' THEN '철거'
      ELSE a.auction_category::text
    END,
    COALESCE(u.name, u.phone_number, 'Unknown')::TEXT,
    a.approved_at,
    a.approved_by,
    ah.reason::TEXT,
    a.created_at,
    a.end_time,
    EXTRACT(EPOCH FROM (NOW() - a.approved_at))::INTEGER / 86400 -- 히든 처리된 지 며칠인지
  FROM auctions a
  JOIN users u ON a.user_id = u.id
  LEFT JOIN auction_approval_history ah ON a.id = ah.auction_id AND ah.action = 'hidden'
  WHERE a.approval_status = 'hidden'
  ORDER BY a.approved_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. 히든 경매를 일반 경매로 전환하는 함수
-- ============================================

-- 히든 경매를 승인된 경매로 변경
CREATE OR REPLACE FUNCTION unhide_auction(
  p_auction_id TEXT,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- 히든 경매를 approved로 변경
  UPDATE auctions 
  SET 
    approval_status = 'approved',
    approved_at = NOW(),
    approved_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_auction_id AND approval_status = 'hidden';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- 승인 히스토리 기록
  INSERT INTO auction_approval_history (
    auction_id, action, admin_id, reason, created_at
  ) VALUES (
    p_auction_id, 'unhidden', p_admin_id, p_reason, NOW()
  );
  
  -- 일반 사용자 알림 큐에 추가 (히든 해제 시 알림 발송)
  INSERT INTO auction_notification_queue (
    auction_id, auction_title, auction_category, seller_name, status
  )
  SELECT 
    a.id,
    a.title,
    CASE a.auction_category
      WHEN 'scrap' THEN '고철'
      WHEN 'machinery' THEN '중고기계'
      WHEN 'materials' THEN '중고자재'
      WHEN 'demolition' THEN '철거'
      ELSE a.auction_category::text
    END,
    COALESCE(u.name, u.phone_number, 'Unknown'),
    'pending'
  FROM auctions a
  JOIN users u ON a.user_id = u.id
  WHERE a.id = p_auction_id
  ON CONFLICT (auction_id) DO NOTHING;
  
  RAISE NOTICE '✅ 히든 경매 해제 완료: %', p_auction_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. 히든 경매 통계 함수
-- ============================================

-- 히든 경매 통계
CREATE OR REPLACE FUNCTION get_hidden_auction_stats()
RETURNS TABLE (
  total_hidden INTEGER,
  hidden_today INTEGER,
  hidden_this_week INTEGER,
  hidden_this_month INTEGER,
  avg_days_hidden NUMERIC
) AS $$
BEGIN
  -- 기존 방식: 권한 체크 없음 (모든 사용자 접근 가능)
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM auctions WHERE approval_status = 'hidden'),
    (SELECT COUNT(*)::INTEGER FROM auction_approval_history WHERE action = 'hidden' AND DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*)::INTEGER FROM auction_approval_history WHERE action = 'hidden' AND created_at >= DATE_TRUNC('week', NOW())),
    (SELECT COUNT(*)::INTEGER FROM auction_approval_history WHERE action = 'hidden' AND created_at >= DATE_TRUNC('month', NOW())),
    (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - approved_at)) / 86400), 0)::NUMERIC(10,2) 
     FROM auctions WHERE approval_status = 'hidden' AND approved_at IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 히든 경매 상세 정보 조회 함수
-- ============================================

-- 특정 히든 경매의 상세 정보 조회
CREATE OR REPLACE FUNCTION get_hidden_auction_detail(p_auction_id TEXT)
RETURNS TABLE (
  auction_id TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  seller_name TEXT,
  seller_phone TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  admin_name TEXT,
  hidden_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  current_bid NUMERIC,
  bidder_count INTEGER,
  view_count INTEGER,
  photo_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title::TEXT,
    a.description::TEXT,
    CASE a.auction_category
      WHEN 'scrap' THEN '고철'
      WHEN 'machinery' THEN '중고기계'
      WHEN 'materials' THEN '중고자재'
      WHEN 'demolition' THEN '철거'
      ELSE a.auction_category::text
    END,
    COALESCE(u.name, u.phone_number, 'Unknown')::TEXT,
    u.phone_number::TEXT,
    a.approved_at,
    a.approved_by,
    COALESCE(admin_u.name, admin_u.phone_number, 'Unknown')::TEXT,
    ah.reason::TEXT,
    a.created_at,
    a.end_time,
    a.current_bid,
    a.bidder_count,
    a.view_count,
    (SELECT COUNT(*)::INTEGER FROM auction_photos WHERE auction_photos.auction_id = a.id)
  FROM auctions a
  JOIN users u ON a.user_id = u.id
  LEFT JOIN users admin_u ON a.approved_by = admin_u.id
  LEFT JOIN auction_approval_history ah ON a.id = ah.auction_id AND ah.action = 'hidden'
  WHERE a.id = p_auction_id AND a.approval_status = 'hidden';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. 권한 설정
-- ============================================

-- 새 함수들에 대한 권한 부여
GRANT EXECUTE ON FUNCTION get_hidden_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION unhide_auction(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hidden_auction_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_hidden_auction_detail(TEXT) TO authenticated;

-- ============================================
-- 6. 완료 알림
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🔒 히든 경매 관리 함수 추가 완료!';
  RAISE NOTICE '   ✅ get_hidden_auctions() - 히든 경매 목록 조회';
  RAISE NOTICE '   ✅ unhide_auction() - 히든 경매 해제 (일반 경매로 전환)';
  RAISE NOTICE '   ✅ get_hidden_auction_stats() - 히든 경매 통계';
  RAISE NOTICE '   ✅ get_hidden_auction_detail() - 히든 경매 상세 정보';
  RAISE NOTICE '   🎯 관리자 대시보드에서 히든 경매 관리 가능';
END $$;
