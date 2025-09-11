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
const chartWidth = width - 120; // 좌우 패딩 60씩 확보 (날짜 잘림 방지)

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
    // 데이터 길이에 따라 적응적 간격 설정 (더 넓은 간격으로 조정)
    let interval = 4;
    if (totalLength > 30) interval = 8;
    else if (totalLength > 20) interval = 6;
    else if (totalLength > 15) interval = 5;

    // 마지막 바로 전 날짜는 제거 (겹침 방지)
    if (index === totalLength - 2) {
      return "";
    }

    // 첫 번째, 마지막, 간격에 맞는 날짜만 표시
    if (index !== 0 && index !== totalLength - 1 && index % interval !== 0) {
      return ""; // 간격에 맞지 않으면 빈 문자열
    }

    // 마지막 날짜는 더 짧게 표시
    if (index === totalLength - 1) {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    return `${date.getMonth() + 1}/${date.getDate()}`;
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

  // Y축 범위 계산 (실제 최저가/최고가 사용)
  const calculateYAxisRange = () => {
    const prices = data.map((item) => item.cashPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    console.log(`📊 ${metalName} 차트 가격 범위:`, {
      최저가: `${minPrice.toLocaleString("ko-KR")}원/KG`,
      최고가: `${maxPrice.toLocaleString("ko-KR")}원/KG`,
      데이터개수: prices.length,
      전체가격: prices.slice(0, 5).map((p) => `${p.toLocaleString("ko-KR")}원`),
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

  // 다크 테마 차트 설정
  const darkChartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: "transparent",
    backgroundGradientTo: "transparent",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`,
    formatYLabel: formatYLabel, // Y축 값 포맷팅 함수 추가
    yAxisInterval: 1, // Y축 간격 설정
    fromZero: false, // 0부터 시작하지 않음
    yAxisSuffix: "", // Y축 접미사 제거
    yLabelsOffset: 0, // Y축 라벨 오프셋
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
    paddingLeft: 30,
    paddingRight: 50, // 우측 패딩으로 날짜 잘림 방지
    paddingTop: 20,
    paddingBottom: 15,
  };

  // 메인 가격 차트 (CASH 가격만) - 상위 컨테이너 제거
  return (
    <LineChart
      data={mainPriceData}
      width={chartWidth}
      height={220}
      chartConfig={darkChartConfig}
      bezier
      withHorizontalLabels={true}
      withVerticalLabels={true}
      withInnerLines={true}
      withOuterLines={false}
      verticalLabelRotation={0}
      horizontalLabelRotation={0}
      withVerticalLines={false}
    />
  );
};

// 스타일 제거 (더 이상 사용하지 않음)
