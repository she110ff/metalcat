import { createClient } from "@supabase/supabase-js";

// 환경변수에서 Supabase 설정 가져오기 (기존 LME 패턴과 동일)
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "http://127.0.0.1:54331";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJl" +
    "eHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// 경매 전용 Supabase 클라이언트 생성 (타입 제약 제거)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // 경매는 사용자 인증이 필요하므로 세션 활성화
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

// 경매 관련 테이블 쿼리를 위한 헬퍼 (타입 안전성보다 유연성 우선)
export const auctionTables = {
  auctions: () => supabase.from("auctions"),
  photos: () => supabase.from("auction_photos"),
  bids: () => supabase.from("auction_bids"),
} as const;

// 경매 관련 스토리지 버킷
export const auctionStorage = {
  photos: () => supabase.storage.from("auction-photos"),
} as const;
