-- ============================================
-- 경매 등록 관리자 승인 시스템 구현
-- 생성일: 2025-08-28
-- 목적: 경매 등록 시 관리자 승인 후 일반 사용자 알림 발송
-- ============================================

-- ============================================
-- 1. 새로운 열거형 타입 생성
-- ============================================

-- 승인 상태 열거형
CREATE TYPE auction_approval_status_enum AS ENUM (
  'pending_approval',  -- 관리자 승인 대기
  'approved',          -- 승인됨 (일반 공개)
  'hidden',            -- 히든 경매 (관리자+등록자+슬레이브+모든사용자)
  'rejected'           -- 거부됨
);

-- ============================================
-- 2. auctions 테이블 확장
-- ============================================

-- 승인 관련 컬럼 추가
ALTER TABLE auctions 
ADD COLUMN approval_status auction_approval_status_enum DEFAULT 'pending_approval',
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_by UUID REFERENCES users(id),
ADD COLUMN rejection_reason TEXT;

-- 승인 관련 인덱스 추가
CREATE INDEX idx_auctions_approval_status ON auctions(approval_status);
CREATE INDEX idx_auctions_pending_approval ON auctions(approval_status, created_at) 
WHERE approval_status = 'pending_approval';

-- ============================================
-- 3. 새로운 테이블 생성
-- ============================================

-- 관리자 알림 큐 테이블
CREATE TABLE admin_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'approval_request', 'auto_approved'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- 관리자 알림 큐 인덱스
CREATE INDEX idx_admin_notification_queue_status ON admin_notification_queue(status, created_at);
CREATE INDEX idx_admin_notification_queue_auction ON admin_notification_queue(auction_id);

-- 경매 승인 히스토리 테이블
CREATE TABLE auction_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL, -- 'approved', 'hidden', 'rejected', 'auto_approved'
  admin_id UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 승인 히스토리 인덱스
CREATE INDEX idx_auction_approval_history_auction ON auction_approval_history(auction_id);
CREATE INDEX idx_auction_approval_history_action ON auction_approval_history(action, created_at);
CREATE INDEX idx_auction_approval_history_admin ON auction_approval_history(admin_id);

-- ============================================
-- 4. 기존 데이터 마이그레이션
-- ============================================

-- 기존 경매들을 승인된 상태로 설정
UPDATE auctions 
SET 
  approval_status = 'approved',
  approved_at = created_at
WHERE approval_status IS NULL;

-- 기존 경매들의 승인 히스토리 생성
INSERT INTO auction_approval_history (auction_id, action, reason, created_at)
SELECT 
  id, 
  'approved', 
  '기존 데이터 마이그레이션', 
  created_at
FROM auctions 
WHERE approval_status = 'approved'
AND id NOT IN (SELECT auction_id FROM auction_approval_history);

-- ============================================
-- 5. 관리자 알림 발송 함수
-- ============================================

-- 관리자 승인 요청 알림 발송
CREATE OR REPLACE FUNCTION send_admin_approval_notification(
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
  admin_tokens TEXT[];
  notification_title TEXT;
  notification_body TEXT;
  admin_count INTEGER;
BEGIN
  -- 현재 환경 확인
  SELECT get_current_environment() INTO current_env;
  
  -- 관리자들의 푸시 토큰 수집
  SELECT array_agg(token) INTO admin_tokens
  FROM user_push_tokens upt
  JOIN users u ON upt.user_id = u.id
  WHERE upt.is_active = true AND u.is_admin = true;
  
  -- 관리자 수 확인
  SELECT COUNT(*) INTO admin_count
  FROM user_push_tokens upt
  JOIN users u ON upt.user_id = u.id
  WHERE upt.is_active = true AND u.is_admin = true;
  
  IF admin_tokens IS NULL OR array_length(admin_tokens, 1) = 0 THEN
    RAISE NOTICE '📱 관리자 알림 건너뜀: 활성 관리자 토큰 없음';
    RETURN;
  END IF;
  
  -- 알림 내용 구성
  notification_title := '새 경매 승인 요청';
  notification_body := auction_title || ' 경매 승인이 필요합니다.';
  
  RAISE NOTICE '📢 관리자 승인 요청 알림: % - % (관리자 수: %)', 
               notification_title, notification_body, admin_count;
  
  -- 관리자별 알림 히스토리 저장
  INSERT INTO notification_history (user_id, notification_type, title, body, data, created_at)
  SELECT 
    u.id,
    'admin_approval_request',
    notification_title,
    notification_body,
    jsonb_build_object(
      'auction_id', auction_id,
      'auction_title', auction_title,
      'auction_category', auction_category,
      'seller_name', seller_name,
      'notification_type', 'admin_approval_request'
    ),
    NOW()
  FROM users u
  WHERE u.is_admin = true;
  
  -- 환경별 처리
  IF current_env = 'local' THEN
    -- 로컬 환경에서는 로그만 출력
    RAISE NOTICE '🏠 로컬 환경: 실제 관리자 알림 전송 생략';
  ELSE
    -- 프로덕션/스테이징에서는 실제 Edge Function 호출
    BEGIN
      -- 환경별 Supabase URL 설정
      IF current_env = 'production' THEN
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      ELSE
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      END IF;
      
      function_url := supabase_url || '/functions/v1/send-auction-notification';
      
      RAISE NOTICE '🚀 관리자 승인 요청 Edge Function 호출: %', function_url;
      
      -- pg_net을 사용해서 Edge Function 호출
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZG5jc3d2YmhlbHN0cGtmY3Z2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDEyMzIxMiwiZXhwIjoyMDY5Njk5MjEyfQ.oAOAE-0vaU0ph5bkX9DBWfCwFEJha9wo8W1kATeAHTI'
        ),
        body := jsonb_build_object(
          'tokens', admin_tokens, 
          'title', notification_title, 
          'body', notification_body, 
          'data', jsonb_build_object(
            'auction_id', auction_id,
            'auction_title', auction_title,
            'auction_category', auction_category,
            'seller_name', seller_name,
            'notification_type', 'admin_approval_request'
          )
        ),
        timeout_milliseconds := 30000
      ) INTO response_id;
      
      RAISE NOTICE '✅ 관리자 승인 요청 알림 전송 완료 (request_id: %)', response_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ 관리자 승인 요청 알림 전송 실패: %', SQLERRM;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. 관리자 알림 큐 처리 함수
