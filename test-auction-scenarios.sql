-- 🚀 경매 낙찰/유찰 즉시 테스트 스크립트
-- 작성일: 2025-02-01
-- 목적: 시드 데이터 + SQL로 모든 시나리오 즉시 테스트
-- 사용자: 4ede4267-2d7c-4f83-8d9b-cb73eb96698e (01012345678, 정개발)

-- ============================================
-- 1. 사용자 추가 (존재하지 않는 경우만)
-- ============================================

INSERT INTO users (id, phone_number, name, address, is_phone_verified, created_at) 
VALUES (
  '4ede4267-2d7c-4f83-8d9b-cb73eb96698e', 
  '01012345678', 
  '정개발', 
  '서울특별시 강남구', 
  true, 
  NOW()
) 
ON CONFLICT (id) DO UPDATE SET 
  phone_number = EXCLUDED.phone_number,
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================
-- 2. 테스트 시나리오별 경매 종료 시간 조정
-- ============================================

-- 🎯 시나리오 1: 낙찰 성공 (scrap3 - 황동 스크랩)
-- 판매자: 울산메탈, 최고입찰자: 창원스크랩 (4,750,000원)
UPDATE auctions 
SET 
  end_time = NOW() - INTERVAL '10 minutes',  -- 10분 전에 종료
  status = 'ended'
WHERE id = 'scrap3';

-- 🎯 시나리오 2: 유찰 - 입찰자 없음 (새 경매 생성)
INSERT INTO auctions (
  id, user_id, title, description, auction_category, transaction_type,
  starting_price, desired_price, current_bid, price_per_unit, total_bid_amount,
  product_type, quantity, sales_environment, address,
  end_time, status, bidders, view_count, created_at
) VALUES (
  'test_no_bids',
  '4ede4267-2d7c-4f83-8d9b-cb73eb96698e',  -- 정개발이 판매자
  '테스트: 입찰자 없는 구리 스크랩',
  '테스트용 경매 - 입찰자가 전혀 없는 상황을 시뮬레이션',
  'scrap',
  'normal',
  3000000,  -- 시작가 300만원
  3500000,  -- 희망가 350만원
  0,        -- 현재 입찰가 없음
  3000,     -- 단가
  0,        -- 총 입찰액 없음
  '{"id": "copper", "name": "구리", "category": "비철금속", "description": "순수 구리 스크랩", "auctionCategory": "scrap"}',
  '{"quantity": 1000, "unit": "kg"}',
  '{"delivery": "seller", "shippingCost": "buyer", "accessibility": "easy", "loading": "seller", "sacksNeeded": false}',
  '{"postalCode": "06134", "addressType": "road", "address": "서울특별시 강남구 테헤란로 123", "detailAddress": "테스트빌딩 1층"}',
  NOW() - INTERVAL '5 minutes',  -- 5분 전에 종료
  'ended',
  0,  -- 입찰자 수 0명
  25,
  NOW() - INTERVAL '3 days'
);

-- 스크랩 카테고리 특화 정보 추가
INSERT INTO scrap_auctions (
  auction_id, product_type, quantity, quantity_unit, price_per_unit,
  sales_environment, created_at
) VALUES (
  'test_no_bids',
  '{"id": "copper", "name": "구리", "category": "비철금속", "description": "순수 구리 스크랩", "auctionCategory": "scrap"}',
  1000,
  'kg',
  3000,
  '{"delivery": "seller", "shippingCost": "buyer", "accessibility": "easy", "loading": "seller", "sacksNeeded": false}',
  NOW() - INTERVAL '3 days'
);

-- 🎯 시나리오 3: 유찰 - 시작가 미달 (새 경매 생성)
INSERT INTO auctions (
  id, user_id, title, description, auction_category, transaction_type,
  starting_price, desired_price, current_bid, price_per_unit, total_bid_amount,
  product_type, quantity, sales_environment, address,
  end_time, status, bidders, view_count, created_at
) VALUES (
  'test_below_starting',
  '550e8400-e29b-41d4-a716-446655440001',  -- 서울철강이 판매자
  '테스트: 시작가 미달 알루미늄',
  '테스트용 경매 - 입찰가가 시작가에 미달하는 상황',
  'scrap',
  'urgent',
  5000000,  -- 시작가 500만원
  5500000,  -- 희망가 550만원
  4500000,  -- 현재 입찰가 450만원 (시작가 미달!)
  2250,     -- 단가
  4500000,  -- 총 입찰액
  '{"id": "aluminum", "name": "알루미늄", "category": "비철금속", "description": "고순도 알루미늄", "auctionCategory": "scrap"}',
  '{"quantity": 2000, "unit": "kg"}',
  '{"delivery": "buyer", "shippingCost": "buyer", "accessibility": "normal", "loading": "both", "sacksNeeded": true}',
  '{"postalCode": "06292", "addressType": "road", "address": "서울특별시 강남구 역삼로 456", "detailAddress": "테스트 작업장"}',
  NOW() - INTERVAL '3 minutes',  -- 3분 전에 종료
  'ended',
  2,  -- 입찰자 2명
  67,
  NOW() - INTERVAL '5 days'
);

