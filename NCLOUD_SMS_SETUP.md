# 네이버 클라우드 SMS API 설정 가이드

## 1. 사전 준비사항

### 1.1 네이버 클라우드 플랫폼 계정 생성

- [네이버 클라우드 플랫폼](https://www.ncloud.com) 가입
- 본인인증 및 결제 수단 등록

### 1.2 API 인증키 발급

1. 네이버 클라우드 플랫폼 콘솔 로그인
2. **마이페이지** > **계정관리** > **인증키관리**
3. **API 인증키 관리**에서 **Access Key ID**와 **Secret Key** 확인

### 1.3 SMS 서비스 신청

1. 콘솔에서 **Simple & Easy Notification Service(SENS)** 선택
2. **SMS** 서비스 생성
3. 서비스 ID 확인 (예: ncp:sms:kr:123456789:test-sms)

### 1.4 발신번호 등록

1. SMS 서비스 > **발신번호 관리**
2. 사업자등록증 또는 통신서비스 이용증명원 업로드
3. 승인 대기 (1-2일 소요)

## 2. 테스트 진행

### 2.1 환경 변수 설정

```bash
# ncloud-sms-test.sh 파일에서 다음 값들을 실제 값으로 변경
ACCESS_KEY="your_actual_access_key"
SECRET_KEY="your_actual_secret_key"
SERVICE_ID="your_sms_service_id"
FROM_NUMBER="01012345678"  # 승인받은 발신번호
TO_NUMBER="01087654321"    # 테스트할 수신번호
```

### 2.2 테스트 실행

```bash
./ncloud-sms-test.sh
```

### 2.3 예상 응답

#### 성공 시 (HTTP 202)

```json
{
  "requestId": "1234567890abcdef",
  "requestTime": "2024-01-01T12:00:00.000Z",
  "statusCode": "202",
  "statusName": "success"
}
```

#### 실패 시 예시

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid phone number format",
  "path": "/sms/v2/services/xxx/messages"
}
```

## 3. 일반적인 오류 및 해결 방법

### 3.1 인증 오류 (401)

- **원인**: Access Key 또는 Secret Key 오류
- **해결**: API 인증키 재확인

### 3.2 권한 오류 (403)

- **원인**: SMS 서비스 미신청 또는 발신번호 미승인
- **해결**: SMS 서비스 신청 및 발신번호 승인 확인

### 3.3 잘못된 요청 (400)

- **원인**: 전화번호 형식 오류 또는 필수 파라미터 누락
- **해결**: 요청 형식 재확인

### 3.4 서비스 오류 (404)

- **원인**: 잘못된 서비스 ID
- **해결**: SMS 서비스 콘솔에서 서비스 ID 재확인

## 4. 비용 정보

- SMS 발송 비용: 건당 약 15원 (2024년 기준)
- 월 사용량에 따른 할인 적용
- 자세한 요금은 [네이버 클라우드 플랫폼 요금 안내](https://www.ncloud.com/product/applicationService/sens) 참조

## 5. 다음 단계

테스트가 성공하면 다음 작업을 진행하세요:

1. 환경 변수를 통한 API 키 관리
2. React Native 앱에 SMS API 통합
3. 인증번호 생성 및 검증 로직 구현
4. 오류 처리 및 사용자 경험 개선


