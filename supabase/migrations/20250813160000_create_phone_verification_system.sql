-- ============================================
-- 전화번호 인증 시스템 데이터베이스 스키마
-- ============================================

-- 1. 기존 users 테이블 확장
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS phone_verification_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_verification_request TIMESTAMP;

-- 2. verification_status enum 타입 생성
DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'expired', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. 전화번호 인증 세션 테이블 생성
CREATE TABLE IF NOT EXISTS phone_verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status verification_status DEFAULT 'pending',
  
  -- SMS 관련 정보
  naver_request_id VARCHAR(100),
  sms_sent_at TIMESTAMP,
  sms_error TEXT,
  
  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  
  -- 제약조건
  CONSTRAINT valid_phone_format CHECK (phone_number ~ '^[0-9]{10,11}$'),
  CONSTRAINT valid_code_format CHECK (verification_code ~ '^[0-9]{6}$'),
  CONSTRAINT positive_attempts CHECK (attempts >= 0),
  CONSTRAINT valid_max_attempts CHECK (max_attempts > 0)
);

-- 4. 핵심 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_phone_verification_active 
ON phone_verification_sessions(phone_number, expires_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_phone_verification_cleanup 
ON phone_verification_sessions(expires_at) 
WHERE status IN ('pending', 'expired');

CREATE INDEX IF NOT EXISTS idx_phone_verification_phone 
ON phone_verification_sessions(phone_number, created_at);

-- 5. RLS (Row Level Security) 정책 설정
ALTER TABLE phone_verification_sessions ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자만 자신의 세션에 접근 가능
CREATE POLICY "Users can access their own verification sessions" 
ON phone_verification_sessions
FOR ALL 
TO authenticated
USING (true); -- Edge Functions에서 관리하므로 모든 접근 허용

-- 익명 사용자도 인증 과정에서 접근 필요
CREATE POLICY "Anonymous users can create verification sessions" 
ON phone_verification_sessions
FOR INSERT 
TO anon
WITH CHECK (true);

-- 6. 만료된 세션 자동 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_verification_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE phone_verification_sessions 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- 7일 이상 된 만료 세션 물리 삭제
  DELETE FROM phone_verification_sessions 
  WHERE status IN ('expired', 'verified', 'failed')
    AND created_at < NOW() - INTERVAL '7 days';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Rate limiting 검증 함수
CREATE OR REPLACE FUNCTION check_verification_rate_limit(
  p_phone_number VARCHAR(20),
  p_ip_address INET DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  hour_count INTEGER;
  day_count INTEGER;
  ip_hour_count INTEGER;
BEGIN
  -- 전화번호별 Rate Limit 검증 (1시간 3회)
  SELECT COUNT(*) INTO hour_count
  FROM phone_verification_sessions
  WHERE phone_number = p_phone_number
    AND created_at > NOW() - INTERVAL '1 hour';
    
  IF hour_count >= 3 THEN
    RETURN FALSE;
  END IF;
  
  -- 전화번호별 Rate Limit 검증 (1일 5회)
  SELECT COUNT(*) INTO day_count
  FROM phone_verification_sessions
  WHERE phone_number = p_phone_number
    AND created_at > NOW() - INTERVAL '1 day';
    
  IF day_count >= 5 THEN
    RETURN FALSE;
  END IF;
  
  -- IP별 Rate Limit 검증 (1시간 10회) - IP 정보가 있는 경우만
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO ip_hour_count
    FROM phone_verification_sessions
    WHERE ip_address = p_ip_address
      AND created_at > NOW() - INTERVAL '1 hour';
      
    IF ip_hour_count >= 10 THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 권한 설정
GRANT SELECT, INSERT, UPDATE ON phone_verification_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON phone_verification_sessions TO anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_verification_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION check_verification_rate_limit(VARCHAR, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION check_verification_rate_limit(VARCHAR, INET) TO anon;
