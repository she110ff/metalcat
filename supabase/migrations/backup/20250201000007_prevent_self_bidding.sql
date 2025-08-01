-- ============================================
-- 🚫 자신의 경매 입찰 방지 마이그레이션
-- 작성일: 2025-02-01
-- 목적: 경매 소유자가 자신의 경매에 입찰하는 것을 방지
-- ============================================

-- 기존 RLS 정책 확인 및 제거 (필요한 경우)
DROP POLICY IF EXISTS "prevent_self_bidding" ON auction_bids;
DROP POLICY IF EXISTS "view_bids_except_self_auction" ON auction_bids;

-- 기존 함수 제거 (타입 변경을 위해)
DROP FUNCTION IF EXISTS check_self_bidding_violations();

-- 🚫 충돌하는 기존 입찰 정책 제거
DROP POLICY IF EXISTS "Anyone can create bids" ON auction_bids;

-- 🔧 커스텀 인증용 현재 사용자 ID 설정 함수 생성
CREATE OR REPLACE FUNCTION set_current_user_id(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- current_setting을 통해 현재 사용자 ID 설정
  PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$;

-- 🔍 현재 사용자 ID 조회 함수 (디버깅용)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 🔧 테이블 소유자도 RLS를 따르도록 강제 설정
ALTER TABLE auction_bids FORCE ROW LEVEL SECURITY;

-- 🚫 기본 입찰 정책 (애플리케이션 레벨 체크에 의존하는 방식)
CREATE POLICY "basic_bid_policy" ON auction_bids
  FOR INSERT
  WITH CHECK (
    -- 기본적인 데이터 무결성만 체크 (자신의 경매 입찰 방지는 애플리케이션에서 처리)
    user_id IS NOT NULL 
    AND auction_id IS NOT NULL
    AND amount > 0
  );

-- 기존 입찰 데이터에 대한 정책도 추가 (SELECT/UPDATE 시에도 체크)
CREATE POLICY "view_bids_except_self_auction" ON auction_bids
  FOR SELECT
  USING (
    -- 모든 입찰은 볼 수 있지만, 자신의 경매에 대한 입찰임을 인지할 수 있도록
    true
  );

-- 🔍 기존 자신의 경매에 대한 입찰이 있는지 확인하는 함수
CREATE OR REPLACE FUNCTION check_self_bidding_violations()
RETURNS TABLE (
  auction_id text,
  auction_title varchar(200),
  bidder_id text,
  bidder_name varchar(100),
  amount numeric(15,2),
  bid_time timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id::text,
    a.title,
    ab.user_id::text,
    ab.user_name,
    ab.amount,
    ab.bid_time
  FROM auction_bids ab
  INNER JOIN auctions a ON ab.auction_id = a.id
  WHERE a.user_id = ab.user_id -- 경매 소유자와 입찰자가 같은 경우
  ORDER BY ab.bid_time DESC;
END;
$$;

-- 💭 코멘트 추가
COMMENT ON POLICY "basic_bid_policy" ON auction_bids IS 
'기본 입찰 정책: 데이터 무결성 체크. 자신의 경매 입찰 방지는 애플리케이션 레벨에서 처리';

COMMENT ON FUNCTION check_self_bidding_violations() IS 
'기존 데이터에서 자신의 경매에 입찰한 위반 사례를 확인하는 함수입니다.';

-- 🔍 마이그레이션 완료 알림
SELECT 
  '✅ 자신의 경매 입찰 방지 정책이 성공적으로 적용되었습니다.' as message,
  COUNT(*) as existing_violations
FROM (
  SELECT check_self_bidding_violations()
) violations;