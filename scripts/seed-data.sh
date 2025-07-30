#!/bin/bash

# 시드 데이터 생성 스크립트
# 사용법: ./scripts/seed-data.sh [페이지수] [데이터삭제여부]

set -e

# 기본값 설정
PAGES=${1:-20}
CLEAR_DATA=${2:-true}

echo "🌱 LME 시드 데이터 생성 스크립트"
echo "=================================="
echo "📄 크롤링 페이지 수: $PAGES"
echo "🗑️  기존 데이터 삭제: $CLEAR_DATA"
echo "=================================="

# Supabase 로컬 상태 확인
echo "🔍 로컬 Supabase 상태 확인..."
if ! supabase status > /dev/null 2>&1; then
    echo "❌ 로컬 Supabase가 실행되지 않았습니다."
    echo "💡 다음 명령어로 Supabase를 시작하세요: supabase start"
    exit 1
fi

echo "✅ 로컬 Supabase 실행 중"

# 벌크 크롤링 함수 실행
echo "🚀 벌크 크롤링 시작..."
echo "⏳ 약 ${PAGES}페이지 크롤링 예상 소요 시간: $((PAGES / 2))초"

RESPONSE=$(curl -s -X POST "http://127.0.0.1:54331/functions/v1/lme-bulk-crawler" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -H "Content-Type: application/json" \
  -d "{\"maxPages\": $PAGES, \"clearData\": $CLEAR_DATA}")

# 결과 확인
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')

if [ "$SUCCESS" = "true" ]; then
    TOTAL_DATA=$(echo "$RESPONSE" | jq -r '.data.total_data // 0')
    PAGES_CRAWLED=$(echo "$RESPONSE" | jq -r '.data.pages_crawled // 0')
    DURATION=$(echo "$RESPONSE" | jq -r '.data.duration_ms // 0')
    OLDEST_DATE=$(echo "$RESPONSE" | jq -r '.data.date_range.oldest // "N/A"')
    NEWEST_DATE=$(echo "$RESPONSE" | jq -r '.data.date_range.newest // "N/A"')
    
    echo ""
    echo "🎉 시드 데이터 생성 성공!"
    echo "=================================="
    echo "📊 총 데이터 개수: $TOTAL_DATA"
    echo "📄 크롤링된 페이지: $PAGES_CRAWLED"
    echo "⏱️  소요 시간: ${DURATION}ms"
    echo "📅 데이터 범위: $OLDEST_DATE ~ $NEWEST_DATE"
    echo "=================================="
    
    # 데이터 검증
    echo "🔍 데이터 검증 중..."
    COUNT=$(curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
      -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
      -H "Prefer: count=exact" \
      "http://127.0.0.1:54331/rest/v1/lme_processed_prices?select=id&limit=1" -I | grep "Content-Range" | sed 's/.*\///g' | tr -d '\r')
    
    echo "✅ DB에 저장된 데이터: $COUNT개"
    
    if [ "$COUNT" = "$TOTAL_DATA" ]; then
        echo "🎯 데이터 검증 성공: 크롤링 결과와 DB 저장 결과가 일치합니다!"
    else
        echo "⚠️  데이터 불일치: 크롤링($TOTAL_DATA) ≠ DB저장($COUNT)"
    fi
    
else
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error // .message // "알 수 없는 오류"')
    echo "❌ 시드 데이터 생성 실패: $ERROR_MSG"
    exit 1
fi

echo ""
echo "🎉 시드 데이터 생성 완료!"
echo "💡 다음에 Supabase가 리셋되면 이 스크립트를 다시 실행하세요:"
echo "   ./scripts/seed-data.sh" 