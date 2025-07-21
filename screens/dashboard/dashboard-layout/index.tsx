import React from "react";
import { ScrollView } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export const Dashboard = () => {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#1A1A1A", "#2D2D2D", "#404040"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1">
          <VStack className="flex-1 p-6" space="lg">
            {/* Header */}
            <VStack space="sm">
              <Text className="text-white text-3xl font-bold">MetalCat</Text>
              <Text className="text-white/60">메탈 거래 플랫폼</Text>
            </VStack>

            {/* Price Cards */}
            <VStack space="md">
              <Text className="text-white text-xl font-semibold">
                실시간 시세
              </Text>

              {/* LME 시세 */}
              <Box className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <VStack space="sm">
                  <Text className="text-white/80 text-sm font-medium uppercase tracking-wider">
                    LME 시세
                  </Text>

                  <VStack space="xs">
                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">구리</Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">
                          13,365원/kg
                        </Text>
                        <Text className="text-green-400 text-xs">+2.3%</Text>
                      </VStack>
                    </HStack>

                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">알루미늄</Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">3,583원/kg</Text>
                        <Text className="text-red-400 text-xs">-1.1%</Text>
                      </VStack>
                    </HStack>

                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">니켈</Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">
                          20,599원/kg
                        </Text>
                        <Text className="text-green-400 text-xs">+0.8%</Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </VStack>
              </Box>

              {/* 국내 고철 시세 */}
              <Box className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <VStack space="sm">
                  <Text className="text-white/80 text-sm font-medium uppercase tracking-wider">
                    국내 고철 시세
                  </Text>

                  <VStack space="xs">
                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">중량고철</Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">580원/kg</Text>
                        <Text className="text-green-400 text-xs">+1.5%</Text>
                      </VStack>
                    </HStack>

                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">경량고철</Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">520원/kg</Text>
                        <Text className="text-red-400 text-xs">-0.5%</Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </VStack>
              </Box>
            </VStack>

            {/* Quick Actions */}
            <VStack space="md">
              <Text className="text-white text-xl font-semibold">
                빠른 메뉴
              </Text>

              <HStack space="md">
                <Pressable
                  className="flex-1 bg-white/5 rounded-2xl p-5 border border-white/10"
                  onPress={() => router.push("/auction-create")}
                >
                  <VStack className="items-center" space="sm">
                    <Box className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                      <Text className="text-white text-xl">📋</Text>
                    </Box>
                    <Text className="text-white font-medium text-center">
                      경매 등록
                    </Text>
                  </VStack>
                </Pressable>

                <Pressable
                  className="flex-1 bg-white/5 rounded-2xl p-5 border border-white/10"
                  onPress={() => router.push("/calculator")}
                >
                  <VStack className="items-center" space="sm">
                    <Box className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                      <Text className="text-white text-xl">🧮</Text>
                    </Box>
                    <Text className="text-white font-medium text-center">
                      가격 계산기
                    </Text>
                  </VStack>
                </Pressable>
              </HStack>

              <HStack space="md">
                <Pressable
                  className="flex-1 bg-white/5 rounded-2xl p-5 border border-white/10"
                  onPress={() => router.push("/auth/signin")}
                >
                  <VStack className="items-center" space="sm">
                    <Box className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                      <Text className="text-white text-xl">🏆</Text>
                    </Box>
                    <Text className="text-white font-medium text-center">
                      경매 참여
                    </Text>
                  </VStack>
                </Pressable>

                <Pressable
                  className="flex-1 bg-white/5 rounded-2xl p-5 border border-white/10"
                  onPress={() => router.push("/profile/profile")}
                >
                  <VStack className="items-center" space="sm">
                    <Box className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                      <Text className="text-white text-xl">👤</Text>
                    </Box>
                    <Text className="text-white font-medium text-center">
                      프로필
                    </Text>
                  </VStack>
                </Pressable>
              </HStack>
            </VStack>

            {/* Recent Activity */}
            <VStack space="md">
              <Text className="text-white text-xl font-semibold">
                최근 경매
              </Text>

              <Box className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <VStack space="sm">
                  <HStack className="justify-between items-center py-3 px-4 bg-white/5 rounded-lg">
                    <VStack>
                      <Text className="text-white font-medium">
                        구리 스크랩 5톤
                      </Text>
                      <Text className="text-white/60 text-sm">서울 강남구</Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="text-white font-bold">₩67,000,000</Text>
                      <Text className="text-blue-400 text-sm">진행 중</Text>
                    </VStack>
                  </HStack>

                  <HStack className="justify-between items-center py-3 px-4 bg-white/5 rounded-lg">
                    <VStack>
                      <Text className="text-white font-medium">
                        알루미늄 캔 3톤
                      </Text>
                      <Text className="text-white/60 text-sm">
                        부산 해운대구
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="text-white font-bold">₩10,750,000</Text>
                      <Text className="text-green-400 text-sm">완료</Text>
                    </VStack>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
