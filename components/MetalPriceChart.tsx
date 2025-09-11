import React, { useState } from "react";
import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import {
  PeriodSelector,
  ChartPeriod,
  getPeriodDescription,
} from "./ui/PeriodSelector";
import { useChartStats } from "../hooks/lme/useChartStats";
import {
  processChartLabels,
  analyzeLabelOverlap,
} from "../utils/chartLabelUtils";

interface MetalPriceChartProps {
  metalCode: string;
  metalName: string;
  chartType?: "line" | "bar";
  selectedPeriod?: ChartPeriod;
  onPeriodChange?: (period: ChartPeriod) => void;
}

const { width } = Dimensions.get("window");
const chartWidth = width - 120; // 좌우 패딩 60씩 확보 (날짜 잘림 방지)

export const MetalPriceChart: React.FC<MetalPriceChartProps> = ({
  metalCode,
  metalName,
  chartType = "line",
  selectedPeriod: externalSelectedPeriod,
  onPeriodChange: externalOnPeriodChange,
}) => {
  // 내부 상태 또는 외부 상태 사용
  const [internalSelectedPeriod, setInternalSelectedPeriod] =
    useState<ChartPeriod>("daily");
  const selectedPeriod = externalSelectedPeriod || internalSelectedPeriod;
  const setSelectedPeriod = externalOnPeriodChange || setInternalSelectedPeriod;

  console.log("🔍 MetalPriceChart 렌더링:", {
    metalCode,
    metalName,
    selectedPeriod,
  });

  // 차트 통계 데이터 조회
  const {
    data: chartData,
    isLoading,
    error,
    isSuccess,
  } = useChartStats(metalCode, selectedPeriod);

  console.log("📊 차트 데이터 상태:", {
    hasData: !!chartData,
    dataLength: chartData?.length || 0,
    isLoading,
    hasError: !!error,
    errorMessage: error?.message,
    cacheVersion: "v2", // 캐시 버전 확인용
  });

  // 라벨 겹침 분석 (개발 모드에서만)
  if (chartData && chartData.length > 0 && __DEV__) {
    const rawLabels = chartData.map((item) => item.period_label);
    const analysis = analyzeLabelOverlap(rawLabels, selectedPeriod, chartWidth);

    console.log("🔍 라벨 겹침 분석:", {
      기간: selectedPeriod,
      사용가능너비: analysis.availableWidth,
      필요너비: analysis.requiredWidth,
      겹침비율: `${(analysis.overlapRatio * 100).toFixed(1)}%`,
      권장라벨수: analysis.recommendedLabelCount,
      현재라벨수: analysis.currentLabelCount,
      겹침여부: analysis.overlapRatio > 1 ? "⚠️ 겹침" : "✅ 정상",
    });
  }

  // 고급 라벨 처리 (겹침 방지 및 반응형)
  const processLabels = (rawLabels: string[]) => {
    // 새로운 스마트 라벨 처리 시스템 사용
    const { labels, config } = processChartLabels(
      rawLabels,
      selectedPeriod,
      chartWidth
    );

    console.log("📊 라벨 처리 결과:", {
      원본라벨수: rawLabels.length,
      처리된라벨수: labels.filter((l) => l).length,
      화면너비: chartWidth,
      기간: selectedPeriod,
      설정: config,
    });

    return { labels, config };
  };

  // 차트 데이터 준비
  const prepareChartData = () => {
    if (!chartData || chartData.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            data: [],
            color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
            strokeWidth: 4,
          },
        ],
      };
    }

    const rawLabels = chartData.map((item) => item.period_label);
    const prices = chartData.map((item) => item.avg_price);

    // 스마트 라벨 처리
    const { labels, config } = processLabels(rawLabels);

    return {
      labels,
      datasets: [
        {
          data: prices,
          color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`, // 노란색 (시세 화면과 일치)
          strokeWidth: 4,
        },
      ],
      labelConfig: config, // 라벨 설정 정보 추가
    };
  };

  const mainPriceData = prepareChartData();

  // Y축 범위 계산 (실제 최저가/최고가 사용)
  const calculateYAxisRange = () => {
    if (!chartData || chartData.length === 0) {
      return { min: 0, max: 100 };
    }

    const prices = chartData.map((item) => item.avg_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    console.log(`📊 ${metalName} 차트 가격 범위 (${selectedPeriod}):`, {
      최저가: `${minPrice.toLocaleString("ko-KR")}원/KG`,
      최고가: `${maxPrice.toLocaleString("ko-KR")}원/KG`,
      데이터개수: prices.length,
      기간: selectedPeriod,
    });

    return {
      min: minPrice,
      max: maxPrice,
    };
  };

  const yAxisRange = calculateYAxisRange();

  // Y축 값 포맷팅 함수 (천 단위 구분자 추가)
  const formatYLabel = (value: string) => {
    const numValue = parseFloat(value);
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(0)}K`;
    }
    return numValue.toLocaleString("ko-KR");
  };

  // 동적 차트 설정 (라벨 설정에 따라 조정)
  const getDynamicChartConfig = () => {
    const labelConfig = mainPriceData.labelConfig || { fontSize: 12 };

    return {
      backgroundColor: "transparent",
      backgroundGradientFrom: "transparent",
      backgroundGradientTo: "transparent",
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`,
      formatYLabel: formatYLabel,
      yAxisInterval: 1,
      fromZero: false,
      yAxisSuffix: "",
      yLabelsOffset: 0,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: "2",
        strokeWidth: "1",
        stroke: "#FFC107",
        fill: "#FFC107",
      },
      propsForBackgroundLines: {
        strokeDasharray: "",
        stroke: "rgba(255, 255, 255, 0.1)",
        strokeWidth: 1,
      },
      // 동적 패딩 및 폰트 크기 조정
      paddingLeft: 30,
      paddingRight: selectedPeriod === "monthly" ? 100 : 90, // 우측 여백만 증가하여 날짜 잘림 방지
      paddingTop: 20,
      paddingBottom: labelConfig.fontSize < 12 ? 12 : 15, // 작은 폰트는 패딩 줄임

      // X축 라벨 설정
      propsForLabels: {
        fontSize: labelConfig.fontSize,
        fontFamily: "System", // 시스템 폰트 사용
      },
    };
  };

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>가격 추이 차트</Text>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          disabled={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFC107" />
          <Text style={styles.loadingText}>차트 데이터 로딩 중...</Text>
        </View>
      </View>
    );
  }

  // 에러 상태 처리
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>가격 추이 차트</Text>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          disabled={true}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>차트 데이터를 불러올 수 없습니다</Text>
          <Text style={styles.errorSubText}>네트워크 연결을 확인해주세요</Text>
        </View>
      </View>
    );
  }

  // 데이터가 없는 경우
  if (!chartData || chartData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>가격 추이 차트</Text>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>표시할 데이터가 없습니다</Text>
          <Text style={styles.noDataSubText}>
            {getPeriodDescription(selectedPeriod)}
          </Text>
        </View>
      </View>
    );
  }

  // 메인 차트 렌더링
  return (
    <View style={styles.container}>
      <Text style={styles.title}>가격 추이 차트</Text>

      <PeriodSelector
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {mainPriceData.datasets[0].data.length > 0 ? (
        <LineChart
          data={mainPriceData}
          width={chartWidth}
          height={220}
          chartConfig={getDynamicChartConfig()}
          bezier
          withHorizontalLabels={true}
          withVerticalLabels={true}
          withInnerLines={true}
          withOuterLines={false}
          verticalLabelRotation={0}
          horizontalLabelRotation={0}
          withVerticalLines={false}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>차트 데이터를 준비 중입니다</Text>
          <Text style={styles.noDataSubText}>
            {selectedPeriod} 데이터를 불러오는 중...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  title: {
    color: "#FCD34D",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 220,
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 220,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorSubText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 220,
  },
  noDataText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  noDataSubText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    textAlign: "center",
  },
});
