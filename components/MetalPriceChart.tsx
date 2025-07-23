import React from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { DailyPriceData } from "../data/types/metal-price";

interface MetalPriceChartProps {
  data: DailyPriceData[];
  chartType: "line" | "bar";
  metalName: string;
}

const { width } = Dimensions.get("window");
const chartWidth = Math.min(width - 60, 350); // 차트 너비 제한

export const MetalPriceChart: React.FC<MetalPriceChartProps> = ({
  data,
  chartType,
  metalName,
}) => {
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  // 메인 가격 차트 데이터 (CASH 가격만)
  const mainPriceData = {
    labels: data.map((item) => formatDate(item.date)),
    datasets: [
      {
        data: data.map((item) => item.cashPrice),
        color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`, // 노란색 (시세 화면과 일치)
        strokeWidth: 4,
      },
    ],
  };

  // 가격 변동 차트 데이터 (절대값)
  const priceChangeData = {
    labels: data.map((item) => formatDate(item.date)),
    datasets: [
      {
        data: data.map((item, index) => {
          if (index === 0) return 0;
          const change = item.cashPrice - data[index - 1].cashPrice;
          return change;
        }),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // 초록색
        strokeWidth: 2,
      },
    ],
  };

  // 변동률 차트 데이터
  const changePercentData = {
    labels: data.map((item) => formatDate(item.date)),
    datasets: [
      {
        data: data.map((item) => item.changePercent),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // 파란색
        strokeWidth: 2,
      },
    ],
  };

  // 다크 테마 차트 설정
  const darkChartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: "transparent",
    backgroundGradientTo: "transparent",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#FFC107", // 노란색
      fill: "#FFC107",
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "rgba(255, 255, 255, 0.1)",
      strokeWidth: 1,
    },
  };

  // 메인 가격 차트 (CASH 가격만)
  const renderMainPriceChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{metalName} CASH 가격 추이 (USD)</Text>
      <View style={styles.chartWrapper}>
        <LineChart
          data={mainPriceData}
          width={chartWidth}
          height={200}
          chartConfig={darkChartConfig}
          bezier
          style={styles.chart}
        />
      </View>
    </View>
  );

  // 가격 변동 차트
  const renderPriceChangeChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>일별 가격 변동 (USD)</Text>
      <View style={styles.chartWrapper}>
        <BarChart
          data={priceChangeData}
          width={chartWidth}
          height={150}
          chartConfig={{
            ...darkChartConfig,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
          }}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          showBarTops
          showValuesOnTopOfBars
        />
      </View>
    </View>
  );

  // 변동률 차트
  const renderChangePercentChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>변동률 추이 (%)</Text>
      <View style={styles.chartWrapper}>
        <LineChart
          data={changePercentData}
          width={chartWidth}
          height={150}
          chartConfig={{
            ...darkChartConfig,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          }}
          bezier
          style={styles.chart}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderMainPriceChart()}
      {renderPriceChangeChart()}
      {renderChangePercentChart()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 10,
    textAlign: "center",
    fontFamily: "NanumGothic",
  },
  chartWrapper: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  chart: {
    borderRadius: 16,
  },
});
