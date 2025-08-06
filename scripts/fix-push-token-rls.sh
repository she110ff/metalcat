#!/bin/bash

# Push Token RLS 문제 해결 스크립트
# Custom 인증 시스템용 RLS 정책 수정

echo "🔧 Push Token RLS 정책 수정 시작..."

# Supabase 프로젝트 확인
if [ ! -f "supabase/config.toml" ]; then
  echo "❌ Supabase 프로젝트가 초기화되지 않았습니다."
  echo "먼저 'supabase init'을 실행하거나 프로젝트 루트 디렉토리에서 실행해주세요."
  exit 1
fi

# 마이그레이션 적용
echo "📤 마이그레이션 적용 중..."
supabase db push

if [ $? -eq 0 ]; then
  echo "✅ Push Token RLS 정책 수정 완료!"
  echo ""
  echo "🎯 변경 사항:"
  echo "  - user_push_tokens 테이블의 RLS 비활성화"
  echo "  - notification_history 테이블의 RLS 비활성화"
  echo "  - 애플리케이션 레벨에서 사용자 검증 추가"
  echo ""
  echo "이제 Push Token 등록이 정상적으로 작동해야 합니다!"
else
  echo "❌ 마이그레이션 적용 실패"
  echo "수동으로 다음 명령어를 실행해보세요:"
  echo "  supabase db push"
  exit 1
fi
