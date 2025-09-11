/**
 * 차트 관련 유틸리티 함수들
 */

import { ChartPeriod } from "../components/ui/PeriodSelector";

/**
 * 기간별 날짜 포맷팅
 *
 * @param dateString 날짜 문자열
 * @param period 차트 기간
 * @returns 포맷된 날짜 문자열
 */
export function formatChartDate(
  dateString: string,
  period: ChartPeriod
): string {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString; // 유효하지 않은 날짜인 경우 원본 반환
  }

  switch (period) {
    case "daily":
      // 일별: MM/DD 형식
      return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
        .getDate()
        .toString()
        .padStart(2, "0")}`;

    case "weekly":
      // 주별: MM/DD (주 시작일)
      const weekStart = getWeekStart(date);
      return `${(weekStart.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${weekStart.getDate().toString().padStart(2, "0")}`;

    case "monthly":
      // 월별: YYYY/MM 형식
      return `${date.getFullYear()}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;

    default:
      return dateString;
  }
}

/**
 * 주의 시작일을 계산 (월요일 기준)
 *
 * @param date 기준 날짜
 * @returns 해당 주의 월요일 날짜
 */
export function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 월요일을 주 시작으로
  return new Date(date.setDate(diff));
}

/**
 * 월의 시작일을 계산
 *
 * @param date 기준 날짜
 * @returns 해당 월의 1일 날짜
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * 차트 라벨 간격 계산
 *
 * @param dataLength 데이터 개수
 * @param maxLabels 최대 표시할 라벨 수 (기본값: 8)
 * @returns 라벨 표시 간격
 */
export function calculateLabelInterval(
  dataLength: number,
  maxLabels: number = 8
): number {
  if (dataLength <= maxLabels) {
    return 1; // 모든 라벨 표시
  }

  return Math.ceil(dataLength / maxLabels);
}

/**
 * 차트 라벨 필터링 (겹침 방지)
 *
 * @param labels 원본 라벨 배열
 * @param maxLabels 최대 표시할 라벨 수
 * @returns 필터링된 라벨 배열
 */
export function filterChartLabels(
  labels: string[],
  maxLabels: number = 8
): string[] {
  const dataLength = labels.length;

  if (dataLength <= maxLabels) {
    return labels; // 모든 라벨 표시
  }

  const interval = calculateLabelInterval(dataLength, maxLabels);

  return labels.map((label, index) => {
    // 첫 번째, 마지막, 간격에 맞는 라벨만 표시
    if (index === 0 || index === dataLength - 1 || index % interval === 0) {
      return label;
    }
    return ""; // 간격에 맞지 않으면 빈 문자열
  });
}

/**
 * 가격 범위 계산
 *
 * @param prices 가격 배열
 * @returns 최소값, 최대값, 평균값을 포함한 객체
 */
export function calculatePriceRange(prices: number[]): {
  min: number;
  max: number;
  avg: number;
  range: number;
} {
  if (prices.length === 0) {
    return { min: 0, max: 0, avg: 0, range: 0 };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const range = max - min;

  return { min, max, avg, range };
}

/**
 * 가격 포맷팅 (천 단위 구분자)
 *
 * @param price 가격
 * @param unit 단위 (기본값: '원')
 * @returns 포맷된 가격 문자열
 */
export function formatPrice(price: number, unit: string = "원"): string {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M${unit}`;
  } else if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}K${unit}`;
  }

  return `${price.toLocaleString("ko-KR")}${unit}`;
}

/**
 * Y축 라벨 포맷팅
 *
 * @param value 값
 * @returns 포맷된 라벨 문자열
 */
export function formatYAxisLabel(value: string): string {
  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return value;
  }

  if (numValue >= 1000000) {
    return `${(numValue / 1000000).toFixed(1)}M`;
  } else if (numValue >= 1000) {
    return `${(numValue / 1000).toFixed(0)}K`;
  }

  return numValue.toLocaleString("ko-KR");
}

/**
 * 변화율 색상 계산
 *
 * @param changePercent 변화율
 * @returns 색상 문자열
 */
export function getChangeColor(changePercent: number): string {
  if (changePercent > 0) {
    return "#4ade80"; // 상승 (녹색)
  } else if (changePercent < 0) {
    return "#f87171"; // 하락 (빨간색)
  }
  return "#9ca3af"; // 변화 없음 (회색)
}

/**
 * 변화율 텍스트 포맷팅
 *
 * @param changePercent 변화율
 * @returns 포맷된 변화율 문자열
 */
export function formatChangePercent(changePercent: number): string {
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}

/**
 * 차트 데이터 유효성 검증
 *
 * @param data 차트 데이터
 * @returns 유효한 데이터 여부
 */
export function validateChartData(data: any[]): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  return data.every(
    (item) =>
      item &&
      typeof item.avg_price === "number" &&
      item.avg_price > 0 &&
      item.period_label &&
      item.period_start
  );
}

/**
 * 차트 색상 팔레트
 */
export const CHART_COLORS = {
  primary: "#FFC107", // 노란색 (메인)
  success: "#4ade80", // 녹색 (상승)
  danger: "#f87171", // 빨간색 (하락)
  neutral: "#9ca3af", // 회색 (변화없음)
  background: "rgba(255, 255, 255, 0.04)",
  border: "rgba(255, 255, 255, 0.08)",
  text: {
    primary: "#ffffff",
    secondary: "rgba(255, 255, 255, 0.7)",
    muted: "rgba(255, 255, 255, 0.5)",
  },
} as const;

/**
 * 기간별 기본 설정
 */
export const PERIOD_CONFIGS = {
  daily: {
    label: "일별",
    description: "최근 20일간의 일별 가격 데이터",
    cacheTime: 5 * 60 * 1000, // 5분
    dataPoints: 20,
  },
  weekly: {
    label: "주별 평균",
    description: "최근 20주간의 주별 평균 가격",
    cacheTime: 15 * 60 * 1000, // 15분
    dataPoints: 20,
  },
  monthly: {
    label: "월별 평균",
    description: "최근 20개월간의 월별 평균 가격",
    cacheTime: 30 * 60 * 1000, // 30분
    dataPoints: 20,
  },
} as const;
