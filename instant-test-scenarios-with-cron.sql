-- 🤖 경매 낙찰/유찰 크론 기반 즉시 테스트
-- 작성일: 2025-02-01
-- 목적: pg_cron 매분 실행에 최적화된 정확한 타이밍 테스트
-- 사용자: 4ede4267-2d7c-4f83-8d9b-cb73eb96698e (01012345678, 정개발)
-- 크론 스케줄: auction-end-processor 매분 정각 실행

-- ============================================
-- 🕐 크론 타이밍 계산 및 시나리오 설정
-- ============================================

-- 크론 최적화 시간 설정
DO $$
DECLARE
  current_ts TIMESTAMP := NOW()::TIMESTAMP;
  next_minute_1 TIMESTAMP;
  next_minute_2 TIMESTAMP;
  wait_seconds_1 INTEGER;
  wait_seconds_2 INTEGER;
BEGIN
  -- 다음 정각들 계산 (크론이 실행되는 시점)
  next_minute_1 := DATE_TRUNC('minute', current_ts) + INTERVAL '1 minute';
  next_minute_2 := DATE_TRUNC('minute', current_ts) + INTERVAL '2 minutes';
  
  wait_seconds_1 := EXTRACT(EPOCH FROM (next_minute_1 - current_ts))::INTEGER;
  wait_seconds_2 := EXTRACT(EPOCH FROM (next_minute_2 - current_ts))::INTEGER;
  
  RAISE NOTICE '🤖 크론 기반 테스트 타이밍 계산 완료';
  RAISE NOTICE '⏰ 현재 시간: %', TO_CHAR(current_ts, 'HH24:MI:SS');
  RAISE NOTICE '🎯 시나리오 1 (scrap3): 즉시 종료 → 다음 크론에서 처리';
  RAISE NOTICE '🎯 시나리오 2 (scrap1): %초 후 % 종료 → 크론 즉시 처리', wait_seconds_1, TO_CHAR(next_minute_1, 'HH24:MI:SS');
  RAISE NOTICE '🎯 시나리오 3 (materials1): %초 후 % 종료 → 크론 즉시 처리', wait_seconds_2, TO_CHAR(next_minute_2, 'HH24:MI:SS');
  RAISE NOTICE '';
  
END
$$;

-- 경매 시간 설정 (직접 UPDATE로 안전하게)
-- 🎯 시나리오 1: scrap3 (황동) - 이미 종료된 상태
UPDATE auctions 
SET 
  end_time = NOW() - INTERVAL '10 minutes',
  status = 'ended'
WHERE id = 'scrap3';

-- 🎯 시나리오 2: scrap1 (알루미늄) - 다음 정각에 종료 (1분 후)
UPDATE auctions 
SET 
  end_time = DATE_TRUNC('minute', NOW()::TIMESTAMP) + INTERVAL '1 minute',
  status = 'ending'
WHERE id = 'scrap1';

-- 🎯 시나리오 3: materials1 (H빔) - 그 다음 정각에 종료 (2분 후)
UPDATE auctions 
SET 
  end_time = DATE_TRUNC('minute', NOW()::TIMESTAMP) + INTERVAL '2 minutes',
  status = 'ending'
WHERE id = 'materials1';

-- ============================================
-- 📝 입찰 데이터 설정
-- ============================================

-- 🎯 정개발이 scrap1에 입찰 추가 (현재 최고가 아님)
INSERT INTO auction_bids (
  id, auction_id, user_id, user_name, amount, price_per_unit, location,
  bid_time, is_top_bid, created_at
) VALUES (
  gen_random_uuid(), 
  'scrap1', 
  '4ede4267-2d7c-4f83-8d9b-cb73eb96698e', 
  '정개발', 
  5200000, 
  2080, 
  '서울 강남구',
  NOW() - INTERVAL '3 hours', 
  false,  -- 최고가 아님 (다른 사람이 더 높은 가격으로 입찰했다고 가정)
  NOW() - INTERVAL '3 hours'
) ON CONFLICT (id) DO NOTHING;

-- 🎯 정개발이 materials1에 최고가 입찰 (낙찰 예정)
INSERT INTO auction_bids (
  id, auction_id, user_id, user_name, amount, price_per_unit, location,
  bid_time, is_top_bid, created_at
) VALUES (
  gen_random_uuid(), 
  'materials1', 
  '4ede4267-2d7c-4f83-8d9b-cb73eb96698e', 
  '정개발', 
  14000000, 
  700000, 
  '서울 강남구',
  NOW() - INTERVAL '1 hour', 
  true,  -- 최고가
  NOW() - INTERVAL '1 hour'
) ON CONFLICT (id) DO NOTHING;

-- materials1 경매의 현재 입찰가 업데이트
UPDATE auctions 
SET 
  current_bid = 14000000,
  total_bid_amount = 14000000,
  bidder_count = bidder_count + 1
WHERE id = 'materials1';

-- ============================================
-- 📊 크론 실행 모니터링 설정
-- ============================================

-- 크론 실행 로그 확인을 위한 뷰 생성 (임시)
DROP VIEW IF EXISTS cron_monitor_view;
CREATE TEMPORARY VIEW cron_monitor_view AS
SELECT 
  job_name,
  status,
  started_at,
  completed_at,
  duration_ms,
  success_count,
  error_message,
  (metadata->>'processed_count')::INTEGER as processed,
  (metadata->>'successful_count')::INTEGER as successful,
  (metadata->>'failed_count')::INTEGER as failed
