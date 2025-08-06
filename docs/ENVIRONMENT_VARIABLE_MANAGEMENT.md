# 환경 변수 관리 가이드

로컬 개발 환경과 원격 프로덕션 환경을 효율적으로 관리하기 위한 가이드입니다.

## 📁 파일 구조

```
metacat2/
├── env.local.recommended      # 로컬 개발용 권장 설정
├── env.remote.recommended     # 원격 프로덕션용 권장 설정
├── .env.local                # 현재 활성 환경 설정
├── scripts/env-manager.sh     # 환경 관리 스크립트
└── supabase/functions/
    └── _shared/env-utils.ts   # 환경 유틸리티 함수
```

## 🔧 환경 설정 분리

### 로컬 개발 환경 (Local)

```bash
ENVIRONMENT=local
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331         # 클라이언트용
SUPABASE_INTERNAL_URL=http://host.docker.internal:54331  # Edge Function용
LOG_LEVEL=debug
DEBUG_MODE=true
ENABLE_MOCK_DATA=true
```

### 원격 프로덕션 환경 (Remote)

```bash
ENVIRONMENT=production
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_INTERNAL_URL=https://your-project.supabase.co   # 원격에서는 동일
LOG_LEVEL=info
DEBUG_MODE=false
ENABLE_MOCK_DATA=false
```

## 🚀 환경 전환 방법

### 1. 스크립트 사용 (권장)

```bash
# 로컬 개발 환경으로 전환
./scripts/env-manager.sh switch-local

# 원격 프로덕션 환경으로 전환
./scripts/env-manager.sh switch-remote

# 현재 환경 상태 확인
./scripts/env-manager.sh status

# 환경 변수 유효성 검사
./scripts/env-manager.sh validate
```

### 2. 수동 전환

```bash
# 로컬 환경으로 전환
cp env.local.recommended .env.local

# 원격 환경으로 전환
cp env.remote.recommended .env.local

# Supabase secrets 업데이트
supabase secrets set EXPO_PUBLIC_SUPABASE_URL="your_url"
supabase secrets set SUPABASE_INTERNAL_URL="your_internal_url"
supabase secrets set ENVIRONMENT="local_or_production"
```

## 🔍 핵심 문제 해결

### Docker 네트워크 문제 (주요 이슈)

**문제**: Edge Function에서 `127.0.0.1:54331`로 데이터베이스 접근 시 실패

**해결**: 환경별 URL 분리

- **클라이언트**: `http://127.0.0.1:54331`
- **Edge Function**: `http://host.docker.internal:54331`

### Edge Function 코드에서 환경 인식

```typescript
import { getEnvironmentConfig } from "../_shared/env-utils.ts";

// 환경 자동 감지 및 적절한 URL 사용
const envConfig = getEnvironmentConfig();
const supabase = createClient(envConfig.supabaseUrl, envConfig.serviceRoleKey);
```

## 📋 환경 관리 체크리스트

### 로컬 개발 시작 시

- [ ] `./scripts/env-manager.sh switch-local` 실행
- [ ] `./scripts/env-manager.sh validate` 로 검증
- [ ] `supabase start` 로 로컬 Supabase 시작
- [ ] Edge Function 테스트

### 프로덕션 배포 시

- [ ] `./scripts/env-manager.sh switch-remote` 실행
- [ ] 프로덕션 환경 변수 값 검증
- [ ] `supabase functions deploy` 실행
- [ ] 원격 Edge Function 테스트

### 문제 해결 시

- [ ] `./scripts/env-manager.sh status` 로 현재 환경 확인
- [ ] Edge Function 로그 확인: `supabase functions logs`
- [ ] 환경 변수 확인: `supabase secrets list`

## 🛡️ 보안 고려사항

### 중요한 환경 변수

- `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`: 절대 노출 금지
- `EXPO_PUBLIC_EXPO_ACCESS_TOKEN`: Expo 빌드용
- 프로덕션 API 키들

### 파일 관리

```bash
# .gitignore에 포함되어야 할 파일들
.env.local
.env.local.backup.*
.env
.env.production
```

### Edge Function Secrets

```bash
# Supabase에 안전하게 저장
supabase secrets set SENSITIVE_KEY="value"
supabase secrets list  # 값은 해시로만 표시
```

## 🔄 자동화 워크플로우

### GitHub Actions 예시

```yaml
- name: Set Environment Variables
  run: |
    if [ "${{ github.ref }}" == "refs/heads/main" ]; then
      ./scripts/env-manager.sh switch-remote
    else
      ./scripts/env-manager.sh switch-local
    fi
```

### 개발 워크플로우

1. **로컬 개발**: `switch-local` → 개발 → 테스트
2. **스테이징**: `switch-staging` → 배포 → 검증
3. **프로덕션**: `switch-remote` → 배포 → 모니터링

## 📊 모니터링 및 디버깅

### 환경 상태 확인

```bash
# 현재 환경 정보
./scripts/env-manager.sh status

# Edge Function 로그
supabase functions logs lme-crawler

# 데이터베이스 연결 테스트
curl -X POST http://127.0.0.1:54331/functions/v1/lme-debug
```

### 일반적인 문제들

1. **Edge Function이 데이터베이스에 접근 못함**

   - `SUPABASE_INTERNAL_URL` 확인
   - Docker 네트워크 설정 검토

2. **환경 변수가 적용 안됨**

   - `supabase secrets list` 확인
   - Edge Function 재배포 필요

3. **로컬/원격 설정 혼재**
   - `./scripts/env-manager.sh validate` 실행
   - 환경 파일 확인

## 🎯 베스트 프랙티스

1. **환경 전환 전 항상 백업**: 스크립트가 자동으로 백업 생성
2. **환경별 설정 분리**: 로컬은 디버그, 원격은 최적화
3. **정기적 검증**: `validate` 명령어로 설정 확인
4. **로그 레벨 조정**: 환경별로 적절한 로그 레벨 설정
5. **보안 의식**: 민감한 정보는 환경 변수로만 관리

---

이 가이드를 통해 로컬과 원격 환경을 효율적으로 관리하고, Edge Function의 네트워크 접근 문제를 해결할 수 있습니다.
