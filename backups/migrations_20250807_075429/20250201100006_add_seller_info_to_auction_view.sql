-- ============================================
-- 판매자 정보를 auction_list_view에 추가
-- ============================================

-- 기존 뷰 삭제
DROP VIEW IF EXISTS auction_list_view;

-- 판매자 정보가 포함된 새로운 뷰 생성
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
  
  -- 판매자 정보 추가
  u.name as seller_name,
  u.phone_number as seller_phone,
  
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
LEFT JOIN users u ON a.user_id = u.id
LEFT JOIN scrap_auctions s ON a.id = s.auction_id AND a.auction_category = 'scrap'
LEFT JOIN machinery_auctions m ON a.id = m.auction_id AND a.auction_category = 'machinery'
LEFT JOIN materials_auctions mt ON a.id = mt.auction_id AND a.auction_category = 'materials'
LEFT JOIN demolition_auctions d ON a.id = d.auction_id AND a.auction_category = 'demolition';

-- 권한 설정
GRANT SELECT ON auction_list_view TO authenticated, anon;

-- 뷰 설명 추가
COMMENT ON VIEW auction_list_view IS '통합 뷰 - 판매자 정보 포함, 기존 API 완전 호환성 보장';
