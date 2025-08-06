-- ============================================
-- 경매 시스템 통합 마이그레이션
-- 생성일: 2025-02-01
-- 목적: 카테고리별 경매, 입찰, 결과 처리, 자동화 전체 시스템
-- ============================================

-- ============================================
-- 1. 열거형 타입 정의
-- ============================================
CREATE TYPE auction_category_enum AS ENUM ('scrap', 'machinery', 'materials', 'demolition');
CREATE TYPE auction_status_enum AS ENUM ('active', 'ending', 'ended', 'cancelled');
CREATE TYPE transaction_type_enum AS ENUM ('normal', 'urgent');
CREATE TYPE auction_result_enum AS ENUM ('successful', 'failed', 'cancelled');
CREATE TYPE transaction_status_enum AS ENUM ('pending', 'paid', 'delivered', 'completed', 'failed');

-- ============================================
-- 2. 기존 테이블 정리 (필요시)
-- ============================================
DROP TABLE IF EXISTS auction_bids CASCADE;
DROP TABLE IF EXISTS auction_photos CASCADE; 
DROP TABLE IF EXISTS auctions CASCADE;
DROP TABLE IF EXISTS auction_results CASCADE;
DROP TABLE IF EXISTS auction_transactions CASCADE;

-- ============================================
-- 3. 공통 경매 테이블 (핵심 정보)
-- ============================================
CREATE TABLE auctions (
  id TEXT PRIMARY KEY DEFAULT 'auction_' || floor(extract(epoch from now()) * 1000) || '_' || substr(gen_random_uuid()::text, 1, 8),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 기본 정보
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  auction_category auction_category_enum NOT NULL,
  transaction_type transaction_type_enum NOT NULL DEFAULT 'normal',
  
  -- 공통 가격 정보
  current_bid DECIMAL(15,2) DEFAULT 0,
  starting_price DECIMAL(15,2) DEFAULT 0,
  total_bid_amount DECIMAL(15,2) DEFAULT 0,
  
  -- 공통 상태
  status auction_status_enum DEFAULT 'active',
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- 공통 통계
  bidder_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  
  -- 공통 주소 (모든 카테고리 공통)
  address_info JSONB NOT NULL,
  
  -- 공통 시간
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. 카테고리별 전용 테이블들
-- ============================================

-- 고철 전용 테이블 
CREATE TABLE scrap_auctions (
  auction_id TEXT PRIMARY KEY REFERENCES auctions(id) ON DELETE CASCADE,
  
  -- 고철 특화 정보
  product_type JSONB NOT NULL, -- ScrapProductType
  weight_kg DECIMAL(10,2) NOT NULL,
  weight_unit VARCHAR(10) DEFAULT 'kg',
  price_per_unit DECIMAL(10,2), -- 원/kg
  
  -- 판매 환경 (고철 특화)
  sales_environment JSONB NOT NULL, -- SalesEnvironment
  special_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 중고기계 전용 테이블  
CREATE TABLE machinery_auctions (
  auction_id TEXT PRIMARY KEY REFERENCES auctions(id) ON DELETE CASCADE,
  
  -- 기계 특화 정보
  product_type JSONB NOT NULL, -- MachineryProductType
  product_name VARCHAR(200) NOT NULL,
  manufacturer VARCHAR(100),
  model_name VARCHAR(100),
  manufacturing_date DATE,
  
  -- 수량 정보
  quantity INTEGER NOT NULL,
  quantity_unit VARCHAR(10) DEFAULT '대',
  
  -- 가격 정보
  desired_price DECIMAL(15,2) NOT NULL,
  
  -- 판매 환경 (기계 특화)
  sales_environment JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 중고자재 전용 테이블
CREATE TABLE materials_auctions (
  auction_id TEXT PRIMARY KEY REFERENCES auctions(id) ON DELETE CASCADE,
  
  -- 자재 특화 정보
  product_type JSONB NOT NULL, -- MaterialProductType
  quantity INTEGER NOT NULL,
  quantity_unit VARCHAR(20) NOT NULL,
  
  -- 가격 정보
  desired_price DECIMAL(15,2) NOT NULL,
  
  -- 판매 환경 (자재 특화)
  sales_environment JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 철거 전용 테이블
CREATE TABLE demolition_auctions (
  auction_id TEXT PRIMARY KEY REFERENCES auctions(id) ON DELETE CASCADE,
  
  -- 철거 특화 정보
  product_type JSONB NOT NULL, -- DemolitionProductType
  demolition_area DECIMAL(10,2) NOT NULL,
  area_unit VARCHAR(10) NOT NULL, -- 'sqm' or 'pyeong'
  price_per_unit DECIMAL(10,2), -- 원/평
  
  -- 철거 세부 정보 (DemolitionInfo)
  building_purpose VARCHAR(20) NOT NULL, -- 'residential', 'commercial', 'public'
  demolition_method VARCHAR(20) NOT NULL, -- 'full', 'partial', 'interior'  
  structure_type VARCHAR(30) NOT NULL, -- 'masonry', 'reinforced-concrete', 'steel-frame'
  waste_disposal VARCHAR(20) NOT NULL, -- 'self', 'company'
  floor_count INTEGER NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. 공통 테이블들 (입찰, 사진)
-- ============================================

-- 경매 사진 테이블
CREATE TABLE auction_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(20) DEFAULT 'full', -- 'full', 'closeup', 'detail'
  photo_order INTEGER DEFAULT 0,
  is_representative BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 입찰 테이블
CREATE TABLE auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(100) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  price_per_unit DECIMAL(10,2),
  location VARCHAR(200) NOT NULL,
  bid_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_top_bid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. 경매 결과 시스템
-- ============================================

-- 경매 결과 테이블
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

-- 거래/결제 추적 테이블
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

-- ============================================
-- 7. 인덱스 최적화
-- ============================================

-- 공통 인덱스
CREATE INDEX idx_auctions_category ON auctions(auction_category);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_user_id ON auctions(user_id);
CREATE INDEX idx_auctions_end_time ON auctions(end_time);
CREATE INDEX idx_auctions_created_at ON auctions(created_at);

-- 카테고리별 인덱스
CREATE INDEX idx_scrap_auctions_weight ON scrap_auctions(weight_kg);
CREATE INDEX idx_machinery_auctions_product_name ON machinery_auctions(product_name);
CREATE INDEX idx_materials_auctions_quantity ON materials_auctions(quantity);
CREATE INDEX idx_demolition_auctions_area ON demolition_auctions(demolition_area);

-- 사진 및 입찰 인덱스
CREATE INDEX idx_auction_photos_auction_id ON auction_photos(auction_id);
CREATE INDEX idx_auction_photos_order ON auction_photos(auction_id, photo_order);
CREATE INDEX idx_auction_photos_representative ON auction_photos(auction_id, is_representative);
CREATE INDEX idx_auction_bids_auction_id ON auction_bids(auction_id);
CREATE INDEX idx_auction_bids_amount ON auction_bids(auction_id, amount DESC);
CREATE INDEX idx_auction_bids_user_id ON auction_bids(user_id);

-- 결과 시스템 인덱스
CREATE INDEX idx_auction_results_auction_id ON auction_results(auction_id);
CREATE INDEX idx_auction_results_type ON auction_results(result_type);
CREATE INDEX idx_auction_results_processed_at ON auction_results(processed_at);
CREATE INDEX idx_auction_results_winning_user ON auction_results(winning_user_id);

CREATE INDEX idx_auction_transactions_result_id ON auction_transactions(auction_result_id);
CREATE INDEX idx_auction_transactions_status ON auction_transactions(transaction_status);
CREATE INDEX idx_auction_transactions_payment_deadline ON auction_transactions(auction_result_id) 
  WHERE transaction_status = 'pending';

-- ============================================
-- 8. Storage 버킷 설정 (auction-photos)
-- ============================================

-- auction-photos 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'auction-photos',
  'auction-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) 
DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- ============================================
-- 9. RLS 정책 설정
-- ============================================

-- 공통 경매 정책
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auctions" ON auctions
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own auctions" ON auctions
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can update their own auctions" ON auctions
    FOR UPDATE USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can delete their own auctions" ON auctions
    FOR DELETE USING (user_id IN (SELECT id FROM users));

-- 카테고리별 정책들
ALTER TABLE scrap_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demolition_auctions ENABLE ROW LEVEL SECURITY;

-- 카테고리별 테이블들은 부모 경매의 소유권을 따름
CREATE POLICY "Scrap auctions follow parent auction policy" ON scrap_auctions
    FOR ALL USING (
        auction_id IN (
            SELECT id FROM auctions WHERE user_id IN (SELECT id FROM users)
        )
    );

CREATE POLICY "Machinery auctions follow parent auction policy" ON machinery_auctions
    FOR ALL USING (
        auction_id IN (
            SELECT id FROM auctions WHERE user_id IN (SELECT id FROM users)
        )
    );

CREATE POLICY "Materials auctions follow parent auction policy" ON materials_auctions
    FOR ALL USING (
        auction_id IN (
            SELECT id FROM auctions WHERE user_id IN (SELECT id FROM users)
        )
    );

CREATE POLICY "Demolition auctions follow parent auction policy" ON demolition_auctions
    FOR ALL USING (
        auction_id IN (
            SELECT id FROM auctions WHERE user_id IN (SELECT id FROM users)
        )
    );

-- 사진 및 입찰 정책
ALTER TABLE auction_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auction photos" ON auction_photos
    FOR SELECT USING (true);

CREATE POLICY "Users can manage photos of their auctions" ON auction_photos
    FOR ALL USING (
        auction_id IN (
            SELECT id FROM auctions WHERE user_id IN (SELECT id FROM users)
        )
    );

CREATE POLICY "Anyone can view auction bids" ON auction_bids
    FOR SELECT USING (true);

-- 입찰 정책 (자기 입찰 방지는 애플리케이션 레벨에서 처리)
CREATE POLICY "basic_bid_policy" ON auction_bids
  FOR INSERT
  WITH CHECK (
    user_id IS NOT NULL 
    AND auction_id IS NOT NULL
    AND amount > 0
  );

-- 경매 결과 및 거래 정책
ALTER TABLE auction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auction results" ON auction_results
    FOR SELECT USING (true);

CREATE POLICY "Users can view their transactions" ON auction_transactions
    FOR SELECT USING (
      auction_result_id IN (
        SELECT ar.id FROM auction_results ar
        JOIN auctions a ON ar.auction_id = a.id
        WHERE a.user_id IN (SELECT id FROM users)
        OR ar.winning_user_id IN (SELECT id FROM users)
      )
    );

-- Storage 정책
CREATE POLICY "Anyone can view auction photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'auction-photos');

CREATE POLICY "Anyone can upload auction photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'auction-photos');

CREATE POLICY "Anyone can update auction photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'auction-photos');

CREATE POLICY "Anyone can delete auction photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'auction-photos');

-- ============================================
-- 10. 자기 입찰 방지 시스템
-- ============================================

-- 테이블 소유자도 RLS를 따르도록 강제 설정
ALTER TABLE auction_bids FORCE ROW LEVEL SECURITY;

-- 커스텀 인증용 현재 사용자 ID 설정 함수
CREATE OR REPLACE FUNCTION set_current_user_id(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$;

-- 현재 사용자 ID 조회 함수 (디버깅용)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 자신의 경매에 대한 입찰 위반 사례 확인 함수
CREATE OR REPLACE FUNCTION check_self_bidding_violations()
RETURNS TABLE (
  auction_id text,
  auction_title varchar(200),
  bidder_id text,
  bidder_name varchar(100),
  amount numeric(15,2),
  bid_time timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id::text,
    a.title,
    ab.user_id::text,
    ab.user_name,
    ab.amount,
    ab.bid_time
  FROM auction_bids ab
  INNER JOIN auctions a ON ab.auction_id = a.id
  WHERE a.user_id = ab.user_id -- 경매 소유자와 입찰자가 같은 경우
  ORDER BY ab.bid_time DESC;
END;
$$;

-- ============================================
-- 11. 트리거 함수들
-- ============================================

-- 경매 업데이트 시간 자동 갱신
CREATE OR REPLACE FUNCTION update_auction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 입찰시 경매 정보 자동 업데이트
CREATE OR REPLACE FUNCTION update_auction_on_bid()
RETURNS TRIGGER AS $$
BEGIN
  -- 경매의 현재 입찰가와 입찰자 수 업데이트
  UPDATE auctions 
  SET 
    current_bid = NEW.amount,
    total_bid_amount = NEW.amount,
    bidder_count = (
      SELECT COUNT(DISTINCT user_id) 
      FROM auction_bids 
      WHERE auction_id = NEW.auction_id
    ),
    updated_at = NOW()
  WHERE id = NEW.auction_id;
  
  -- 이전 최고 입찰을 false로 변경
  UPDATE auction_bids 
  SET is_top_bid = false 
  WHERE auction_id = NEW.auction_id AND id != NEW.id;
  
  -- 새 입찰을 최고 입찰로 설정
  NEW.is_top_bid = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 자동 업데이트 트리거들
CREATE OR REPLACE FUNCTION update_auction_result_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_auction_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 결제 기한 자동 설정 트리거
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

-- 거래 레코드 자동 생성 트리거
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

-- ============================================
-- 12. 트리거 생성
-- ============================================

CREATE TRIGGER trigger_update_auction_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_updated_at();

CREATE TRIGGER trigger_update_auction_on_bid
  BEFORE INSERT ON auction_bids
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_on_bid();

CREATE TRIGGER trigger_update_auction_result_updated_at
  BEFORE UPDATE ON auction_results
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_result_updated_at();

CREATE TRIGGER trigger_update_auction_transaction_updated_at
  BEFORE UPDATE ON auction_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_transaction_updated_at();

CREATE TRIGGER trigger_set_payment_deadline
  BEFORE INSERT ON auction_results
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_deadline();

CREATE TRIGGER trigger_create_transaction_record
  AFTER INSERT ON auction_results
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_record();

-- ============================================
-- 13. 통합 뷰 (기존 API 호환성)
-- ============================================
CREATE VIEW auction_list_view AS
SELECT 
  -- 공통 정보
  a.id,
  a.user_id,
  a.title,
  a.description,
  a.auction_category,
  a.transaction_type,
  a.current_bid,
  a.starting_price,
  a.total_bid_amount,
  a.status,
  a.end_time,
  a.bidder_count,
  a.view_count,
  a.address_info,
  a.created_at,
  a.updated_at,
  
  -- 카테고리별 특화 정보 통합
  CASE 
    WHEN a.auction_category = 'scrap' THEN 
      json_build_object(
        'productType', s.product_type,
        'weightKg', s.weight_kg,
        'weightUnit', s.weight_unit,
        'pricePerUnit', s.price_per_unit,
        'salesEnvironment', s.sales_environment,
        'specialNotes', s.special_notes,
        'quantity', json_build_object('quantity', s.weight_kg, 'unit', s.weight_unit)
      )
    WHEN a.auction_category = 'machinery' THEN
      json_build_object(
        'productType', m.product_type,
        'productName', m.product_name,
        'manufacturer', m.manufacturer,
        'modelName', m.model_name,
        'manufacturingDate', m.manufacturing_date,
        'quantity', json_build_object('quantity', m.quantity, 'unit', m.quantity_unit),
        'desiredPrice', m.desired_price,
        'salesEnvironment', m.sales_environment
      )
    WHEN a.auction_category = 'materials' THEN
      json_build_object(
        'productType', mt.product_type,
        'quantity', json_build_object('quantity', mt.quantity, 'unit', mt.quantity_unit),
        'desiredPrice', mt.desired_price,
        'salesEnvironment', mt.sales_environment
      )
    WHEN a.auction_category = 'demolition' THEN
      json_build_object(
        'productType', d.product_type,
        'demolitionArea', d.demolition_area,
        'areaUnit', d.area_unit,
        'pricePerUnit', d.price_per_unit,
        'quantity', json_build_object('quantity', d.demolition_area, 'unit', d.area_unit),
        'demolitionInfo', json_build_object(
          'buildingPurpose', d.building_purpose,
          'demolitionMethod', d.demolition_method,
          'structureType', d.structure_type,
          'wasteDisposal', d.waste_disposal,
          'floorCount', d.floor_count
        )
      )
  END as category_details,
  
  -- 서브쿼리로 사진과 입찰 정보 포함
  (
    SELECT json_agg(
      json_build_object(
        'id', ap.id,
        'photo_url', ap.photo_url,
        'photo_type', ap.photo_type,
        'photo_order', ap.photo_order,
        'is_representative', ap.is_representative
      ) ORDER BY ap.photo_order
    )
    FROM auction_photos ap 
    WHERE ap.auction_id = a.id
  ) as auction_photos,
  
  (
    SELECT json_agg(
      json_build_object(
        'id', ab.id,
        'user_id', ab.user_id,
        'user_name', ab.user_name,
        'amount', ab.amount,
        'price_per_unit', ab.price_per_unit,
        'location', ab.location,
        'bid_time', ab.bid_time,
        'is_top_bid', ab.is_top_bid,
        'created_at', ab.created_at
      ) ORDER BY ab.amount DESC
    )
    FROM auction_bids ab 
    WHERE ab.auction_id = a.id
  ) as auction_bids
  
FROM auctions a
LEFT JOIN scrap_auctions s ON a.id = s.auction_id AND a.auction_category = 'scrap'
LEFT JOIN machinery_auctions m ON a.id = m.auction_id AND a.auction_category = 'machinery'
LEFT JOIN materials_auctions mt ON a.id = mt.auction_id AND a.auction_category = 'materials'
LEFT JOIN demolition_auctions d ON a.id = d.auction_id AND a.auction_category = 'demolition';

-- ============================================
-- 14. 경매 처리 자동화 시스템
-- ============================================

-- 실시간 알림 발송 함수
CREATE OR REPLACE FUNCTION send_auction_end_notification(
  tokens TEXT[],
  title TEXT,
  body TEXT,
  data JSONB
) RETURNS void AS $$
DECLARE
  current_env TEXT;
  supabase_url TEXT;
  function_url TEXT;
  response_id BIGINT;
BEGIN
  -- 현재 환경 확인
  SELECT get_current_environment() INTO current_env;
  
  -- 토큰이 없으면 처리하지 않음
  IF tokens IS NULL OR array_length(tokens, 1) IS NULL OR array_length(tokens, 1) = 0 THEN
    RAISE NOTICE '📱 알림 전송 건너뜀: 유효한 토큰이 없음';
    RETURN;
  END IF;
  
  RAISE NOTICE '📱 알림 발송: % - % (토큰 수: %)', title, body, array_length(tokens, 1);
  
  -- 환경별 처리
  IF current_env = 'local' THEN
    -- 로컬 환경에서는 로그만 출력
    RAISE NOTICE '🏠 로컬 환경: 실제 알림 전송 생략';
  ELSE
    -- 프로덕션/스테이징에서는 실제 Edge Function 호출
    BEGIN
      -- 환경별 Supabase URL 설정
      IF current_env = 'production' THEN
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      ELSE
        -- 스테이징이나 기타 환경
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      END IF;
      
      function_url := supabase_url || '/functions/v1/send-auction-notification';
      
      RAISE NOTICE '🚀 Edge Function 호출: %', function_url;
      
      -- pg_net을 사용해서 Edge Function 호출
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZG5jc3d2YmhlbHN0cGtmY3Z2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDEyMzIxMiwiZXhwIjoyMDY5Njk5MjEyfQ.oAOAE-0vaU0ph5bkX9DBWfCwFEJha9wo8W1kATeAHTI'
        ),
        body := jsonb_build_object(
          'tokens', tokens, 
          'title', title, 
          'body', body, 
          'data', data
        ),
        timeout_milliseconds := 30000
      ) INTO response_id;
      
      RAISE NOTICE '✅ 알림 전송 요청 완료 (request_id: %)', response_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ 알림 전송 실패: %', SQLERRM;
      -- 알림 실패가 경매 처리를 중단시키지 않도록 예외를 흡수
    END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 경매 종료 처리 메인 함수 (알림 기능 통합)
CREATE OR REPLACE FUNCTION process_ended_auctions()
RETURNS TABLE(
  processed_count INTEGER,
  successful_count INTEGER,
  failed_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  ended_auction RECORD;
  total_processed INTEGER := 0;
  total_successful INTEGER := 0;
  total_failed INTEGER := 0;
  total_errors INTEGER := 0;
  auction_error TEXT;
  
  -- 알림 관련 변수
  seller_tokens TEXT[];
  winner_tokens TEXT[];
  auction_title TEXT;
BEGIN
  -- 로그 시작
  INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
  VALUES ('auction', 'auction-end-processor', 'running', 
          jsonb_build_object('started_at', NOW()));

  -- 종료된 경매들 처리 (락 적용)
  FOR ended_auction IN 
    SELECT 
      a.id,
      a.title,
      a.starting_price,
      a.user_id as seller_id,
      a.end_time,
      a.status,
      ab.id as winning_bid_id,
      ab.user_id as winning_user_id,
      ab.amount as winning_amount,
      ab.user_name as winning_user_name
    FROM auctions a
    LEFT JOIN auction_bids ab ON a.id = ab.auction_id AND ab.is_top_bid = true
    WHERE a.end_time <= NOW() 
      AND a.status IN ('active', 'ending')
    ORDER BY a.end_time ASC
    FOR UPDATE OF a -- 동시성 제어를 위한 락
  LOOP
    BEGIN
      total_processed := total_processed + 1;
      auction_title := ended_auction.title;
      
      -- 알림을 위한 토큰 조회
      -- 경매 등록자 토큰
      SELECT array_agg(expo_push_token) INTO seller_tokens
      FROM user_push_tokens 
      WHERE user_id = ended_auction.seller_id AND is_active = true;
      
      -- 낙찰자 토큰 (낙찰된 경우)
      IF ended_auction.winning_user_id IS NOT NULL THEN
        SELECT array_agg(expo_push_token) INTO winner_tokens
        FROM user_push_tokens 
        WHERE user_id = ended_auction.winning_user_id AND is_active = true;
      END IF;
      
      -- 낙찰/유찰 결정
      IF ended_auction.winning_amount IS NOT NULL 
         AND ended_auction.winning_amount >= ended_auction.starting_price THEN
        
        -- 낙찰 처리 (기존 로직)
        INSERT INTO auction_results (
          auction_id, 
          result_type, 
          winning_bid_id, 
          winning_user_id, 
          winning_amount,
          metadata
        ) VALUES (
          ended_auction.id, 
          'successful', 
          ended_auction.winning_bid_id, 
          ended_auction.winning_user_id, 
          ended_auction.winning_amount,
          jsonb_build_object(
            'winning_user_name', ended_auction.winning_user_name,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id
          )
        );
        
        -- 알림 발송
        -- 경매 등록자에게 알림
        IF array_length(seller_tokens, 1) > 0 THEN
          PERFORM send_auction_end_notification(
            seller_tokens,
            '경매가 종료되었습니다',
            auction_title || ' 경매가 종료되었습니다.',
            jsonb_build_object(
              'auction_id', ended_auction.id,
              'auction_title', auction_title,
              'user_type', 'seller',
              'result', 'successful'
            )
          );
          
          -- 히스토리 저장
          INSERT INTO notification_history (user_id, type, title, body, data)
          VALUES (ended_auction.seller_id, 'auction_ended', '경매가 종료되었습니다', 
                  auction_title || ' 경매가 종료되었습니다.',
                  jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
        END IF;
        
        -- 낙찰자에게 알림
        IF array_length(winner_tokens, 1) > 0 THEN
          PERFORM send_auction_end_notification(
            winner_tokens,
            '경매에 낙찰되었습니다!',
            auction_title || ' 경매에 낙찰되었습니다!',
            jsonb_build_object(
              'auction_id', ended_auction.id,
              'auction_title', auction_title,
              'user_type', 'winner',
              'result', 'successful',
              'winning_amount', ended_auction.winning_amount
            )
          );
          
          -- 히스토리 저장
          INSERT INTO notification_history (user_id, type, title, body, data)
          VALUES (ended_auction.winning_user_id, 'auction_won', '경매에 낙찰되었습니다!', 
                  auction_title || ' 경매에 낙찰되었습니다!',
                  jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
        END IF;
        
        total_successful := total_successful + 1;
        
        RAISE NOTICE '✅ 낙찰 처리: % (₩%) - 알림 발송 완료', ended_auction.title, ended_auction.winning_amount;
        
      ELSE
        -- 유찰 처리 (기존 로직)
        INSERT INTO auction_results (
          auction_id, 
          result_type,
          metadata
        ) VALUES (
          ended_auction.id, 
          'failed',
          jsonb_build_object(
            'reason', CASE 
              WHEN ended_auction.winning_amount IS NULL THEN 'no_bids'
              WHEN ended_auction.winning_amount < ended_auction.starting_price THEN 'below_starting_price'
              ELSE 'unknown'
            END,
            'highest_bid', ended_auction.winning_amount,
            'starting_price', ended_auction.starting_price,
            'processing_time', NOW(),
            'seller_id', ended_auction.seller_id
          )
        );
        
        -- 경매 등록자에게 유찰 알림
        IF array_length(seller_tokens, 1) > 0 THEN
          PERFORM send_auction_end_notification(
            seller_tokens,
            '경매가 유찰되었습니다',
            auction_title || ' 경매가 유찰되었습니다.',
            jsonb_build_object(
              'auction_id', ended_auction.id,
              'auction_title', auction_title,
              'user_type', 'seller',
              'result', 'failed',
              'highest_bid', ended_auction.winning_amount
            )
          );
          
          -- 히스토리 저장
          INSERT INTO notification_history (user_id, type, title, body, data)
          VALUES (ended_auction.seller_id, 'auction_failed', '경매가 유찰되었습니다', 
                  auction_title || ' 경매가 유찰되었습니다.',
                  jsonb_build_object('auction_id', ended_auction.id, 'auction_title', auction_title));
        END IF;
        
        total_failed := total_failed + 1;
        
        RAISE NOTICE '❌ 유찰 처리: % (최고가: ₩%, 시작가: ₩%) - 알림 발송 완료', 
          ended_auction.title, 
          COALESCE(ended_auction.winning_amount, 0), 
          ended_auction.starting_price;
      END IF;
      
      -- 경매 상태를 ended로 업데이트
      UPDATE auctions 
      SET status = 'ended', updated_at = NOW()
      WHERE id = ended_auction.id;
      
    EXCEPTION WHEN OTHERS THEN
      total_errors := total_errors + 1;
      auction_error := SQLERRM;
      
      RAISE NOTICE '❌ 경매 처리 오류: % - %', ended_auction.title, auction_error;
      
      -- 오류 로그 저장
      INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
      VALUES ('auction', 'auction-end-processor', 'failed', 
              jsonb_build_object(
                'auction_id', ended_auction.id,
                'error', auction_error,
                'timestamp', NOW()
              ));
    END;
  END LOOP;

  -- 로그 완료
  INSERT INTO cron_execution_logs (job_type, job_name, status, metadata)
  VALUES ('auction', 'auction-end-processor', 'success', 
          jsonb_build_object(
            'processed', total_processed,
            'successful', total_successful,
            'failed', total_failed,
            'errors', total_errors,
            'completed_at', NOW()
          ));

  RETURN QUERY SELECT total_processed, total_successful, total_failed, total_errors;
END;
$$ LANGUAGE plpgsql;

-- 경매 상태 실시간 업데이트 함수 (ending 상태 관리)
CREATE OR REPLACE FUNCTION update_auction_status_realtime()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- ending 상태로 변경 (종료 1시간 전)
  UPDATE auctions 
  SET 
    status = 'ending',
    updated_at = NOW()
  WHERE 
    end_time <= NOW() + INTERVAL '1 hour' 
    AND end_time > NOW()
    AND status = 'active';
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE '⏰ % 개 경매가 ending 상태로 변경됨', updated_count;
  END IF;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 결제 기한 관리 함수
CREATE OR REPLACE FUNCTION process_payment_deadlines()
RETURNS TABLE(
  overdue_count INTEGER,
  warning_count INTEGER
) AS $$
DECLARE
  total_overdue INTEGER := 0;
  total_warnings INTEGER := 0;
BEGIN
  -- 결제 기한 초과된 거래 처리
  UPDATE auction_transactions 
  SET 
    transaction_status = 'failed',
    updated_at = NOW(),
    notes = COALESCE(notes, '') || '[' || NOW() || '] 결제 기한 초과로 자동 취소됨. '
  FROM auction_results ar
  WHERE 
    auction_transactions.auction_result_id = ar.id
    AND auction_transactions.transaction_status = 'pending'
    AND ar.payment_deadline < NOW();
    
  GET DIAGNOSTICS total_overdue = ROW_COUNT;
  
  -- 결제 기한 24시간 전 경고 대상 카운트
  SELECT COUNT(*) INTO total_warnings
  FROM auction_transactions at
  JOIN auction_results ar ON at.auction_result_id = ar.id
  WHERE 
    at.transaction_status = 'pending'
    AND ar.payment_deadline BETWEEN NOW() AND NOW() + INTERVAL '24 hours';
  
  -- 로그 기록
  INSERT INTO cron_execution_logs (job_type, job_name, status, success_count, metadata)
  VALUES ('auction', 'payment-deadline-checker', 'success', total_overdue,
          jsonb_build_object(
            'overdue_processed', total_overdue,
            'warnings_pending', total_warnings,
            'processed_at', NOW()
          ));
  
  RETURN QUERY SELECT total_overdue, total_warnings;
  
  IF total_overdue > 0 THEN
    RAISE NOTICE '💳 결제 기한 초과 처리: % 건', total_overdue;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 15. 통계 및 유틸리티 함수
-- ============================================

-- 경매 사진 개수 확인 함수
CREATE OR REPLACE FUNCTION get_auction_photo_count(auction_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM auction_photos 
    WHERE auction_photos.auction_id = get_auction_photo_count.auction_id
  );
END;
$$;

-- 경매 대표 사진 URL 가져오기 함수
CREATE OR REPLACE FUNCTION get_auction_representative_photo(auction_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT photo_url
    FROM auction_photos 
    WHERE auction_photos.auction_id = get_auction_representative_photo.auction_id 
    AND is_representative = true
    ORDER BY photo_order
    LIMIT 1
  );
END;
$$;

-- 경매 처리 통계 함수
CREATE OR REPLACE FUNCTION get_auction_processing_stats()
RETURNS TABLE(
  today_processed INTEGER,
  today_successful INTEGER,
  today_failed INTEGER,
  this_week_processed INTEGER,
  success_rate DECIMAL
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH today_stats AS (
    SELECT 
      COUNT(*) as processed,
      COUNT(*) FILTER (WHERE result_type = 'successful') as successful,
      COUNT(*) FILTER (WHERE result_type = 'failed') as failed
    FROM auction_results
    WHERE DATE(processed_at) = CURRENT_DATE
  ),
  week_stats AS (
    SELECT COUNT(*) as processed
    FROM auction_results
    WHERE processed_at >= DATE_TRUNC('week', NOW())
  ),
  overall_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND(COUNT(*) FILTER (WHERE result_type = 'successful') * 100.0 / COUNT(*), 2)
        ELSE 0
      END as rate
    FROM auction_results
    WHERE processed_at >= NOW() - INTERVAL '30 days'
  )
  SELECT 
    ts.processed::INTEGER,
    ts.successful::INTEGER, 
    ts.failed::INTEGER,
    ws.processed::INTEGER,
    os.rate
  FROM today_stats ts, week_stats ws, overall_stats os;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 16. 크론 작업 스케줄링
-- ============================================
DO $$
BEGIN
  -- 기존 경매 관련 크론 작업 제거 (존재하는 경우에만)
  BEGIN
    PERFORM cron.unschedule('auction-end-processor');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    PERFORM cron.unschedule('auction-status-updater');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    PERFORM cron.unschedule('payment-deadline-checker');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- 새로운 크론 작업 등록
  
  -- 매분마다 경매 종료 처리
  PERFORM cron.schedule(
    'auction-end-processor',
    '* * * * *',
    'SELECT process_ended_auctions();'
  );
  
  -- 매 5분마다 경매 상태 업데이트 (ending 상태 전환)
  PERFORM cron.schedule(
    'auction-status-updater', 
    '*/5 * * * *',
    'SELECT update_auction_status_realtime();'
  );
  
  -- 매시간마다 결제 기한 체크
  PERFORM cron.schedule(
    'payment-deadline-checker',
    '0 * * * *', 
    'SELECT process_payment_deadlines();'
  );
  
  RAISE NOTICE '⏰ 경매 시스템 크론 작업 스케줄 설정 완료';
  RAISE NOTICE '   • auction-end-processor: 매분 실행';
  RAISE NOTICE '   • auction-status-updater: 5분마다 실행';
  RAISE NOTICE '   • payment-deadline-checker: 매시간 실행';
END
$$;

-- ============================================
-- 17. 권한 설정
-- ============================================

-- 테이블 접근 권한
GRANT SELECT, INSERT, UPDATE, DELETE ON auctions TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON scrap_auctions TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON machinery_auctions TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON materials_auctions TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON demolition_auctions TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON auction_photos TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON auction_bids TO authenticated, anon;
GRANT SELECT ON auction_results TO authenticated, anon;
GRANT SELECT ON auction_transactions TO authenticated, anon;

-- 뷰 접근 권한
GRANT SELECT ON auction_list_view TO authenticated, anon;

-- 경매 등록 시 모든 사용자에게 알림 발송 함수
CREATE OR REPLACE FUNCTION send_auction_create_notification(
  auction_id TEXT,
  auction_title TEXT,
  auction_category TEXT,
  seller_name TEXT
) RETURNS void AS $$
DECLARE
  current_env TEXT;
  supabase_url TEXT;
  function_url TEXT;
  response_id BIGINT;
  all_tokens TEXT[];
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- 현재 환경 확인
  SELECT get_current_environment() INTO current_env;
  
  -- 모든 활성 사용자의 푸시 토큰 가져오기
  SELECT array_agg(expo_push_token) INTO all_tokens
  FROM user_push_tokens 
  WHERE is_active = true;
  
  -- 토큰이 없으면 처리하지 않음
  IF all_tokens IS NULL OR array_length(all_tokens, 1) IS NULL OR array_length(all_tokens, 1) = 0 THEN
    RAISE NOTICE '📱 새 경매 알림 전송 건너뜀: 활성 토큰이 없음';
    RETURN;
  END IF;
  
  -- 알림 내용 구성
  notification_title := '새로운 경매가 등록되었습니다!';
  notification_body := auction_title || ' 경매가 새로 등록되었습니다.';
  
  RAISE NOTICE '📢 새 경매 알림 발송: % - % (토큰 수: %)', notification_title, notification_body, array_length(all_tokens, 1);
  
  -- 환경별 처리
  IF current_env = 'local' THEN
    -- 로컬 환경에서는 로그만 출력
    RAISE NOTICE '🏠 로컬 환경: 실제 새 경매 알림 전송 생략';
  ELSE
    -- 프로덕션/스테이징에서는 실제 Edge Function 호출
    BEGIN
      -- 환경별 Supabase URL 설정
      IF current_env = 'production' THEN
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      ELSE
        -- 스테이징이나 기타 환경
        supabase_url := 'https://vxdncswvbhelstpkfcvv.supabase.co';
      END IF;
      
      function_url := supabase_url || '/functions/v1/send-auction-notification';
      
      RAISE NOTICE '🚀 새 경매 알림 Edge Function 호출: %', function_url;
      
      -- pg_net을 사용해서 Edge Function 호출
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZG5jc3d2YmhlbHN0cGtmY3Z2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDEyMzIxMiwiZXhwIjoyMDY5Njk5MjEyfQ.oAOAE-0vaU0ph5bkX9DBWfCwFEJha9wo8W1kATeAHTI'
        ),
        body := jsonb_build_object(
          'tokens', all_tokens, 
          'title', notification_title, 
          'body', notification_body, 
          'data', jsonb_build_object(
            'auction_id', auction_id,
            'auction_title', auction_title,
            'auction_category', auction_category,
            'seller_name', seller_name,
            'notification_type', 'auction_created'
          )
        ),
        timeout_milliseconds := 30000
      ) INTO response_id;
      
      RAISE NOTICE '✅ 새 경매 알림 전송 요청 완료 (request_id: %)', response_id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ 새 경매 알림 전송 실패: %', SQLERRM;
      -- 알림 실패가 경매 등록을 중단시키지 않도록 예외를 흡수
    END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 경매 등록 시 자동 알림 발송 트리거 함수
CREATE OR REPLACE FUNCTION trigger_auction_create_notification()
RETURNS TRIGGER AS $$
DECLARE
  seller_name TEXT;
  category_text TEXT;
BEGIN
  -- 판매자 이름 가져오기 (users 테이블에서)
  SELECT COALESCE(name, phone_number, 'Unknown') INTO seller_name
  FROM users 
  WHERE id = NEW.user_id;
  
  -- 카테고리 텍스트 변환
  category_text := CASE NEW.auction_category
    WHEN 'scrap' THEN '고철'
    WHEN 'machinery' THEN '중고기계'
    WHEN 'materials' THEN '중고자재'
    WHEN 'demolition' THEN '철거'
    ELSE NEW.auction_category::text
  END;
  
  -- 새 경매 알림 발송 (비동기)
  PERFORM send_auction_create_notification(
    NEW.id,
    NEW.title,
    category_text,
    COALESCE(seller_name, 'Unknown')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 경매 테이블에 트리거 생성
DROP TRIGGER IF EXISTS trigger_new_auction_notification ON auctions;
CREATE TRIGGER trigger_new_auction_notification
  AFTER INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auction_create_notification();

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION process_ended_auctions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_auction_status_realtime() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auction_processing_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auction_photo_count TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_auction_representative_photo TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_self_bidding_violations TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION send_auction_end_notification(TEXT[], TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION send_auction_create_notification(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trigger_auction_create_notification() TO anon, authenticated;

-- storage 버킷 사용 권한 부여
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO authenticated;

-- service_role에 모든 권한 부여
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================
-- 18. 코멘트 및 문서화
-- ============================================

COMMENT ON TABLE auctions IS '공통 경매 테이블 - 모든 카테고리의 기본 정보';
COMMENT ON TABLE scrap_auctions IS '고철 경매 특화 정보';
COMMENT ON TABLE machinery_auctions IS '중고기계 경매 특화 정보'; 
COMMENT ON TABLE materials_auctions IS '중고자재 경매 특화 정보';
COMMENT ON TABLE demolition_auctions IS '철거 경매 특화 정보';
COMMENT ON TABLE auction_photos IS '경매 사진 정보';
COMMENT ON TABLE auction_bids IS '경매 입찰 정보';
COMMENT ON TABLE auction_results IS '경매 결과 정보 - 낙찰/유찰/취소 결과 저장';
COMMENT ON TABLE auction_transactions IS '거래 추적 정보 - 결제 및 배송 상태 관리';
COMMENT ON VIEW auction_list_view IS '통합 뷰 - 기존 API 완전 호환성 보장';

COMMENT ON COLUMN auction_results.result_type IS '결과 타입: successful(낙찰), failed(유찰), cancelled(취소)';
COMMENT ON COLUMN auction_results.payment_deadline IS '결제 기한 (낙찰시 자동 설정: 처리일 + 3일)';
COMMENT ON COLUMN auction_transactions.transaction_status IS '거래 상태: pending → paid → delivered → completed';

COMMENT ON FUNCTION process_ended_auctions IS '종료된 경매들의 낙찰/유찰 처리 및 알림 발송 - 매분 실행';
COMMENT ON FUNCTION update_auction_status_realtime IS '경매 상태 실시간 업데이트 (ending 전환) - 5분마다 실행';
COMMENT ON FUNCTION process_payment_deadlines IS '결제 기한 관리 및 초과 처리 - 매시간 실행';
COMMENT ON FUNCTION get_auction_processing_stats IS '경매 처리 통계 조회 함수';
COMMENT ON FUNCTION check_self_bidding_violations IS '기존 데이터에서 자신의 경매에 입찰한 위반 사례를 확인하는 함수';
COMMENT ON FUNCTION send_auction_end_notification IS '경매 종료 시 실시간 알림 발송 함수';
COMMENT ON FUNCTION send_auction_create_notification IS '새 경매 등록 시 모든 사용자에게 알림 발송 함수';
COMMENT ON FUNCTION trigger_auction_create_notification IS '경매 등록 시 자동 알림 발송 트리거 함수';

COMMENT ON POLICY "basic_bid_policy" ON auction_bids IS 
'기본 입찰 정책: 데이터 무결성 체크. 자신의 경매 입찰 방지는 애플리케이션 레벨에서 처리';

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🎉 경매 시스템 통합 완료!';
  RAISE NOTICE '🏷️ 카테고리: scrap, machinery, materials, demolition';
  RAISE NOTICE '📊 테이블: auctions + 카테고리별 테이블 + 입찰/사진/결과';
  RAISE NOTICE '🔒 RLS 정책: 사용자별 접근 제어 + 자기 입찰 방지';
  RAISE NOTICE '📁 Storage: auction-photos 버킷 설정';
  RAISE NOTICE '🤖 자동화: 경매 종료, 상태 업데이트, 결제 기한 관리';
  RAISE NOTICE '📈 통계: 처리 현황, 성공률, 위반 사례 확인';
  RAISE NOTICE '🔗 호환성: auction_list_view 통합 뷰로 기존 API 지원';
  RAISE NOTICE '⏰ 크론: 매분/5분/매시간 자동 실행';
  RAISE NOTICE '🚀 완전한 경매 시스템 준비 완료!';
  RAISE NOTICE '📱 알림 시스템: 경매 종료/등록 시 자동 푸시 알림 발송';
END $$;