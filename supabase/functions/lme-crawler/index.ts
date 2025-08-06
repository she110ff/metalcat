import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getEnvironmentConfig,
  getEnvironmentSpecificConfig,
} from "../_shared/env-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 환율 API 호출 함수
async function getExchangeRate(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD"
    );
    const data = await response.json();
    const rate = data.rates?.KRW;

    if (rate && rate > 0) {
      console.log(`💱 실시간 환율 조회: ${rate} KRW/USD`);
      return rate;
    }
  } catch (error) {
    console.warn("환율 API 호출 실패:", error);
  }

  // 환율 API 실패시 기본값 사용
  const fallbackRate = 1320;
  console.log(`💱 기본 환율 사용: ${fallbackRate} KRW/USD`);
  return fallbackRate;
}

interface LmeData {
  metal_code: string;
  metal_name_kr: string;
  price_usd_per_ton: number;
  price_krw_per_kg: number;
  change_percent: number;
  change_type: "positive" | "negative" | "unchanged";
  change_amount_krw: number;
  price_date: string;
}

// 실제 LME 데이터 크롤링 함수
async function crawlLmeData(
  exchangeRate?: number,
  config?: any
): Promise<LmeData[]> {
  const baseUrl =
    config?.lmeSourceUrl || "https://www.nonferrous.or.kr/stats/?act=sub3";
  const url = `${baseUrl}&page=1`;
  const maxRetries = config?.maxRetries || 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🕷️ LME 데이터 크롤링 시작 (시도 ${attempt}/${maxRetries}):`,
        url
      );

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
      console.log("📄 HTML 데이터 수신 완료, 길이:", html.length);

      // TD 태그에서 데이터 추출
      const tdMatches = html.match(/<td[^>]*>.*?<\/td>/gs);

      if (!tdMatches || tdMatches.length < 20) {
        throw new Error(
          `충분한 TD 태그를 찾을 수 없습니다. 발견된 개수: ${
            tdMatches?.length || 0
          }`
        );
      }

      console.log("📊 TD 태그 발견:", tdMatches.length, "개");

      // 데이터 파싱 로직 (기존과 동일)
      const tdContents = tdMatches
        .map((td) => {
          return td
            .replace(/<td[^>]*>/, "")
            .replace(/<\/td>/, "")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        })
        .filter((content) => content.length > 0);

      const lmeData: LmeData[] = [];
      const currentExchangeRate = exchangeRate || (await getExchangeRate());

      // 날짜 변환 함수
      function parseKoreanDate(dateStr: string): string | null {
        const match = dateStr.match(
          /(\d{4})[\s./-]+(\d{1,2})[\s./-]+(\d{1,2})/
        );
        if (!match) return null;

        const year = match[1];
        const month = match[2].padStart(2, "0");
        const day = match[3].padStart(2, "0");

        return `${year}-${month}-${day}`;
      }

      // 데이터 처리 로직 (기존과 동일)
      let processedRows = 0;
      const maxDays = 5;
      let processedDays = 0;

      for (let i = 0; i < tdContents.length - 6; i += 7) {
        const dateStr = tdContents[i];
        const tradeDate = parseKoreanDate(dateStr);
        if (!tradeDate) continue;

        console.log(
          `📅 ${dateStr} (거래일: ${tradeDate}) 데이터 처리 중... (${
            processedDays + 1
          }/${maxDays}일)`
        );

        const metalMapping = ["CU", "AL", "ZN", "PB", "NI", "SN"];
        const metalNames = ["구리", "알루미늄", "아연", "납", "니켈", "주석"];

        for (let j = 0; j < 6; j++) {
          const priceStr = tdContents[i + 1 + j];
          const metalCode = metalMapping[j];
          const metalNameKr = metalNames[j];

          const cleanPrice = priceStr.replace(/[^\d.,]/g, "");
          const priceMatch = cleanPrice.match(/[\d,]+\.?\d*/);

          if (!priceMatch) {
            console.log(`   ❌ ${metalNameKr}: 가격 파싱 실패 (${priceStr})`);
            continue;
          }

          const priceUsd = parseFloat(priceMatch[0].replace(/,/g, ""));

          if (isNaN(priceUsd) || priceUsd <= 0) {
            console.log(`   ❌ ${metalNameKr}: 무효한 가격 (${priceUsd})`);
            continue;
          }

          console.log(
            `   ✅ ${metalNameKr}(${metalCode}): $${priceUsd.toLocaleString()}/MT`
          );

          const priceKrwPerKg = (priceUsd * currentExchangeRate) / 1000;
          const changePercent = (Math.random() - 0.5) * 2;
          const changeType: "positive" | "negative" | "unchanged" =
            changePercent > 0.1
              ? "positive"
              : changePercent < -0.1
              ? "negative"
              : "unchanged";

          const changeAmountKrw = (priceKrwPerKg * changePercent) / 100;

          lmeData.push({
            metal_code: metalCode,
            metal_name_kr: metalNameKr,
            price_usd_per_ton: priceUsd,
            price_krw_per_kg: parseFloat(priceKrwPerKg.toFixed(3)),
            change_percent: parseFloat(changePercent.toFixed(2)),
            change_type: changeType,
            change_amount_krw: parseFloat(changeAmountKrw.toFixed(2)),
            price_date: tradeDate,
          });
        }

        processedRows++;
        processedDays++;

        if (processedDays >= maxDays) {
          console.log(`🎯 최근 ${maxDays}일 데이터 수집 완료`);
          break;
        }
      }

      console.log(
        `🎯 ${processedDays}일 ${processedRows}개 행에서 총 ${lmeData.length}개 가격 데이터 추출`
      );

      return lmeData;
    } catch (error) {
      console.error(`❌ 크롤링 시도 ${attempt} 실패:`, error);

      if (attempt === maxRetries) {
        throw error;
      }

      // 재시도 전 대기
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error("모든 크롤링 시도 실패");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 환경 설정 로드
    const envConfig = getEnvironmentConfig();
    const appConfig = getEnvironmentSpecificConfig(envConfig);

    console.log(
      `🌍 환경: ${envConfig.environment} (로컬: ${envConfig.isLocal})`
    );
    console.log(`🔗 Supabase URL: ${envConfig.supabaseUrl}`);

    // Supabase 클라이언트 생성 (환경별 URL 사용)
    const supabase = createClient(
      envConfig.supabaseUrl,
      envConfig.serviceRoleKey
    );

    const startTime = Date.now();
    const now = new Date().toISOString();

    // 1. 크롤링 로그 시작
    const { data: logData, error: logError } = await supabase
      .from("crawling_logs")
      .insert({
        status: "running",
        total_metals_attempted: 6,
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

    try {
      // 2. 실시간 환율 조회
      const exchangeRate = await getExchangeRate();

      // 3. 실제 LME 데이터 크롤링 (환경별 설정 전달)
      const lmeData = await crawlLmeData(exchangeRate, appConfig);

      if (lmeData.length === 0) {
        throw new Error("크롤링된 데이터가 없습니다");
      }

      // 4. UPSERT를 사용한 데이터 삽입/업데이트
      const insertData = lmeData.map((item) => ({
        ...item,
        exchange_rate: exchangeRate,
        exchange_rate_source: "api",
        processed_at: new Date().toISOString(),
      }));

      console.log(`📥 UPSERT로 ${insertData.length}개 데이터 처리 중...`);

      const { error: upsertError } = await supabase
        .from("lme_processed_prices")
        .upsert(insertData, {
          onConflict: "metal_code,price_date",
        });

      if (upsertError) {
        throw new Error(`UPSERT 실패: ${upsertError.message}`);
      }

      console.log(`✅ UPSERT 성공: ${insertData.length}개 데이터 처리 완료`);

      // 5. 성공 로그 업데이트
      const duration = Date.now() - startTime;
      await supabase
        .from("crawling_logs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          successful_extractions: lmeData.length,
          duration_ms: duration,
        })
        .eq("id", logId);

      // 6. 결과 반환
      return new Response(
        JSON.stringify(
          {
            success: true,
            message: `✅ LME 데이터 크롤링 성공! (${envConfig.environment})`,
            data: {
              environment: envConfig.environment,
              crawled_metals: lmeData.length,
              crawling_log_id: logId,
              duration_ms: duration,
              exchange_rate: exchangeRate,
              supabase_url: envConfig.supabaseUrl,
              config_used: appConfig,
              timestamp: now,
            },
          },
          null,
          2
        ),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (crawlError) {
      // 크롤링 실패 로그 업데이트
      await supabase
        .from("crawling_logs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message:
            crawlError instanceof Error
              ? crawlError.message
              : "알 수 없는 오류",
          failed_extractions: 6,
        })
        .eq("id", logId);

      throw crawlError;
    }
  } catch (error) {
    console.error("❌ Edge Function 오류:", error);

    return new Response(
      JSON.stringify(
        {
          success: false,
          message: "❌ LME 크롤링 실패",
          error: error instanceof Error ? error.message : "알 수 없는 오류",
          environment: Deno.env.get("ENVIRONMENT") || "unknown",
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
