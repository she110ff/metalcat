import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import {
  Plane,
  Battery,
  Shield,
  Cable,
  Package,
  Coins,
  Car,
  Bike,
  Rocket,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text as UIText } from "@/components/ui/text";
import { MetalDetailData, DailyPriceData } from "../data/types/metal-price";
import { MetalPriceChart } from "./MetalPriceChart";
import { formatMetalPrice } from "@/data/utils/metal-price-utils";

// 금속별 아이콘 매핑 (MetalPriceCard와 동일)
const getMetalIcon = (metalName: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    알루미늄: Plane, // 항공기용 알루미늄
    납: Battery, // 배터리용 납
    아연: Shield, // 아연 도금/보호막
    구리: Cable, // 구리 전선/케이블
    주석: Package, // 주석 캔/포장재
    니켈: Coins, // 니켈 동전
    중량고철: Car, // 자동차 고철
    경량고철: Bike, // 자전거 등 경량 고철
    특수고철: Rocket, // 특수 합금 고철
  };

  return iconMap[metalName] || Package;
};

// 금속별 색상 클래스 매핑 (MetalPriceCard와 동일)
const getMetalColorClass = (metalName: string) => {
  const colorClassMap: { [key: string]: string } = {
    알루미늄: "bg-indigo-600 shadow-indigo-500/60", // 인디고
    납: "bg-green-500 shadow-green-500/60", // 그린
    아연: "bg-blue-500 shadow-blue-500/60", // 블루
    구리: "bg-orange-400 shadow-orange-500/60", // 오렌지
    주석: "bg-gray-400 shadow-gray-500/60", // 그레이
    니켈: "bg-purple-500 shadow-purple-500/60", // 퍼플
    중량고철: "bg-red-500 shadow-red-500/60", // 레드
    경량고철: "bg-green-500 shadow-green-500/60", // 그린
    특수고철: "bg-purple-600 shadow-purple-500/60", // 퍼플
  };

  return colorClassMap[metalName] || "bg-gray-500 shadow-gray-500/60";
};

interface MetalDetailScreenProps {
  data: MetalDetailData;
  onBack: () => void;
}

const { width } = Dimensions.get("window");