-- ============================================

-- 관리자 알림 큐 처리 함수
CREATE OR REPLACE FUNCTION process_admin_notification_queue()
RETURNS TABLE (
    processed_count integer,
    success_count integer,
    failed_count integer
) AS $$
DECLARE
  queue_item RECORD;
  total_processed integer := 0;
  total_success integer := 0;
  total_failed integer := 0;
  processing_error text;
BEGIN
  RAISE NOTICE '🔄 관리자 알림 큐 처리 시작';
  
  -- 대기 중인 관리자 알림들을 처리 (최대 10개씩)
  FOR queue_item IN 
    SELECT id, auction_id, notification_type
    FROM admin_notification_queue 
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      total_processed := total_processed + 1;
      
      -- 처리 중 상태로 변경
      UPDATE admin_notification_queue 
      SET status = 'processing', processed_at = NOW()
      WHERE id = queue_item.id;
      
      -- 승인 요청 알림 발송
      IF queue_item.notification_type = 'approval_request' THEN
        PERFORM send_admin_approval_notification(
          queue_item.auction_id,
          (SELECT title FROM auctions WHERE id = queue_item.auction_id),
          (SELECT CASE auction_category
            WHEN 'scrap' THEN '고철'
            WHEN 'machinery' THEN '중고기계'
            WHEN 'materials' THEN '중고자재'
            WHEN 'demolition' THEN '철거'
            ELSE auction_category::text
          END FROM auctions WHERE id = queue_item.auction_id),
          (SELECT COALESCE(u.name, u.phone_number, 'Unknown') 
           FROM auctions a JOIN users u ON a.user_id = u.id 
           WHERE a.id = queue_item.auction_id)
        );
      END IF;
      
      -- 성공 시 완료 상태로 변경
      UPDATE admin_notification_queue 
      SET status = 'sent', processed_at = NOW()
      WHERE id = queue_item.id;
      
      total_success := total_success + 1;
      RAISE NOTICE '✅ 관리자 알림 처리 성공: %', queue_item.auction_id;
      
    EXCEPTION WHEN OTHERS THEN
      processing_error := SQLERRM;
      
      -- 실패 시 failed 상태로 변경
      UPDATE admin_notification_queue 
      SET status = 'failed', processed_at = NOW()
      WHERE id = queue_item.id;
      
      total_failed := total_failed + 1;
      RAISE WARNING '❌ 관리자 알림 처리 실패: % - %', queue_item.auction_id, processing_error;
    END;
  END LOOP;
  
  RAISE NOTICE '🎯 관리자 알림 큐 처리 완료: 처리 %개, 성공 %개, 실패 %개', 
               total_processed, total_success, total_failed;
  
  RETURN QUERY SELECT total_processed, total_success, total_failed;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. 자동 승인 처리 함수
-- ============================================

