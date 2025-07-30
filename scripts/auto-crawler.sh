#!/bin/bash

# LME 자동 크롤링 스크립트

# 환경 변수 로드 (한글 주석 필터링)
# .env.local 파일에서 환경 변수 로드 (우선순위)
if [ -f .env.local ]; then
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env.local | sed 's/[[:space:]]*#.*$//' | xargs)
elif [ -f .env ]; then
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' .env | sed 's/[[:space:]]*#.*$//' | xargs)
fi

# 필수 환경 변수 확인
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ 환경 변수가 설정되지 않았습니다."
  echo "   .env.local 파일을 생성하고 다음 변수들을 설정하세요:"
  echo "   - SUPABASE_URL"
  echo "   - SUPABASE_ANON_KEY"
  echo ""
  echo "   예시: cp .env.local.example .env.local"
  exit 1
fi

# 크롤링 간격 설정 (환경변수 사용)
CRAWLER_INTERVAL=${LME_CRAWLER_INTERVAL:-60}

echo "🕐 LME 자동 크롤링 시작 - $(date)"
echo "📍 Supabase URL: $SUPABASE_URL"
echo "⏱️  실행 간격: ${CRAWLER_INTERVAL}초"
echo "🔄 ${CRAWLER_INTERVAL}초마다 실행됩니다. Ctrl+C로 중단하세요."
echo ""

# 카운터
count=1

while true; do
    echo "🔄 실행 #${count} - $(date '+%Y-%m-%d %H:%M:%S')"
    
    # LME 크롤링 호출
    response=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/lme-crawler" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null)
    
    # 결과 확인 (공백 무시하고 체크)
    if echo "$response" | grep -q '"success"[[:space:]]*:[[:space:]]*true'; then
        metals_count=$(echo "$response" | grep -o '"crawled_metals"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*')
        duration=$(echo "$response" | grep -o '"duration_ms"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*')
        
        # 실제 거래 날짜 추출
        trade_dates=$(echo "$response" | grep -o '"price_date":"[^"]*"' | sort -u | head -3)
        
        echo "   ✅ 성공: ${metals_count}개 금속, ${duration}ms"
        echo "   📅 거래일: $(echo "$trade_dates" | cut -d'"' -f4 | tr '\n' ' ')"
    else
        echo "   ❌ 실패"
        echo "$response" | head -3
    fi
    
    echo ""
    ((count++))
    
    # 환경변수 간격으로 대기
    echo "⏳ ${CRAWLER_INTERVAL}초 대기 중..."
    sleep $CRAWLER_INTERVAL
done