import React from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { DailyPriceData } from "../data/types/metal-price";

interface MetalPriceChartProps {
  data: DailyPriceData[];
  chartType: "line" | "bar";
  metalName: string;
}

const { width } = Dimensions.get("window");
const chartWidth = width - 80; // 좌우 패딩 40씩 확보

export const MetalPriceChart: React.FC<MetalPriceChartProps> = ({
  data,
  chartType,
  metalName,
}) => {
  // 날짜 포맷팅 (간격 조정으로 겹침 방지)
  const formatDate = (
    dateString: string,
    index: number,
    totalLength: number
  ) => {
    const date = new Date(dateString);
    // 데이터 길이에 따라 적응적 간격 설정
    let interval = 3;
    if (totalLength > 30) interval = 7;
    else if (totalLength > 20) interval = 5;
    else if (totalLength > 15) interval = 4;

    // 첫 번째, 마지막, 간격에 맞는 날짜만 표시
    if (index !== 0 && index !== totalLength - 1 && index % interval !== 0) {
      return ""; // 간격에 맞지 않으면 빈 문자열
    }
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  // 메인 가격 차트 데이터 (CASH 가격만)
  const mainPriceData = {
    labels: data.map((item, index) =>
      formatDate(item.date, index, data.length)
    ),
    datasets: [
      {
        data: data.map((item) => item.cashPrice),
        color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`, // 노란색 (시세 화면과 일치)
        strokeWidth: 4,
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
    // 라벨이 잘리지 않도록 패딩 설정
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 10,
  };

  // 메인 가격 차트 (CASH 가격만)
  const renderMainPriceChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{metalName} CASH 가격 추이 (원/KG)</Text>
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

  return <View style={styles.container}>{renderMainPriceChart()}</View>;
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
    padding: 15, // 패딩 증가
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    overflow: "hidden", // 차트가 넘치지 않도록
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8, // 상하 여백 추가
  },
});
