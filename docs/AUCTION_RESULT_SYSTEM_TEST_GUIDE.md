# 🏆 경매 낙찰/유찰 시스템 테스트 가이드

경매 낙찰/유찰 자동 결정 시스템을 로컬 환경에서 직접 테스트하고 검증하는 방법을 설명합니다.

## 📋 개요

이 가이드는 Phase 1과 Phase 2에서 구현된 경매 낙찰/유찰 시스템의 전체 기능을 단계별로 테스트하는 방법을 제공합니다. **크론 자동 처리**와 **수동 처리** 두 가지 방식을 모두 지원하며, 실제 시나리오를 시뮬레이션하여 시스템의 정확한 동작을 검증할 수 있습니다.

### 🎯 테스트 시나리오

1. **낙찰 성공**: 정개발이 최고가로 입찰하여 낙찰받는 상황 (`materials1`)
2. **낙찰 실패**: 정개발이 입찰했지만 다른 사용자에게 낙찰되는 상황 (`scrap1`)
3. **유찰**: 입찰자가 없거나 시작가에 미달하는 상황 (`test_no_bids`)
4. **거래 정보 자동 생성**: 낙찰 시 결제/배송 정보 자동 생성
5. **프론트엔드 UI 검증**:
   - 🎉 "축하합니다!" 메시지 (낙찰 성공 시)
   - 💔 "아쉬워요" 메시지 (낙찰 실패 시)
   - 📋 목록 카드 개선사항 (간결한 시간 표시, 레이아웃 최적화)
   - 🔨 마감 임박 상태에서도 입찰 가능

### ⚡ 테스트 방식 선택

| 방식                  | 특징                                                            | 사용 시점             |
| --------------------- | --------------------------------------------------------------- | --------------------- |
| **🤖 크론 자동 처리** | 실제 운영환경과 동일<br/>매분 정각 자동 실행<br/>대기 시간 필요 | 실제 시스템 동작 확인 |
| **⚡ 수동 즉시 처리** | 즉시 결과 확인<br/>개발/디버깅 용도<br/>빠른 테스트             | 빠른 개발 검증        |

## 🚀 빠른 시작

### 1. 전제 조건

- 로컬 Supabase가 실행 중이어야 합니다
- Docker가 실행 중이어야 합니다
- **크론 시스템 마이그레이션**이 적용되어 있어야 합니다 (`20250201000006`)

```bash
# Supabase 상태 확인
npx supabase status

# 필수 마이그레이션 확인 (20250201000005, 20250201000006 포함되어야 함)
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
SELECT
  version,
  CASE
    WHEN version = '20250201000005' THEN '✅ 경매 결과 테이블'
    WHEN version = '20250201000006' THEN '✅ 크론 시스템'
    ELSE '📋 기타 마이그레이션'
  END as description
FROM supabase_migrations.schema_migrations
WHERE version LIKE '202502%'
ORDER BY version;
"

# 크론 시스템 상태 확인
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
SELECT
  jobname,
  schedule,
  active,
  CASE WHEN active THEN '🟢 활성' ELSE '🔴 비활성' END as status
FROM cron.job
WHERE jobname LIKE '%auction%';
"
```

### 2. 환경 초기화

```bash
# 데이터베이스 완전 리셋 (모든 마이그레이션 재적용)
npx supabase db reset

# 크론 시스템 마이그레이션이 누락된 경우 수동 적용
docker cp supabase/migrations/20250201000006_create_auction_processor_functions.sql supabase_db_metacat2:/tmp/
docker exec supabase_db_metacat2 psql -U postgres -d postgres -f /tmp/20250201000006_create_auction_processor_functions.sql

# 시드 데이터 및 정개발 계정 확인
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
-- 전체 사용자 수 확인
SELECT COUNT(*) as total_users FROM users;

-- 정개발 계정 확인
SELECT
  id, phone_number, name,
  CASE WHEN id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' THEN '← 테스트 계정' ELSE '' END as note
FROM users
WHERE phone_number = '01012345678' OR name = '정개발';

-- 테스트 경매 수 확인
SELECT COUNT(*) as total_auctions FROM auctions;
"
```

예상 출력:

```
 total_users
-------------
          6  # 6명의 테스트 사용자 (정개발 포함)

                  id                  | phone_number |  name  |     note
--------------------------------------+--------------+--------+---------------
 4ede4267-2d7c-4f83-8d9b-cb73eb96698e | 01012345678  | 정개발 | ← 테스트 계정

 total_auctions
----------------
             6  # 6개의 테스트 경매
```

