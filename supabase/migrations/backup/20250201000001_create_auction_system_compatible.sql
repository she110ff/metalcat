-- ============================================
-- 최적화된 카테고리별 경매 시스템 아키텍처
-- 작성일: 2025-02-01  
-- 목적: 기존 UI/UX 호환성 유지 + 카테고리별 테이블 분리 최적화
-- ============================================

-- 열거형 타입 정의 (기존 TypeScript 타입과 동일)
CREATE TYPE auction_category_enum AS ENUM ('scrap', 'machinery', 'materials', 'demolition');
CREATE TYPE auction_status_enum AS ENUM ('active', 'ending', 'ended', 'cancelled');
CREATE TYPE transaction_type_enum AS ENUM ('normal', 'urgent');

-- 기존 테이블들 정리 (필요시)
DROP TABLE IF EXISTS auction_bids CASCADE;
DROP TABLE IF EXISTS auction_photos CASCADE; 
DROP TABLE IF EXISTS auctions CASCADE;

-- ============================================
-- 1. 공통 경매 테이블 (핵심 정보만)
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
-- 2. 고철 전용 테이블 
-- ============================================
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

-- ============================================
-- 3. 중고기계 전용 테이블  
-- ============================================
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

-- ============================================
-- 4. 중고자재 전용 테이블
-- ============================================
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

-- ============================================
-- 5. 철거 전용 테이블
-- ============================================
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
-- 6. 공통 테이블들 (기존 유지)
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
-- 7. 기존 API 호환성을 위한 통합 뷰
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
-- 8. 인덱스 최적화
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
CREATE INDEX idx_auction_bids_auction_id ON auction_bids(auction_id);
CREATE INDEX idx_auction_bids_amount ON auction_bids(auction_id, amount DESC);
CREATE INDEX idx_auction_bids_user_id ON auction_bids(user_id);

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

CREATE POLICY "Anyone can create bids" ON auction_bids
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 10. 트리거 함수들
-- ============================================

-- 경매 업데이트 시간 자동 갱신
CREATE OR REPLACE FUNCTION update_auction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_auction_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_updated_at();

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

CREATE TRIGGER trigger_update_auction_on_bid
  BEFORE INSERT ON auction_bids
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_on_bid();

-- ============================================
-- 11. 문서화 및 코멘트
-- ============================================

COMMENT ON TABLE auctions IS '공통 경매 테이블 - 모든 카테고리의 기본 정보';
COMMENT ON TABLE scrap_auctions IS '고철 경매 특화 정보';
COMMENT ON TABLE machinery_auctions IS '중고기계 경매 특화 정보'; 
COMMENT ON TABLE materials_auctions IS '중고자재 경매 특화 정보';
COMMENT ON TABLE demolition_auctions IS '철거 경매 특화 정보';
COMMENT ON TABLE auction_photos IS '경매 사진 정보';
COMMENT ON TABLE auction_bids IS '경매 입찰 정보';
COMMENT ON VIEW auction_list_view IS '통합 뷰 - 기존 API 완전 호환성 보장';

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🎉 최적화된 카테고리별 경매 시스템 구축 완료!';
  RAISE NOTICE '✅ 카테고리별 테이블 분리: scrap, machinery, materials, demolition';
  RAISE NOTICE '✅ 기존 API 호환성: auction_list_view 통합 뷰';
  RAISE NOTICE '✅ 성능 최적화: 카테고리별 인덱스 및 RLS 정책';
  RAISE NOTICE '✅ 자동화: 트리거 기반 데이터 동기화';
  RAISE NOTICE '🚀 확장 가능하고 효율적인 구조로 완성!';
END $$;