# 🔄 경매 등록 성능 최적화 롤백 계획

## 📊 적용된 최적화 내용 요약

### ✅ 완료된 최적화 (2025-01-08)

1. **알림 트리거 비동기화** (`20250108161800_optimize_auction_trigger_async.sql`)

   - 기존 동기 트리거 → 비동기 대기열 시스템
   - 예상 성능 개선: 경매 등록 시간 ~30초 단축

2. **사진 업로드 병렬 처리** (`hooks/auctions/api.ts`)

   - 순차 업로드 → 병렬 업로드 (Promise.allSettled)
   - 예상 성능 개선: 사진 업로드 시간 ~80% 단축

3. **알림 히스토리 배치 INSERT** (`20250108162200_optimize_notification_batch_insert.sql`)
   - 개별 INSERT → 배치 INSERT
   - 예상 성능 개선: 알림 처리 시간 50-70% 단축

### 📈 전체 예상 성능 개선

- **기존**: ~291초 (약 4분 51초)
- **최적화 후**: ~34초 (약 88% 개선)

---

## 🚨 롤백 시나리오

### 시나리오 1: 부분 롤백 (특정 기능만)

#### A. 알림 트리거만 롤백

```sql
-- 파일: rollback_trigger_only.sql

-- 1. 새 트리거 제거
DROP TRIGGER IF EXISTS trigger_auction_notification_queue ON auctions;
DROP FUNCTION IF EXISTS trigger_auction_notification_queue();

-- 2. 대기열 처리 크론 제거
SELECT cron.unschedule('auction-notification-processor');

-- 3. 기존 동기 트리거 복원
CREATE OR REPLACE FUNCTION trigger_auction_create_notification()
RETURNS TRIGGER AS $$
DECLARE
  seller_name TEXT;
  category_text TEXT;
BEGIN
  SELECT COALESCE(name, phone_number, 'Unknown') INTO seller_name
  FROM users WHERE id = NEW.user_id;

  category_text := CASE NEW.auction_category
    WHEN 'scrap' THEN '고철'
    WHEN 'machinery' THEN '중고기계'
    WHEN 'materials' THEN '중고자재'
    WHEN 'demolition' THEN '철거'
    ELSE NEW.auction_category::text
  END;

  -- 원래 동기 방식 복원
  PERFORM send_auction_create_notification(
    NEW.id, NEW.title, category_text, COALESCE(seller_name, 'Unknown')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_auction_notification
  AFTER INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auction_create_notification();
```

#### B. 사진 업로드만 롤백

```typescript
// hooks/auctions/api.ts에서 병렬 처리 코드를 순차 처리로 되돌리기

// 기존 순차 처리 코드로 복원
for (let index = 0; index < auctionData.photos.length; index++) {
  const photo = auctionData.photos[index];
  // ... 순차 처리 로직
}
```

### 시나리오 2: 전체 롤백

#### 완전 롤백 마이그레이션

```bash
# 롤백 마이그레이션 생성
npx supabase migration new rollback_all_performance_optimizations

# 마이그레이션 파일 내용
```

```sql
-- 파일: 20250108170000_rollback_all_performance_optimizations.sql

-- ============================================
-- 1. 비동기 알림 시스템 완전 제거
-- ============================================

-- 크론 작업 제거
SELECT cron.unschedule('auction-notification-processor');

-- 새 트리거 제거
DROP TRIGGER IF EXISTS trigger_auction_notification_queue ON auctions;
DROP FUNCTION IF EXISTS trigger_auction_notification_queue();
DROP FUNCTION IF EXISTS process_auction_notification_queue();

-- 대기열 테이블 제거
DROP TABLE IF EXISTS auction_notification_queue;

-- 성능 모니터링 뷰 제거
DROP VIEW IF EXISTS auction_notification_performance;

-- ============================================
-- 2. 기존 동기 트리거 시스템 복원
-- ============================================

-- 원래 알림 발송 함수 복원 (개별 INSERT 방식)
CREATE OR REPLACE FUNCTION send_auction_create_notification(
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
  all_tokens TEXT[];
  notification_title TEXT;
  notification_body TEXT;
  user_record RECORD;
BEGIN
  SELECT get_current_environment() INTO current_env;

  SELECT array_agg(token) INTO all_tokens
  FROM user_push_tokens
  WHERE is_active = true;

  IF all_tokens IS NULL OR array_length(all_tokens, 1) IS NULL OR array_length(all_tokens, 1) = 0 THEN
    RAISE NOTICE '📱 새 경매 알림 전송 건너뜀: 활성 토큰이 없음';
    RETURN;
  END IF;

  notification_title := '새로운 경매가 등록되었습니다!';
  notification_body := auction_title || ' 경매가 새로 등록되었습니다.';

  -- 기존 개별 INSERT 방식 복원
  FOR user_record IN
    SELECT user_id FROM user_push_tokens WHERE is_active = true
  LOOP
    INSERT INTO notification_history (user_id, notification_type, title, body, data)
    VALUES (
      user_record.user_id,
      'auction_created',
      notification_title,
      notification_body,
      jsonb_build_object(
        'auction_id', auction_id,
        'auction_title', auction_title,
        'auction_category', auction_category,
        'seller_name', seller_name,
        'notification_type', 'auction_created'
      )
    );
  END LOOP;

  -- Edge Function 호출 로직 (기존과 동일)
  IF current_env != 'local' THEN
    -- 기존 Edge Function 호출 코드...
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 기존 동기 트리거 함수 복원
CREATE OR REPLACE FUNCTION trigger_auction_create_notification()
RETURNS TRIGGER AS $$
DECLARE
  seller_name TEXT;
  category_text TEXT;
BEGIN
  SELECT COALESCE(name, phone_number, 'Unknown') INTO seller_name
  FROM users WHERE id = NEW.user_id;

  category_text := CASE NEW.auction_category
    WHEN 'scrap' THEN '고철'
    WHEN 'machinery' THEN '중고기계'
    WHEN 'materials' THEN '중고자재'
    WHEN 'demolition' THEN '철거'
    ELSE NEW.auction_category::text
  END;

  -- 동기적 알림 발송 (원래 방식)
  PERFORM send_auction_create_notification(
    NEW.id, NEW.title, category_text, COALESCE(seller_name, 'Unknown')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 동기 트리거 생성
CREATE TRIGGER trigger_new_auction_notification
  AFTER INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auction_create_notification();

-- 완료 메시지
RAISE NOTICE '모든 성능 최적화가 롤백되었습니다. 기존 동기 방식으로 복원됨.';
```