## 📝 테스트 실행 방법 선택

> **💡 팁**: 두 가지 방식 중 원하는 방법을 선택하여 진행하세요. 크론 방식은 실제 운영환경 테스트에, 수동 방식은 빠른 개발 검증에 적합합니다.

---

## 🤖 방법 1: 크론 자동 처리 테스트

실제 운영환경과 동일하게 pg_cron이 매분 정각에 자동으로 경매를 처리하는 방식입니다.

### 3-A단계: 크론 기반 시나리오 설정

```bash
# 크론 최적화 테스트 스크립트 실행
docker cp instant-test-scenarios-with-cron.sql supabase_db_metacat2:/tmp/
docker exec supabase_db_metacat2 psql -U postgres -d postgres -f /tmp/instant-test-scenarios-with-cron.sql
```

### 4-A단계: 크론 실행 모니터링

```bash
# 실시간 모니터링 (30초마다 확인)
watch -n 30 "echo '⏰ 현재 시간:' \$(date +'%H:%M:%S') && docker exec supabase_db_metacat2 psql -U postgres -d postgres -c 'SELECT COUNT(*) as processed_auctions FROM auction_results;'"

# 또는 크론 실행 로그 확인
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
SELECT
  job_name,
  status,
  TO_CHAR(started_at, 'HH24:MI:SS') as started_time,
  success_count,
  (metadata->>'processed_count')::INTEGER as processed
FROM cron_execution_logs
WHERE job_type = 'auction'
  AND started_at >= NOW() - INTERVAL '5 minutes'
ORDER BY started_at DESC;
"
```

### 5-A단계: 결과 확인 (크론 실행 후)

```bash
# 최종 결과 확인
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
SELECT
  ar.auction_id,
  LEFT(a.title, 20) as title,
  ar.result_type,
  CASE
    WHEN ar.winning_user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' THEN '🏆 정개발 낙찰'
    WHEN ar.result_type = 'successful' THEN '✅ 타인 낙찰'
    ELSE '❌ 유찰'
  END as result,
  TO_CHAR(ar.processed_at, 'HH24:MI:SS') as processed_time
FROM auction_results ar
JOIN auctions a ON ar.auction_id = a.id
ORDER BY ar.processed_at DESC;
"
```

---

## ⚡ 방법 2: 수동 즉시 처리 테스트

테스트용 함수를 사용하여 즉시 결과를 확인하는 방식입니다.

### 3-B단계: 즉시 테스트 시나리오 설정

```bash
# 기본 테스트 스크립트 실행
docker cp instant-test-scenarios.sql supabase_db_metacat2:/tmp/
docker exec supabase_db_metacat2 psql -U postgres -d postgres -f /tmp/instant-test-scenarios.sql
```

### 4-B단계: 수동 처리 실행

```bash
# 30초~1분 대기 후 처리 함수 실행
sleep 60
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "SELECT test_process_auction_results();"
```

### 5-B단계: 즉시 결과 확인

```bash
# 처리 결과 확인
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
SELECT
  ar.auction_id,
  LEFT(a.title, 20) as title,
  ar.result_type,
  CASE
    WHEN ar.winning_user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' THEN '🏆 정개발 낙찰'
    WHEN ar.result_type = 'successful' THEN '✅ 타인 낙찰'
    ELSE '❌ 유찰'
  END as result
FROM auction_results ar
JOIN auctions a ON ar.auction_id = a.id
ORDER BY ar.processed_at DESC;
"
```

---

## 📱 프론트엔드 UI 테스트

### 6단계: 앱에서 결과 확인

경매 결과 처리가 완료되면 **Expo 앱을 실행**하여 다음 개선사항들을 확인합니다:

#### ✅ 확인 항목들:

1. **경매 목록 카드 개선사항**:

   - 🕐 **간결한 시간 표시**: "3일", "2시간", "45분" (기존 "3일 5시간 남음" → 개선)
   - 📐 **레이아웃 최적화**: 빈 공간 제거, 정보 밀도 향상
   - 🏷️ **상태 배지**: "진행중", "마감임박", "낙찰", "유찰"

2. **경매 상세 화면**:

   - 🔨 **마감 임박 입찰**: "마감임박" 상태에서도 입찰 입력 UI 표시
   - 🎉 **정개발 낙찰 성공**: `materials1`에서 "축하합니다! 낙찰받으셨습니다!" 메시지
   - 💔 **정개발 낙찰 실패**: `scrap1`에서 "아쉬워요" 메시지
   - 👀 **미참여 경매**: `scrap3`에서 일반적인 낙찰 정보만 표시

