# 네이버 클라우드 SMS API 간단한 curl 테스트

## 방법 1: .env.local 파일 사용 (권장)

```bash
# 현재 프로젝트의 환경 변수 로드 (안전한 방법)
set -a && source .env.local && set +a

# 또는 env-manager.sh 사용
./scripts/env-manager.sh status  # 현재 환경 확인
```

## 방법 2: 직접 환경 변수 설정

```bash
export NC_SMS_ACCESS_KEY="your_access_key"
export NC_SMS_SECRET_KEY="your_secret_key"
export NC_SMS_SERVICE_ID="your_service_id"
export NC_SMS_FROM_NUMBER="01040447435"
export TO_NUMBER="01067380002"
```

## 시그니처 생성 및 API 호출

```bash
# 1. 타임스탬프 생성 (밀리초)
TIMESTAMP=$(date +%s)000

# 2. 시그니처 메시지 생성
URI="/sms/v2/services/${NC_SMS_SERVICE_ID}/messages"
MESSAGE="POST ${URI}\n${TIMESTAMP}\n${NC_SMS_ACCESS_KEY}"

# 3. HMAC-SHA256 시그니처 생성
SIGNATURE=$(echo -ne "$MESSAGE" | openssl dgst -sha256 -hmac "$NC_SMS_SECRET_KEY" -binary | base64)

# 4. API 호출
curl -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-ncp-apigw-timestamp: $TIMESTAMP" \
  -H "x-ncp-iam-access-key: $NC_SMS_ACCESS_KEY" \
  -H "x-ncp-apigw-signature-v2: $SIGNATURE" \
  -d '{
    "type": "SMS",
    "contentType": "COMM",
    "countryCode": "82",
    "from": "'$NC_SMS_FROM_NUMBER'",
    "content": "[메타캣] 인증번호는 [123456]입니다.",
    "messages": [
      {
        "to": "'$TO_NUMBER'",
        "content": "[메타캣] 인증번호는 [123456]입니다."
      }
    ]
  }' \
  https://sens.apigw.ntruss.com/sms/v2/services/$NC_SMS_SERVICE_ID/messages
```

## 방법 3: 환경변수 확인 및 원라이너 테스트

```bash
# 환경변수 확인
echo "환경변수 상태:"
echo "NC_SMS_ACCESS_KEY: ${NC_SMS_ACCESS_KEY:+설정됨}${NC_SMS_ACCESS_KEY:-❌ 미설정}"
echo "NC_SMS_SECRET_KEY: ${NC_SMS_SECRET_KEY:+설정됨}${NC_SMS_SECRET_KEY:-❌ 미설정}"
echo "NC_SMS_SERVICE_ID: ${NC_SMS_SERVICE_ID:-❌ 미설정}"
echo "NC_SMS_FROM_NUMBER: ${NC_SMS_FROM_NUMBER:-❌ 미설정}"

# 원라이너 테스트 (환경변수 필수)
TIMESTAMP=$(date +%s)000 && \
URI="/sms/v2/services/${NC_SMS_SERVICE_ID}/messages" && \
MESSAGE="POST ${URI}\n${TIMESTAMP}\n${NC_SMS_ACCESS_KEY}" && \
SIGNATURE=$(echo -ne "$MESSAGE" | openssl dgst -sha256 -hmac "$NC_SMS_SECRET_KEY" -binary | base64) && \
curl -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-ncp-apigw-timestamp: $TIMESTAMP" \
  -H "x-ncp-iam-access-key: $NC_SMS_ACCESS_KEY" \
  -H "x-ncp-apigw-signature-v2: $SIGNATURE" \
  -d '{"type":"SMS","contentType":"COMM","countryCode":"82","from":"'$NC_SMS_FROM_NUMBER'","content":"[메타캣] 인증번호는 [123456]입니다.","messages":[{"to":"'${TO_NUMBER:-01067380002}'","content":"[메타캣] 인증번호는 [123456]입니다."}]}' \
  https://sens.apigw.ntruss.com/sms/v2/services/$NC_SMS_SERVICE_ID/messages | jq .
```

## 사용 예시

```bash
# 1. .env.local 파일을 사용하여 테스트
set -a && source .env.local && set +a && [위의 원라이너 실행]

# 2. 직접 환경변수 설정하여 테스트
NC_SMS_ACCESS_KEY="your_key" \
NC_SMS_SECRET_KEY="your_secret" \
NC_SMS_SERVICE_ID="your_service_id" \
NC_SMS_FROM_NUMBER="your_number" \
TO_NUMBER="your_test_number" \
[위의 원라이너 실행]
```
