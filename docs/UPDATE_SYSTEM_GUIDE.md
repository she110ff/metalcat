# MetalCat 업데이트 시스템 가이드

## 📱 개요

MetalCat 앱은 Expo의 EAS Update를 사용하여 Over-The-Air (OTA) 업데이트를 지원합니다. 이를 통해 앱스토어 심사 없이도 JavaScript 코드, 스타일, 이미지 등의 변경사항을 사용자에게 즉시 배포할 수 있습니다.

## 🏗️ 아키텍처

### 핵심 컴포넌트

1. **`useAppUpdates` 훅** (`hooks/useAppUpdates.ts`)

   - 업데이트 상태 관리
   - 자동/수동 체크 로직
   - 다운로드 및 적용 기능

2. **업데이트 UI 컴포넌트** (`components/updates/`)

   - `UpdateAvailableModal`: 업데이트 알림 모달
   - `UpdateProgressModal`: 다운로드 진행률 모달
   - `UpdateStatusBadge`: 상태 표시 배지

3. **앱 레이아웃 통합** (`app/_layout.tsx`)

   - 앱 시작 시 자동 업데이트 체크
   - 업데이트 모달 자동 표시

4. **설정 화면** (`screens/profile-screens/profile/simple.tsx`)
   - 수동 업데이트 체크
   - 자동 체크 설정
   - 업데이트 상태 확인

## ⚙️ 설정

### app.json 설정

```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    },
    "android": {
      "versionCode": 1
    },
    "updates": {
      "enabled": true,
      "url": "https://u.expo.dev/YOUR_PROJECT_ID",
      "fallbackToCacheTimeout": 0,
      "checkAutomatically": "ON_LOAD"
    },
    "runtimeVersion": "1.0.0"
  }
}
```

### eas.json 설정

```json
{
  "build": {
    "preview": {
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    },
    "development": {
      "channel": "development"
    }
  }
}
```

> **참고**: `autoIncrement` 설정은 EAS Build에서 지원하지 않습니다.
> 버전 관리는 `app.json`의 `version` 필드를 수동으로 관리하거나,
> EAS CLI의 `--auto-submit` 옵션을 사용하여 자동화할 수 있습니다.

## 🚀 사용 방법

### 버전 관리 전략

#### 버전 구성 요소

- **`version`**: 사용자에게 보이는 버전 (예: "1.0.0")
- **`buildNumber`/`versionCode`**: 개발자용 빌드 식별자 (예: 1, 2, 3)
- **`runtimeVersion`**: 업데이트 호환성 기준

#### Profile별 버전 관리

- **Development**: 수동 버전 관리, 개발용 빌드
- **Preview**: 수동 버전 관리, 테스트용 빌드
- **Production**: 수동 버전 관리, 배포용 빌드

> **참고**: EAS Build에서는 자동 버전 증가를 지원하지 않습니다.
> 버전 관리는 `app.json`의 `version` 필드를 수동으로 변경해야 합니다.

### 개발자용

#### 업데이트 발행

```bash
# 개발 채널
eas update --channel development --message "개발 업데이트"

# 프리뷰 채널
eas update --channel preview --message "프리뷰 업데이트"

# 프로덕션 채널
eas update --channel production --message "프로덕션 업데이트"
```

#### 빌드 및 배포 워크플로우

```bash
# 1. 개발 중 (매일)
eas update --branch development

# 2. 테스트 준비 (주 1-2회)
eas build --profile preview
eas update --branch preview

# 3. 배포 (월 1-2회)
# app.json에서 version 수동 변경 후
eas build --profile production
```

#### 테스트 스크립트 사용

```bash
./scripts/test-update.sh
```

#### 업데이트 목록 확인

```bash
eas update:list --channel production
```

### 사용자용

1. **자동 업데이트**: 앱 시작 시 자동으로 업데이트를 체크합니다
2. **수동 체크**: 프로필 화면 > 업데이트 탭에서 "업데이트 확인" 버튼
3. **설정 변경**: 자동 체크 on/off 설정 가능

## 🔄 업데이트 플로우

### 1. 업데이트 체크

- 앱 시작 시 자동 체크 (24시간 간격)
- 앱 포그라운드 진입 시 체크
- 사용자 수동 체크

### 2. 업데이트 호환성 확인

