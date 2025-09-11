import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export type ChartPeriod = "daily" | "weekly" | "monthly";

interface PeriodSelectorProps {
  selectedPeriod: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  disabled?: boolean;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  disabled = false,
}) => {
  const periods: { key: ChartPeriod; label: string; description: string }[] = [
    { key: "daily", label: "일", description: "일별 데이터" },
    { key: "weekly", label: "주", description: "주별 평균" },
    { key: "monthly", label: "월", description: "월별 평균" },
  ];

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      {periods.map((period) => {
        const isSelected = selectedPeriod === period.key;

        return (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.tab,
              isSelected && styles.activeTab,
              disabled && styles.tabDisabled,
            ]}
            onPress={() => !disabled && onPeriodChange(period.key)}
            disabled={disabled}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Text
              style={[
                styles.tabText,
                isSelected && styles.activeTabText,
                disabled && styles.tabTextDisabled,
              ]}
            >
              {period.label}
            </Text>
            {isSelected && (
              <Text
                style={[
                  styles.description,
                  disabled && styles.descriptionDisabled,
                ]}
              >
                {period.description}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  disabled: {
    opacity: 0.5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    transition: "all 0.2s ease-in-out",
  },
  activeTab: {
    backgroundColor: "#FFC107",
    shadowColor: "#FFC107",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabDisabled: {
    backgroundColor: "transparent",
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  activeTabText: {
    color: "#000",
    fontWeight: "700",
  },
  tabTextDisabled: {
    color: "rgba(255, 255, 255, 0.3)",
  },
  description: {
    color: "rgba(0, 0, 0, 0.7)",
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
  descriptionDisabled: {
    color: "rgba(255, 255, 255, 0.2)",
  },
});

/**
 * 기간별 설명 텍스트를 반환하는 유틸리티 함수
 */
export function getPeriodDescription(period: ChartPeriod): string {
  switch (period) {
    case "daily":
      return "최근 20일간의 일별 가격 데이터";
    case "weekly":
      return "최근 20주간의 주별 평균 가격";
    case "monthly":
      return "최근 20개월간의 월별 평균 가격";
    default:
      return "";
  }
}

/**
 * 기간별 데이터 포인트 수를 반환하는 유틸리티 함수
 */
export function getPeriodDataPoints(period: ChartPeriod): number {
  switch (period) {
    case "daily":
      return 30; // 30일
    case "weekly":
      return 30; // 30주
    case "monthly":
      return 30; // 30개월
    default:
      return 30;
  }
}

/**
 * 기간별 캐시 시간을 반환하는 유틸리티 함수 (밀리초)
 */
export function getPeriodCacheTime(period: ChartPeriod): number {
  switch (period) {
    case "daily":
      return 5 * 60 * 1000; // 5분
    case "weekly":
      return 15 * 60 * 1000; // 15분
    case "monthly":
      return 30 * 60 * 1000; // 30분
    default:
      return 10 * 60 * 1000; // 기본 10분
  }
}