FROM cron_execution_logs 
WHERE job_type = 'auction' 
  AND started_at >= NOW() - INTERVAL '10 minutes'
ORDER BY started_at DESC;

-- ============================================
-- 🎉 테스트 준비 완료 알림
-- ============================================

DO $$
DECLARE
  next_cron_1 TIMESTAMP := DATE_TRUNC('minute', NOW()) + INTERVAL '1 minute';
  next_cron_2 TIMESTAMP := DATE_TRUNC('minute', NOW()) + INTERVAL '2 minutes';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🤖 크론 기반 경매 테스트 시나리오 설정 완료!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 테스트 시나리오:';
  RAISE NOTICE '  1. scrap3 (황동) - 이미 종료, 다음 크론에서 처리 ✅';
  RAISE NOTICE '  2. scrap1 (알루미늄) - % 정각 종료, 정개발 낙찰 실패 예정 💔', TO_CHAR(next_cron_1, 'HH24:MI');
  RAISE NOTICE '  3. materials1 (H빔) - % 정각 종료, 정개발 낙찰 성공 예정 🏆', TO_CHAR(next_cron_2, 'HH24:MI');
  RAISE NOTICE '';
  RAISE NOTICE '👤 테스트 사용자: 정개발 (4ede4267-2d7c-4f83-8d9b-cb73eb96698e)';
  RAISE NOTICE '📱 전화번호: 01012345678';
  RAISE NOTICE '';
  RAISE NOTICE '⏰ 크론 스케줄: auction-end-processor 매분 정각 자동 실행';
  RAISE NOTICE '🔄 모니터링: 하단 쿼리들로 실시간 확인 가능';
END
$$;

-- ============================================
-- 🔍 실시간 모니터링 쿼리들
-- ============================================

-- 📊 현재 테스트 상황 요약
SELECT '=== 🎯 테스트 경매 현황 ===' as info;
SELECT 
  id,
  LEFT(title, 25) as title,
  status,
  TO_CHAR(end_time, 'HH24:MI:SS') as end_time,
  CASE 
    WHEN end_time <= NOW() THEN '🔴 종료됨'
    WHEN end_time <= NOW() + INTERVAL '1 minute' THEN '🟡 곧 종료'
    ELSE '🟢 진행중'
  END as time_status,
  current_bid,
  bidder_count
FROM auctions 
WHERE id IN ('scrap1', 'scrap3', 'materials1')
ORDER BY end_time;

-- 🙋‍♂️ 정개발 입찰 현황
SELECT '=== 🙋‍♂️ 정개발 입찰 현황 ===' as info;
SELECT 
  ab.auction_id,
  LEFT(a.title, 20) as title,
  ab.amount as my_bid,
  ab.is_top_bid,
  a.current_bid as auction_top_bid,
  CASE 
    WHEN ab.is_top_bid THEN '🏆 최고가'
    WHEN ab.amount < a.current_bid THEN '💔 밀림'
    ELSE '❓ 확인 필요'
  END as bid_status,
  TO_CHAR(a.end_time, 'HH24:MI:SS') as end_time
FROM auction_bids ab
JOIN auctions a ON ab.auction_id = a.id
WHERE ab.user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e'
  AND a.id IN ('scrap1', 'scrap3', 'materials1')
ORDER BY a.end_time;

-- ⏰ 크론 작업 상태 확인
SELECT '=== ⏰ 크론 작업 상태 ===' as info;
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '🟢 활성'
    ELSE '🔴 비활성'
  END as status
FROM cron.job 
WHERE jobname LIKE '%auction%';

-- 📈 경매 결과 테이블 상태
SELECT '=== 📈 경매 결과 현황 ===' as info;
SELECT 
  COUNT(*) as total_results,
  COUNT(*) FILTER (WHERE result_type = 'successful') as successful,
  COUNT(*) FILTER (WHERE result_type = 'failed') as failed
FROM auction_results;

-- ============================================
-- 🔄 실시간 모니터링 명령어 가이드
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 === 실시간 모니터링 명령어 === 🔄';
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣ 크론 실행 로그 확인:';
  RAISE NOTICE '   docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "SELECT * FROM cron_monitor_view;"';
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣ 경매 결과 확인:';
  RAISE NOTICE '   docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "';
  RAISE NOTICE '   SELECT ar.auction_id, LEFT(a.title,20) as title, ar.result_type, ';
  RAISE NOTICE '          CASE WHEN ar.winning_user_id = ''4ede4267-2d7c-4f83-8d9b-cb73eb96698e'' THEN ''정개발 낙찰'' ELSE ''타인 낙찰'' END as winner,';
  RAISE NOTICE '          TO_CHAR(ar.processed_at, ''HH24:MI:SS'') as processed_time';
  RAISE NOTICE '   FROM auction_results ar JOIN auctions a ON ar.auction_id = a.id ORDER BY ar.processed_at DESC;"';
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣ 30초마다 자동 모니터링:';
  RAISE NOTICE '   watch -n 30 "docker exec supabase_db_metacat2 psql -U postgres -d postgres -c ''SELECT COUNT(*) as results FROM auction_results''"';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 크론이 정각에 자동 실행됩니다. 기다리시거나 모니터링 명령어로 확인하세요!';
END
$$;