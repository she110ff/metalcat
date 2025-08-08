import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

interface CrawlResult {
  page: number;
  dataCount: number;
  dates: string[];
  success: boolean;
  error?: string;
}

// 날짜 변환 함수 (한국 형식 → ISO 형식)
function parseKoreanDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{4})[\s./-]+(\d{1,2})[\s./-]+(\d{1,2})/);
  if (!match) return null;

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 단일 페이지 크롤링 함수
async function crawlSinglePage(
  pageNumber: number,
  exchangeRate?: number
): Promise<{ data: LmeData[]; dates: string[] }> {
  const baseUrl = "https://www.nonferrous.or.kr/stats/?act=sub3";
  const url = `${baseUrl}&page=${pageNumber}`;

  console.log(`🕷️ ${pageNumber}페이지 크롤링 시작: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.5",
      "Accept-Encoding": "gzip, deflate",
      Connection: "keep-alive",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP 오류: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  console.log(`📄 ${pageNumber}페이지 HTML 수신: ${html.length}자`);

  // TD 태그에서 데이터 추출
  const tdMatches = html.match(/<td[^>]*>.*?<\/td>/gs);

  if (!tdMatches || tdMatches.length < 20) {
    console.log(
      `⚠️ ${pageNumber}페이지: 충분한 데이터 없음 (${tdMatches?.length || 0}개)`
    );
    return { data: [], dates: [] };
  }

  // TD 내용 추출 및 정리
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
  const extractedDates: string[] = [];

  // 환율 설정 (파라미터로 전달되지 않으면 기본값 사용)
  const currentExchangeRate = exchangeRate || (await getExchangeRate());

  // 7개씩 그룹화 (날짜 + 6개 금속)
  let processedRows = 0;

  for (let i = 0; i < tdContents.length - 6; i += 7) {
    const dateStr = tdContents[i];

    // 실제 거래 날짜 파싱
    const tradeDate = parseKoreanDate(dateStr);
    if (!tradeDate) {
      continue;
    }

    extractedDates.push(tradeDate);
    console.log(`📅 ${pageNumber}페이지: ${dateStr} (거래일: ${tradeDate})`);

    // 6개 금속 가격 데이터 순서: Cu, Al, Zn, Pb, Ni, Sn
    const metalMapping = ["CU", "AL", "ZN", "PB", "NI", "SN"];
    const metalNames = ["구리", "알루미늄", "아연", "납", "니켈", "주석"];

    for (let j = 0; j < 6; j++) {
      const priceStr = tdContents[i + 1 + j];
      const metalCode = metalMapping[j];
      const metalNameKr = metalNames[j];

      // 가격 파싱
      const cleanPrice = priceStr.replace(/[^\d.,]/g, "");
      const priceMatch = cleanPrice.match(/[\d,]+\.?\d*/);

      if (!priceMatch) {
        continue;
      }

      const priceUsd = parseFloat(priceMatch[0].replace(/,/g, ""));

      if (isNaN(priceUsd) || priceUsd <= 0) {
        continue;
      }

      // KRW/kg 변환 (USD/ton -> KRW/kg)
      const priceKrwPerKg = (priceUsd * currentExchangeRate) / 1000;

      // 실제 가격 기반 변동률 계산 (bulk crawler에서는 이전 데이터가 없을 수 있으므로 0으로 설정)
      // 실제 운영에서는 이전 데이터를 조회하여 계산해야 함
      const changePercent = 0; // 초기 데이터이므로 변동률 0
      const changeType: "positive" | "negative" | "unchanged" = "unchanged";

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
  }

  console.log(
    `✅ ${pageNumber}페이지 완료: ${processedRows}행, ${lmeData.length}개 데이터`
  );
  return { data: lmeData, dates: extractedDates };
}

// 전체 데이터 삭제 함수
async function clearAllData(supabase: any): Promise<void> {
  console.log("🗑️ 기존 데이터 전체 삭제 시작...");

  // 가격 데이터 삭제
  const { error: priceError } = await supabase
    .from("lme_processed_prices")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // 모든 데이터 삭제용 조건

  if (priceError) {
    console.error("가격 데이터 삭제 실패:", priceError);
    throw new Error(`가격 데이터 삭제 실패: ${priceError.message}`);
  }

  // 크롤링 로그 삭제 (최근 10개는 유지)
  const { data: recentLogs } = await supabase
    .from("crawling_logs")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentLogs && recentLogs.length > 0) {
    const keepIds = recentLogs.map((log) => log.id);
    const { error: logError } = await supabase
      .from("crawling_logs")
      .delete()
      .not("id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);

    if (logError) {
      console.error("크롤링 로그 정리 실패:", logError);
    }
  }

  console.log("✅ 기존 데이터 삭제 완료");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 파라미터 확인 (JSON body 우선, URL 파라미터 fallback)
    const url = new URL(req.url);
    let requestBody: any = {};

    try {
      const contentType = req.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        requestBody = await req.json();
      }
    } catch (error) {
      console.log("JSON 파싱 실패, URL 파라미터만 사용:", error);
    }

    const clearData =
      requestBody.clearData ?? url.searchParams.get("clear") === "true";
    const maxPages = parseInt(
      requestBody.maxPages?.toString() || url.searchParams.get("pages") || "10"
    );

    // Supabase 클라이언트 생성
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

    const startTime = Date.now();
    const now = new Date().toISOString();

    // 크롤링 로그 시작
    const { data: logData, error: logError } = await supabase
      .from("crawling_logs")
      .insert({
        status: "running",
        total_metals_attempted: maxPages * 6,
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
      // 기존 데이터 삭제 (선택적)
      if (clearData) {
        await clearAllData(supabase);
      }

      // 실시간 환율 조회
      const exchangeRate = await getExchangeRate();

      // 다중 페이지 크롤링 실행
      const allLmeData: LmeData[] = [];
      const crawlResults: CrawlResult[] = [];

      console.log(`🚀 ${maxPages}페이지 크롤링 시작...`);

      for (let page = 1; page <= maxPages; page++) {
        try {
          const result = await crawlSinglePage(page, exchangeRate);

          if (result.data.length > 0) {
            allLmeData.push(...result.data);
            crawlResults.push({
              page,
              dataCount: result.data.length,
              dates: result.dates,
              success: true,
            });
          } else {
            console.log(`⏹️ ${page}페이지: 데이터 없음, 크롤링 중단`);
            crawlResults.push({
              page,
              dataCount: 0,
              dates: [],
              success: true,
            });
            break; // 더 이상 데이터가 없으면 중단
          }
        } catch (error) {
          console.error(`❌ ${page}페이지 크롤링 실패:`, error);
          crawlResults.push({
            page,
            dataCount: 0,
            dates: [],
            success: false,
            error: error instanceof Error ? error.message : "알 수 없는 오류",
          });
        }

        // 페이지 간 딜레이 (서버 부하 방지)
        if (page < maxPages) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (allLmeData.length === 0) {
        throw new Error("모든 페이지에서 데이터를 찾을 수 없습니다");
      }

      // 중복 제거 (같은 날짜, 같은 금속)
      const uniqueData = allLmeData.filter(
        (item, index, self) =>
          index ===
          self.findIndex(
            (t) =>
              t.price_date === item.price_date &&
              t.metal_code === item.metal_code
          )
      );

      console.log(
        `📊 중복 제거: ${allLmeData.length} → ${uniqueData.length}개`
      );

      // UPSERT를 사용한 데이터 삽입/업데이트 (중복 시 업데이트)
      const insertData = uniqueData.map((item) => ({
        ...item,
        exchange_rate: exchangeRate,
        exchange_rate_source: "api",
        processed_at: new Date().toISOString(),
      }));

      console.log(`📥 UPSERT로 ${insertData.length}개 데이터 처리 중...`);

      const { error: upsertError } = await supabase
        .from("lme_processed_prices")
        .upsert(insertData, {
          onConflict: "metal_code,price_date", // 유니크 제약조건과 일치
        });

      if (upsertError) {
        throw new Error(`UPSERT 실패: ${upsertError.message}`);
      }

      console.log(`✅ UPSERT 성공: ${insertData.length}개 데이터 처리 완료`);

      // 성공 로그 업데이트
      const duration = Date.now() - startTime;
      await supabase
        .from("crawling_logs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          successful_extractions: uniqueData.length,
          duration_ms: duration,
        })
        .eq("id", logId);

      // 결과 반환
      return new Response(
        JSON.stringify(
          {
            success: true,
            message: `✅ ${
              crawlResults.filter((r) => r.success).length
            }페이지 크롤링 성공!`,
            data: {
              pages_crawled: crawlResults.filter((r) => r.success).length,
              total_data: uniqueData.length,
              data_cleared: clearData,
              crawling_log_id: logId,
              duration_ms: duration,
              page_results: crawlResults,
              date_range: {
                oldest: uniqueData.reduce(
                  (min, item) =>
                    item.price_date < min ? item.price_date : min,
                  uniqueData[0]?.price_date || ""
                ),
                newest: uniqueData.reduce(
                  (max, item) =>
                    item.price_date > max ? item.price_date : max,
                  uniqueData[0]?.price_date || ""
                ),
              },
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
          failed_extractions: maxPages * 6,
        })
        .eq("id", logId);

      throw crawlError;
    }
  } catch (error) {
    console.error("❌ 다중 페이지 크롤링 실패:", error);

    return new Response(
      JSON.stringify(
        {
          success: false,
          message: "❌ 다중 페이지 LME 크롤링 실패",
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
