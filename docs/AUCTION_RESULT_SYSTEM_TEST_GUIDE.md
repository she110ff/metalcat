# 🏆 경매 낙찰/유찰 시스템 테스트 가이드

경매 낙찰/유찰 자동 결정 시스템을 로컬 환경에서 직접 테스트하고 검증하는 방법을 설명합니다.

## 📋 개요

이 가이드는 Phase 1과 Phase 2에서 구현된 경매 낙찰/유찰 시스템의 전체 기능을 단계별로 테스트하는 방법을 제공합니다. 실제 시나리오를 시뮬레이션하여 시스템의 정확한 동작을 검증할 수 있습니다.

### 🎯 테스트 시나리오

1. **낙찰 성공**: 사용자가 최고가로 입찰하여 낙찰받는 상황
2. **낙찰 실패**: 사용자가 입찰했지만 다른 사용자에게 낙찰되는 상황
3. **유찰**: 입찰자가 없거나 시작가에 미달하는 상황
4. **거래 정보 자동 생성**: 낙찰 시 결제/배송 정보 자동 생성
5. **프론트엔드 연동**: API 데이터로 UI 표시 준비

## 🚀 빠른 시작

### 1. 전제 조건

- 로컬 Supabase가 실행 중이어야 합니다
- Docker가 실행 중이어야 합니다
- 경매 시스템 마이그레이션이 적용되어 있어야 합니다

```bash
# Supabase 상태 확인
npx supabase status

# 마이그레이션 확인 (20250201000005, 20250201000006 포함되어야 함)
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"
```

### 2. 환경 초기화

```bash
# 데이터베이스 완전 리셋 (모든 마이그레이션 재적용)
npx supabase db reset

# 시드 데이터 로드 확인
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM auctions;"
```

예상 출력:

```
 count
-------
     6  # 6명의 테스트 사용자 (정개발 포함)

 count
-------
     6  # 6개의 테스트 경매
```

## 📝 단계별 테스트 실행

### 3단계: 테스트 사용자 확인

정개발 사용자가 올바르게 생성되었는지 확인합니다:

```bash
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
SELECT id, phone_number, name
FROM users
WHERE id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e'
   OR phone_number = '01012345678';
"
```

예상 출력:

```
                  id                  | phone_number |  name
--------------------------------------+--------------+--------
 4ede4267-2d7c-4f83-8d9b-cb73eb96698e | 01012345678  | 정개발
```

### 4단계: 테스트 시나리오 설정

다음 SQL 스크립트를 실행하여 테스트 시나리오를 설정합니다:

```bash
# 임시 스크립트 파일 생성
cat > test-auction-scenarios.sql << 'EOF'
-- 🎯 경매 낙찰/유찰 즉시 테스트 시나리오

-- 1. scrap3 경매를 종료 상태로 설정 (기존 낙찰 테스트용)
UPDATE auctions
SET
  end_time = NOW() - INTERVAL '10 minutes',
  status = 'ended'
WHERE id = 'scrap3';

-- 2. 정개발이 scrap1에 입찰 (최고가 아님)
INSERT INTO auction_bids (
  auction_id, user_id, user_name, amount, price_per_unit, location,
  bid_time, is_top_bid, created_at
) VALUES (
  'scrap1',
  '4ede4267-2d7c-4f83-8d9b-cb73eb96698e',
  '정개발',
  5200000,
  2080,
  '서울 강남구',
  NOW() - INTERVAL '3 hours',
  true,  -- 최고가로 설정
  NOW() - INTERVAL '3 hours'
);

-- 3. 정개발이 materials1에 최고가 입찰
INSERT INTO auction_bids (
  auction_id, user_id, user_name, amount, price_per_unit, location,
  bid_time, is_top_bid, created_at
) VALUES (
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

-- 4. 경매 정보 업데이트
UPDATE auctions
SET
  current_bid = 5200000,
  total_bid_amount = 5200000,
  bidder_count = bidder_count + 1
WHERE id = 'scrap1';

UPDATE auctions
SET
  current_bid = 14000000,
  total_bid_amount = 14000000,
  bidder_count = bidder_count + 1
WHERE id = 'materials1';

-- 5. 테스트 경매들을 종료 상태로 설정
UPDATE auctions
SET status = 'ended'
WHERE id IN ('scrap1', 'materials1');

-- 6. 유찰 테스트용 경매 생성 (입찰자 없음)
INSERT INTO auctions (
  id, user_id, title, description, auction_category, transaction_type,
  current_bid, starting_price, total_bid_amount, status, end_time,
  bidder_count, view_count, address_info, created_at, updated_at
) VALUES (
  'test_no_bids',
  '4ede4267-2d7c-4f83-8d9b-cb73eb96698e',  -- 정개발이 판매자
  '테스트: 입찰자 없는 구리 스크랩',
  '테스트용 경매 - 입찰자가 전혀 없는 상황',
  'scrap',
  'normal',
  0,        -- 현재 입찰가 없음
  3000000,  -- 시작가 300만원
  0,        -- 총 입찰액 없음
  'ended',  -- 이미 종료
  NOW() - INTERVAL '5 minutes',
  0,        -- 입찰자 수 0명
  25,
  '{"postalCode": "06134", "addressType": "road", "address": "서울특별시 강남구 테헤란로 123"}',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
);

-- 7. 스크랩 카테고리 정보 추가
INSERT INTO scrap_auctions (
  auction_id, product_type, weight_kg, weight_unit, price_per_unit, sales_environment, created_at
) VALUES (
  'test_no_bids',
  '{"id": "copper", "name": "구리", "category": "비철금속"}',
  1000,
  'kg',
  3000,
  '{"delivery": "seller", "shippingCost": "buyer"}',
  NOW() - INTERVAL '3 days'
);

-- 설정 완료 확인
SELECT '🎯 테스트 시나리오 설정 완료!' as status;
EOF

# 스크립트 실행
docker cp test-auction-scenarios.sql supabase_db_metacat2:/tmp/test-scenarios.sql
docker exec supabase_db_metacat2 psql -U postgres -d postgres -f /tmp/test-scenarios.sql
```