- **같은 `runtimeVersion`**: 업데이트 가능 ✅
- **다른 `runtimeVersion`**: 업데이트 불가능 ❌
- Profile별로 다른 `runtimeVersion` 설정 가능

### 3. 업데이트 알림

- 업데이트 사용 가능 시 모달 표시
- 현재 버전 및 빌드 번호 표시
- 사용자가 다운로드 여부 선택

### 4. 업데이트 다운로드

- 백그라운드에서 다운로드
- 진행률 표시
- 에러 처리

### 5. 업데이트 적용

- 다운로드 완료 후 재시작 안내
- 앱 재시작 시 새 버전 적용

## 🛠️ 개발 가이드

### 새로운 업데이트 기능 추가

1. **훅 확장**

   ```typescript
   // hooks/useAppUpdates.ts에 새로운 상태/함수 추가
   ```

2. **UI 컴포넌트 생성**

   ```typescript
   // components/updates/에 새로운 컴포넌트 추가
   ```

3. **설정 화면 통합**
   ```typescript
   // screens/profile-screens/profile/simple.tsx에 추가
   ```

### 에러 처리

- 네트워크 오류
- 다운로드 실패
- 업데이트 적용 실패
- 권한 문제

### 테스트

1. **개발 환경**: `__DEV__` 플래그로 업데이트 체크 비활성화
2. **프리뷰 빌드**: preview 채널로 업데이트 테스트
3. **프로덕션 빌드**: production 채널로 실제 배포

### 버전 관리 예시

#### 개발 단계

```bash
# 개발 빌드
eas build --profile development
# 결과: version 1.0.0, buildNumber 1

# 개발 중 업데이트
eas update --branch development
# ✅ 가능: 같은 runtimeVersion
```

#### 테스트 단계

```bash
# 테스트 빌드
eas build --profile preview
# 결과: version 1.0.0, buildNumber 2

# 테스트 중 업데이트
eas update --branch preview
# ✅ 가능: 같은 runtimeVersion
```

#### 배포 단계

```bash
# 1. app.json에서 버전 수동 변경
# "version": "1.0.0" → "version": "1.1.0"

# 2. 배포 빌드
eas build --profile production
# 결과: version 1.1.0, buildNumber 3
```

## 📊 모니터링

### 업데이트 메트릭

- 업데이트 성공률
- 다운로드 시간
- 사용자 수락률
- 에러 발생 빈도

### 로그 확인

```bash
# EAS 로그 확인
eas build:list
eas update:list
```

## 🔒 보안 고려사항

1. **코드 서명**: 업데이트에 코드 서명 적용
2. **채널 분리**: 개발/프리뷰/프로덕션 채널 분리
3. **롤백 계획**: 문제 발생 시 이전 버전으로 롤백

## 🚨 문제 해결

### 일반적인 문제

1. **업데이트가 표시되지 않음**

   - `runtimeVersion` 호환성 확인
   - 채널 설정 확인
   - 네트워크 연결 확인

2. **빌드 번호가 "알 수 없음"으로 표시됨**

   - `app.json`의 `buildNumber`/`versionCode` 설정 확인
   - iOS: `"buildNumber": "1"`
   - Android: `"versionCode": 1`

3. **다운로드 실패**

   - 디스크 공간 확인
   - 네트워크 상태 확인
   - 서버 상태 확인

4. **적용 실패**

   - 앱 재시작 확인
   - 캐시 클리어
   - 강제 업데이트 시도

5. **Profile 간 업데이트 불가능**

   - 다른 `runtimeVersion`을 사용하는 Profile 간에는 업데이트 불가
   - 같은 Profile 내에서만 업데이트 가능

### 디버깅

```typescript
// 개발 환경에서 로그 확인
console.log("업데이트 상태:", updateState);
```

## 📚 참고 자료

- [Expo Updates 공식 문서](https://docs.expo.dev/versions/latest/sdk/updates/)
- [EAS Update 가이드](https://docs.expo.dev/eas-update/)
- [업데이트 API 레퍼런스](https://docs.expo.dev/versions/latest/sdk/updates/#api)
- [버전 관리 가이드](https://docs.expo.dev/eas-update/updating-apps/)
- [Runtime Version 정책](https://docs.expo.dev/eas-update/runtime-versions/)
