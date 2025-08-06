-- Push Token RLS 정책 수정
-- Custom 인증 시스템에 맞게 RLS 정책 변경

-- 기존 RLS 정책 제거
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON user_push_tokens;
DROP POLICY IF EXISTS "Users can view their own notification history" ON notification_history;

-- RLS 비활성화 (애플리케이션 레벨에서 권한 관리)
ALTER TABLE user_push_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history DISABLE ROW LEVEL SECURITY;

-- 또는 대안: 모든 인증된 사용자가 접근 가능하도록 설정 (더 안전한 방법)
-- ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Allow authenticated users to manage push tokens" ON user_push_tokens
--   FOR ALL USING (true);

-- CREATE POLICY "Allow authenticated users to view notification history" ON notification_history
--   FOR SELECT USING (true);
