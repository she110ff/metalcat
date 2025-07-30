#!/bin/bash

# Supabase 시드 데이터로 리셋하는 스크립트
# 사용법: ./scripts/reset-with-seed.sh

set -e

echo "🔄 Supabase 데이터베이스 시드 리셋"
echo "================================="

# Supabase 로컬 상태 확인
echo "🔍 로컬 Supabase 상태 확인..."
if ! supabase status > /dev/null 2>&1; then
    echo "❌ 로컬 Supabase가 실행되지 않았습니다."
    echo "💡 다음 명령어로 Supabase를 시작하세요: supabase start"
    exit 1
fi

echo "✅ 로컬 Supabase 실행 중"

# 시드 파일 존재 확인
if [ ! -f "supabase/seed.sql" ]; then
    echo "❌ 시드 파일이 없습니다. 먼저 시드 파일을 생성하세요."
    echo "💡 실행 명령: node scripts/generate-seed-file.js"
    exit 1
fi

echo "✅ 시드 파일 발견"

# 기존 데이터 삭제
echo "🗑️  기존 데이터 삭제 중..."
curl -s -X DELETE \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  "http://127.0.0.1:54331/rest/v1/lme_processed_prices?id=not.eq.00000000-0000-0000-0000-000000000000" > /dev/null

echo "✅ 기존 데이터 삭제 완료"

# 시드 데이터 적용 (PostgreSQL 명령어 시뮬레이션)
echo "🌱 시드 데이터 적용 중..."

# 시드 파일에서 INSERT 문만 추출해서 PostgREST API로 변환
# (실제 운영에서는 psql이나 supabase db seed를 사용)
echo "⚠️  시드 파일 적용은 수동으로 실행하세요:"
echo "   psql postgresql://postgres:postgres@127.0.0.1:54332/postgres -f supabase/seed.sql"
echo "   또는"
echo "   supabase db seed (프로덕션 환경에서)"

# 현재 데이터 상태 확인
echo ""
echo "📊 현재 데이터 상태:"
COUNT=$(curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
  -H "Prefer: count=exact" \
  "http://127.0.0.1:54331/rest/v1/lme_processed_prices?select=id&limit=1" -I | grep "Content-Range" | sed 's/.*\///g' | tr -d '\r')

echo "현재 DB 레코드 수: $COUNT개"

if [ "$COUNT" = "0" ]; then
    echo ""
    echo "💡 시드 데이터를 적용하려면:"
    echo "   1. psql이 설치된 경우: psql postgresql://postgres:postgres@127.0.0.1:54332/postgres -f supabase/seed.sql"
    echo "   2. 벌크 크롤링 사용: ./scripts/seed-data.sh"
    echo "   3. 새 시드 파일 생성: node scripts/generate-seed-file.js"
fi

echo ""
echo "🎉 리셋 작업 완료!"