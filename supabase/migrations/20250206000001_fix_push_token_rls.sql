-- Push Token RLS 정책 수정
-- Custom 인증 시스템에 맞게 RLS 정책 변경

-- user_push_tokens 테이블이 존재하는 경우에만 RLS 정책 제거
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_push_tokens') THEN
    DROP POLICY IF EXISTS "Users can manage their own push tokens" ON user_push_tokens;
    ALTER TABLE user_push_tokens DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- notification_history 테이블이 존재하는 경우에만 RLS 정책 제거
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_history') THEN
    DROP POLICY IF EXISTS "Users can view their own notification history" ON notification_history;
    ALTER TABLE notification_history DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 또는 대안: 모든 인증된 사용자가 접근 가능하도록 설정 (더 안전한 방법)
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_push_tokens') THEN
--     ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
--     DROP POLICY IF EXISTS "Allow authenticated users to manage push tokens" ON user_push_tokens;
--     CREATE POLICY "Allow authenticated users to manage push tokens" ON user_push_tokens
--       FOR ALL USING (true);
--   END IF;
-- END $$;

-- DO $$
-- BEGIN
--   IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_history') THEN
--     ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
--     DROP POLICY IF EXISTS "Allow authenticated users to view notification history" ON notification_history;
--     CREATE POLICY "Allow authenticated users to view notification history" ON notification_history
--       FOR SELECT USING (true);
--   END IF;
-- END $$;
