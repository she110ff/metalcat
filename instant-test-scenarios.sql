-- 🚀 경매 낙찰/유찰 즉시 테스트 (간단 버전)
-- 작성일: 2025-02-01
-- 목적: 실제 테이블 구조에 맞는 즉시 테스트
-- 사용자: 4ede4267-2d7c-4f83-8d9b-cb73eb96698e (01012345678, 정개발)

-- ============================================
-- 1. 테스트 시나리오 설정
-- ============================================

-- 🎯 시나리오 1: scrap3 (황동) - 이미 종료된 경매, 낙찰 성공 상황
UPDATE auctions 
SET 
  end_time = NOW() - INTERVAL '10 minutes',
  status = 'ended'
WHERE id = 'scrap3';

-- 🎯 시나리오 2: 정개발이 scrap1에 입찰 추가 (현재 최고가 아님)
INSERT INTO auction_bids (
  id, auction_id, user_id, user_name, amount, price_per_unit, location,
  bid_time, is_top_bid, created_at
) VALUES (
  'jung_bid_scrap1', 
  'scrap1', 
  '4ede4267-2d7c-4f83-8d9b-cb73eb96698e', 
  '정개발', 
  5200000, 
  2080, 
  '서울 강남구',
  NOW() - INTERVAL '3 hours', 
  false,  -- 최고가 아님
  NOW() - INTERVAL '3 hours'
);

-- 🎯 시나리오 3: 정개발이 materials1에 최고가 입찰 (낙찰 예정)
INSERT INTO auction_bids (
  id, auction_id, user_id, user_name, amount, price_per_unit, location,
  bid_time, is_top_bid, created_at
) VALUES (
  'jung_bid_materials1', 
  'materials1', 
  '4ede4267-2d7c-4f83-8d9b-cb73eb96698e', 
  '정개발', 
  14000000, 
  700000, 
  '서울 강남구',
  NOW() - INTERVAL '1 hour', 
  true,  -- 최고가
  NOW() - INTERVAL '1 hour'
);

-- materials1 경매의 현재 입찰가 업데이트
UPDATE auctions 
SET 
  current_bid = 14000000,
  total_bid_amount = 14000000,
  bidder_count = bidder_count + 1
WHERE id = 'materials1';

-- 🎯 시나리오 4: scrap1을 30초 후 종료되도록 설정
UPDATE auctions 
SET 
  end_time = NOW() + INTERVAL '30 seconds',
  status = 'ending'
WHERE id = 'scrap1';

-- 🎯 시나리오 5: materials1을 1분 후 종료되도록 설정
UPDATE auctions 
SET 
  end_time = NOW() + INTERVAL '1 minute',
  status = 'ending'
WHERE id = 'materials1';

-- ============================================
-- 2. 현재 상태 확인
-- ============================================

-- 📊 테스트 준비 완료 상태 출력
DO $$
BEGIN
  RAISE NOTICE '🚀 간단 경매 테스트 시나리오 설정 완료!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 테스트 시나리오:';
  RAISE NOTICE '  1. scrap3 (황동) - 이미 종료, 낙찰 성공 테스트용 ✅';
  RAISE NOTICE '  2. scrap1 (알루미늄) - 정개발 입찰, 30초 후 종료 (낙찰 실패 예정) 💔';
  RAISE NOTICE '  3. materials1 (H빔) - 정개발 최고가, 1분 후 종료 (낙찰 성공 예정) 🏆';
  RAISE NOTICE '';
  RAISE NOTICE '👤 테스트 사용자: 정개발 (4ede4267-2d7c-4f83-8d9b-cb73eb96698e)';
  RAISE NOTICE '📱 전화번호: 01012345678';
  RAISE NOTICE '';
  RAISE NOTICE '⏰ 다음 단계: 30초 후 process_ended_auctions() 함수 실행';
END
$$;

-- ============================================
-- 3. 데이터 검증 쿼리
-- ============================================

-- 사용자 확인
SELECT '=== 사용자 정보 ===' as info;
SELECT id, phone_number, name 
FROM users 
WHERE id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e';

-- 경매 상태 확인
SELECT '=== 경매 상태 ===' as info;
SELECT 
  id,
  LEFT(title, 30) as title,
  status,
  CASE 
    WHEN end_time <= NOW() THEN '종료됨'
    WHEN end_time <= NOW() + INTERVAL '2 minutes' THEN '곧 종료'
    ELSE '진행중'
  END as time_status,
  bidder_count,
  current_bid
FROM auctions 
ORDER BY end_time;

-- 정개발 입찰 현황 확인
SELECT '=== 정개발 입찰 현황 ===' as info;
SELECT 
  ab.auction_id,
  LEFT(a.title, 25) as title,
  ab.amount,
  ab.is_top_bid,
  a.status as auction_status,
  CASE 
    WHEN a.end_time <= NOW() THEN '종료됨'
    WHEN a.end_time <= NOW() + INTERVAL '2 minutes' THEN '곧 종료'
    ELSE '진행중'
  END as time_status
FROM auction_bids ab
JOIN auctions a ON ab.auction_id = a.id
WHERE ab.user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e'
ORDER BY ab.bid_time DESC;

-- 경매 결과 테이블 상태 확인
SELECT '=== 경매 결과 상태 ===' as info;
SELECT COUNT(*) as total_results FROM auction_results;
SELECT COUNT(*) as total_transactions FROM auction_transactions;