-- Push Token 스키마 수정
-- 기존 테이블 구조를 새로운 스키마에 맞게 업데이트

-- 기존 제약 조건 및 인덱스 제거
ALTER TABLE "public"."user_push_tokens" DROP CONSTRAINT IF EXISTS "user_push_tokens_platform_check";
ALTER TABLE "public"."user_push_tokens" DROP CONSTRAINT IF EXISTS "user_push_tokens_user_id_expo_push_token_key";
ALTER TABLE "public"."notification_history" DROP CONSTRAINT IF EXISTS "notification_history_user_id_fkey";
ALTER TABLE "public"."user_push_tokens" DROP CONSTRAINT IF EXISTS "user_push_tokens_user_id_fkey";

DROP INDEX IF EXISTS "public"."idx_notification_history_created_at";
DROP INDEX IF EXISTS "public"."user_push_tokens_user_id_expo_push_token_key";

-- notification_history 테이블 수정
ALTER TABLE "public"."notification_history" DROP COLUMN IF EXISTS "read_at";
ALTER TABLE "public"."notification_history" DROP COLUMN IF EXISTS "type";
ALTER TABLE "public"."notification_history" ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT false;
ALTER TABLE "public"."notification_history" ADD COLUMN IF NOT EXISTS "notification_type" text;
ALTER TABLE "public"."notification_history" ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone DEFAULT now();

-- user_push_tokens 테이블 수정
ALTER TABLE "public"."user_push_tokens" DROP COLUMN IF EXISTS "device_id";
ALTER TABLE "public"."user_push_tokens" DROP COLUMN IF EXISTS "expo_push_token";
ALTER TABLE "public"."user_push_tokens" DROP COLUMN IF EXISTS "platform";
ALTER TABLE "public"."user_push_tokens" ADD COLUMN IF NOT EXISTS "device_type" text;
ALTER TABLE "public"."user_push_tokens" ADD COLUMN IF NOT EXISTS "token" text;

-- users 테이블에 expo_push_token 컬럼 추가
ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "expo_push_token" text;

-- 새로운 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notification_history_is_read ON public.notification_history USING btree (is_read);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON public.notification_history USING btree (sent_at);
CREATE INDEX IF NOT EXISTS idx_users_expo_push_token ON public.users USING btree (expo_push_token) WHERE (expo_push_token IS NOT NULL);

-- 새로운 제약 조건 추가 (안전한 방식)
DO $$
BEGIN
  -- device_type 체크 제약 조건 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'user_push_tokens_device_type_check'
  ) THEN
    ALTER TABLE "public"."user_push_tokens" ADD CONSTRAINT "user_push_tokens_device_type_check" 
      CHECK ((device_type = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])));
  END IF;
END $$;

-- 외래키 제약 조건 재생성 (안전한 방식)
DO $$
BEGIN
  -- notification_history 외래키
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notification_history_user_id_fkey'
  ) THEN
    ALTER TABLE "public"."notification_history" ADD CONSTRAINT "notification_history_user_id_fkey" 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  -- user_push_tokens 외래키
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_push_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE "public"."user_push_tokens" ADD CONSTRAINT "user_push_tokens_user_id_fkey" 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- token 컬럼을 NOT NULL로 설정 (기존 데이터가 있는 경우 주의)
DO $$
BEGIN
  -- token 컬럼이 NULL인 레코드가 있는지 확인
  IF EXISTS (SELECT 1 FROM user_push_tokens WHERE token IS NULL) THEN
    -- NULL인 레코드들을 삭제하거나 기본값 설정
    DELETE FROM user_push_tokens WHERE token IS NULL;
  END IF;
  
  -- 이제 NOT NULL 제약 조건 추가
  ALTER TABLE "public"."user_push_tokens" ALTER COLUMN "token" SET NOT NULL;
END $$;

-- 고유 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS user_push_tokens_user_id_token_key ON public.user_push_tokens USING btree (user_id, token);

-- 📱 Push Token 스키마 수정 완료!
-- 🔧 주요 변경사항:
--   • notification_history: read_at → is_read, type → notification_type, sent_at 추가
--   • user_push_tokens: device_id, expo_push_token, platform → device_type, token
--   • users: expo_push_token 컬럼 추가
--   • 새로운 인덱스 및 제약 조건 설정
-- 🚀 스키마 통합 완료!
