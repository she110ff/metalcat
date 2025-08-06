import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const baseUrl = "https://www.nonferrous.or.kr/stats/?act=sub3";
    const url = baseUrl;

    console.log("🔍 LME 디버깅 시작:", url);

    // 1. Fetch 테스트
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // 2. HTML 기본 정보
    const htmlInfo = {
      length: html.length,
      has_table: html.includes("<table"),
      has_td: html.includes("<td"),
      title: html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || "No title",
    };

    // 3. TD 태그 추출 테스트
    const tdMatches = html.match(/<td[^>]*>.*?<\/td>/gs);
    const tdCount = tdMatches?.length || 0;

    // 4. 첫 10개 TD 내용 확인
    const sampleTds =
      tdMatches?.slice(0, 10).map((td) =>
        td
          .replace(/<td[^>]*>/, "")
          .replace(/<\/td>/, "")
          .trim()
      ) || [];

    // 5. 날짜 패턴 확인
    let dateMatches = 0;
    let priceMatches = 0;

    if (tdMatches) {
      for (const td of tdMatches.slice(0, 50)) {
        const content = td
          .replace(/<td[^>]*>/, "")
          .replace(/<\/td>/, "")
          .trim();

        if (content.match(/\d{4}[-./]\d{1,2}[-./]\d{1,2}/)) {
          dateMatches++;
        }

        if (content.match(/[\d,]+\.?\d*/)) {
          priceMatches++;
        }
      }
    }

    const debugInfo = {
      success: true,
      html_info: htmlInfo,
      td_analysis: {
        total_td_count: tdCount,
        sample_tds: sampleTds,
        date_pattern_matches: dateMatches,
        price_pattern_matches: priceMatches,
      },
      parsing_test: {
        expected_minimum_tds: 140,
        has_enough_data: tdCount >= 140,
        sample_first_td: sampleTds[0] || "No TDs found",
      },
    };

    return new Response(JSON.stringify(debugInfo, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ 디버깅 함수 오류:", error);

    return new Response(
      JSON.stringify(
        {
          success: false,
          error: error instanceof Error ? error.message : "알 수 없는 오류",
          debug_info: "Edge Function 디버깅 실패",
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
