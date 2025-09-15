-- ============================================
-- 고철/비철 분류 시스템 추가
-- 생성일: 2025-09-15
-- 목적: scrap_auctions 테이블에 ferrous_type 컬럼 추가하여 고철/비철 분류
-- 설명: scrap 카테고리 내에서 ferrous(고철)/nonferrous(비철) 구분
-- ============================================

-- scrap_auctions 테이블에 ferrous_type 컬럼 추가
ALTER TABLE scrap_auctions 
ADD COLUMN ferrous_type VARCHAR(20) NOT NULL DEFAULT 'ferrous'
CHECK (ferrous_type IN ('ferrous', 'nonferrous'));

-- 컬럼 설명 추가
COMMENT ON COLUMN scrap_auctions.ferrous_type IS '금속 분류: ferrous(고철), nonferrous(비철)';

-- 인덱스 추가 (필터링 성능 향상)
CREATE INDEX idx_scrap_auctions_ferrous_type ON scrap_auctions(ferrous_type);
