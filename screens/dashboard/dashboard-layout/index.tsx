import React from "react";
import { ScrollView, View, Text as RNText, Image } from "react-native";

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

export const Dashboard = () => {
  const router = useRouter();

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
            <Box className="items-center mb-8">
              <Box className="w-30 h-30 justify-center items-center mb-3">
                {/* MetalCat 로고 - Enhanced with animation */}
                <Image
                  source={require("@/assets/images/metalcat_logo.png")}
                  className="w-25 h-25 animate-fade-in"
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
                className="text-slate-50 text-xl font-black uppercase text-center mt-2 tracking-[6px] font-mono animate-fade-in"
                accessible={true}
                accessibilityLabel="메탈캣 - 금속 거래 플랫폼"
                accessibilityRole="header"
              >
                METALCAT
              </Text>
            </Box>

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
                {groupMetalData(lmePricesData).map((row, rowIndex) => (
                  <HStack key={`lme-row-${rowIndex}`} space="md">
                    {row.map((item, itemIndex) => (
                      <MetalPriceCard
                        key={`lme-${rowIndex}-${itemIndex}`}
                        {...item}
                        onPress={() => handleMetalPress(item.metalName)}
                      />
                    ))}
                  </HStack>
                ))}
              </VStack>
            </VStack>

            {/* DOMESTIC SCRAP Section - Enhanced with animations */}
            <VStack
              space="lg"
              className="mt-12 animate-slide-up [animation-delay:200ms]"
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