---

## 📋 롤백 실행 체크리스트

### 사전 준비

- [ ] 현재 상태 백업 (이미 완료: `backups/full_backup_20250807_161710.sql`)
- [ ] 롤백 마이그레이션 파일 준비
- [ ] 애플리케이션 코드 롤백 준비 (사진 업로드 부분)
- [ ] 팀원들에게 롤백 계획 공유

### 롤백 실행 (단계별)

#### 1단계: 로컬 환경에서 테스트

```bash
# 로컬에서 롤백 테스트
npx supabase migration new test_rollback
# (롤백 SQL 작성)
npx supabase migration up --local
```

#### 2단계: 애플리케이션 코드 롤백

```bash
# Git에서 사진 업로드 코드 롤백
git checkout HEAD~1 -- hooks/auctions/api.ts
# 또는 수동으로 순차 처리 코드로 변경
```

#### 3단계: 원격 환경 롤백

```bash
# 프로덕션 환경 롤백
npx supabase db push
```

### 롤백 후 확인사항

- [ ] 경매 등록 기능 정상 작동
- [ ] 알림 발송 정상 작동
- [ ] 사진 업로드 정상 작동
- [ ] 성능 지표 모니터링
- [ ] 에러 로그 확인

---

## 🕐 예상 롤백 시간

| 롤백 범위     | 예상 시간 | 영향도 |
| ------------- | --------- | ------ |
| 알림 트리거만 | 5-10분    | 중간   |
| 사진 업로드만 | 2-5분     | 낮음   |
| 전체 롤백     | 15-30분   | 높음   |

---

## 🚨 비상 롤백 시나리오

### 즉시 롤백이 필요한 경우

#### 1. 알림 트리거 즉시 비활성화

```sql
-- 긴급시 트리거 비활성화
ALTER TABLE auctions DISABLE TRIGGER trigger_auction_notification_queue;

-- 기존 트리거 즉시 활성화
CREATE TRIGGER emergency_notification_trigger
  AFTER INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auction_create_notification();
```

#### 2. 대기열 크론 즉시 중지

```sql
SELECT cron.unschedule('auction-notification-processor');
```

#### 3. 애플리케이션 레벨 즉시 조치

```typescript
// 긴급시 병렬 업로드 비활성화 (환경변수로 제어)
if (process.env.DISABLE_PARALLEL_UPLOAD === "true") {
  // 순차 업로드 로직 사용
}
```

---

## 📞 비상 연락처 및 참고 자료

### 백업 파일 위치

- `backups/schema_backup_20250807_161629.sql`
- `backups/full_backup_20250807_161710.sql`

### 적용된 마이그레이션 파일

- `supabase/migrations/20250108161800_optimize_auction_trigger_async.sql`
- `supabase/migrations/20250108162200_optimize_notification_batch_insert.sql`

### 변경된 애플리케이션 파일

- `hooks/auctions/api.ts` (사진 업로드 병렬 처리)

---

**⚠️ 주의사항**: 롤백 전에는 반드시 현재 상태를 백업하고, 로컬 환경에서 충분히 테스트한 후 프로덕션에 적용하세요.
