import { createClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase";

// 환경변수에서 Supabase 설정 가져오기 (Expo Public 변수 우선, fallback 포함)
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54331";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// LME 전용 Supabase 클라이언트 생성
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // LME 데이터는 인증이 필요 없으므로 세션 비활성화
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "Content-Type": "application/json",
    },
  },
});

// RPC 함수 호출을 위한 타입 안전 wrapper
export const lmeRpc = {
  // 최신 LME 가격 조회
  getLatestPrices: () => {
    return supabase.rpc("get_latest_lme_prices");
  },

  // 크롤링 상태 조회
  getCrawlingStatus: () => {
    return supabase.rpc("get_crawling_status");
  },

  // 차트 통계 조회
  getChartStats: (
    metalCode: string,
    period: "daily" | "weekly" | "monthly",
    limit = 30
  ) => {
    return supabase.rpc("get_lme_chart_stats", {
      p_metal_code: metalCode,
      p_period: period,
      p_limit: limit,
    });
  },
} as const;

// 직접 테이블 쿼리를 위한 헬퍼
export const lmeTables = {
  processedPrices: () => supabase.from("lme_processed_prices"),
  crawlingLogs: () => supabase.from("crawling_logs"),
} as const;