3. **축하 메시지 정확성**:
   - ✅ **낙찰받은 사용자에게만** "축하합니다!" 표시
   - ❌ **낙찰받지 않은 사용자에게는** 축하 메시지 미표시

#### 📱 앱 실행:

```bash
# 앱 시작 (새 터미널에서)
cd /Users/youngsoo.jung/development/metacat2
npm start
# 또는
npx expo start
```

#### 🔍 확인 순서:

1. **홈 → 경매 목록**: 개선된 카드 레이아웃과 시간 표시 확인
2. **`materials1` 상세**: 정개발 낙찰 성공 → "🎉 축하합니다!" 확인
3. **`scrap1` 상세**: 정개발 낙찰 실패 → "💔 아쉬워요" 확인
4. **`scrap3` 상세**: 정개발 미참여 → 일반 낙찰 정보만 확인

---

## 📊 결과 검증

### 7단계: 데이터베이스 최종 결과 확인

**두 가지 방법 중 어느 것을 선택했든** 동일한 명령어로 최종 결과를 확인할 수 있습니다:

```bash
# 전체 테스트 결과 요약
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
SELECT '🎯 === 전체 테스트 결과 요약 === 🎯' as summary;

SELECT
  ar.auction_id,
  LEFT(a.title, 25) as title,
  ar.result_type,
  ar.winning_amount,
  CASE
    WHEN ar.winning_user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' THEN '🏆 정개발 낙찰!'
    WHEN ar.result_type = 'successful' THEN '✅ 다른 사용자 낙찰'
    ELSE '❌ 유찰'
  END as result_status,
  TO_CHAR(ar.processed_at, 'HH24:MI:SS') as processed_time
FROM auction_results ar
JOIN auctions a ON ar.auction_id = a.id
ORDER BY ar.processed_at DESC;
"
```

### 8단계: 정개발 입찰 현황 확인

```bash
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
-- 정개발 입찰 및 결과 요약
SELECT '🙋‍♂️ === 정개발 입찰 현황 === 🙋‍♂️' as info;

SELECT
  ab.auction_id,
  LEFT(a.title, 20) as title,
  ab.amount as my_bid,
  ab.is_top_bid,
  ar.result_type,
  CASE
    WHEN ar.winning_user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' THEN '🏆 낙찰 성공'
    WHEN ar.result_type = 'successful' THEN '💔 낙찰 실패'
    WHEN ar.result_type = 'failed' THEN '❌ 경매 유찰'
    ELSE '⏳ 처리 중'
  END as final_result
FROM auction_bids ab
JOIN auctions a ON ab.auction_id = a.id
LEFT JOIN auction_results ar ON a.id = ar.auction_id
WHERE ab.user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e'
ORDER BY ab.bid_time DESC;
"
```

### 9단계: 거래 정보 확인

```bash
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
-- 자동 생성된 거래 정보 확인
SELECT '💳 === 거래 정보 === 💳' as info;

SELECT
  ar.auction_id,
  LEFT(a.title, 20) as title,
  at.transaction_status,
  at.delivery_status,
  CASE
    WHEN ar.winning_user_id = '4ede4267-2d7c-4f83-8d9b-cb73eb96698e' THEN '🏆 정개발 구매'
    ELSE '👤 다른 사용자 구매'
  END as buyer_info
FROM auction_transactions at
JOIN auction_results ar ON at.auction_result_id = ar.id
JOIN auctions a ON ar.auction_id = a.id
WHERE ar.result_type = 'successful'
ORDER BY at.created_at DESC;
"
```

## ✅ 예상 결과

### 성공적인 테스트 완료 시 다음과 같은 결과가 나타납니다:

#### 📊 **데이터베이스 결과**:

1. **정개발 낙찰 성공 1건**: `materials1` (H빔, 1,400만원) 🏆
2. **정개발 낙찰 실패 1건**: `scrap1` (알루미늄, 520만원) 💔
3. **다른 사용자 낙찰**: `scrap3` (황동, 기존 낙찰자) ✅
4. **자동 거래 정보 생성**: 모든 낙찰에 대해 `transaction_status: 'pending'` 생성

#### 📱 **프론트엔드 UI 결과**:

1. **경매 목록 개선사항**:

   - ✅ 간결한 시간 표시: "3일", "2시간", "45분"
   - ✅ 레이아웃 최적화: 빈 공간 제거, 정보 밀도 향상
   - ✅ 정확한 상태 배지: "진행중", "마감임박", "낙찰", "유찰"

