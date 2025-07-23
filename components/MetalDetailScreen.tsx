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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { MetalDetailData, DailyPriceData } from "../data/types/metal-price";
import { MetalPriceChart } from "./MetalPriceChart";
import { formatMetalPrice } from "@/data/utils/metal-price-utils";

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
    return formatMetalPrice(price);
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
    <Box
      className="rounded-2xl p-6 mb-6"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Text
        className="text-yellow-300 text-xl font-black tracking-[2px] uppercase mb-4"
        style={{
          fontFamily: "NanumGothic",
          fontWeight: "800",
        }}
      >
        일별 가격 데이터
      </Text>

      <Box
        className="rounded-xl p-4 mb-4"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.05)",
        }}
      >
        <HStack className="mb-3">
          <Text className="text-white/60 text-xs font-bold uppercase tracking-[1px] flex-1">
            날짜
          </Text>
          <Text className="text-white/60 text-xs font-bold uppercase tracking-[1px] flex-1 text-center">
            CASH
          </Text>
          <Text className="text-white/60 text-xs font-bold uppercase tracking-[1px] flex-1 text-center">
            3M
          </Text>
          <Text className="text-white/60 text-xs font-bold uppercase tracking-[1px] flex-1 text-center">
            변동
          </Text>
          <Text className="text-white/60 text-xs font-bold uppercase tracking-[1px] flex-1 text-center">
            스프레드
          </Text>
        </HStack>

        <ScrollView style={{ maxHeight: 300 }}>
          {[...data.dailyData].reverse().map((item, index) => (
            <HStack key={index} className="py-2 border-b border-white/5">
              <Text
                className="text-white/80 text-xs flex-1"
                style={{ fontFamily: "NanumGothic" }}
              >
                {formatDate(item.date)}
              </Text>
              <Text
                className="text-white text-xs flex-1 text-center font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                ${formatPrice(item.cashPrice)}
              </Text>
              <Text
                className="text-white text-xs flex-1 text-center font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                ${formatPrice(item.threeMonthPrice)}
              </Text>
              <HStack className="flex-1 justify-center items-center">
                <Ionicons
                  name={getChangeIcon(item.changeType)}
                  size={10}
                  color={getChangeColor(item.changeType)}
                />
                <Text
                  className="text-xs font-bold ml-1"
                  style={{
                    color: getChangeColor(item.changeType),
                    fontFamily: "NanumGothic",
                  }}
                >
                  {item.changePercent > 0 ? "+" : ""}
                  {item.changePercent.toFixed(2)}%
                </Text>
              </HStack>
              <Text
                className="text-white/70 text-xs flex-1 text-center"
                style={{ fontFamily: "NanumGothic" }}
              >
                ${formatPrice(item.spread)}
              </Text>
            </HStack>
          ))}
        </ScrollView>
      </Box>
    </Box>
  );

  const renderStatistics = () => (
    <Box
      className="rounded-2xl p-6 mb-6"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Text
        className="text-white text-xl font-black tracking-[2px] uppercase mb-4"
        style={{
          fontFamily: "NanumGothic",
          fontWeight: "800",
        }}
      >
        통계 분석
      </Text>

      <VStack space="md">
        <HStack space="md">
          <Box
            className="flex-1 rounded-xl p-4"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Text className="text-white/60 text-xs font-bold uppercase tracking-[1px] mb-2">
              최고가
            </Text>
            <Text
              className="text-white text-lg font-black"
              style={{ fontFamily: "NanumGothic" }}
            >
              ${formatPrice(data.statistics.highestPrice)}
            </Text>
          </Box>
          <Box
            className="flex-1 rounded-xl p-4"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Text className="text-white/60 text-xs font-bold uppercase tracking-[1px] mb-2">
              최저가
            </Text>
            <Text
              className="text-white text-lg font-black"
              style={{ fontFamily: "NanumGothic" }}
            >
              ${formatPrice(data.statistics.lowestPrice)}
            </Text>
          </Box>
        </HStack>

        <HStack space="md">
          <Box
            className="flex-1 rounded-xl p-4"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Text className="text-white/60 text-xs font-bold uppercase tracking-[1px] mb-2">
              평균가
            </Text>
            <Text
              className="text-white text-lg font-black"
              style={{ fontFamily: "NanumGothic" }}
            >
              ${formatPrice(data.statistics.averagePrice)}
            </Text>
          </Box>
          <Box
            className="flex-1 rounded-xl p-4"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.05)",
            }}
          >
            <Text className="text-white/60 text-xs font-bold uppercase tracking-[1px] mb-2">
              변동성
            </Text>
            <Text
              className="text-white text-lg font-black"
              style={{ fontFamily: "NanumGothic" }}
            >
              ${formatPrice(data.statistics.volatility)}
            </Text>
          </Box>
        </HStack>
      </VStack>
    </Box>
  );

  const renderPriceChart = () => (
    <Box
      className="rounded-2xl p-6 mb-6"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Text
        className="text-yellow-300 text-xl font-black tracking-[2px] uppercase mb-4"
        style={{
          fontFamily: "NanumGothic",
          fontWeight: "800",
        }}
      >
        가격 추이
      </Text>
      <MetalPriceChart
        data={data.dailyData}
        chartType="line"
        metalName={data.metalName}
      />
    </Box>
  );

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* 헤더 */}
        <Box
          className="p-6"
          style={{
            backgroundColor: data.bgColor,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          }}
        >
          <HStack className="items-center justify-between mb-4">
            <TouchableOpacity onPress={onBack} className="p-2">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <HStack className="items-center">
              <Box
                className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  shadowColor: data.iconColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Ionicons
                  name={data.iconName}
                  size={24}
                  color={data.iconColor}
                />
              </Box>
              <VStack className="items-start">
                <Text
                  className="text-white text-2xl font-black tracking-wide"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {data.metalName}
                </Text>
                <Text
                  className="text-white/60 text-sm uppercase tracking-[1px]"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {data.unit}
                </Text>
              </VStack>
            </HStack>
          </HStack>

          <VStack className="items-end">
            <Text
              className="text-white text-3xl font-black tracking-wide"
              style={{ fontFamily: "NanumGothic" }}
            >
              ${formatPrice(data.currentPrice)}
            </Text>
            <HStack className="items-center mt-2">
              <Ionicons
                name={getChangeIcon(data.changeType)}
                size={16}
                color={getChangeColor(data.changeType)}
              />
              <Text
                className="text-sm font-bold ml-2"
                style={{
                  color: getChangeColor(data.changeType),
                  fontFamily: "NanumGothic",
                }}
              >
                {data.changePercent > 0 ? "+" : ""}
                {data.changePercent.toFixed(2)}%
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* 기간 선택 */}
        <HStack className="p-6 gap-3">
          {(["1D", "1W", "1M", "3M"] as const).map((period) => (
            <TouchableOpacity
              key={period}
              className="flex-1 rounded-2xl py-3"
              style={{
                backgroundColor:
                  selectedPeriod === period
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(255, 255, 255, 0.02)",
                borderWidth: 1,
                borderColor:
                  selectedPeriod === period
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
              }}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                className="text-center font-bold text-sm uppercase tracking-[1px]"
                style={{
                  color:
                    selectedPeriod === period
                      ? "#FFFFFF"
                      : "rgba(255, 255, 255, 0.6)",
                  fontFamily: "NanumGothic",
                }}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </HStack>

        {/* 콘텐츠 */}
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {renderStatistics()}
          {renderPriceTable()}
          {renderPriceChart()}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
