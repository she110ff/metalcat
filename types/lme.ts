import { Database } from "./supabase";

// Supabase 데이터베이스 타입 추출
export type LmeProcessedPriceRow =
  Database["public"]["Tables"]["lme_processed_prices"]["Row"];
export type CrawlingLogRow =
  Database["public"]["Tables"]["crawling_logs"]["Row"];

// 프론트엔드용 LME 가격 데이터 인터페이스
export interface LatestLmePrice {
  metal_code: string;
  metal_name_kr: string;
  price_krw_per_kg: number;
  change_percent: number | null;
  change_type: "positive" | "negative" | "unchanged" | null;
  price_date: string;
  last_updated: string;
}

// 금속별 히스토리 데이터 인터페이스
export interface MetalHistoryData {
  metal_code: string;
  metal_name_kr: string; // 실제 DB에서 오는 한글 금속명
  price_date: string;
  price_krw_per_kg: number;
  price_usd_per_ton: number;
  change_percent: number | null;
  change_type: "positive" | "negative" | "unchanged" | null;
  exchange_rate: number;
}

// 크롤링 상태 인터페이스
export interface CrawlingStatus {
  last_success_at: string | null;
  last_failure_at: string | null;
  is_currently_running: boolean;
  success_rate_24h: number;
  avg_duration_ms: number;
}

// API 응답 래퍼 인터페이스
export interface ApiResponse<T> {
  data: T;
  error: string | null;
  success: boolean;
}

// 쿼리 필터 옵션
export interface LmeQueryOptions {
  metalCode?: string;
  days?: number;
  startDate?: string;
  endDate?: string;
}

// 에러 타입
export interface LmeError {
  code: string;
  message: string;
  details?: any;
}
