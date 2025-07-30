import { supabase, lmeRpc } from "./supabaseClient";
import {
  LatestLmePrice,
  MetalHistoryData,
  CrawlingStatus,
} from "../../types/lme";
import { validateLmePrice, classifyError } from "./errorUtils";

/**
 * LME 데이터 API 함수들
 *
 * Supabase와 통신하여 실시간 LME 데이터를 가져오는 함수들
 */

// 금속 코드 매핑 (한글명 → 실제 DB 코드)
const METAL_CODE_MAP: Record<string, string> = {
  구리: "CU",
  알루미늄: "AL",
  아연: "ZN",
  납: "PB",
  니켈: "NI",
  주석: "SN",
} as const;

// 실제 DB 코드 → 한글명 매핑
const METAL_NAME_MAP: Record<string, string> = {
  CU: "구리",
  AL: "알루미늄",
  ZN: "아연",
  PB: "납",
  NI: "니켈",
  SN: "주석",
} as const;

/**
 * 최신 LME 가격 데이터 조회
 *
 * @returns 6개 금속의 최신 가격 데이터
 */
export async function fetchLatestLmePrices(): Promise<LatestLmePrice[]> {
  try {
    // RPC 함수 호출 시도
    const { data: rpcData, error: rpcError } = await lmeRpc.getLatestPrices();

    if (!rpcError && rpcData && Array.isArray(rpcData)) {
      // RPC 함수가 성공한 경우
      return rpcData.map((item) => ({
        metal_code: item.metal_code,
        metal_name_kr: item.metal_name_kr,
        price_krw_per_kg: item.price_krw_per_kg,
        change_percent: item.change_percent,
        change_type: item.change_type as
          | "positive"
          | "negative"
          | "unchanged"
          | null,
        price_date: item.price_date,
        last_updated: item.last_updated,
      }));
    }

    // RPC 함수가 실패하거나 없으면 직접 쿼리
    console.log("RPC 함수 호출 실패, 직접 쿼리로 대체:", rpcError?.message);

    const { data, error } = await supabase
      .from("lme_processed_prices")
      .select(
        `
        metal_code,
        metal_name_kr,
        price_krw_per_kg,
        change_percent,
        change_type,
        price_date,
        processed_at
      `
      )
      .gte(
        "price_date",
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      )
      .order("metal_code", { ascending: true })
      .order("price_date", { ascending: false })
      .order("processed_at", { ascending: false });

    if (error) {
      throw classifyError(error);
    }

    if (!data || !Array.isArray(data)) {
      throw new Error("유효하지 않은 데이터 형식입니다");
    }

    // 각 금속별 최신 데이터만 추출
    const latestPrices = new Map<string, LatestLmePrice>();

    data.forEach((item) => {
      if (!latestPrices.has(item.metal_code) && validateLmePrice(item)) {
        latestPrices.set(item.metal_code, {
          metal_code: item.metal_code,
          metal_name_kr: item.metal_name_kr,
          price_krw_per_kg: item.price_krw_per_kg,
          change_percent: item.change_percent,
          change_type: item.change_type as
            | "positive"
            | "negative"
            | "unchanged"
            | null,
          price_date: item.price_date,
          last_updated: item.processed_at || item.price_date,
        });
      }
    });

    return Array.from(latestPrices.values());
  } catch (error) {
    console.error("LME 가격 데이터 조회 실패:", error);
    throw classifyError(error);
  }
}

/**
 * 특정 금속의 히스토리 데이터 조회
 *
 * @param metalCode 금속 코드 (예: 'copper', 'aluminum')
 * @param days 조회할 일수 (기본값: 30일)
 * @returns 해당 금속의 히스토리 데이터
 */
export async function fetchMetalHistory(
  metalCode: string,
  days: number = 30
): Promise<MetalHistoryData[]> {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data, error } = await supabase
      .from("lme_processed_prices")
      .select(
        `
        metal_code,
        metal_name_kr,
        price_date,
        price_krw_per_kg,
        price_usd_per_ton,
        change_percent,
        change_type,
        exchange_rate
      `
      )
      .eq("metal_code", metalCode)
      .gte("price_date", startDate)
      .order("price_date", { ascending: false });

    if (error) {
      throw classifyError(error);
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((item: any) => ({
      metal_code: item.metal_code,
      metal_name_kr: item.metal_name_kr, // 실제 DB에서 오는 한글 금속명 포함
      price_date: item.price_date,
      price_krw_per_kg: item.price_krw_per_kg,
      price_usd_per_ton: item.price_usd_per_ton,
      change_percent: item.change_percent,
      change_type: item.change_type as
        | "positive"
        | "negative"
        | "unchanged"
        | null,
      exchange_rate: item.exchange_rate,
    }));
  } catch (error) {
    console.error(`${metalCode} 히스토리 데이터 조회 실패:`, error);
    throw classifyError(error);
  }
}

/**
 * 크롤링 상태 조회
 *
 * @returns 크롤링 시스템 상태 정보
 */
export async function fetchCrawlingStatus(): Promise<CrawlingStatus> {
  try {
    // RPC 함수 시도
    const { data: rpcData, error: rpcError } = await lmeRpc.getCrawlingStatus();

    if (!rpcError && rpcData && !Array.isArray(rpcData)) {
      return rpcData as CrawlingStatus;
    }

    // 직접 쿼리로 대체
    const { data, error } = await supabase
      .from("crawling_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10);

    if (error) {
      throw classifyError(error);
    }

    if (!data || data.length === 0) {
      return {
        last_success_at: null,
        last_failure_at: null,
        is_currently_running: false,
        success_rate_24h: 0,
        avg_duration_ms: 0,
      };
    }

    // 간단한 상태 계산
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentLogs = data.filter(
      (log) => log.started_at && new Date(log.started_at) > oneDayAgo
    );

    const successLogs = recentLogs.filter((log) => log.status === "success");
    const successRate =
      recentLogs.length > 0
        ? (successLogs.length / recentLogs.length) * 100
        : 0;

    const avgDuration =
      successLogs.length > 0
        ? successLogs.reduce((sum, log) => sum + (log.duration_ms || 0), 0) /
          successLogs.length
        : 0;

    return {
      last_success_at: successLogs[0]?.completed_at || null,
      last_failure_at:
        data.find((log) => log.status === "failed")?.completed_at || null,
      is_currently_running: data.some((log) => log.status === "running"),
      success_rate_24h: successRate,
      avg_duration_ms: Math.round(avgDuration),
    };
  } catch (error) {
    console.error("크롤링 상태 조회 실패:", error);
    throw classifyError(error);
  }
}

/**
 * 한글 금속명을 영문 코드로 변환
 */
export function getMetalCode(koreanName: string): string {
  return METAL_CODE_MAP[koreanName] || koreanName.toLowerCase();
}

/**
 * 영문 코드를 한글 금속명으로 변환
 */
export function getMetalName(code: string): string {
  return METAL_NAME_MAP[code] || code;
}
