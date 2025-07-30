-- LME 가격 데이터를 위한 테이블 생성
-- 생성일: 2025-01-21
-- 목적: 한국 비철금속협회에서 크롤링한 LME 가격 데이터 저장

-- 1. 처리된 가격 테이블 (메인 데이터)
CREATE TABLE IF NOT EXISTS lme_processed_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 금속 정보
  metal_code VARCHAR(10) NOT NULL,
  metal_name_kr VARCHAR(20) NOT NULL,
  
  -- 변환된 가격 정보
  price_krw_per_kg DECIMAL(12,2) NOT NULL, -- 원/KG (메인 표시 가격)
  price_usd_per_ton DECIMAL(12,4) NOT NULL, -- USD/톤 (원본 가격)
  
  -- 변화율 정보
  change_percent DECIMAL(8,4), -- 전일 대비 변화율
  change_type VARCHAR(10) CHECK (change_type IN ('positive', 'negative', 'unchanged')),
  change_amount_krw DECIMAL(12,2), -- 원화 기준 변화량
  
  -- 환율 정보
  exchange_rate DECIMAL(10,4) NOT NULL, -- 적용된 USD/KRW 환율
  exchange_rate_source VARCHAR(50) DEFAULT 'manual', -- 환율 출처
  
  -- 시간 정보
  price_date DATE NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 유니크 제약조건 (하루에 하나의 금속당 하나의 레코드)
  UNIQUE(metal_code, price_date)
);

-- 3. 크롤링 실행 로그 테이블
CREATE TABLE IF NOT EXISTS crawling_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 실행 정보
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'partial', 'timeout')),
  
  -- 실행 결과 통계
  total_metals_attempted INTEGER DEFAULT 0,
  successful_extractions INTEGER DEFAULT 0,
  failed_extractions INTEGER DEFAULT 0,
  
  -- 오류 정보
  error_message TEXT,
  
  -- 성능 메트릭
  duration_ms INTEGER,
  
  -- 시간 정보
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
-- 처리된 데이터 조회 최적화
CREATE INDEX IF NOT EXISTS idx_lme_processed_prices_metal_date ON lme_processed_prices(metal_code, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_lme_processed_prices_processed_at ON lme_processed_prices(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lme_processed_prices_change_type ON lme_processed_prices(change_type, price_date DESC);

-- 크롤링 로그 모니터링
CREATE INDEX IF NOT EXISTS idx_crawling_logs_status_started ON crawling_logs(status, started_at DESC);

-- 업데이트 트리거 추가 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 각 테이블에 업데이트 트리거 적용
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 기본 시스템 설정 값 추가
INSERT INTO system_settings (key, value, description) VALUES
('crawler_interval_minutes', '5', 'LME 크롤링 실행 간격 (분)'),
('default_exchange_rate', '1320', '기본 USD/KRW 환율'),
('max_retry_attempts', '3', '크롤링 재시도 최대 횟수')
ON CONFLICT (key) DO NOTHING;

-- 코멘트 추가
COMMENT ON TABLE lme_processed_prices IS 'LME 가격 데이터 (처리된 형태)';
COMMENT ON TABLE crawling_logs IS '크롤링 실행 로그';
COMMENT ON TABLE system_settings IS '시스템 설정값 저장';

COMMENT ON COLUMN lme_processed_prices.change_type IS '가격 변화 방향: positive(상승), negative(하락), unchanged(변화없음)';
COMMENT ON COLUMN crawling_logs.status IS '실행 상태: running(실행중), success(성공), failed(실패), partial(부분성공), timeout(타임아웃)'; 