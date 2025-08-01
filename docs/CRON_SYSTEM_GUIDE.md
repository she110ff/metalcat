# 🕒 Cron 시스템 관리 가이드

## 🏗️ 시스템 개요

확장 가능한 pg_cron 기반의 자동화 시스템으로, Edge Function을 정기적으로 실행하여 데이터 크롤링 및 배치 작업을 수행합니다.

### 주요 구성 요소

- **pg_cron**: PostgreSQL 기반 스케줄러
- **app_config**: 환경별 설정 관리 테이블
- **cron_execution_logs**: 통합 실행 로그 시스템
- **모니터링 함수들**: 실시간 상태 확인 및 통계

---

## ⚙️ 기본 설정

### 현재 환경 설정

```sql
-- 환경 설정 (local/staging/production)
SELECT update_app_config('current_environment', 'local', 'system');

-- 크롤러 URL 설정
SELECT update_app_config(
    'lme_crawler_url',
    'http://host.docker.internal:54331/functions/v1/lme-crawler',
    'local'
);
```

### 설정 확인

```sql
-- 현재 환경 확인
SELECT get_current_environment_simple();

-- 모든 설정 보기
SELECT * FROM get_current_app_config();
```

---

## 🕐 크론 시간 변경

### 1. 간편 변경 (권장)

```sql
-- 함수 사용 (한 줄로 변경 + 자동 기록)
SELECT update_cron_schedule('lme-crawler-minutely', '*/15 * * * *', '15분마다 실행');
```

### 2. 수동 변경

```sql
-- 기존 제거
SELECT cron.unschedule('lme-crawler-minutely');

-- 새로 생성
SELECT cron.schedule('lme-crawler-minutely', '*/30 * * * *', 'SELECT run_lme_crawler();');
```

### 3. 자주 사용하는 스케줄 패턴

| 패턴                 | 설명          | 용도      |
| -------------------- | ------------- | --------- |
| `* * * * *`          | 매분          | 테스트    |
| `*/5 * * * *`        | 5분마다       | 실시간    |
| `*/15 * * * *`       | 15분마다      | **권장**  |
| `*/30 * * * *`       | 30분마다      | 일반적    |
| `0 * * * *`          | 매시간 정각   | 배치      |
| `0 9-18 * * MON-FRI` | 평일 업무시간 | 업무용    |
| `0 2 * * *`          | 매일 새벽 2시 | 일일 작업 |

---

## 📊 모니터링 및 관리

### 실시간 상태 확인

```sql
-- 모든 크론 잡 상태
SELECT * FROM get_cron_jobs_status();

-- 시스템 상태 (JSON)
SELECT get_cron_system_health();

-- LME 크롤러 통계 (최근 24시간)
SELECT * FROM get_crawler_stats('lme', 24);
```

### 실행 로그 확인

```sql
-- 최근 10개 실행 기록
SELECT * FROM get_recent_executions('lme', 10);

-- 상세 로그 (새 통합 시스템)
SELECT
    job_type,
    status,
    started_at,
    duration_ms,
    success_count,
    error_message
FROM cron_execution_logs
ORDER BY started_at DESC
LIMIT 10;
```

---

## 🚀 새로운 크롤러 추가

### 1. 설정 추가

```sql
-- URL 설정
SELECT update_app_config(
    'auction_crawler_url',
    'http://host.docker.internal:54331/functions/v1/auction-crawler',
    'local'
);
```

### 2. 함수 생성 (5줄만!)

```sql
CREATE OR REPLACE FUNCTION run_auction_crawler()
RETURNS void AS $$
BEGIN
    PERFORM run_generic_crawler('auction', 'auction_crawler_url', 'auction-crawler-hourly');
END;
$$ LANGUAGE plpgsql;
```

### 3. 크론 잡 등록

```sql
-- 매시간 실행
SELECT cron.schedule('auction-crawler-hourly', '0 * * * *', 'SELECT run_auction_crawler();');
```

---

## 🛠️ 문제 해결

### 크론 잡이 실행되지 않을 때

```sql
-- 1. 크론 잡 상태 확인
SELECT jobname, schedule, active FROM cron.job;

-- 2. 최근 오류 확인
SELECT error_message, started_at
FROM cron_execution_logs
WHERE status = 'failed'
ORDER BY started_at DESC
LIMIT 5;

-- 3. Edge Function 서버 확인 (로컬)
-- 터미널에서: supabase functions serve --no-verify-jwt
```