-- 스크랩 카테고리 특화 정보 추가
INSERT INTO scrap_auctions (
  auction_id, product_type, quantity, quantity_unit, price_per_unit,
  sales_environment, created_at
) VALUES (
  'test_below_starting',
  '{"id": "aluminum", "name": "알루미늄", "category": "비철금속", "description": "고순도 알루미늄", "auctionCategory": "scrap"}',
  2000,
  'kg',
  2250,
  '{"delivery": "buyer", "shippingCost": "buyer", "accessibility": "normal", "loading": "both", "sacksNeeded": true}',
  NOW() - INTERVAL '5 days'
);

-- 시작가 미달 경매의 입찰 데이터 추가
INSERT INTO auction_bids (
  auction_id, user_id, user_name, amount, price_per_unit, location,
  bid_time, is_top_bid, created_at
) VALUES
('test_below_starting', '4ede4267-2d7c-4f83-8d9b-cb73eb96698e', '정개발', 4000000, 2000, '서울 강남구', NOW() - INTERVAL '1 day', false, NOW() - INTERVAL '1 day'),
('test_below_starting', '550e8400-e29b-41d4-a716-446655440002', '부산철강', 4500000, 2250, '부산 해운대구', NOW() - INTERVAL '4 hours', true, NOW() - INTERVAL '4 hours');

-- 🎯 시나리오 4: 정개발이 낙찰 받는 경매 (새 경매 생성)
INSERT INTO auctions (
  id, user_id, title, description, auction_category, transaction_type,
  starting_price, desired_price, current_bid, price_per_unit, total_bid_amount,
  product_type, quantity, sales_environment, address,
  end_time, status, bidders, view_count, created_at
) VALUES (
  'test_win_by_user',
  '550e8400-e29b-41d4-a716-446655440005',  -- 광주철강이 판매자
  '테스트: 정개발 낙찰 - 니켈 스크랩',
  '테스트용 경매 - 정개발이 최고가로 낙찰받는 상황',
  'scrap',
  'normal',
  8000000,  -- 시작가 800만원
  9000000,  -- 희망가 900만원
  8800000,  -- 현재 입찰가 880만원 (정개발이 최고가)
  4400,     -- 단가
  8800000,  -- 총 입찰액
  '{"id": "nickel", "name": "니켈", "category": "비철금속", "description": "고순도 니켈 스크랩", "auctionCategory": "scrap"}',
  '{"quantity": 2000, "unit": "kg"}',
  '{"delivery": "seller", "shippingCost": "seller", "accessibility": "easy", "loading": "seller", "sacksNeeded": false}',
  '{"postalCode": "61945", "addressType": "road", "address": "광주광역시 서구 상무대로 789", "detailAddress": "테스트 공장"}',
  NOW() - INTERVAL '1 minute',  -- 1분 전에 종료
  'ended',
  3,  -- 입찰자 3명
  89,
  NOW() - INTERVAL '7 days'
);

-- 스크랩 카테고리 특화 정보 추가
INSERT INTO scrap_auctions (
  auction_id, product_type, quantity, quantity_unit, price_per_unit,
  sales_environment, created_at
) VALUES (
  'test_win_by_user',
  '{"id": "nickel", "name": "니켈", "category": "비철금속", "description": "고순도 니켈 스크랩", "auctionCategory": "scrap"}',
  2000,
  'kg',
  4400,
  '{"delivery": "seller", "shippingCost": "seller", "accessibility": "easy", "loading": "seller", "sacksNeeded": false}',
  NOW() - INTERVAL '7 days'
);

-- 정개발이 낙찰받는 경매의 입찰 데이터
INSERT INTO auction_bids (
  auction_id, user_id, user_name, amount, price_per_unit, location,
  bid_time, is_top_bid, created_at
) VALUES
('test_win_by_user', '550e8400-e29b-41d4-a716-446655440001', '서울철강', 8000000, 4000, '서울 강남구', NOW() - INTERVAL '2 days', false, NOW() - INTERVAL '2 days'),
('test_win_by_user', '550e8400-e29b-41d4-a716-446655440002', '부산철강', 8400000, 4200, '부산 해운대구', NOW() - INTERVAL '1 day', false, NOW() - INTERVAL '1 day'),
('test_win_by_user', '4ede4267-2d7c-4f83-8d9b-cb73eb96698e', '정개발', 8800000, 4400, '서울 강남구', NOW() - INTERVAL '2 hours', true, NOW() - INTERVAL '2 hours');

