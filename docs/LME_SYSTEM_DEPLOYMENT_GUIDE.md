# LME 가격 크롤링 시스템 배포 가이드

## 🏗️ 시스템 개요

한국 비철금속협회에서 LME(London Metal Exchange) 가격을 실시간으로 크롤링하여 Supabase에 저장하는 시스템입니다.

### 주요 구성 요소

- **데이터베이스**: Supabase PostgreSQL (테이블 + RLS 보안)
- **크롤링**: Supabase Edge Functions (실제 웹사이트 크롤링)
- **데이터**: 6개 금속 (구리, 알루미늄, 아연, 납, 니켈, 주석)

---

## 📋 사전 요구사항

### Supabase 프로젝트 설정

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 연결
supabase link --project-ref your-project-ref
```

---

## 🚀 배포 단계

### 1단계: 데이터베이스 마이그레이션

```bash
# 마이그레이션 적용
supabase db push

# 개별 실행시
supabase migration up --file 20250121000001_create_lme_price_tables.sql
supabase migration up --file 20250121000002_setup_rls_and_security.sql
```

**테이블 확인**:

```sql
-- 생성된 테이블 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'lme_%';

-- 결과: lme_processed_prices, crawling_logs, system_settings
```

### 2단계: Edge Function 배포

```bash
# 크롤링 함수 배포
supabase functions deploy lme-crawler

# 배포 확인
supabase functions list
```

---

## 🧪 테스트

### 기본 크롤링 테스트

```bash
# 로컬 환경
curl -X POST "$SUPABASE_URL/functions/v1/lme-crawler" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# 프로덕션 환경
curl -X POST "https://your-project.supabase.co/functions/v1/lme-crawler" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 데이터 확인

```sql
-- 최신 크롤링 로그
SELECT * FROM crawling_logs
ORDER BY started_at DESC LIMIT 5;

-- 최신 가격 데이터
SELECT * FROM lme_processed_prices
ORDER BY price_date DESC, metal_code LIMIT 12;

-- 금속별 최신 가격
SELECT metal_name_kr, price_krw_per_kg, change_percent
FROM lme_processed_prices
WHERE price_date = (SELECT MAX(price_date) FROM lme_processed_prices)
ORDER BY metal_code;
```

---

## 📊 모니터링

### Supabase 대시보드

1. **Edge Functions > Logs**: 크롤링 실행 로그 확인
2. **Database > Logs**: SQL 쿼리 및 에러 확인
3. **Reports**: 사용량 및 성능 메트릭

### 시스템 상태 체크

```sql
-- 크롤링 상태 확인
SELECT
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE status = 'success') as successful,
    MAX(started_at) as last_run
FROM crawling_logs
WHERE started_at > NOW() - INTERVAL '24 hours';

-- 데이터 최신성 확인
SELECT
    metal_code,
    MAX(price_date) as latest_date,
    COUNT(*) as records_count
FROM lme_processed_prices
GROUP BY metal_code;
```

---

## 🔧 문제 해결

### 1. 크롤링 실패 시

```sql
-- 최근 에러 확인
SELECT started_at, error_message
FROM crawling_logs
WHERE status = 'failed'
ORDER BY started_at DESC LIMIT 5;
```

**일반적인 해결 방법**:

- Edge Function 로그 확인
- 한국비철금속협회 사이트 접근 가능 여부 확인
- 환경 변수 설정 확인

### 2. 데이터 누락 시

```sql
-- 누락된 날짜 확인
SELECT DISTINCT price_date
FROM lme_processed_prices
WHERE price_date >= CURRENT_DATE - 7
ORDER BY price_date DESC;
```

**해결 방법**: 수동으로 크롤링 함수 재실행

### 3. 성능 문제

```sql
-- 데이터베이스 크기 확인
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables
WHERE tablename LIKE 'lme_%';
```

**최적화**:

- 오래된 데이터 정리 (system_settings에서 보존 기간 설정)
- 인덱스 성능 확인

---

## 🔄 자동화 (선택사항)

### pg_cron으로 스케줄링 (Pro 플랜 이상)

```sql
-- 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1분마다 실행 (예시)
SELECT cron.schedule(
    'lme-crawling',
    '* * * * *',
    'SELECT extensions.http_post(
        url => ''https://your-project.supabase.co/functions/v1/lme-crawler'',
        headers => ''{"Authorization": "Bearer YOUR_ANON_KEY"}''::jsonb
    );'
);
```

---

## 📋 체크리스트

**배포 전**:

- [ ] Supabase 프로젝트 생성
- [ ] 환경 변수 설정 (SUPABASE_URL, API 키)
- [ ] 마이그레이션 파일 확인

**배포 후**:

- [ ] 테이블 생성 확인 (`lme_processed_prices`, `crawling_logs`)
- [ ] Edge Function 배포 확인
- [ ] 수동 크롤링 테스트 성공
- [ ] 데이터 삽입 확인 (6개 금속)
- [ ] 로그 기록 확인

**운영 중**:

- [ ] 정기적인 크롤링 상태 모니터링
- [ ] 데이터 품질 검증 (가격 범위, 날짜 등)
- [ ] 에러 로그 주기적 확인

---

_최종 업데이트: 2025-07-30_  
_실제 작동 확인 완료: lme-crawler Edge Function_
