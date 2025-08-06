/**
 * 환경 변수 유틸리티
 * 로컬/리모트 환경에 따라 적절한 설정을 반환
 */

/// <reference types="https://deno.land/x/supabase_functions_js@v2.4.5/edge-runtime.d.ts" />

export interface EnvironmentConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  environment: "local" | "staging" | "production";
  isLocal: boolean;
  isProduction: boolean;
}

/**
 * 현재 환경 감지 및 설정 반환
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  // 환경 변수에서 설정 읽기
  const rawSupabaseUrl = Deno.env.get("EXPO_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
  const environment = (Deno.env.get("ENVIRONMENT") || "production") as
    | "local"
    | "staging"
    | "production";

  // 로컬 환경 감지 (URL 패턴으로 판단)
  const isLocal =
    rawSupabaseUrl?.includes("127.0.0.1") ||
    rawSupabaseUrl?.includes("localhost");

  // 로컬 환경에서는 Edge Function용 내부 URL 사용
  let supabaseUrl = rawSupabaseUrl || "";

  if (isLocal) {
    // Edge Function에서 Supabase API에 접근할 때는 Docker 네트워크 주소 사용
    const internalUrl = Deno.env.get("INTERNAL_SUPABASE_URL");
    if (internalUrl) {
      supabaseUrl = internalUrl;
      console.log(`🔧 로컬 환경 감지: 내부 URL 사용 (${supabaseUrl})`);
    } else {
      // 폴백: host.docker.internal 사용
      supabaseUrl =
        rawSupabaseUrl?.replace("127.0.0.1", "host.docker.internal") ||
        supabaseUrl;
      console.log(
        `🔧 로컬 환경 폴백: host.docker.internal 사용 (${supabaseUrl})`
      );
    }
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "필수 환경 변수가 설정되지 않았습니다: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    environment,
    isLocal,
    isProduction: environment === "production",
  };
}

/**
 * 환경별 설정값 반환
 */
export function getEnvironmentSpecificConfig(config: EnvironmentConfig) {
  return {
    // 크롤링 설정
    maxRetries: config.isLocal ? 2 : 5,
    crawlerInterval: config.isLocal ? 900 : 900, // 15분
    maxPages: config.isLocal ? 5 : 10,

    // 로깅 설정
    logLevel: config.isLocal ? "debug" : "info",
    enableDetailedLogs: config.isLocal,

    // 기능 설정
    enableMockData: config.isLocal,
    enableRateLimiting: config.isProduction,

    // 기본값
    defaultExchangeRate: 1320,
    lmeSourceUrl: "https://www.nonferrous.or.kr/stats/?act=sub3",
  };
}
