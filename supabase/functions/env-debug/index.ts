import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  getEnvironmentConfig,
  getEnvironmentSpecificConfig,
} from "../_shared/env-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 환경 설정 로드
    const envConfig = getEnvironmentConfig();
    const appConfig = getEnvironmentSpecificConfig(envConfig);

    // 환경변수 정보 수집 (민감한 정보는 마스킹)
    const envInfo = {
      // 기본 환경 정보
      environment: envConfig.environment,
      isLocal: envConfig.isLocal,
      isProduction: envConfig.isProduction,

      // URL 정보 (마지막 4자리만 표시)
      supabaseUrl: envConfig.supabaseUrl.replace(/(.{4})$/, "****"),
      serviceRoleKey: envConfig.serviceRoleKey
        ? "***" + envConfig.serviceRoleKey.slice(-4)
        : "없음",

      // 환경변수 존재 여부 확인
      envVars: {
        EXPO_PUBLIC_SUPABASE_URL: Deno.env.get("EXPO_PUBLIC_SUPABASE_URL")
          ? "설정됨"
          : "없음",
        EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: Deno.env.get(
          "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"
        )
          ? "설정됨"
          : "없음",
        INTERNAL_SUPABASE_URL: Deno.env.get("INTERNAL_SUPABASE_URL")
          ? "설정됨"
          : "없음",
        ENVIRONMENT: Deno.env.get("ENVIRONMENT") || "기본값(production)",
      },

      // 애플리케이션 설정
      appConfig: appConfig,

      // 시스템 정보
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    return new Response(
      JSON.stringify(
        {
          success: true,
          message: "환경변수 디버그 정보",
          data: envInfo,
        },
        null,
        2
      ),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("환경변수 디버그 오류:", error);

    return new Response(
      JSON.stringify(
        {
          success: false,
          message: "환경변수 디버그 실패",
          error: error instanceof Error ? error.message : "알 수 없는 오류",
        },
        null,
        2
      ),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
