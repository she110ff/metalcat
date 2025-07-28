import React from "react";
import { ScrollView, View, Image } from "react-native";

// 상대 경로로 다시 테스트
const iconImage = require("../../../assets/images/icon.png");
const metalcatLogo = require("../../../assets/images/metalcat-logo.png");
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
          <Box className="flex-1 p-4">
            {/* MetalCat Logo Header */}
            <Box className="items-center mb-4">
              <Box
                style={{
                  width: 120,
                  height: 120,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Image
                  source={iconImage}
                  style={{
                    width: 100,
                    height: 100,
                  }}
                  resizeMode="contain"
                  onError={(error: any) => {
                    console.error("❌ Image loading failed:", error);
                    console.error(
                      "❌ Attempted path: ../../../assets/images/icon.png"
                    );
                  }}
                  onLoad={() => {
                    console.log("✅ Image loaded successfully!");
                  }}
                  onLoadStart={() => {
                    console.log("🔄 Image loading started...");
                  }}
                />
              </Box>
              <Text
                className="text-white text-lg font-black uppercase text-center"
                style={{
                  marginTop: 5,
                  fontFamily: "SpaceMono",
                  textShadowColor: "rgba(255, 255, 255, 0.4)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                  letterSpacing: 6,
                  fontWeight: "900",
                  color: "#F8FAFC",
                }}
              >
                METALCAT
              </Text>
            </Box>

            {/* LME PRICES Section */}
            <VStack space="lg" className="mt-20">
              <Text
                className="text-yellow-300 text-xl font-black tracking-[2px] uppercase"
                style={{
                  fontFamily: "NanumGothic",
                  fontWeight: "800",
                }}
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

            {/* DOMESTIC SCRAP Section */}
            <VStack space="lg" className="mt-10">
              <Text
                className="text-white text-xl font-black tracking-[2px] uppercase"
                style={{
                  fontFamily: "NanumGothic",
                  fontWeight: "800",
                }}
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

            {/* TRENDING AUCTIONS Section */}
            <VStack space="lg" className="mt-10">
              <Text
                className="text-white text-xl font-black tracking-[2px] uppercase"
                style={{
                  fontFamily: "NanumGothic",
                  fontWeight: "800",
                }}
              >
                Trending Auctions
              </Text>

              <VStack space="md">
                <Pressable>
                  <Box
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: "rgba(147, 51, 234, 0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(147, 51, 234, 0.15)",
                      shadowColor: "#9333EA",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(147, 51, 234, 0.9)",
                          shadowColor: "#9333EA",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons name="hammer" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text
                          className="text-white font-bold text-base mb-0.5 tracking-wide"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          Aluminum Profiles
                        </Text>
                        <Text
                          className="text-white/50 text-xs uppercase tracking-[1px]"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          Gyeonggi • 1,600kg
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text
                          className="text-white font-black text-lg tracking-wide"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          4,960,000
                        </Text>
                        <Text
                          className="text-white/50 text-xs uppercase tracking-[1px]"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          KRW
                        </Text>
                        <Text
                          className="text-white/50 text-xs uppercase tracking-[1px]"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          2 Days Left
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>

                <Pressable>
                  <Box
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: "rgba(147, 51, 234, 0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(147, 51, 234, 0.15)",
                      shadowColor: "#9333EA",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(147, 51, 234, 0.9)",
                          shadowColor: "#9333EA",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons name="settings" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text
                          className="text-white font-bold text-base mb-0.5 tracking-wide"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          Used Motors
                        </Text>
                        <Text
                          className="text-white/50 text-xs uppercase tracking-[1px]"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          Chungbuk • 300kg
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text
                          className="text-white font-black text-lg tracking-wide"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          405,000
                        </Text>
                        <Text
                          className="text-white/50 text-xs uppercase tracking-[1px]"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          KRW
                        </Text>
                        <Text
                          className="text-white/50 text-xs uppercase tracking-[1px]"
                          style={{ fontFamily: "NanumGothic" }}
                        >
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
