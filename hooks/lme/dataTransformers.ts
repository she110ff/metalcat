import type { MetalHistoryData } from "../../types/lme";
import type {
  MetalDetailData,
  DailyPriceData,
} from "../../data/types/metal-price";
import { getMetalName } from "./api";

/**
 * LME 히스토리 데이터를 Metal Detail 화면 형식으로 변환
 *
 * 실시간 데이터 구조를 기존 컴포넌트와 호환되는 형식으로 변환
 */

/**
 * MetalHistoryData 배열을 MetalDetailData로 변환
 *
 * @param historyData 30일간의 LME 히스토리 데이터
 * @param metalCode 금속 코드 (예: 'copper')
 * @returns MetalDetailData 형식의 변환된 데이터
 */
export function transformHistoryToDetailData(
  historyData: MetalHistoryData[],
  metalCode: string
): MetalDetailData {
  // 데이터가 없으면 기본값 반환
  if (!historyData || historyData.length === 0) {
    return createEmptyDetailData(metalCode);
  }

  // 날짜 기준 정렬 (최신 순)
  const sortedData = [...historyData].sort(
    (a, b) =>
      new Date(b.price_date).getTime() - new Date(a.price_date).getTime()
  );

  const latestData = sortedData[0];
  // 실시간 데이터에서 직접 금속명 사용 (변환 로직보다 우선)
  const metalNameKr = latestData.metal_name_kr || getMetalName(metalCode);

  // Daily 데이터 변환 (원/KG 기준, 실제 DB 구조에 맞게)
  const dailyData: DailyPriceData[] = sortedData.map((item, index) => {
    const prevItem = sortedData[index + 1];

    // 변화율 계산 (이전 날과 비교)
    let changePercent = item.change_percent || 0;
    if (!changePercent && prevItem) {
      const prevPrice = prevItem.price_krw_per_kg;
      const currentPrice = item.price_krw_per_kg;
      changePercent =
        prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
    }

    // 실제 DB에는 3개월 선물가격이 없으므로 현물가격과 동일하게 설정
    const cashPriceKrw = item.price_krw_per_kg;

    return {
      date: item.price_date,
      cashPrice: cashPriceKrw,
      threeMonthPrice: cashPriceKrw, // 실제 데이터에 3M 가격이 없으므로 현물가격과 동일
      changePercent: Number(changePercent.toFixed(2)),
      changeType: (item.change_type === "positive"
        ? "positive"
        : "negative") as "positive" | "negative",
      spread: 0, // 3개월 선물가격이 없으므로 스프레드 0
    };
  });

  // 통계 계산 (원/KG 기준)
  const krwPrices = sortedData.map((item) => item.price_krw_per_kg);
  const statistics = calculateStatistics(krwPrices, sortedData);

  return {
    metalName: metalNameKr,
    currentPrice: latestData.price_krw_per_kg, // 원/KG 가격 사용
    unit: "원/KG", // USD/톤 대신 원/KG 사용
    changePercent: Number((latestData.change_percent || 0).toFixed(2)),
    changeType: (latestData.change_type === "positive"
      ? "positive"
      : "negative") as "positive" | "negative",
    dailyData: dailyData.reverse(), // 과거부터 최신 순으로 정렬
    statistics,
  };
}

/**
 * 가격 통계 계산
 */
function calculateStatistics(
  prices: number[],
  historyData: MetalHistoryData[]
): MetalDetailData["statistics"] {
  if (prices.length === 0) {
    return {
      highestPrice: 0,
      lowestPrice: 0,
      averagePrice: 0,
      volatility: 0,
      totalChange: 0,
    };
  }

  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);
  const averagePrice =
    prices.reduce((sum, price) => sum + price, 0) / prices.length;

  // 변동성 계산 (표준편차)
  const variance =
    prices.reduce((sum, price) => {
      return sum + Math.pow(price - averagePrice, 2);
    }, 0) / prices.length;
  const volatility = Math.sqrt(variance);

  // 총 변화율 계산 (첫날 대비 마지막날) - 원/KG 기준
  const firstPrice = historyData[historyData.length - 1]?.price_krw_per_kg || 0;
  const lastPrice = historyData[0]?.price_krw_per_kg || 0;
  const totalChange =
    firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  return {
    highestPrice: Number(highestPrice.toFixed(0)), // 원 단위이므로 소수점 제거
    lowestPrice: Number(lowestPrice.toFixed(0)),
    averagePrice: Number(averagePrice.toFixed(0)),
    volatility: Number(volatility.toFixed(0)),
    totalChange: Number(totalChange.toFixed(2)),
  };
}

/**
 * 빈 데이터 생성 (에러/로딩 상태용)
 */
function createEmptyDetailData(metalCode: string): MetalDetailData {
  // 빈 데이터일 때만 변환 로직 사용
  const metalNameKr = getMetalName(metalCode);

  return {
    metalName: metalNameKr,
    currentPrice: 0,
    unit: "원/KG", // USD/톤 대신 원/KG 사용
    changePercent: 0,
    changeType: "positive",
    dailyData: [],
    statistics: {
      highestPrice: 0,
      lowestPrice: 0,
      averagePrice: 0,
      volatility: 0,
      totalChange: 0,
    },
  };
}

/**
 * 정적 데이터와 실시간 데이터 병합
 * 실시간 데이터가 없을 때 정적 데이터를 사용
 */
export function mergeWithStaticData(
  realtimeData: MetalDetailData | null,
  staticData: MetalDetailData
): MetalDetailData {
  if (!realtimeData || realtimeData.dailyData.length === 0) {
    return staticData;
  }

  // 실시간 데이터가 부족하면 정적 데이터로 보완
  const mergedDailyData = [...realtimeData.dailyData];

  if (mergedDailyData.length < 7) {
    // 일주일 미만 데이터면 정적 데이터 추가
    const staticDailyData = staticData.dailyData.filter(
      (staticItem) =>
        !mergedDailyData.some(
          (realtimeItem) => realtimeItem.date === staticItem.date
        )
    );

    mergedDailyData.push(
      ...staticDailyData.slice(0, 30 - mergedDailyData.length)
    );
  }

  return {
    ...realtimeData,
    dailyData: mergedDailyData.slice(0, 30), // 최대 30일
  };
}

/**
 * 금속 코드 정규화 (한글명/영문명 → 영문 코드)
 */
export function normalizeMetalCode(metalName: string): string {
  const codeMap: Record<string, string> = {
    // 한글명 → 실제 DB 코드
    구리: "CU",
    알루미늄: "AL",
    아연: "ZN",
    납: "PB",
    니켈: "NI",
    주석: "SN",
    // 실제 DB 코드 (그대로)
    CU: "CU",
    AL: "AL",
    ZN: "ZN",
    PB: "PB",
    NI: "NI",
    SN: "SN",
    // 기존 영문명 호환성 (Phase 2 호환)
    copper: "CU",
    aluminum: "AL",
    zinc: "ZN",
    lead: "PB",
    nickel: "NI",
    tin: "SN",
  };

  return codeMap[metalName] || metalName.toUpperCase();
}
