# 환경 변수 설정 가이드

## 📋 **개요**

LME 크롤링 시스템은 보안을 위해 환경 변수를 사용하여 Supabase 연결 정보를 관리합니다.

## 🔧 **로컬 개발 환경 설정**

### **1단계: 환경 변수 파일 생성**

```bash
# 템플릿 파일을 복사하여 실제 환경 변수 파일 생성
cp .env.local.example .env.local
```

### **2단계: 환경 변수 값 확인**

로컬 Supabase가 실행 중인지 확인하고 올바른 URL과 키를 사용하고 있는지 확인하세요:

```bash
# Supabase 로컬 상태 확인
supabase status
```

출력 예시:

```
API URL: http://127.0.0.1:54331
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **3단계: .env.local 파일 수정**

위에서 확인한 값들로 `.env.local` 파일을 업데이트하세요:

```bash
# .env.local 파일 내용
SUPABASE_URL=http://127.0.0.1:54331
SUPABASE_ANON_KEY=실제_anon_key_값
SUPABASE_SERVICE_ROLE_KEY=실제_service_role_key_값

# 기타 설정
LME_CRAWLER_INTERVAL=60
DEFAULT_EXCHANGE_RATE=1320
MAX_PAGES=10

# LME 데이터 소스 URL
LME_SOURCE_URL=https://www.nonferrous.or.kr/stats/?act=sub3
```

## 🌐 **프로덕션 환경 설정**

### **1단계: Supabase 프로젝트 생성**

1. [Supabase 대시보드](https://app.supabase.com)에서 새 프로젝트 생성
2. 프로젝트 설정에서 API 키 확인

### **2단계: 프로덕션 환경 변수 설정**

```bash
# 프로덕션용 .env.local (또는 서버 환경 변수)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# LME 데이터 소스 (필요시 다른 소스로 변경 가능)
LME_SOURCE_URL=https://www.nonferrous.or.kr/stats/?act=sub3
```

## 🧪 **테스트 방법**

### **환경 변수 로드 테스트**

```bash
# 자동 크롤러 스크립트로 환경 변수 테스트
./scripts/auto-crawler.sh
```

성공 시 출력:

```
🕐 LME 자동 크롤링 시작 - 2025-01-21 15:30:00
📍 Supabase URL: http://127.0.0.1:54331
1분마다 실행됩니다. Ctrl+C로 중단하세요.
```

실패 시 출력:

```
❌ 환경 변수가 설정되지 않았습니다.
   .env.local 파일을 생성하고 다음 변수들을 설정하세요:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
```

### **Edge Functions 테스트**

```bash
# 환경 변수가 제대로 설정되었는지 Edge Function 호출 테스트
curl -X POST "$SUPABASE_URL/functions/v1/lme-test" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 🔒 **보안 가이드**

### **중요 사항**

1. **`.env.local` 파일은 절대 커밋하지 마세요**

   - 이미 `.gitignore`에 포함되어 있습니다
   - 실수로 커밋하지 않도록 주의하세요

2. **프로덕션 키는 안전하게 관리하세요**

   - 환경 변수나 보안 서비스 사용
   - 코드에 직접 하드코딩 금지

3. **서비스 롤 키는 특히 조심하세요**
   - 모든 데이터에 접근 가능한 권한
   - 서버 환경에서만 사용

### **권장 프로덕션 설정**

```bash
# 서버 환경 변수로 설정 (예: Ubuntu/CentOS)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 또는 systemd 서비스 파일에서
Environment=SUPABASE_URL=https://your-project.supabase.co
Environment=SUPABASE_ANON_KEY=your-anon-key
Environment=SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🛠️ **문제 해결**

### **자주 발생하는 오류**

1. **"환경 변수가 설정되지 않았습니다"**

   - `.env.local` 파일이 존재하는지 확인
   - 파일 권한 확인 (`chmod 600 .env.local`)
   - 변수명 오타 확인

2. **"Cannot connect to Supabase"**

   - `supabase start`로 로컬 서버 실행 확인
   - URL이 올바른지 확인 (포트 번호 포함)

3. **"Invalid API key"**
   - `supabase status`로 최신 키 확인
   - 키 복사 시 공백이나 줄바꿈 포함되지 않았는지 확인

### **디버깅 팁**

```bash
# 환경 변수 값 확인
echo "SUPABASE_URL: $SUPABASE_URL"
echo "ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..." # 앞 20자만 표시

# Supabase 연결 테스트
curl -s "$SUPABASE_URL/rest/v1/" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY"
```
