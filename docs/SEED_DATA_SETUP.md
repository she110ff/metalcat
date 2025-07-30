# 🌱 시드 데이터 생성 가이드

로컬 Supabase 개발 환경에서 LME 가격 데이터를 빠르게 생성하는 방법을 설명합니다.

## 📋 개요

Supabase가 리셋되거나 새로운 개발 환경을 세팅할 때, 실제 LME 웹사이트에서 데이터를 크롤링하여 시드 데이터를 자동으로 생성할 수 있습니다.

## 🚀 빠른 시작

### 1. 전제 조건

- 로컬 Supabase가 실행 중이어야 합니다
- `jq` 명령어가 설치되어 있어야 합니다 (`brew install jq`)

### 2. 시드 데이터 생성

```bash
# 기본 설정으로 시드 데이터 생성 (20페이지, 기존 데이터 삭제)
./scripts/seed-data.sh

# 사용자 정의 설정
./scripts/seed-data.sh [페이지수] [기존데이터삭제]

# 예시
./scripts/seed-data.sh 30 true  # 30페이지 크롤링, 기존 데이터 삭제
./scripts/seed-data.sh 10 false # 10페이지 크롤링, 기존 데이터 유지
```

## 📊 생성되는 데이터

### 데이터 구조

- **테이블**: `lme_processed_prices`
- **레코드 수**: 약 120개/페이지 (20페이지 = 2,400개)
- **날짜 범위**: 최근 1년 7개월간의 데이터
- **금속 종류**: 6개 (구리, 알루미늄, 아연, 납, 니켈, 주석)

### 데이터 필드

```typescript
interface LmeProcessedPrice {
  id: string;
  metal_code: string; // CU, AL, ZN, PB, NI, SN
  metal_name_kr: string; // 구리, 알루미늄, 아연, 납, 니켈, 주석
  price_usd_per_ton: number; // USD/톤 가격
  price_krw_per_kg: number; // KRW/kg 가격 (환율 적용)
  change_percent: number; // 변화율 (%)
  change_type: string; // positive, negative, unchanged
  change_amount_krw: number; // 변화량 (KRW)
  price_date: string; // 거래일 (YYYY-MM-DD)
  exchange_rate: number; // 적용된 환율
  exchange_rate_source: string; // api 또는 fallback
  processed_at: string; // 처리 시간
}
```

## 🔧 수동 실행 방법

스크립트 없이 직접 실행하고 싶은 경우:

### 1. 벌크 크롤링 함수 서빙

```bash
# 백그라운드에서 함수 실행
supabase functions serve lme-bulk-crawler &
```

### 2. API 호출

```bash
curl -X POST "http://127.0.0.1:54331/functions/v1/lme-bulk-crawler" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"maxPages": 20, "clearData": true}'
```

### 3. 데이터 확인

```bash
curl -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Prefer: count=exact" \
  "http://127.0.0.1:54331/rest/v1/lme_processed_prices?select=id&limit=1" -I
```

## 📈 성능 및 예상 소요시간

| 페이지 수 | 예상 데이터 | 예상 소요시간 |
| --------- | ----------- | ------------- |
| 10페이지  | 1,200개     | ~5초          |
| 20페이지  | 2,400개     | ~10초         |
| 30페이지  | 3,600개     | ~15초         |

## 🛠️ 트러블슈팅

### 일반적인 문제들

#### 1. `jq: command not found`

```bash
brew install jq
```

#### 2. Supabase가 실행되지 않음

```bash
supabase start
```

#### 3. 함수 서빙 오류

```bash
# 함수를 다시 시작
pkill -f "supabase functions serve"
supabase functions serve lme-bulk-crawler &
```

#### 4. 환율 API 오류

- 기본 환율(1320 KRW/USD)이 자동으로 사용됩니다
- 인터넷 연결을 확인하세요

#### 5. 데이터 불일치

```bash
# 데이터베이스 상태 확인
supabase status

# 수동으로 데이터 확인
curl -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  "http://127.0.0.1:54331/rest/v1/lme_processed_prices?select=metal_code,price_date&limit=10"
```

## 🔄 정기적인 업데이트

실제 운영 환경에서는 cron job으로 정기적 업데이트를 설정할 수 있습니다:

```bash
# crontab -e 에 추가
# 매일 오전 9시에 최신 1페이지 데이터 추가
0 9 * * * /path/to/metacat2/scripts/seed-data.sh 1 false
```

## 🗂️ Supabase 시드 파일 시스템

### 시드 파일 생성

로컬 DB의 데이터를 SQL 형식으로 추출하여 `supabase/seed.sql` 파일을 생성할 수 있습니다:

```bash
# 현재 DB 데이터를 시드 파일로 생성
node scripts/generate-seed-file.js
```

### 시드 파일 사용법

```bash
# 방법 1: Supabase CLI 사용 (프로덕션 환경)
supabase db reset  # 마이그레이션 + 시드 데이터
supabase db seed   # 시드 데이터만 적용

# 방법 2: psql 직접 사용 (로컬 환경)
psql postgresql://postgres:postgres@127.0.0.1:54332/postgres -f supabase/seed.sql

# 방법 3: 리셋 스크립트 사용
./scripts/reset-with-seed.sh
```

### 시드 파일 구조

- **360개의 LME 가격 데이터** (각 금속별 60개씩)
- **최근 2-3개월간의 실제 데이터**
- **완전한 SQL INSERT 문**
- **데이터 검증 쿼리 포함**

### 시드 파일 vs 벌크 크롤링

| 방법        | 속도      | 데이터 양 | 인터넷 필요 | 용도             |
| ----------- | --------- | --------- | ----------- | ---------------- |
| 시드 파일   | 매우 빠름 | 360개     | ❌          | 개발 초기 설정   |
| 벌크 크롤링 | 보통      | 2400개+   | ✅          | 실제 최신 데이터 |

## 🎯 다음 단계

시드 데이터 생성이 완료되면:

1. **프론트엔드에서 데이터 확인**: Dashboard에서 차트가 정상적으로 표시되는지 확인
2. **API 테스트**: `useLmePrices` 훅이 정상 작동하는지 확인
3. **캐싱 테스트**: React Query 캐싱이 올바르게 동작하는지 확인

## 📞 지원

문제가 발생하면 다음을 확인하세요:

- 로컬 Supabase 로그: `supabase logs`
- 함수 로그: Functions 탭에서 실행 로그 확인
- 네트워크 연결 상태