-- 🎯 시나리오 5: 정개발이 입찰했지만 낙찰 실패 (기존 scrap1 수정)
-- scrap1의 종료 시간을 조정하고 정개발의 입찰 추가
UPDATE auctions 
SET 
  end_time = NOW() + INTERVAL '30 seconds',  -- 30초 후에 종료 예정
  status = 'ending'
WHERE id = 'scrap1';

-- 정개발이 scrap1에 입찰했지만 최고가가 아닌 상황
INSERT INTO auction_bids (
  auction_id, user_id, user_name, amount, price_per_unit, location,
  bid_time, is_top_bid, created_at
) VALUES
('scrap1', '4ede4267-2d7c-4f83-8d9b-cb73eb96698e', '정개발', 5200000, 2080, '서울 강남구', NOW() - INTERVAL '3 hours', false, NOW() - INTERVAL '3 hours');

-- scrap1의 입찰자 수 업데이트
UPDATE auctions SET bidders = 4 WHERE id = 'scrap1';

-- ============================================
-- 3. 경매 사진 추가 (테스트 경매용)
-- ============================================

INSERT INTO auction_photos (
  auction_id, photo_url, photo_type, photo_order, is_representative, created_at
) VALUES
-- test_no_bids 사진들
('test_no_bids', 'https://dummyimage.com/800x600/DC2626/FFFFFF&text=테스트+구리+1', 'full', 0, true, NOW()),
('test_no_bids', 'https://dummyimage.com/800x600/DC2626/FFFFFF&text=테스트+구리+2', 'detail', 1, false, NOW()),

-- test_below_starting 사진들
('test_below_starting', 'https://dummyimage.com/800x600/F59E0B/FFFFFF&text=시작가미달+알루미늄', 'full', 0, true, NOW()),

-- test_win_by_user 사진들
('test_win_by_user', 'https://dummyimage.com/800x600/10B981/FFFFFF&text=정개발+낙찰+니켈', 'full', 0, true, NOW()),
('test_win_by_user', 'https://dummyimage.com/800x600/10B981/FFFFFF&text=니켈+상세', 'closeup', 1, false, NOW());

-- ============================================
-- 4. 현재 데이터 상태 확인
-- ============================================

-- 📊 테스트 준비 완료 상태 출력
DO $$
BEGIN
  RAISE NOTICE '🚀 경매 테스트 시나리오 설정 완료!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 테스트 시나리오:';
  RAISE NOTICE '  1. scrap3 (황동) - 낙찰 성공 ✅';
  RAISE NOTICE '  2. test_no_bids (구리) - 유찰 (입찰자 없음) ❌';
  RAISE NOTICE '  3. test_below_starting (알루미늄) - 유찰 (시작가 미달) ❌';
  RAISE NOTICE '  4. test_win_by_user (니켈) - 정개발 낙찰 🏆';
  RAISE NOTICE '  5. scrap1 (알루미늄) - 정개발 입찰했지만 낙찰 실패 (30초 후 종료) 💔';
  RAISE NOTICE '';
  RAISE NOTICE '👤 테스트 사용자: 정개발 (4ede4267-2d7c-4f83-8d9b-cb73eb96698e)';
  RAISE NOTICE '📱 전화번호: 01012345678';
  RAISE NOTICE '';
  RAISE NOTICE '⏰ 다음 단계: process_ended_auctions() 함수 실행';
END
$$;

-- ============================================
-- 5. 데이터 검증 쿼리
-- ============================================

-- 사용자 확인
SELECT '=== 사용자 정보 ===' as info;
SELECT id, phone_number, name 
FROM users 
WHERE id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' 
   OR phone_number LIKE '010-%';

-- 경매 상태 확인
SELECT '=== 경매 상태 ===' as info;
SELECT 
  id,
  LEFT(title, 25) as title,
  status,
  CASE 
    WHEN end_time <= NOW() THEN '종료됨'
    WHEN end_time <= NOW() + INTERVAL '5 minutes' THEN '곧 종료'
    ELSE '진행중'
  END as time_status,
  bidders,
  current_bid
FROM auctions 
ORDER BY end_time;

-- 입찰 현황 확인 (정개발 포함)
SELECT '=== 정개발 입찰 현황 ===' as info;
SELECT 
  ab.auction_id,
  LEFT(a.title, 20) as title,
  ab.amount,
  ab.is_top_bid,
  a.status as auction_status
FROM auction_bids ab
JOIN auctions a ON ab.auction_id = a.id
WHERE ab.user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e'
ORDER BY ab.bid_time DESC;