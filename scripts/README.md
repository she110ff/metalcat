# 개발 스크립트 가이드

로컬 개발 환경에서 사용하는 유틸리티 스크립트들입니다.

## 🚀 주요 스크립트

### 1. **전체 리셋** (`dev-reset.sh`)

```bash
./scripts/dev-reset.sh
```

- 데이터베이스 완전 리셋
- 모든 Edge Functions 배포
- 환경 변수 확인
- 시스템 상태 점검
- **대화형**: 확인 질문과 선택사항 포함

### 2. **빠른 리셋** (`quick-reset.sh`)

```bash
./scripts/quick-reset.sh
```

- 질문 없이 바로 실행
- 데이터베이스 리셋 + 핵심 함수만 배포
- 개발 중 빠른 테스트용

### 3. **함수 배포** (`deploy-functions.sh`)

```bash
# 모든 함수 배포
./scripts/deploy-functions.sh

# 특정 함수만 배포
./scripts/deploy-functions.sh lme-crawler env-debug

# 단일 함수 배포
./scripts/deploy-functions.sh lme-crawler
```

## 📋 일반적인 개발 워크플로우

### 새로운 마이그레이션 작업할 때:

```bash
./scripts/dev-reset.sh
```

### 함수 코드만 수정했을 때:

```bash
./scripts/deploy-functions.sh lme-crawler
```

### 빠른 테스트가 필요할 때:

```bash
./scripts/quick-reset.sh
```

## 🔧 기타 유틸리티

### 기존 스크립트들:

- `auto-crawler.sh` - LME 크롤러 자동 실행
- `config-manager.sh` - 환경 설정 관리
- `test-lme-system.sh` - LME 시스템 테스트

## 🛠️ 문제 해결

### Supabase가 시작되지 않을 때:

```bash
supabase stop
supabase start
```

### 포트 충돌 시:

```bash
supabase stop
# 다른 프로세스 종료 후
supabase start
```

### 환경 변수 문제 시:

```bash
cp env.local.recommended .env.local
# .env.local 파일 수정 후
./scripts/quick-reset.sh
```

## 📊 유용한 확인 명령어

```bash
# Supabase 상태 확인
supabase status

# 데이터베이스 연결
supabase db shell

# 크론 작업 확인
supabase db shell --command "SELECT * FROM cron.job;"

# 함수 로그 확인
supabase functions logs lme-crawler

# 실시간 로그 모니터링
supabase functions logs --follow
```

## 🔗 접속 URL

- **Supabase Studio**: http://localhost:54333
- **API Base**: http://localhost:54331
- **Database**: postgresql://postgres:postgres@localhost:54332/postgres
- **Functions**: http://localhost:54331/functions/v1/

## ⚡ 팁

1. **개발 중 자주 사용**: `./scripts/quick-reset.sh`
2. **마이그레이션 변경 후**: `./scripts/dev-reset.sh`
3. **함수 디버깅**: `supabase functions logs lme-crawler --follow`
4. **환경 확인**: `curl http://localhost:54321/functions/v1/env-debug`
