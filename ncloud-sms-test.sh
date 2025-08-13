#!/bin/bash

# 네이버 클라우드 SMS API 테스트 스크립트
# 
# 사용 방법:
# 1. 환경 변수로 설정: set -a && source .env.local && set +a && ./ncloud-sms-test.sh
# 2. 직접 변수 설정: NC_SMS_ACCESS_KEY="..." NC_SMS_SECRET_KEY="..." ./ncloud-sms-test.sh

# API 인증 정보 (환경 변수 필수)
if [ -z "$NC_SMS_ACCESS_KEY" ] || [ -z "$NC_SMS_SECRET_KEY" ] || [ -z "$NC_SMS_SERVICE_ID" ] || [ -z "$NC_SMS_FROM_NUMBER" ]; then
    echo "❌ 필수 환경 변수가 설정되지 않았습니다."
    echo ""
    echo "다음 중 하나의 방법으로 환경 변수를 설정하세요:"
    echo ""
    echo "1. .env.local 파일 사용:"
    echo "   set -a && source .env.local && set +a && ./ncloud-sms-test.sh"
    echo ""
    echo "2. 직접 설정:"
    echo "   NC_SMS_ACCESS_KEY=\"your_key\" NC_SMS_SECRET_KEY=\"your_secret\" \\"
    echo "   NC_SMS_SERVICE_ID=\"your_service_id\" NC_SMS_FROM_NUMBER=\"your_number\" \\"
    echo "   ./ncloud-sms-test.sh"
    echo ""
    echo "필수 환경 변수:"
    echo "  - NC_SMS_ACCESS_KEY: ${NC_SMS_ACCESS_KEY:-❌ 미설정}"
    echo "  - NC_SMS_SECRET_KEY: ${NC_SMS_SECRET_KEY:-❌ 미설정}"
    echo "  - NC_SMS_SERVICE_ID: ${NC_SMS_SERVICE_ID:-❌ 미설정}"
    echo "  - NC_SMS_FROM_NUMBER: ${NC_SMS_FROM_NUMBER:-❌ 미설정}"
    exit 1
fi

TO_NUMBER="${TO_NUMBER:-01067380002}"           # 수신번호 (테스트용)

# API 엔드포인트
API_URL="https://sens.apigw.ntruss.com"
URI="/sms/v2/services/${NC_SMS_SERVICE_ID}/messages"
FULL_URL="${API_URL}${URI}"

# 현재 타임스탬프 (밀리초)
TIMESTAMP=$(date +%s)000

# 메시지 내용
MESSAGE_CONTENT="[메타캣] 인증번호는 [123456]입니다."

# 요청 본문 생성
REQUEST_BODY=$(cat <<EOF
{
  "type": "SMS",
  "contentType": "COMM",
  "countryCode": "82",
  "from": "${NC_SMS_FROM_NUMBER}",
  "content": "${MESSAGE_CONTENT}",
  "messages": [
    {
      "to": "${TO_NUMBER}",
      "content": "${MESSAGE_CONTENT}"
    }
  ]
}
EOF
)

# 시그니처 생성을 위한 문자열
METHOD="POST"
NEWLINE=$'\n'
MESSAGE="${METHOD} ${URI}${NEWLINE}${TIMESTAMP}${NEWLINE}${NC_SMS_ACCESS_KEY}"

# HMAC-SHA256 시그니처 생성
SIGNATURE=$(echo -ne "$MESSAGE" | openssl dgst -sha256 -hmac "$NC_SMS_SECRET_KEY" -binary | base64)

echo "=== 네이버 클라우드 SMS API 테스트 ==="
echo "환경 변수 정보:"
echo "  NC_SMS_ACCESS_KEY: ${NC_SMS_ACCESS_KEY:0:20}..."
echo "  NC_SMS_SERVICE_ID: $NC_SMS_SERVICE_ID"
echo "  NC_SMS_FROM_NUMBER: $NC_SMS_FROM_NUMBER"
echo ""
echo "테스트 정보:"
echo "  타임스탬프: $TIMESTAMP"
echo "  요청 URL: $FULL_URL"
echo "  발신번호: $NC_SMS_FROM_NUMBER"
echo "  수신번호: $TO_NUMBER"
echo "  메시지: $MESSAGE_CONTENT"
echo ""

# API 호출
echo "API 호출 중..."
RESPONSE=$(curl -s -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-ncp-apigw-timestamp: $TIMESTAMP" \
  -H "x-ncp-iam-access-key: $NC_SMS_ACCESS_KEY" \
  -H "x-ncp-apigw-signature-v2: $SIGNATURE" \
  -d "$REQUEST_BODY" \
  "$FULL_URL")

# 응답 분리 (마지막 3자리는 HTTP 상태 코드)
HTTP_CODE="${RESPONSE: -3}"
RESPONSE_BODY="${RESPONSE%???}"

echo "HTTP 상태 코드: $HTTP_CODE"
echo "응답 본문:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

# 결과 분석
if [ "$HTTP_CODE" = "202" ]; then
    echo ""
    echo "✅ SMS 발송 성공!"
    echo "메시지가 성공적으로 발송되었습니다."
else
    echo ""
    echo "❌ SMS 발송 실패!"
    echo "HTTP 상태 코드: $HTTP_CODE"
    echo "오류 내용을 확인하고 설정을 점검해주세요."
fi
