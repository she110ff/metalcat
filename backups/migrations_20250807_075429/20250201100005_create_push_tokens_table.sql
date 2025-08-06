-- Push Token 테이블 생성
-- 알림 시스템을 위한 사용자 푸시 토큰 관리

-- user_push_tokens 테이블 생성
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_active ON user_push_tokens(is_active);

-- RLS 활성화
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Users can manage their own push tokens" ON user_push_tokens
  FOR ALL USING (auth.uid()::text = user_id::text);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_user_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER trigger_update_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_push_tokens_updated_at();

-- notification_history 테이블 생성 (알림 히스토리)
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  notification_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_is_read ON notification_history(is_read);

-- RLS 활성화
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Users can view their own notification history" ON notification_history
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- 알림 관련 유틸리티 함수들
CREATE OR REPLACE FUNCTION get_active_push_tokens(user_ids UUID[])
RETURNS TABLE(user_id UUID, tokens TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    upt.user_id,
    array_agg(upt.token) as tokens
  FROM user_push_tokens upt
  WHERE upt.user_id = ANY(user_ids)
    AND upt.is_active = true
  GROUP BY upt.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 알림 발송 로그 함수
CREATE OR REPLACE FUNCTION log_notification_sent(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL,
  p_notification_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notification_history (
    user_id, title, body, data, notification_type
  ) VALUES (
    p_user_id, p_title, p_body, p_data, p_notification_type
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 알림 읽음 처리 함수
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notification_history 
  SET is_read = true 
  WHERE id = notification_id 
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자별 미읽 알림 개수 조회 함수
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM notification_history 
    WHERE user_id = p_user_id 
      AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 📱 푸시 알림 시스템 준비 완료!
-- 🔧 주요 기능:
--   • 사용자별 푸시 토큰 관리
--   • 알림 히스토리 저장
--   • RLS 기반 보안 정책
--   • 유틸리티 함수 제공
-- 🚀 알림 시스템 통합 준비 완료!
