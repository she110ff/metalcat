import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LmeTestResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 생성 (service_role 키 사용)
    const supabaseUrl = Deno.env.get("EXPO_PUBLIC_SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get(
      "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "환경 변수가 설정되지 않았습니다: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 현재 시각
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // 1. 테스트용 LME 가격 데이터 생성
    const testPrices = [
      {
        metal_code: "AL",
        metal_name_kr: "알루미늄",
        price_usd_per_ton: 2200.0,
        price_krw_per_kg: 1.8,
        change_percent: 2.5,
        change_type: "positive",
        change_amount_krw: 44.0,
        exchange_rate: 1300.0,
        exchange_rate_source: "edge_function_test",
        price_date: today,
      },
      {
        metal_code: "CU",
        metal_name_kr: "구리",
        price_usd_per_ton: 9000.0,
        price_krw_per_kg: 7.385,
        change_percent: -1.2,
        change_type: "negative",
        change_amount_krw: -89.6,
        exchange_rate: 1300.0,
        exchange_rate_source: "edge_function_test",
        price_date: today,
      },
    ];

    // 2. 크롤링 로그 시작
    const { data: logData, error: logError } = await supabase
      .from("crawling_logs")
      .insert({
        status: "running",
        total_metals_attempted: 2,
        successful_extractions: 0,
        failed_extractions: 0,
        started_at: now,
      })
      .select("id")
      .single();

    if (logError) {
      throw new Error(`크롤링 로그 생성 실패: ${logError.message}`);
    }

    const logId = logData.id;

    // 3. 기존 오늘 데이터 삭제 (테스트용)
    await supabase
      .from("lme_processed_prices")
      .delete()
      .eq("price_date", today)
      .eq("exchange_rate_source", "edge_function_test");

    // 4. 새 가격 데이터 삽입
    const { data: priceData, error: priceError } = await supabase
      .from("lme_processed_prices")
      .insert(testPrices);

    if (priceError) {
      // 로그 업데이트 (실패)
      await supabase
        .from("crawling_logs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: priceError.message,
          failed_extractions: 2,
        })
        .eq("id", logId);

      throw new Error(`가격 데이터 삽입 실패: ${priceError.message}`);
    }

    // 5. 크롤링 로그 완료 업데이트
    await supabase
      .from("crawling_logs")
      .update({
        status: "success",
        completed_at: new Date().toISOString(),
        successful_extractions: 2,
        duration_ms: 2000,
      })
      .eq("id", logId);

    // 6. 삽입된 데이터 조회
    const { data: retrievedData, error: retrieveError } = await supabase
      .from("lme_processed_prices")
      .select("*")
      .eq("price_date", today)
      .eq("exchange_rate_source", "edge_function_test")
      .order("metal_code");

    if (retrieveError) {
      throw new Error(`데이터 조회 실패: ${retrieveError.message}`);
    }

    // 7. 테스트 데이터 즉시 삭제 (데이터베이스 오염 방지)
    await supabase
      .from("lme_processed_prices")
      .delete()
      .eq("price_date", today)
      .eq("exchange_rate_source", "edge_function_test");

    const response: LmeTestResponse = {
      success: true,
      message: `✅ Edge Function 테스트 성공! ${testPrices.length}개 가격 데이터 처리 완료 (테스트 후 정리됨)`,
      data: {
        inserted_count: testPrices.length,
        crawling_log_id: logId,
        retrieved_data: retrievedData,
        timestamp: now,
        note: "테스트 데이터는 자동으로 삭제되었습니다",
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Edge Function 오류:", error);

    const errorResponse: LmeTestResponse = {
      success: false,
      message: "❌ Edge Function 실행 실패",
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