### 실행 시간이 너무 오래 걸릴 때

```sql
-- 평균 실행 시간 확인
SELECT
    job_type,
    AVG(duration_ms) as avg_duration_ms,
    MAX(duration_ms) as max_duration_ms
FROM cron_execution_logs
WHERE status = 'success'
GROUP BY job_type;
```

### 로그 정리 (성능 최적화)

```sql
-- 30일 이전 로그 삭제
DELETE FROM cron_execution_logs
WHERE started_at < NOW() - INTERVAL '30 days';
```

---

## 📈 성능 최적화

### 권장 설정

- **LME 크롤러**: `*/15 * * * *` (15분마다)
- **경매 크롤러**: `0 * * * *` (매시간)
- **통계 작업**: `0 3 * * *` (매일 새벽 3시)

### 서버 부하 분산

```sql
-- 시간대를 다르게 설정
SELECT update_cron_schedule('lme-crawler', '5,20,35,50 * * * *');    -- 5분, 20분, 35분, 50분
SELECT update_cron_schedule('auction-crawler', '0 * * * *');         -- 정각
SELECT update_cron_schedule('stats-generator', '0 3 * * *');         -- 새벽 3시
```

---

## 🔧 유용한 명령어 모음

### 일상적인 관리

```sql
-- 전체 시스템 상태 체크
SELECT get_cron_system_health();

-- 특정 크롤러 일시 중지
SELECT cron.unschedule('lme-crawler-minutely');

-- 크롤러 재시작
SELECT cron.schedule('lme-crawler-minutely', '*/15 * * * *', 'SELECT run_lme_crawler();');

-- 수동 실행 (테스트용)
SELECT run_lme_crawler();
```

### 설정 백업 및 복원

```sql
-- 설정 백업 (JSON)
SELECT jsonb_pretty(jsonb_agg(to_jsonb(t)))
FROM app_config t;

-- 크론 잡 목록 백업
SELECT jsonb_pretty(jsonb_agg(to_jsonb(t)))
FROM cron.job t;
```

---

## 📋 체크리스트

### 배포 전 확인사항

- [ ] 환경 설정 (`current_environment`) 올바른지 확인
- [ ] 크롤러 URL이 환경에 맞게 설정되었는지 확인
- [ ] Edge Function이 정상 작동하는지 테스트
- [ ] 크론 스케줄이 적절한지 검토

### 운영 중 정기 점검

- [ ] 시스템 상태 확인 (`get_cron_system_health()`)
- [ ] 실패율 모니터링 (성공률 90% 이상 유지)
- [ ] 로그 크기 확인 및 정리
- [ ] 성능 지표 검토 (평균 실행 시간)

---

## 🚨 알람 및 알림

### 실패 감지 쿼리

```sql
-- 최근 1시간 내 실패 2회 이상 시 알람
SELECT
    job_type,
    COUNT(*) as failure_count
FROM cron_execution_logs
WHERE status = 'failed'
AND started_at >= NOW() - INTERVAL '1 hour'
GROUP BY job_type
HAVING COUNT(*) >= 2;
```

### 성능 저하 감지

```sql
-- 평소보다 5배 이상 느린 실행 감지
WITH avg_times AS (
    SELECT job_type, AVG(duration_ms) as avg_duration
    FROM cron_execution_logs
    WHERE status = 'success'
    AND started_at >= NOW() - INTERVAL '7 days'
    GROUP BY job_type
)
SELECT
    cel.job_type,
    cel.duration_ms,
    at.avg_duration,
    (cel.duration_ms / at.avg_duration) as slowdown_ratio
FROM cron_execution_logs cel
JOIN avg_times at ON cel.job_type = at.job_type
WHERE cel.started_at >= NOW() - INTERVAL '1 hour'
AND cel.duration_ms > at.avg_duration * 5;
```

---

## 📞 지원 및 문의

시스템 관련 문제가 발생하면:

1. **로그 확인**: `get_recent_executions()`로 최근 실행 기록 점검
2. **시스템 상태**: `get_cron_system_health()`로 전체 상태 확인
3. **Edge Function**: 로컬에서 `supabase functions serve` 실행 상태 점검
4. **네트워크**: Docker에서 `host.docker.internal` 접근 가능 여부 확인

---

_마지막 업데이트: 2025-08-01_
_버전: 1.0_
