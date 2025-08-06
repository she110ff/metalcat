-- 최종 스키마 정리
-- 데이터 타입 및 제약 조건 통일

-- notification_history 테이블 정리
ALTER TABLE "public"."notification_history" 
  ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;

ALTER TABLE "public"."notification_history" 
  ALTER COLUMN "user_id" DROP NOT NULL;

-- user_push_tokens 테이블 정리
ALTER TABLE "public"."user_push_tokens" 
  ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;

ALTER TABLE "public"."user_push_tokens" 
  ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;

ALTER TABLE "public"."user_push_tokens" 
  ALTER COLUMN "user_id" DROP NOT NULL;

-- 고유 제약 조건 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_push_tokens_user_id_token_key'
  ) THEN
    ALTER TABLE "public"."user_push_tokens" 
    ADD CONSTRAINT "user_push_tokens_user_id_token_key" 
    UNIQUE USING INDEX "user_push_tokens_user_id_token_key";
  END IF;
END $$;

-- 📱 최종 스키마 정리 완료!
-- 🔧 주요 변경사항:
--   • timestamp with time zone 데이터 타입 통일
--   • user_id 컬럼 NOT NULL 제약 조건 제거 (선택적 관계 허용)
--   • 고유 제약 조건 설정
-- 🚀 스키마 통합 완료!
