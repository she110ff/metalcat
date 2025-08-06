#!/bin/bash

# ============================================
# 빠른 리셋 스크립트 (질문 없이 바로 실행)
# ============================================
# 목적: 개발 중 빠른 데이터베이스 리셋 + 함수 배포
# 사용법: ./scripts/quick-reset.sh

set -e

echo "🚀 빠른 개발 환경 리셋 시작..."

# 0. Supabase 상태 확인 및 시작
echo "🔍 Supabase 상태 확인 중..."
if ! supabase status > /dev/null 2>&1; then
    echo "⚡ Supabase 시작 중..."
    supabase start
    echo "✅ Supabase 시작 완료"
else
    echo "✅ Supabase 이미 실행 중"
fi

# 1. 데이터베이스 리셋
echo "📊 데이터베이스 리셋 중..."
supabase db reset

# 2. 주요 함수들만 배포
echo "📦 Edge Functions 배포 중..."
CORE_FUNCTIONS=("lme-crawler" "lme-bulk-crawler" "env-debug")

for func in "${CORE_FUNCTIONS[@]}"; do
    echo "  • $func 배포 중..."
    supabase functions deploy "$func" --no-verify-jwt > /dev/null 2>&1 || echo "    ⚠️ $func 배포 실패 (무시)"
done

# 3. 상태 확인
echo "✅ 완료! 상태:"
supabase status

echo ""
echo "🎉 빠른 리셋 완료!"
echo "🧪 테스트: curl http://localhost:54331/functions/v1/lme-crawler"