export const MetalDetailScreen: React.FC<MetalDetailScreenProps> = ({
  data,
  onBack,
}) => {
  console.log("🔍 MetalDetailScreen 렌더링 시작", {
    metalName: data?.metalName,
    hasData: !!data,
    dataKeys: data ? Object.keys(data) : [],
  });

  const IconComponent = getMetalIcon(data.metalName);
  const metalColorClass = getMetalColorClass(data.metalName);

  console.log("📋 MetalDetailScreen 아이콘/색상 설정", {
    IconComponent: IconComponent?.name,
    metalColorClass,
  });
  // USD/톤을 원/KG로 변환
  const convertUsdPerTonToKrwPerKg = (usdPerTon: number) => {
    const USD_TO_KRW_RATE = 1300; // 환율
    const TON_TO_KG = 1000; // 1톤 = 1,000kg
    return Math.round((usdPerTon * USD_TO_KRW_RATE) / TON_TO_KG);
  };

  const formatPrice = (price: number) => {
    return formatMetalPrice(price);
  };

  // USD/톤 가격을 원/KG로 변환하여 포매팅
  const formatPriceInKrw = (usdPerTon: number) => {
    const krwPerKg = convertUsdPerTonToKrwPerKg(usdPerTon);
    return formatMetalPrice(krwPerKg);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  const getChangeColorClass = (changeType: "positive" | "negative") => {
    return changeType === "positive" ? "text-green-400" : "text-red-400";
  };

  const getChangeIcon = (changeType: "positive" | "negative") => {
    return changeType === "positive" ? TrendingUp : TrendingDown;
  };

  const renderPriceTable = () => {
    console.log("📊 renderPriceTable 호출됨", {
      dailyDataLength: data.dailyData?.length,
    });
    return (
      <Box className="rounded-2xl p-6 mb-6 bg-white/4 border border-white/8 shadow-lg animate-slide-up">
        <UIText className="text-yellow-300 text-xl font-black tracking-[2px] uppercase mb-4 font-nanum-bold">
          일별 가격 데이터
        </UIText>

        <Box className="rounded-xl p-4 mb-4 bg-white/2 border border-white/5">
          <HStack className="mb-3">
            <UIText className="text-slate-400 text-xs font-bold uppercase tracking-[1px] flex-1 font-nanum">
              날짜
            </UIText>
            <UIText className="text-slate-400 text-xs font-bold uppercase tracking-[1px] flex-1 text-center font-nanum">
              CASH (원/KG)
            </UIText>
            <UIText className="text-slate-400 text-xs font-bold uppercase tracking-[1px] flex-1 text-center font-nanum">
              3M (원/KG)
            </UIText>
            <UIText className="text-slate-400 text-xs font-bold uppercase tracking-[1px] flex-1 text-center font-nanum">
              변동
            </UIText>
          </HStack>

          <ScrollView className="max-h-80">
            {[...data.dailyData].reverse().map((item, index) => {
              const ChangeIconComponent = getChangeIcon(item.changeType);
              return (
                <HStack key={index} className="py-2 border-b border-white/5">
                  <UIText className="text-slate-300 text-xs flex-1 font-nanum">
                    {formatDate(item.date)}
                  </UIText>
                  <UIText className="text-slate-50 text-xs flex-1 text-center font-bold font-mono">
                    {formatPriceInKrw(item.cashPrice)}
                  </UIText>
                  <UIText className="text-slate-50 text-xs flex-1 text-center font-bold font-mono">
                    {formatPriceInKrw(item.threeMonthPrice)}
                  </UIText>
                  <HStack className="flex-1 justify-center items-center">
                    <ChangeIconComponent
                      size={10}
                      color={
                        item.changeType === "positive" ? "#22C55E" : "#EF4444"
                      }
                      strokeWidth={2}
                    />
                    <UIText
                      className={`text-xs font-bold ml-1 font-nanum ${getChangeColorClass(
                        item.changeType
                      )}`}
                    >
                      {item.changePercent > 0 ? "+" : ""}
                      {item.changePercent.toFixed(2)}%
                    </UIText>
                  </HStack>
                </HStack>
              );
            })}
          </ScrollView>
        </Box>
      </Box>
    );
  };

  const renderStatistics = () => {
    console.log("📈 renderStatistics 호출됨", { statistics: data.statistics });
    return (
      <Box className="rounded-2xl p-6 mb-8 mt-6 bg-white/4 border border-white/8 shadow-lg animate-slide-up">
        <UIText className="text-slate-50 text-xl font-black tracking-[2px] uppercase mb-4 font-nanum-bold">
          통계 분석 (원/KG)
        </UIText>

        <VStack space="lg">
          <HStack space="lg">
            <Box className="flex-1 rounded-xl p-4 bg-white/2 border border-white/5">
              <UIText className="text-slate-400 text-xs font-bold uppercase tracking-[1px] mb-2 font-nanum">
                최고가
              </UIText>
              <UIText className="text-slate-50 text-lg font-black font-mono">
                ₩{formatPriceInKrw(data.statistics.highestPrice)}
              </UIText>
            </Box>
            <Box className="flex-1 rounded-xl p-4 bg-white/2 border border-white/5">
              <UIText className="text-slate-400 text-xs font-bold uppercase tracking-[1px] mb-2 font-nanum">
                최저가
              </UIText>
              <UIText className="text-slate-50 text-lg font-black font-mono">
                ₩{formatPriceInKrw(data.statistics.lowestPrice)}
              </UIText>
            </Box>
          </HStack>

          <HStack space="lg">
            <Box className="flex-1 rounded-xl p-4 bg-white/2 border border-white/5">
              <UIText className="text-slate-400 text-xs font-bold uppercase tracking-[1px] mb-2 font-nanum">
                평균가
              </UIText>
              <UIText className="text-slate-50 text-lg font-black font-mono">
                ₩{formatPriceInKrw(data.statistics.averagePrice)}
              </UIText>
            </Box>
            <Box className="flex-1 rounded-xl p-4 bg-white/2 border border-white/5">
              <UIText className="text-slate-400 text-xs font-bold uppercase tracking-[1px] mb-2 font-nanum">
                변동성
              </UIText>
              <UIText className="text-slate-50 text-lg font-black font-mono">
                ₩{formatPriceInKrw(data.statistics.volatility)}
              </UIText>
            </Box>
          </HStack>
        </VStack>
      </Box>
    );
  };

  const renderPriceChart = () => {
    console.log("📉 renderPriceChart 호출됨");
    return (
      <Box className="rounded-2xl p-6 mb-6 bg-white/4 border border-white/8 shadow-lg animate-slide-up">
        <UIText className="text-yellow-300 text-xl font-black tracking-[2px] uppercase mb-4 font-nanum-bold">
          가격 추이
        </UIText>
        <MetalPriceChart
          data={data.dailyData.map((item) => ({
            ...item,
            cashPrice: convertUsdPerTonToKrwPerKg(item.cashPrice),
            threeMonthPrice: convertUsdPerTonToKrwPerKg(item.threeMonthPrice),
          }))}
          chartType="line"
          metalName={data.metalName}
        />
      </Box>
    );
  };

  console.log("🎨 MetalDetailScreen JSX 렌더링 시작");

  // 임시 간단한 렌더링 테스트
  if (!data) {
    console.log("❌ 데이터가 없습니다!");
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "red",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 20 }}>데이터 없음</Text>
      </View>
    );
  }

  console.log("✅ 데이터 확인됨, 정상 렌더링 시작");

  // 1단계: LinearGradient + 기본 스타일로 시작 (NativeWind 사용 안함)
  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* 헤더 - 기본 스타일 */}
        <View
          style={{
            padding: 24,
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: "rgba(99, 102, 241, 0.9)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <IconComponent size={24} color="#FFFFFF" strokeWidth={2.5} />
              </View>

              <View>
                <Text
                  style={{ color: "white", fontSize: 24, fontWeight: "bold" }}
                >
                  {data.metalName}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
                  {data.unit}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: "white", fontSize: 30, fontWeight: "bold" }}>
              ₩{formatPriceInKrw(data.currentPrice)}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                marginTop: 4,
              }}
            >
              원/KG
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              {(() => {
                const ChangeIconComponent = getChangeIcon(data.changeType);
                return (
                  <ChangeIconComponent
                    size={16}
                    color={
                      data.changeType === "positive" ? "#22C55E" : "#EF4444"
                    }
                    strokeWidth={2.5}
                  />
                );
              })()}
              <Text
                style={{
                  color: data.changeType === "positive" ? "#22C55E" : "#EF4444",
                  fontSize: 14,
                  fontWeight: "bold",
                  marginLeft: 8,
                }}
              >
                {data.changePercent > 0 ? "+" : ""}
                {data.changePercent.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* 콘텐츠 - 간단한 통계만 */}
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 24 }}
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              통계 분석 (원/KG)
            </Text>

            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  borderRadius: 12,
                  padding: 16,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.05)",
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  최고가
                </Text>
                <Text
                  style={{ color: "white", fontSize: 18, fontWeight: "bold" }}
                >
                  ₩{formatPriceInKrw(data.statistics.highestPrice)}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  borderRadius: 12,
                  padding: 16,
                  marginLeft: 8,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.05)",
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  최저가
                </Text>
                <Text
                  style={{ color: "white", fontSize: 18, fontWeight: "bold" }}
                >
                  ₩{formatPriceInKrw(data.statistics.lowestPrice)}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <Text
              style={{
                color: "#FCD34D",
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              가격 추이 차트
            </Text>

            {/* 차트 컴포넌트 추가 */}
            <MetalPriceChart
              data={data.dailyData.map((item) => ({
                ...item,
                cashPrice: convertUsdPerTonToKrwPerKg(item.cashPrice),
                threeMonthPrice: convertUsdPerTonToKrwPerKg(
                  item.threeMonthPrice
                ),
              }))}
              chartType="line"
              metalName={data.metalName}
            />
          </View>

          {/* 일별 데이터 테이블 */}
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
              marginTop: 16,
            }}
          >
            <Text
              style={{
                color: "#FCD34D",
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              일별 가격 데이터
            </Text>
            <Text style={{ color: "white", fontSize: 14, marginBottom: 12 }}>
              총 {data.dailyData?.length || 0}일 데이터
            </Text>

            {/* 테이블 헤더 */}
            <View
              style={{
                flexDirection: "row",
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.1)",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  flex: 1,
                }}
              >
                날짜
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  flex: 1,
                  textAlign: "center",
                }}
              >
                CASH (원/KG)
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  flex: 1,
                  textAlign: "center",
                }}
              >
                3M (원/KG)
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  flex: 1,
                  textAlign: "center",
                }}
              >
                변동률
              </Text>
            </View>

            {/* 데이터 행들 */}
            {data.dailyData
              ?.slice()
              .reverse()
              .map((item, index) => {
                const ChangeIconComponent = getChangeIcon(item.changeType);
                return (
                  <View
                    key={index}
                    style={{
                      flexDirection: "row",
                      paddingVertical: 8,
                      borderBottomWidth:
                        index < data.dailyData.length - 1 ? 1 : 0,
                      borderBottomColor: "rgba(255,255,255,0.05)",
                    }}
                  >
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: 12,
                        flex: 1,
                      }}
                    >
                      {formatDate(item.date)}
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "bold",
                        flex: 1,
                        textAlign: "center",
                      }}
                    >
                      ₩{formatPriceInKrw(item.cashPrice)}
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "bold",
                        flex: 1,
                        textAlign: "center",
                      }}
                    >
                      ₩{formatPriceInKrw(item.threeMonthPrice)}
                    </Text>
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <ChangeIconComponent
                        size={10}
                        color={
                          item.changeType === "positive" ? "#22C55E" : "#EF4444"
                        }
                        strokeWidth={2}
                      />
                      <Text
                        style={{
                          color:
                            item.changeType === "positive"
                              ? "#22C55E"
                              : "#EF4444",
                          fontSize: 12,
                          fontWeight: "bold",
                          marginLeft: 4,
                        }}
                      >
                        {item.changePercent > 0 ? "+" : ""}
                        {item.changePercent.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
