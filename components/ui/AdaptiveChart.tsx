/**
 * 적응형 차트 컴포넌트 (향후 확장용)
 *
 * react-native-chart-kit의 한계를 극복하기 위한 대안 솔루션
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ChartPeriod } from "./PeriodSelector";

interface AdaptiveChartProps {
  data: Array<{
    label: string;
    value: number;
    date: string;
  }>;
  period: ChartPeriod;
  width: number;
  height: number;
}

/**
 * 커스텀 차트 컴포넌트 (SVG 기반 대안)
 *
 * 장점:
 * - 완전한 라벨 제어
 * - 회전, 크기, 간격 자유 조정
 * - 반응형 디자인 완벽 지원
 *
 * 단점:
 * - 구현 복잡도 증가
 * - 애니메이션 추가 작업 필요
 */
export const AdaptiveChart: React.FC<AdaptiveChartProps> = ({
  data,
  period,
  width,
  height,
}) => {
  // SVG 기반 차트 구현 (향후 필요시)
  return (
    <View style={[styles.container, { width, height }]}>
      <Text style={styles.placeholder}>커스텀 적응형 차트 (향후 구현)</Text>
      <Text style={styles.info}>
        현재: {data.length}개 데이터, {period} 기간
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderStyle: "dashed",
  },
  placeholder: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  info: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
    marginTop: 4,
  },
});

/**
 * 라벨 회전 지원 차트 (react-native-svg 사용)
 *
 * 설치 필요: npm install react-native-svg
 */
export const RotatableLabelChart = () => {
  // SVG 기반 구현으로 X축 라벨 45도 회전 지원
  // 향후 필요시 구현
  return null;
};
