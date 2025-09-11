-- ============================================
-- LME 차트 통계 함수 추가
-- 생성일: 2025-09-11
-- 목적: 일/주/월별 차트 데이터 집계 및 통계 제공
-- ============================================

-- LME 차트 통계 조회 함수
CREATE OR REPLACE FUNCTION get_lme_chart_stats(
  p_metal_code VARCHAR(10),
  p_period VARCHAR(10), -- 'daily', 'weekly', 'monthly'
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE(
  period_start DATE,
  period_label TEXT,
  avg_price DECIMAL(12,2),
  min_price DECIMAL(12,2), 
  max_price DECIMAL(12,2),
  change_percent DECIMAL(8,4),
  change_type VARCHAR(10),
  data_points INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_period
    WHEN 'daily' THEN
      -- 일별 데이터 (기존 데이터 그대로, 최근 30일)
      RETURN QUERY
      SELECT 
        lpp.price_date as period_start,
        TO_CHAR(lpp.price_date, 'MM/DD') as period_label,
        lpp.price_krw_per_kg as avg_price,
        lpp.price_krw_per_kg as min_price,
        lpp.price_krw_per_kg as max_price,
        COALESCE(lpp.change_percent, 0::DECIMAL(8,4)) as change_percent,
        COALESCE(lpp.change_type, 'unchanged'::VARCHAR(10)) as change_type,
        1 as data_points
      FROM lme_processed_prices lpp
      WHERE lpp.metal_code = p_metal_code
      AND lpp.price_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY lpp.price_date DESC
      LIMIT p_limit;
      
    WHEN 'weekly' THEN
      -- 주별 평균 데이터 (최근 140일 = 약 20주)
      RETURN QUERY
      WITH weekly_stats AS (
        SELECT 
          DATE_TRUNC('week', lpp.price_date)::DATE as week_start,
          ROUND(AVG(lpp.price_krw_per_kg), 2) as avg_price,
          MIN(lpp.price_krw_per_kg) as min_price,
          MAX(lpp.price_krw_per_kg) as max_price,
          COUNT(*)::INTEGER as data_points
        FROM lme_processed_prices lpp
        WHERE lpp.metal_code = p_metal_code
        AND lpp.price_date >= CURRENT_DATE - INTERVAL '140 days'
        GROUP BY DATE_TRUNC('week', lpp.price_date)
        ORDER BY week_start DESC
        LIMIT p_limit
      ),
      weekly_with_change AS (
        SELECT 
          ws.*,
          LAG(ws.avg_price) OVER (ORDER BY ws.week_start DESC) as prev_price
        FROM weekly_stats ws
      )
      SELECT 
        wwc.week_start as period_start,
        TO_CHAR(wwc.week_start, 'MM/DD') as period_label,
        wwc.avg_price,
        wwc.min_price,
        wwc.max_price,
        CASE 
          WHEN wwc.prev_price IS NULL THEN 0::DECIMAL(8,4)
          ELSE ROUND(((wwc.avg_price - wwc.prev_price) / wwc.prev_price * 100), 4)
        END as change_percent,
        CASE 
          WHEN wwc.prev_price IS NULL THEN 'unchanged'::VARCHAR(10)
          WHEN wwc.avg_price > wwc.prev_price THEN 'positive'::VARCHAR(10)
          WHEN wwc.avg_price < wwc.prev_price THEN 'negative'::VARCHAR(10)
          ELSE 'unchanged'::VARCHAR(10)
        END as change_type,
        wwc.data_points
      FROM weekly_with_change wwc
      ORDER BY wwc.week_start DESC;
      
    WHEN 'monthly' THEN
      -- 월별 평균 데이터 (최근 600일 = 약 20개월)
      RETURN QUERY
      WITH monthly_stats AS (
        SELECT 
          DATE_TRUNC('month', lpp.price_date)::DATE as month_start,
          ROUND(AVG(lpp.price_krw_per_kg), 2) as avg_price,
          MIN(lpp.price_krw_per_kg) as min_price,
          MAX(lpp.price_krw_per_kg) as max_price,
          COUNT(*)::INTEGER as data_points
        FROM lme_processed_prices lpp
        WHERE lpp.metal_code = p_metal_code
        AND lpp.price_date >= CURRENT_DATE - INTERVAL '600 days'
        GROUP BY DATE_TRUNC('month', lpp.price_date)
        ORDER BY month_start DESC
        LIMIT p_limit
      ),
      monthly_with_change AS (
        SELECT 
          ms.*,
          LAG(ms.avg_price) OVER (ORDER BY ms.month_start DESC) as prev_price
        FROM monthly_stats ms
      )
      SELECT 
        mwc.month_start as period_start,
        TO_CHAR(mwc.month_start, 'YYYY/MM') as period_label,
        mwc.avg_price,
        mwc.min_price,
        mwc.max_price,
        CASE 
          WHEN mwc.prev_price IS NULL THEN 0::DECIMAL(8,4)
          ELSE ROUND(((mwc.avg_price - mwc.prev_price) / mwc.prev_price * 100), 4)
        END as change_percent,
        CASE 
          WHEN mwc.prev_price IS NULL THEN 'unchanged'::VARCHAR(10)
          WHEN mwc.avg_price > mwc.prev_price THEN 'positive'::VARCHAR(10)
          WHEN mwc.avg_price < mwc.prev_price THEN 'negative'::VARCHAR(10)
          ELSE 'unchanged'::VARCHAR(10)
        END as change_type,
        mwc.data_points
      FROM monthly_with_change mwc
      ORDER BY mwc.month_start DESC;
      
    ELSE
      -- 잘못된 period 값인 경우 빈 결과 반환
      RETURN;
  END CASE;
END;
$$;

-- 권한 설정 (모든 인증된 사용자와 익명 사용자가 실행 가능)
GRANT EXECUTE ON FUNCTION get_lme_chart_stats(VARCHAR, VARCHAR, INTEGER) TO authenticated, anon;

-- 함수 설명 추가
COMMENT ON FUNCTION get_lme_chart_stats(VARCHAR, VARCHAR, INTEGER) IS 'LME 가격 데이터의 일/주/월별 차트 통계를 조회하는 함수. 평균, 최소, 최대 가격과 변화율을 계산하여 반환합니다.';
