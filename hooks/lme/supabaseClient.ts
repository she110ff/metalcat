import { createClient } from "@supabase/supabase-js";
import { Database } from "../../types/supabase";

// 환경변수에서 Supabase 설정 가져오기 (Expo Public 변수 우선, fallback 포함)
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54331";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJl" +
    "eHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

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
} as const;

// 직접 테이블 쿼리를 위한 헬퍼
export const lmeTables = {
  processedPrices: () => supabase.from("lme_processed_prices"),
  crawlingLogs: () => supabase.from("crawling_logs"),
} as const;
