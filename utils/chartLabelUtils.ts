/**
 * 차트 X축 라벨 겹침 방지를 위한 고급 유틸리티
 */

import { Dimensions } from "react-native";
import { ChartPeriod } from "../components/ui/PeriodSelector";

const { width: screenWidth } = Dimensions.get("window");

/**
 * 라벨별 예상 너비 (픽셀)
 */
const LABEL_WIDTH_MAP = {
  daily: 35, // "09/10" 형태
  weekly: 35, // "09/08" 형태
  monthly: 35, // "25/09" 형태 (축약)
} as const;

/**
 * 차트 설정
 */
const CHART_CONFIG = {
  paddingLeft: 30,
  paddingRight: 50, // 적절한 우측 여백 (라벨 공백으로 잘림 방지)
  minLabelSpacing: 8, // 라벨 간 최소 간격
  fontSize: 12,
} as const;

/**
 * 화면 크기 기반 최적 라벨 개수 계산
 */
export function calculateOptimalLabelCount(
  period: ChartPeriod,
  chartWidth?: number
): number {
  const availableWidth =
    (chartWidth || screenWidth - 120) -
    CHART_CONFIG.paddingLeft -
    CHART_CONFIG.paddingRight;

  const labelWidth = LABEL_WIDTH_MAP[period];
  const totalLabelWidth = labelWidth + CHART_CONFIG.minLabelSpacing;

  const maxLabels = Math.floor(availableWidth / totalLabelWidth);

  // 기간별 최소/최대 라벨 수 제한
  const limits = {
    daily: { min: 3, max: 8 },
    weekly: { min: 3, max: 6 },
    monthly: { min: 3, max: 5 },
  };

  const { min, max } = limits[period];
  return Math.max(min, Math.min(max, maxLabels));
}

/**
 * 스마트 라벨 선택 알고리즘
 */
export function selectOptimalLabels(
  labels: string[],
  period: ChartPeriod,
  chartWidth?: number
): string[] {
  if (labels.length === 0) return [];

  const optimalCount = calculateOptimalLabelCount(period, chartWidth);

  if (labels.length <= optimalCount) {
    return labels; // 모든 라벨 표시 가능
  }

  // 전략적 라벨 선택
  return selectStrategicLabels(labels, optimalCount, period);
}

/**
 * 전략적 라벨 선택 (시작, 끝, 균등 분포)
 */
function selectStrategicLabels(
  labels: string[],
  targetCount: number,
  period: ChartPeriod
): string[] {
  const result = new Array(labels.length).fill("");
  const totalLabels = labels.length;

  // 항상 첫 번째와 마지막 라벨 포함
  result[0] = labels[0];
  result[totalLabels - 1] = labels[totalLabels - 1];

  if (targetCount <= 2) {
    return result;
  }

  // 중간 라벨들을 균등하게 분배
  const middleCount = targetCount - 2;
  const step = (totalLabels - 1) / (middleCount + 1);

  for (let i = 1; i <= middleCount; i++) {
    const index = Math.round(step * i);
    if (index > 0 && index < totalLabels - 1) {
      result[index] = labels[index];
    }
  }

  return result;
}

/**
 * 기간별 라벨 포맷 최적화
 */
export function optimizeLabelFormat(
  dateString: string,
  period: ChartPeriod,
  isCompact: boolean = false
): string {
  // 월별 데이터의 경우 YYYY/MM 형식을 YY/MM로 변환
  if (period === "monthly" && dateString.match(/^\d{4}\/\d{2}$/)) {
    const [year, month] = dateString.split("/");
    return `${year.slice(-2)}/${month}`;
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  switch (period) {
    case "daily":
      return isCompact
        ? `${date.getMonth() + 1}/${date.getDate()}`
        : `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
            .getDate()
            .toString()
            .padStart(2, "0")}`;

    case "weekly":
      return isCompact
        ? `${date.getMonth() + 1}/${date.getDate()}`
        : `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
            .getDate()
            .toString()
            .padStart(2, "0")}`;

    case "monthly":
      // 항상 축약 형식 사용: 25/09
      return `${date.getFullYear().toString().slice(-2)}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;

    default:
      return dateString;
  }
}

/**
 * 반응형 라벨 처리 (화면 크기별 적응)
 */
export function getResponsiveLabelConfig(period: ChartPeriod) {
  const screenSize = screenWidth;

  // 화면 크기별 설정
  if (screenSize < 350) {
    // 작은 화면 (iPhone SE 등)
    return {
      maxLabels: period === "monthly" ? 4 : 4, // 월별도 4개까지 가능
      useCompactFormat: true,
      fontSize: 10,
    };
  } else if (screenSize < 400) {
    // 중간 화면
    return {
      maxLabels: period === "monthly" ? 5 : 5, // 월별도 5개까지 가능
      useCompactFormat: true, // 모든 기간에 압축 포맷 사용
      fontSize: 11,
    };
  } else {
    // 큰 화면
    return {
      maxLabels: period === "monthly" ? 6 : 6, // 월별도 6개까지 가능
      useCompactFormat: true, // 월별은 항상 압축 포맷 (25/09)
      fontSize: 12,
    };
  }
}

/**
 * 메인 라벨 처리 함수
 */
export function processChartLabels(
  rawLabels: string[],
  period: ChartPeriod,
  chartWidth?: number
): {
  labels: string[];
  config: {
    fontSize: number;
    rotation: number;
    maxLabels: number;
  };
} {
  const responsiveConfig = getResponsiveLabelConfig(period);
  const optimalLabels = selectOptimalLabels(rawLabels, period, chartWidth);

  // 라벨 포맷 최적화
  const processedLabels = optimalLabels.map((label, index) => {
    if (!label) return "";

    const formattedLabel = optimizeLabelFormat(
      label,
      period,
      responsiveConfig.useCompactFormat
    );

    // 마지막 라벨에 공백 4칸 추가 (잘림 방지)
    if (index === optimalLabels.length - 1 && formattedLabel) {
      return formattedLabel + "      "; // 공백 4칸 추가
    }

    return formattedLabel;
  });

  return {
    labels: processedLabels,
    config: {
      fontSize: responsiveConfig.fontSize,
      rotation: 0, // react-native-chart-kit 제약으로 0 고정
      maxLabels: responsiveConfig.maxLabels,
    },
  };
}

/**
 * 디버깅용 라벨 분석
 */
export function analyzeLabelOverlap(
  labels: string[],
  period: ChartPeriod,
  chartWidth?: number
) {
  const availableWidth = (chartWidth || screenWidth - 120) - 80;
  const labelWidth = LABEL_WIDTH_MAP[period];
  const totalRequiredWidth = labels.length * (labelWidth + 8);

  return {
    availableWidth,
    requiredWidth: totalRequiredWidth,
    overlapRatio: totalRequiredWidth / availableWidth,
    recommendedLabelCount: calculateOptimalLabelCount(period, chartWidth),
    currentLabelCount: labels.filter((l) => l).length,
  };
}