2. **경매 상세 화면**:

   - ✅ 마감 임박 입찰 가능: `ending` 상태에서도 입찰 UI 표시
   - ✅ 정개발 낙찰 성공 시: "🎉 축하합니다! 낙찰받으셨습니다!"
   - ✅ 정개발 낙찰 실패 시: "💔 아쉬워요" 메시지
   - ✅ 미참여 경매: 일반적인 낙찰 정보만 표시

3. **축하 메시지 정확성**:
   - ✅ 낙찰받은 사용자에게만 축하 메시지 표시
   - ✅ 낙찰받지 않은 사용자에게는 축하 메시지 미표시

## 🔧 문제 해결

### 일반적인 문제들

1. **크론 시스템 마이그레이션 누락**:

   ```bash
   # 크론 시스템 수동 적용
   docker cp supabase/migrations/20250201000006_create_auction_processor_functions.sql supabase_db_metacat2:/tmp/
   docker exec supabase_db_metacat2 psql -U postgres -d postgres -f /tmp/20250201000006_create_auction_processor_functions.sql

   # 마이그레이션 기록 추가
   docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
   INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20250201000006') ON CONFLICT DO NOTHING;
   "
   ```

2. **정개발 계정 누락**:

   ```bash
   # 수동으로 정개발 계정 추가
   docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
   INSERT INTO users (id, phone_number, name, address, is_phone_verified, created_at)
   VALUES ('4ede4267-2d7c-4f83-8d9b-cb73eb96698e', '01012345678', '정개발', '서울특별시 강남구', true, NOW())
   ON CONFLICT (phone_number) DO NOTHING;
   "
   ```

3. **크론 작업 미등록**:

   ```bash
   # 크론 작업 수동 등록
   docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "
   SELECT cron.schedule('auction-end-processor', '* * * * *', 'SELECT process_ended_auctions();');
   SELECT cron.schedule('auction-status-updater', '*/5 * * * *', 'SELECT update_auction_status_realtime();');
   "
   ```

4. **전체 환경 리셋**:
   ```bash
   # 완전 초기화 후 재시작
   npx supabase db reset
   docker cp supabase/migrations/20250201000006_create_auction_processor_functions.sql supabase_db_metacat2:/tmp/
   docker exec supabase_db_metacat2 psql -U postgres -d postgres -f /tmp/20250201000006_create_auction_processor_functions.sql
   ```

### 디버깅 명령어

```bash
# 함수 존재 확인
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "SELECT proname FROM pg_proc WHERE proname LIKE '%auction%';"

# 크론 작업 상태 확인
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "SELECT * FROM cron.job WHERE jobname LIKE '%auction%';"

# 테이블 존재 확인
docker exec supabase_db_metacat2 psql -U postgres -d postgres -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%auction%';"
```

## 🚀 다음 단계

테스트가 성공적으로 완료되면:

1. **✅ 완료된 개선사항들**:

   - 크론 기반 자동 경매 처리 시스템
   - 프론트엔드 UI/UX 개선 (목록 카드, 시간 표시, 레이아웃)
   - 마감 임박 입찰 기능
   - 정확한 축하 메시지 표시

2. **🔄 향후 개발 방향**:
   - 사용자 알림: 낙찰/유찰 결과 푸시 알림 구현
   - 결제 시스템: 낙찰 후 결제 프로세스 구현
   - 실시간 업데이트: WebSocket 기반 실시간 경매 상태 업데이트
   - 분석 대시보드: 경매 성과 분석 및 통계

## 📚 관련 파일

### 🗂️ **테스트 스크립트**:

- `instant-test-scenarios.sql` - 수동 즉시 처리 테스트
- `instant-test-scenarios-with-cron.sql` - 크론 자동 처리 테스트

### 📄 **마이그레이션**:

- `20250201000005_create_auction_results_system.sql` - 경매 결과 테이블
- `20250201000006_create_auction_processor_functions.sql` - 크론 시스템

### 🎨 **프론트엔드 컴포넌트**:

- `components/auction/result/AuctionResultSection.tsx` - 결과 표시 메인 컴포넌트
- `components/auction/result/WinningResultCard.tsx` - 낙찰 성공 카드
- `components/auction/result/LosingResultCard.tsx` - 낙찰 실패 카드
- `screens/auction-list/components/AuctionItemCard.tsx` - 목록 카드 (개선됨)

---

**💡 팁**:

- 개발 중에는 **수동 방식**으로 빠르게 테스트
- 최종 검증 시에는 **크론 방식**으로 실제 환경 테스트
- 문제 발생 시 `npx supabase db reset`으로 환경 초기화 가능
