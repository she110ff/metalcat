import React from "react";
import {
  ScrollView,
  View,
  Text as RNText,
  Image,
  Animated,
} from "react-native";

// MetalCat Dashboard Layout
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { MetalPriceCard } from "@/components/dashboard/metal-price-card";
import { domesticScrapData, groupMetalData, lmePricesData } from "@/data";
import { useLatestLmePricesCompatible } from "@/hooks/lme";

export const Dashboard = () => {
  const router = useRouter();

  // LME 실시간 데이터 Hook
  const {
    data: realTimeLmeData,
    isLoading: isLmeLoading,
    error: lmeError,
    refetch: refetchLme,
  } = useLatestLmePricesCompatible();

  // 애니메이션을 위한 Animated Values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  // 컴포넌트 마운트 시 애니메이션 시작
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Dashboard 컴포넌트 렌더링

  // 대시보드 렌더링

  const handleMetalPress = (metalName: string) => {
    // 금속별 라우팅 매핑
    const metalRoutes: { [key: string]: string } = {
      구리: "copper",
      니켈: "nickel",
      알루미늄: "aluminum",
      아연: "zinc",
      주석: "tin",
      납: "lead",
    };

    const routeName = metalRoutes[metalName];
    if (routeName) {
      router.push(`/metal-detail/${routeName}`);
    }
  };

  return (
    <LinearGradient
      colors={["#1A0F2A", "#2D1B3D", "#3D2F5A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          <Box className="flex-1 px-4 pt-6">
            {/* MetalCat Logo Header - Improved spacing and accessibility */}
            <Animated.View
              style={{
                alignItems: "center",
                marginBottom: 32,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <Box className="items-center justify-center">
                {/* MetalCat 로고 - Enhanced with native animation */}
                <Image
                  source={require("@/assets/images/metalcat_logo.png")}
                  className="w-32 h-32"
                  resizeMode="contain"
                  accessible={true}
                  accessibilityLabel="MetalCat 로고"
                  accessibilityRole="image"
                  onError={(error) => {
                    console.error("로고 로딩 실패:", error);
                  }}
                  onLoad={() => {
                    console.log("✅ MetalCat 로고 로드 성공!");
                  }}
                />
              </Box>
              <Text
                className="text-slate-50 text-xl uppercase text-center font-mono -mt-4 tracking-[2px]"
                accessible={true}
                accessibilityLabel="메탈캣 - 금속 거래 플랫폼"
                accessibilityRole="header"
              >
                METALCAT
              </Text>
            </Animated.View>

            {/* LME PRICES Section - Enhanced with animations and proper fonts */}
            <VStack space="lg" className="mt-12 animate-slide-up">
              <Text
                className="text-yellow-300 text-xl font-black tracking-[2px] uppercase font-nanum-bold"
                accessible={true}
                accessibilityLabel="LME 가격 정보 섹션"
                accessibilityRole="header"
              >
                LME Prices
              </Text>

              <VStack space="md">
                {/* 로딩 상태 처리 */}
                {isLmeLoading && !realTimeLmeData ? (
                  <VStack space="md">
                    {[1, 2, 3].map((row) => (
                      <HStack key={`loading-row-${row}`} space="md">
                        {[1, 2].map((col) => (
                          <Box
                            key={`loading-${row}-${col}`}
                            className="flex-1 h-20 rounded-2xl bg-white/5 animate-pulse"
                          />
                        ))}
                      </HStack>
                    ))}
                  </VStack>
                ) : (
                  // 실시간 데이터 또는 정적 데이터 표시
                  groupMetalData(realTimeLmeData || lmePricesData).map(
                    (row, rowIndex) => (
                      <HStack key={`lme-row-${rowIndex}`} space="md">
                        {row.map((item, itemIndex) => (
                          <MetalPriceCard
                            key={`lme-${rowIndex}-${itemIndex}`}
                            {...item}
                            onPress={() => handleMetalPress(item.metalName)}
                          />
                        ))}
                      </HStack>
                    )
                  )
                )}

                {/* 에러 상태 처리 */}
                {lmeError && !realTimeLmeData && (
                  <Box className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20">
                    <HStack className="items-center justify-between">
                      <VStack>
                        <Text className="text-red-400 font-bold">
                          데이터 로드 실패
                        </Text>
                        <Text className="text-red-300 text-sm">
                          네트워크를 확인하고 다시 시도해주세요
                        </Text>
                      </VStack>
                      <Pressable
                        onPress={() => refetchLme()}
                        className="bg-red-500/20 px-3 py-2 rounded-lg"
                      >
                        <Text className="text-red-300 text-sm font-bold">
                          재시도
                        </Text>
                      </Pressable>
                    </HStack>
                  </Box>
                )}
              </VStack>
            </VStack>

            {/* PREMIUM PROMOTION Banner - Open Event */}
            <VStack
              space="lg"
              className="mt-12 animate-slide-up [animation-delay:150ms]"
            >
              <Pressable
                onPress={() => router.push("/(tabs)/premium")}
                accessible={true}
                accessibilityLabel="프리미엄 서비스 오픈 이벤트, 3달간 무료"
                accessibilityRole="button"
                accessibilityHint="프리미엄 페이지로 이동하려면 탭하세요"
                className="active:scale-[0.98] transform transition-transform duration-150"
              >
                <View
                  style={{
                    borderRadius: 20,
                    shadowColor: "#FFD700",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 12,
                  }}
                >
                  <LinearGradient
                    colors={[
                      "rgba(255, 215, 0, 0.9)",
                      "rgba(255, 165, 0, 0.8)",
                      "rgba(255, 140, 0, 0.9)",
                      "rgba(255, 215, 0, 0.9)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 20,
                      padding: 20,
                    }}
                  >
                    <HStack className="items-center justify-between">
                      <VStack className="flex-1 mr-4">
                        <HStack className="items-center mb-2">
                          <Ionicons name="star" size={24} color="#FFFFFF" />
                          <Text className="text-white text-lg font-black ml-2 tracking-wide animate-pulse-slow">
                            오픈 이벤트
                          </Text>
                          <Ionicons name="star" size={24} color="#FFFFFF" />
                        </HStack>
                        <Text className="text-white text-2xl font-black tracking-wide mb-1 drop-shadow-lg">
                          3달간 프리미엄 서비스
                        </Text>
                        <Text className="text-white text-3xl font-black tracking-wider drop-shadow-lg">
                          무료! 🎉
                        </Text>
                        <Text className="text-white/80 text-sm mt-2 font-semibold">
                          지금 가입하고 특별 혜택을 받아보세요
                        </Text>
                      </VStack>

                      <VStack className="items-center">
                        <Box className="w-16 h-16 rounded-full items-center justify-center bg-white/20 mb-2 animate-pulse-slow">
                          <Ionicons name="star" size={32} color="#FFFFFF" />
                        </Box>
                        <Text className="text-white text-xs font-bold tracking-wide text-center">
                          PREMIUM
                        </Text>
                      </VStack>
                    </HStack>

                    {/* Sparkle Effects */}
                    <Box className="absolute top-3 right-3">
                      <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                    </Box>
                    <Box className="absolute bottom-3 left-3">
                      <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                    </Box>
                    <Box className="absolute top-8 left-8">
                      <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                    </Box>
                  </LinearGradient>
                </View>
              </Pressable>
            </VStack>

            {/* DOMESTIC SCRAP Section - Enhanced with animations */}
            <VStack
              space="lg"
              className="mt-12 animate-slide-up [animation-delay:400ms]"
            >
              <Text
                className="text-slate-50 text-xl font-black tracking-[2px] uppercase font-nanum-bold"
                accessible={true}
                accessibilityLabel="국내 고철 가격 정보 섹션"
                accessibilityRole="header"
              >
                Domestic Scrap
              </Text>

              <VStack space="md">
                {groupMetalData(domesticScrapData).map((row, rowIndex) => (
                  <HStack key={`domestic-row-${rowIndex}`} space="md">
                    {row.map((item, itemIndex) => (
                      <MetalPriceCard
                        key={`domestic-${rowIndex}-${itemIndex}`}
                        {...item}
                        onPress={() => handleMetalPress(item.metalName)}
                      />
                    ))}
                  </HStack>
                ))}
              </VStack>
            </VStack>

            {/* TRENDING AUCTIONS Section - Enhanced with animations and fonts */}
            <VStack
              space="lg"
              className="mt-12 animate-slide-up [animation-delay:400ms]"
            >
              <Text
                className="text-slate-50 text-xl font-black tracking-[2px] uppercase font-nanum-bold"
                accessible={true}
                accessibilityLabel="인기 경매 섹션"
                accessibilityRole="header"
              >
                Trending Auctions
              </Text>

              <VStack space="md">
                <Pressable
                  accessible={true}
                  accessibilityLabel="알루미늄 프로파일 경매, 4백9십6만원, 2일 남음"
                  accessibilityRole="button"
                  accessibilityHint="경매 상세 정보를 보려면 탭하세요"
                  className="active:scale-[0.98] transform transition-transform duration-150"
                >
                  <Box className="rounded-2xl p-4 bg-purple-900/8 border border-purple-500/15 shadow-lg shadow-purple-500/30 hover:bg-purple-900/12 transition-colors duration-200">
                    <HStack className="items-center">
                      <Box className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-purple-600 shadow-lg shadow-purple-500/60">
                        <Ionicons name="hammer" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-slate-50 font-bold text-base mb-1 tracking-wide font-nanum-bold">
                          Aluminum Profiles
                        </Text>
                        <Text className="text-slate-400 text-xs uppercase tracking-[1px] font-nanum">
                          Gyeonggi • 1,600kg
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-green-400 font-black text-lg tracking-wide font-mono">
                          4,960,000
                        </Text>
                        <Text className="text-slate-400 text-3xs uppercase tracking-[1px] font-nanum">
                          KRW
                        </Text>
                        <Text className="text-orange-400 text-xs uppercase tracking-[1px] font-semibold font-nanum animate-pulse-slow">
                          2 Days Left
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>

                <Pressable
                  accessible={true}
                  accessibilityLabel="중고 모터 경매, 40만5천원, 15시간 남음"
                  accessibilityRole="button"
                  accessibilityHint="경매 상세 정보를 보려면 탭하세요"
                  className="active:scale-[0.98] transform transition-transform duration-150"
                >
                  <Box className="rounded-2xl p-4 bg-purple-900/8 border border-purple-500/15 shadow-lg shadow-purple-500/30 hover:bg-purple-900/12 transition-colors duration-200">
                    <HStack className="items-center">
                      <Box className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-purple-600 shadow-lg shadow-purple-500/60">
                        <Ionicons name="settings" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-slate-50 font-bold text-base mb-1 tracking-wide font-nanum-bold">
                          Used Motors
                        </Text>
                        <Text className="text-slate-400 text-xs uppercase tracking-[1px] font-nanum">
                          Chungbuk • 300kg
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-green-400 font-black text-lg tracking-wide font-mono">
                          405,000
                        </Text>
                        <Text className="text-slate-400 text-3xs uppercase tracking-[1px] font-nanum">
                          KRW
                        </Text>
                        <Text className="text-red-400 text-xs uppercase tracking-[1px] font-semibold font-nanum animate-pulse-slow">
                          15 Hours Left
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>
              </VStack>
            </VStack>
          </Box>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