### 5단계: 경매 결과 처리 함수 생성

경매 결과를 자동으로 처리하는 함수를 생성합니다:

```bash
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
-- 테스트용 경매 결과 처리 함수
CREATE OR REPLACE FUNCTION test_process_auction_results()
RETURNS TEXT AS \$\$
DECLARE
  processed_count INTEGER := 0;
  auction_rec RECORD;
  winning_bid_rec RECORD;
BEGIN
  FOR auction_rec IN
    SELECT id, title, current_bid, starting_price, user_id as seller_id
    FROM auctions
    WHERE status = 'ended'
    AND end_time <= NOW()
    AND id NOT IN (SELECT auction_id FROM auction_results)
  LOOP
    SELECT user_id, amount, user_name
    INTO winning_bid_rec
    FROM auction_bids
    WHERE auction_id = auction_rec.id
    AND is_top_bid = true
    ORDER BY amount DESC, bid_time ASC
    LIMIT 1;

    IF winning_bid_rec.user_id IS NOT NULL AND winning_bid_rec.amount >= auction_rec.starting_price THEN
      INSERT INTO auction_results (
        auction_id, result_type, winning_bid_id, winning_user_id, winning_amount, metadata
      ) VALUES (
        auction_rec.id, 'successful',
        (SELECT id FROM auction_bids WHERE auction_id = auction_rec.id AND user_id = winning_bid_rec.user_id AND amount = winning_bid_rec.amount LIMIT 1),
        winning_bid_rec.user_id, winning_bid_rec.amount,
        jsonb_build_object('seller_id', auction_rec.seller_id, 'winning_user_name', winning_bid_rec.user_name)
      );
      RAISE NOTICE '✅ 낙찰: % - % (%)원', auction_rec.id, auction_rec.title, winning_bid_rec.amount;
    ELSE
      INSERT INTO auction_results (
        auction_id, result_type, metadata
      ) VALUES (
        auction_rec.id, 'failed',
        jsonb_build_object(
          'reason', CASE
            WHEN winning_bid_rec.user_id IS NULL THEN 'no_bids'
            WHEN winning_bid_rec.amount < auction_rec.starting_price THEN 'below_starting_price'
            ELSE 'unknown'
          END,
          'seller_id', auction_rec.seller_id
        )
      );
      RAISE NOTICE '❌ 유찰: % - %', auction_rec.id, auction_rec.title;
    END IF;

    processed_count := processed_count + 1;
  END LOOP;

  RETURN format('처리된 경매: %s개', processed_count);
END;
\$\$ LANGUAGE plpgsql;
"
```

### 6단계: 경매 결과 처리 실행

생성한 함수를 실행하여 경매 결과를 처리합니다:

```bash
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "SELECT test_process_auction_results();"
```

예상 출력:

```
NOTICE:  ✅ 낙찰: scrap3 - 황동 스크랩 950kg (경매 종료) (4750000.00)원
NOTICE:  ✅ 낙찰: scrap1 - 알루미늄 고품질 스크랩 2.5톤 (5200000.00)원
NOTICE:  ✅ 낙찰: materials1 - H빔 200x200 20개 (신품급) (14000000.00)원
NOTICE:  ❌ 유찰: test_no_bids - 테스트: 입찰자 없는 구리 스크랩
 test_process_auction_results
------------------------------
 처리된 경매: 4개
```

## 📊 결과 검증

### 7단계: 전체 결과 확인

```bash
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
-- 전체 테스트 결과 요약
SELECT '🎯 === 전체 테스트 결과 요약 === 🎯' as summary;

SELECT
  ar.auction_id,
  LEFT(a.title, 30) as title,
  ar.result_type,
  ar.winning_amount,
  CASE
    WHEN ar.winning_user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' THEN '🏆 정개발 낙찰!'
    WHEN ar.result_type = 'successful' THEN '✅ 다른 사용자 낙찰'
    ELSE '❌ 유찰'
  END as result_status,
  a.user_id as seller_id,
  CASE
    WHEN a.user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' THEN '🔨 정개발 판매'
    ELSE '👤 다른 사용자 판매'
  END as seller_status
FROM auction_results ar
JOIN auctions a ON ar.auction_id = a.id
ORDER BY ar.created_at DESC;
"
```

