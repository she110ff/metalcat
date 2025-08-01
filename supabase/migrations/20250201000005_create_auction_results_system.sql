-- ============================================
-- 낙찰/유찰 결과 시스템 구축
-- 작성일: 2025-02-01
-- 목적: 자동 경매 종료 및 결과 처리 시스템
-- ============================================

-- 1. 결과 타입 열거형 정의
CREATE TYPE auction_result_enum AS ENUM ('successful', 'failed', 'cancelled');
CREATE TYPE transaction_status_enum AS ENUM ('pending', 'paid', 'delivered', 'completed', 'failed');

-- 2. 경매 결과 테이블
CREATE TABLE auction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  result_type auction_result_enum NOT NULL,
  
  -- 낙찰 정보 (successful인 경우)
  winning_bid_id UUID REFERENCES auction_bids(id),
  winning_user_id UUID REFERENCES users(id),
  winning_amount DECIMAL(15,2),
  
  -- 처리 정보
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_deadline TIMESTAMP WITH TIME ZONE,
  
  -- 메타데이터
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 제약 조건
  CONSTRAINT valid_successful_result CHECK (
    (result_type = 'successful' AND winning_bid_id IS NOT NULL AND winning_user_id IS NOT NULL AND winning_amount IS NOT NULL)
    OR result_type != 'successful'
  )
);

-- 3. 거래/결제 추적 테이블
CREATE TABLE auction_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_result_id UUID NOT NULL REFERENCES auction_results(id) ON DELETE CASCADE,
  transaction_status transaction_status_enum DEFAULT 'pending',
  
  -- 결제 정보
  payment_method VARCHAR(50),
  payment_confirmed_at TIMESTAMP WITH TIME ZONE,
  payment_amount DECIMAL(15,2),
  
  -- 배송/거래 정보
  delivery_status VARCHAR(50) DEFAULT 'pending',
  delivery_scheduled_at TIMESTAMP WITH TIME ZONE,
  delivery_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- 연락처 정보
  contact_info JSONB DEFAULT '{}',
  
  -- 메타데이터
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 인덱스 최적화
CREATE INDEX idx_auction_results_auction_id ON auction_results(auction_id);
CREATE INDEX idx_auction_results_type ON auction_results(result_type);
CREATE INDEX idx_auction_results_processed_at ON auction_results(processed_at);
CREATE INDEX idx_auction_results_winning_user ON auction_results(winning_user_id);

CREATE INDEX idx_auction_transactions_result_id ON auction_transactions(auction_result_id);
CREATE INDEX idx_auction_transactions_status ON auction_transactions(transaction_status);
CREATE INDEX idx_auction_transactions_payment_deadline ON auction_transactions(auction_result_id) 
  WHERE transaction_status = 'pending';

-- 5. RLS 정책 설정
ALTER TABLE auction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_transactions ENABLE ROW LEVEL SECURITY;

-- 경매 결과 조회 정책 (모든 사용자가 조회 가능)
CREATE POLICY "Anyone can view auction results" ON auction_results
    FOR SELECT USING (true);

-- 거래 정보는 관련자만 조회 가능
CREATE POLICY "Users can view their transactions" ON auction_transactions
    FOR SELECT USING (
      auction_result_id IN (
        SELECT ar.id FROM auction_results ar
        JOIN auctions a ON ar.auction_id = a.id
        WHERE a.user_id IN (SELECT id FROM users)
        OR ar.winning_user_id IN (SELECT id FROM users)
      )
    );

-- 6. 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_auction_result_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_auction_result_updated_at
  BEFORE UPDATE ON auction_results
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_result_updated_at();

CREATE OR REPLACE FUNCTION update_auction_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_auction_transaction_updated_at
  BEFORE UPDATE ON auction_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_transaction_updated_at();

-- 7. 결제 기한 자동 설정 트리거
CREATE OR REPLACE FUNCTION set_payment_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- 낙찰된 경우 3일 후로 결제 기한 설정
  IF NEW.result_type = 'successful' THEN
    NEW.payment_deadline = NEW.processed_at + INTERVAL '3 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_payment_deadline
  BEFORE INSERT ON auction_results
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_deadline();

-- 8. 거래 레코드 자동 생성 트리거
CREATE OR REPLACE FUNCTION create_transaction_record()
RETURNS TRIGGER AS $$
BEGIN
  -- 낙찰된 경우 거래 레코드 자동 생성
  IF NEW.result_type = 'successful' THEN
    INSERT INTO auction_transactions (
      auction_result_id,
      transaction_status,
      payment_amount
    ) VALUES (
      NEW.id,
      'pending',
      NEW.winning_amount
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_transaction_record
  AFTER INSERT ON auction_results
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_record();

-- 9. 문서화
COMMENT ON TABLE auction_results IS '경매 결과 정보 - 낙찰/유찰/취소 결과 저장';
COMMENT ON TABLE auction_transactions IS '거래 추적 정보 - 결제 및 배송 상태 관리';

COMMENT ON COLUMN auction_results.result_type IS '결과 타입: successful(낙찰), failed(유찰), cancelled(취소)';
COMMENT ON COLUMN auction_results.payment_deadline IS '결제 기한 (낙찰시 자동 설정: 처리일 + 3일)';
COMMENT ON COLUMN auction_transactions.transaction_status IS '거래 상태: pending → paid → delivered → completed';

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🎉 경매 결과 시스템 테이블 구축 완료!';
  RAISE NOTICE '📋 생성된 테이블: auction_results, auction_transactions';
  RAISE NOTICE '🔧 트리거 설정: 자동 업데이트, 결제기한 설정, 거래레코드 생성';
END
$$;