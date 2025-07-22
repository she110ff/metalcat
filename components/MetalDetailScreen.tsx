import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MetalDetailData, DailyPriceData } from "../data/types/metal-price";
import { NickelPriceChart } from "./NickelPriceChart";

interface MetalDetailScreenProps {
  data: MetalDetailData;
  onBack: () => void;
}

const { width } = Dimensions.get("window");

export const MetalDetailScreen: React.FC<MetalDetailScreenProps> = ({
  data,
  onBack,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    "1D" | "1W" | "1M" | "3M"
  >("1M");

  const formatPrice = (price: number) => {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  const getChangeColor = (changeType: "positive" | "negative") => {
    return changeType === "positive" ? "#22C55E" : "#EF4444";
  };

  const getChangeIcon = (changeType: "positive" | "negative") => {
    return changeType === "positive" ? "trending-up" : "trending-down";
  };

  const renderPriceTable = () => (
    <View style={styles.tableContainer}>
      <Text style={styles.sectionTitle}>일별 가격 데이터</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.dateColumn]}>날짜</Text>
        <Text style={[styles.tableHeaderText, styles.priceColumn]}>CASH</Text>
        <Text style={[styles.tableHeaderText, styles.priceColumn]}>3M</Text>
        <Text style={[styles.tableHeaderText, styles.changeColumn]}>변동</Text>
        <Text style={[styles.tableHeaderText, styles.spreadColumn]}>
          스프레드
        </Text>
      </View>
      <ScrollView style={styles.tableBody}>
        {[...data.dailyData].reverse().map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.dateColumn]}>
              {formatDate(item.date)}
            </Text>
            <Text style={[styles.tableCell, styles.priceColumn]}>
              ${formatPrice(item.cashPrice)}
            </Text>
            <Text style={[styles.tableCell, styles.priceColumn]}>
              ${formatPrice(item.threeMonthPrice)}
            </Text>
            <View style={styles.changeColumn}>
              <View style={styles.changeContainer}>
                <Ionicons
                  name={getChangeIcon(item.changeType)}
                  size={12}
                  color={getChangeColor(item.changeType)}
                />
                <Text
                  style={[
                    styles.changeText,
                    { color: getChangeColor(item.changeType) },
                  ]}
                >
                  {item.changePercent > 0 ? "+" : ""}
                  {item.changePercent.toFixed(2)}%
                </Text>
              </View>
            </View>
            <Text style={[styles.tableCell, styles.spreadColumn]}>
              ${formatPrice(item.spread)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderStatistics = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>통계 분석</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>최고가</Text>
          <Text style={styles.statValue}>
            ${formatPrice(data.statistics.highestPrice)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>최저가</Text>
          <Text style={styles.statValue}>
            ${formatPrice(data.statistics.lowestPrice)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>평균가</Text>
          <Text style={styles.statValue}>
            ${formatPrice(data.statistics.averagePrice)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>변동성</Text>
          <Text style={styles.statValue}>
            ${formatPrice(data.statistics.volatility)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPriceChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.sectionTitle}>가격 추이</Text>
      <NickelPriceChart data={data.dailyData} chartType="line" />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: data.bgColor }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.metalInfo}>
            <Ionicons name={data.iconName} size={24} color={data.iconColor} />
            <Text style={styles.metalName}>{data.metalName}</Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.currentPrice}>
              ${formatPrice(data.currentPrice)}
            </Text>
            <View style={styles.changeContainer}>
              <Ionicons
                name={getChangeIcon(data.changeType)}
                size={16}
                color={getChangeColor(data.changeType)}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: getChangeColor(data.changeType) },
                ]}
              >
                {data.changePercent > 0 ? "+" : ""}
                {data.changePercent.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.unit}>{data.unit}</Text>
      </View>

      {/* 기간 선택 */}
      <View style={styles.periodSelector}>
        {(["1D", "1W", "1M", "3M"] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 콘텐츠 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStatistics()}
        {renderPriceTable()}
        {renderPriceChart()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    marginBottom: 15,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metalName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  priceInfo: {
    alignItems: "flex-end",
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  unit: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
    textAlign: "right",
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  periodButtonActive: {
    backgroundColor: "#3B82F6",
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  periodButtonTextActive: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 15,
  },
  statsContainer: {
    marginBottom: 25,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 50) / 2,
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  chartContainer: {
    marginBottom: 25,
  },
  tableContainer: {
    marginBottom: 25,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151",
  },
  tableBody: {
    maxHeight: 300,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tableCell: {
    fontSize: 12,
    color: "#1F2937",
  },
  dateColumn: {
    flex: 1,
  },
  priceColumn: {
    flex: 1,
    textAlign: "center",
  },
  changeColumn: {
    flex: 1,
    alignItems: "center",
  },
  spreadColumn: {
    flex: 1,
    textAlign: "center",
  },
});