### 8단계: 정개발 관련 결과 확인

```bash
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
-- 정개발 낙찰 목록 (구매한 경매)
SELECT '🏆 === 정개발 낙찰 목록 === 🏆' as info;
SELECT
  ar.auction_id,
  a.title,
  ar.winning_amount,
  ar.processed_at,
  at.transaction_status
FROM auction_results ar
JOIN auctions a ON ar.auction_id = a.id
JOIN auction_transactions at ON at.auction_result_id = ar.id
WHERE ar.winning_user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e'
AND ar.result_type = 'successful';

-- 정개발 판매 목록
SELECT '📤 === 정개발 판매 목록 === 📤' as info;
SELECT
  ar.auction_id,
  a.title,
  ar.result_type,
  ar.winning_amount
FROM auction_results ar
JOIN auctions a ON ar.auction_id = a.id
WHERE a.user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e';
"
```

### 9단계: 거래 정보 확인

```bash
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
-- 자동 생성된 거래 정보 확인
SELECT
  at.auction_result_id,
  ar.auction_id,
  LEFT(a.title, 25) as title,
  at.transaction_status,
  at.delivery_status,
  CASE
    WHEN ar.winning_user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' THEN '🏆 정개발'
    ELSE '👤 다른 사용자'
  END as winner
FROM auction_transactions at
JOIN auction_results ar ON at.auction_result_id = ar.id
JOIN auctions a ON ar.auction_id = a.id
ORDER BY at.created_at DESC;
"
```

## 🖼️ 프론트엔드 연동 테스트

### 10단계: API 데이터 시뮬레이션

프론트엔드에서 사용할 데이터 형태를 확인합니다:

```bash
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
-- 경매 목록 (결과 배지 포함)
SELECT '📋 === 경매 목록 (결과 배지) === 📋' as info;
SELECT
  a.id,
  LEFT(a.title, 25) as title,
  a.status,
  ar.result_type,
  CASE
    WHEN ar.result_type = 'successful' THEN '🏆 낙찰'
    WHEN ar.result_type = 'failed' THEN '💔 유찰'
    WHEN a.status = 'ended' THEN '⏳ 처리중'
    ELSE NULL
  END as result_badge
FROM auctions a
LEFT JOIN auction_results ar ON a.id = ar.auction_id
ORDER BY a.end_time DESC;
"
```

## ✅ 예상 결과

### 성공적인 테스트 완료 시 다음과 같은 결과가 나타납니다:

1. **정개발 낙찰 2건**:

   - `scrap1`: 알루미늄 스크랩 (520만원)
   - `materials1`: H빔 20개 (1,400만원)

2. **정개발 판매 유찰 1건**:

   - `test_no_bids`: 구리 스크랩 (입찰자 없음)

3. **다른 사용자 낙찰**:

   - `scrap3`: 황동 스크랩 (475만원)

4. **자동 생성된 거래 정보**:
   - 모든 낙찰 경매에 대해 `transaction_status: 'pending'` 상태의 거래 레코드 생성

## 🔧 문제 해결

### 일반적인 문제들

1. **마이그레이션 누락**:

   ```bash
   # 마이그레이션 재적용
   npx supabase db reset
   ```

2. **시드 데이터 누락**:

   ```bash
   # 시드 데이터 수동 로드
   docker cp supabase/seed.sql supabase_db_metacat2:/tmp/seed.sql
   docker exec supabase_db_metacat2 psql -U postgres -d postgres -f /tmp/seed.sql
   ```

3. **함수 생성 오류**:
   ```bash
   # 함수 목록 확인
   docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "SELECT proname FROM pg_proc WHERE proname LIKE '%auction%';"
   ```

## 🚀 다음 단계

테스트가 성공적으로 완료되면:

1. **프론트엔드 컴포넌트 연동**: Phase 2에서 구현한 `WinningResultCard`, `FailedAuctionCard`, `ResultBadge` 등을 실제 데이터와 연결
2. **실시간 업데이트**: 크론 작업으로 자동 처리되도록 설정
3. **사용자 알림**: 낙찰/유찰 결과 푸시 알림 구현
4. **결제 시스템**: 낙찰 후 결제 프로세스 구현

## 📚 관련 문서

- [CRON_SYSTEM_GUIDE.md](./CRON_SYSTEM_GUIDE.md) - 크론 작업 설정
- [SEED_DATA_SETUP.md](./SEED_DATA_SETUP.md) - 시드 데이터 관리
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - 환경 변수 설정

---

**💡 팁**: 테스트 과정에서 문제가 발생하면 `npx supabase db reset`으로 환경을 초기화하고 다시 시작할 수 있습니다.
