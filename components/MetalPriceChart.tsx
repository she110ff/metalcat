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
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // 파란색
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
        color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`, // 보라색
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#3B82F6",
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#E5E7EB",
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
          chartConfig={{
            ...chartConfig,
            formatYLabel: (value) => `${parseInt(value).toLocaleString()}`,
          }}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={false}
          yAxisInterval={1}
          segments={4}
        />
      </View>
    </View>
  );

  // 가격 변동 차트 (절대값)
  const renderPriceChangeChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>일별 가격 변동 (USD)</Text>
      <View style={styles.chartWrapper}>
        <BarChart
          data={{
            labels: data.map((item) => formatDate(item.date)),
            datasets: [
              {
                data: data.map((item, index) => {
                  if (index === 0) return 0;
                  const change = item.cashPrice - data[index - 1].cashPrice;
                  return change;
                }),
              },
            ],
          }}
          width={chartWidth}
          height={160}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            barPercentage: 0.6,
          }}
          style={styles.chart}
          withInnerLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={true}
          yAxisLabel=""
          yAxisSuffix=""
          yAxisInterval={1}
          segments={4}
        />
      </View>
    </View>
  );

  // 변동률 차트
  const renderChangePercentChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>일별 변동률 (%)</Text>
      <View style={styles.chartWrapper}>
        <LineChart
          data={changePercentData}
          width={chartWidth}
          height={160}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
            propsForDots: {
              r: "3",
              strokeWidth: "2",
              stroke: "#A855F7",
            },
          }}
          bezier
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={false}
          yAxisInterval={1}
          segments={4}
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartContainer: {
    marginBottom: 25,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 15,
    textAlign: "center",
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});