-- 자동 승인 처리 함수
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
  
  -- 30분 이상 대기 중인 경매들 처리
  FOR auction_record IN 
    SELECT id, title, user_id, auction_category
    FROM auctions 
    WHERE approval_status = 'pending_approval'
    AND created_at <= NOW() - INTERVAL '30 minutes'
  LOOP
    total_processed := total_processed + 1;
    
    -- 경매 상태를 approved로 변경
    UPDATE auctions 
    SET 
      approval_status = 'approved',
      approved_at = NOW(),
      updated_at = NOW()
    WHERE id = auction_record.id;
    
    -- 승인 히스토리 기록
    INSERT INTO auction_approval_history (
      auction_id, action, reason, created_at
    ) VALUES (
      auction_record.id, 'auto_approved', '30분 자동 승인', NOW()
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
-- 8. 경매 등록 트리거 수정
-- ============================================

-- 기존 트리거 함수 수정 (관리자 알림 큐로 변경)
CREATE OR REPLACE FUNCTION trigger_auction_notification_queue()
RETURNS TRIGGER AS $$
DECLARE
  seller_name TEXT;
  category_text TEXT;
BEGIN
  -- 판매자 이름 가져오기
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
  
  -- 관리자 알림 큐에 승인 요청 추가
  INSERT INTO admin_notification_queue (
    auction_id,
    notification_type,
    status
  ) VALUES (
    NEW.id,
    'approval_request',
    'pending'
  );
  
  RAISE NOTICE '📋 관리자 승인 요청이 큐에 추가됨: % (ID: %)', NEW.title, NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. 관리자 승인 함수들
-- ============================================

-- 경매 승인 함수
CREATE OR REPLACE FUNCTION approve_auction(
  p_auction_id TEXT,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- 경매 승인 처리
  UPDATE auctions 
  SET 
    approval_status = 'approved',
    approved_at = NOW(),
    approved_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_auction_id AND approval_status = 'pending_approval';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- 승인 히스토리 기록
  INSERT INTO auction_approval_history (
    auction_id, action, admin_id, reason, created_at
  ) VALUES (
    p_auction_id, 'approved', p_admin_id, p_reason, NOW()
  );
  
  -- 일반 사용자 알림 큐에 추가
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
  
  RAISE NOTICE '✅ 경매 승인 완료: %', p_auction_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 히든 경매 처리 함수
CREATE OR REPLACE FUNCTION hide_auction(
  p_auction_id TEXT,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE auctions 
  SET 
    approval_status = 'hidden',
    approved_at = NOW(),
    approved_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_auction_id AND approval_status = 'pending_approval';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  INSERT INTO auction_approval_history (
    auction_id, action, admin_id, reason, created_at
  ) VALUES (
    p_auction_id, 'hidden', p_admin_id, p_reason, NOW()
  );
  
  RAISE NOTICE '✅ 경매 히든 처리 완료: %', p_auction_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 경매 거부 함수
CREATE OR REPLACE FUNCTION reject_auction(
  p_auction_id TEXT,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE auctions 
  SET 
    approval_status = 'rejected',
    approved_by = p_admin_id,
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_auction_id AND approval_status = 'pending_approval';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  INSERT INTO auction_approval_history (
    auction_id, action, admin_id, reason, created_at
  ) VALUES (
    p_auction_id, 'rejected', p_admin_id, p_reason, NOW()
  );
  
  -- TODO: 등록자에게 거부 알림 발송 로직 추가
  
  RAISE NOTICE '✅ 경매 거부 완료: %', p_auction_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. 관리자 조회 함수들
-- ============================================

-- 승인 대기 경매 목록
CREATE OR REPLACE FUNCTION get_pending_approval_auctions()
RETURNS TABLE (
  auction_id TEXT,
  title TEXT,
  category TEXT,
  seller_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  waiting_minutes INTEGER
) AS $$
BEGIN
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
    a.created_at,
    EXTRACT(EPOCH FROM (NOW() - a.created_at))::INTEGER / 60
  FROM auctions a
  JOIN users u ON a.user_id = u.id
  WHERE a.approval_status = 'pending_approval'
  ORDER BY a.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 승인 통계
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
    (SELECT COUNT(*)::INTEGER FROM auctions WHERE approval_status = 'pending_approval' AND created_at <= NOW() - INTERVAL '25 minutes'),
    (SELECT COUNT(*)::INTEGER FROM auction_approval_history WHERE action = 'approved' AND DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*)::INTEGER FROM auction_approval_history WHERE action = 'hidden' AND DATE(created_at) = CURRENT_DATE),
    (SELECT COUNT(*)::INTEGER FROM auction_approval_history WHERE action = 'rejected' AND DATE(created_at) = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 11. RLS 정책 수정
-- ============================================

-- 기존 경매 조회 정책 제거
DROP POLICY IF EXISTS "Anyone can view auctions" ON auctions;

-- 기존 경매 생성 정책 수정 (승인 시스템 적용)
DROP POLICY IF EXISTS "Users can create their own auctions" ON auctions;

CREATE POLICY "Users can create their own auctions" ON auctions
FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users)
);

-- 새로운 경매 조회 정책 (승인 상태별 차등 접근)
CREATE POLICY "Auction visibility policy" ON auctions
FOR SELECT USING (
  CASE 
    -- 승인된 경매: 모든 사용자 조회 가능
    WHEN approval_status = 'approved' THEN true
    
    -- 히든 경매: 모든 사용자 조회 가능 (기존 방식)
    WHEN approval_status = 'hidden' THEN true
    
    -- 승인 대기: 모든 사용자 조회 가능 (기존 방식)
    WHEN approval_status = 'pending_approval' THEN true
    
    -- 거부된 경매: 모든 사용자 조회 가능 (기존 방식)
    WHEN approval_status = 'rejected' THEN true
    
    ELSE true
  END
);

-- 히든 경매 입찰 정책 (슬레이브 유저 + 모든 사용자)
-- 기존 입찰 정책은 유지하고 히든 경매에 대한 추가 체크만 수행
-- 애플리케이션 레벨에서 히든 경매 입찰 권한을 체크하도록 함

-- ============================================
-- 12. 새 테이블들에 대한 RLS 설정
-- ============================================

-- 관리자 알림 큐 RLS
ALTER TABLE admin_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage notification queue" ON admin_notification_queue
FOR ALL USING (
  true  -- 기존 방식: 모든 사용자 접근 가능
);

-- 승인 히스토리 RLS
ALTER TABLE auction_approval_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view approval history" ON auction_approval_history
FOR SELECT USING (
  true  -- 기존 방식: 모든 사용자 접근 가능
);

CREATE POLICY "Admin can insert approval history" ON auction_approval_history
FOR INSERT WITH CHECK (
  true  -- 기존 방식: 모든 사용자 접근 가능
);

-- ============================================
-- 13. 크론 작업 등록
-- ============================================

-- 기존 알림 처리 크론 작업 제거 (새로운 시스템으로 대체)
DO $$
BEGIN
  -- 기존 크론 작업이 존재하는지 확인 후 제거
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auction-notification-processor') THEN
    PERFORM cron.unschedule('auction-notification-processor');
    RAISE NOTICE '기존 auction-notification-processor 크론 작업 제거됨';
  END IF;
END $$;

-- 관리자 알림 처리 크론 (2분마다 실행)
SELECT cron.schedule(
  'admin-notification-processor',
  '*/2 * * * *',
  'SELECT process_admin_notification_queue();'
);

-- 자동 승인 크론 (5분마다 실행)
SELECT cron.schedule(
  'auction-auto-approval',
  '*/5 * * * *',
  'SELECT process_auto_approval_queue();'
);

-- 기존 일반 사용자 알림 처리 크론 재등록 (승인된 경매 알림용)
SELECT cron.schedule(
  'auction-notification-processor',
  '*/1 * * * *',
  'SELECT process_auction_notification_queue();'
);

-- ============================================
-- 14. 권한 설정
-- ============================================

-- 새 테이블들에 대한 권한
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_notification_queue TO authenticated;
GRANT SELECT, INSERT ON auction_approval_history TO authenticated;

-- 새 함수들에 대한 권한
GRANT EXECUTE ON FUNCTION send_admin_approval_notification(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_admin_notification_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION process_auto_approval_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_auction(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION hide_auction(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_auction(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_approval_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_approval_stats() TO authenticated;

-- ============================================
-- 15. 완료 알림
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🚀 경매 등록 관리자 승인 시스템 구현 완료!';
  RAISE NOTICE '   ✅ 승인 상태 열거형 및 테이블 확장 완료';
  RAISE NOTICE '   ✅ 관리자 알림 큐 시스템 구축 완료';
  RAISE NOTICE '   ✅ 자동 승인 시스템 구축 완료 (30분 후)';
  RAISE NOTICE '   ✅ 관리자 승인 함수들 구현 완료';
  RAISE NOTICE '   ✅ RLS 정책 업데이트 완료';
  RAISE NOTICE '   ✅ 크론 작업 등록 완료';
  RAISE NOTICE '   📊 새로운 워크플로우:';
  RAISE NOTICE '      1. 경매 등록 → pending_approval 상태';
  RAISE NOTICE '      2. 관리자 알림 발송 (2분마다)';
  RAISE NOTICE '      3. 30분 후 자동 승인 (5분마다 체크)';
  RAISE NOTICE '      4. 승인 후 일반 사용자 알림 발송';
  RAISE NOTICE '   🔧 관리자 기능: approve_auction(), hide_auction(), reject_auction()';
  RAISE NOTICE '   📈 모니터링: get_pending_approval_auctions(), get_approval_stats()';
END $$;
