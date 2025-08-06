/**
 * 서비스 요청 시스템용 Supabase 클라이언트
 * 작성일: 2025-01-30
 * 목적: 서비스 요청 테이블 접근용 클라이언트 (타입 제한 없음)
 */

import { createClient } from "@supabase/supabase-js";

// 환경변수에서 Supabase 설정 가져오기 (Expo Public 변수 우선, fallback 포함)
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54331";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJl" +
    "eHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// 서비스 요청 전용 Supabase 클라이언트 생성 (타입 제한 없음)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // 서비스 요청은 인증이 필요할 수 있으므로 세션 유지
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "x-application-name": "metacat2-service-request",
    },
  },
});
