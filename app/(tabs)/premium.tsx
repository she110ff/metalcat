import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { ScrollView } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";

export default function Premium() {
  return (
    <LinearGradient
      colors={["#0A0A0A", "#1A1A1A", "#2A2A2A", "#1A1A1A"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          <VStack className="flex-1 p-6" space="xl">
            {/* Header Section */}
            <Box
              className="rounded-3xl p-8"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.5,
                shadowRadius: 40,
                elevation: 20,
              }}
            >
              <VStack className="items-center" space="md">
                <Box className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 items-center justify-center">
                  <Ionicons name="star" size={28} color="#1A1A1A" />
                </Box>
                <VStack className="items-center" space="sm">
                  <Text className="text-white text-3xl font-black tracking-wide">
                    특수금속 서비스
                  </Text>
                  <Text className="text-white/60 text-base font-medium tracking-wider uppercase text-center">
                    전문가 방문 • 정밀 분석 • 최고가 매입
                  </Text>
                </VStack>
              </VStack>
            </Box>

            {/* Service Type Buttons */}
            <HStack space="md">
              <Pressable
                className="flex-1 rounded-2xl p-4"
                style={{
                  backgroundColor: "rgba(255, 193, 7, 0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 193, 7, 0.3)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <Text className="text-yellow-400 text-sm font-bold text-center tracking-wide">
                  서비스 목록
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 rounded-2xl p-4"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <Text className="text-white/70 text-sm font-semibold text-center tracking-wide">
                  신청 내역
                </Text>
              </Pressable>
            </HStack>

            {/* Premium Appraisal Service */}
            <Box
              className="rounded-3xl p-6"
              style={{
                backgroundColor: "rgba(139, 69, 19, 0.15)",
                borderWidth: 1,
                borderColor: "rgba(139, 69, 19, 0.3)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              <VStack space="md">
                <HStack className="items-center" space="sm">
                  <Box className="w-8 h-8 rounded-xl bg-yellow-400/20 items-center justify-center">
                    <Ionicons name="star" size={16} color="#FFC107" />
                  </Box>
                  <Text className="text-yellow-400 text-sm font-bold">
                    인기
                  </Text>
                </HStack>

                <VStack space="sm">
                  <Text className="text-white text-xl font-bold">
                    현장 방문 감정
                  </Text>
                  <Text className="text-white/60 text-sm">
                    전문가가 직접 방문하여 특수금속을 정확히 감정합니다
                  </Text>
                </VStack>

                <VStack space="xs">
                  <HStack className="justify-between items-center">
                    <Text className="text-green-400 text-2xl font-black">
                      150,000원
                    </Text>
                    <Text className="text-white/50 text-sm">2-3시간</Text>
                  </HStack>
                </VStack>

                <VStack space="xs">
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">
                      전문 감정사 파견
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">
                      정밀 분석 장비 사용
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">
                      상세 감정서 제공
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">
                      시장 기준 견적
                    </Text>
                  </HStack>
                </VStack>

                <Pressable
                  className="rounded-2xl p-4 mt-2"
                  style={{
                    backgroundColor: "#FFC107",
                    shadowColor: "#FFC107",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <Text className="text-black text-center text-base font-bold">
                    서비스 요청
                  </Text>
                </Pressable>
              </VStack>
            </Box>

            {/* Premium Analysis Service */}
            <Box
              className="rounded-3xl p-6"
              style={{
                backgroundColor: "rgba(34, 139, 139, 0.15)",
                borderWidth: 1,
                borderColor: "rgba(34, 139, 139, 0.3)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              <VStack space="md">
                <VStack space="sm">
                  <Text className="text-white text-xl font-bold">
                    정밀 성분 분석
                  </Text>
                  <Text className="text-white/60 text-sm">
                    첨단 장비를 통한 금속 성분 정밀 분석 서비스
                  </Text>
                </VStack>

                <VStack space="xs">
                  <HStack className="justify-between items-center">
                    <Text className="text-green-400 text-2xl font-black">
                      80,000원
                    </Text>
                    <Text className="text-white/50 text-sm">1-2일</Text>
                  </HStack>
                </VStack>

                <VStack space="xs">
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">
                      XRF 분석기 활용
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">99.9% 정확도</Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">
                      상세 분석 리포트
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">인증서 발급</Text>
                  </HStack>
                </VStack>

                <Pressable
                  className="rounded-2xl p-4 mt-2"
                  style={{
                    backgroundColor: "#20B2AA",
                    shadowColor: "#20B2AA",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <Text className="text-white text-center text-base font-bold">
                    서비스 요청
                  </Text>
                </Pressable>
              </VStack>
            </Box>

            {/* Immediate Purchase Service */}
            <Box
              className="rounded-3xl p-6"
              style={{
                backgroundColor: "rgba(30, 58, 138, 0.15)",
                borderWidth: 1,
                borderColor: "rgba(30, 58, 138, 0.3)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              <VStack space="md">
                <VStack space="sm">
                  <Text className="text-white text-xl font-bold">
                    즉시 매입 서비스
                  </Text>
                  <Text className="text-white/60 text-sm">
                    감정 완료 즉시 최고가로 매입해드립니다
                  </Text>
                </VStack>

                <VStack space="xs">
                  <HStack className="justify-between items-center">
                    <Text className="text-green-400 text-2xl font-black">
                      협의
                    </Text>
                    <Text className="text-white/50 text-sm">감정 후 즉시</Text>
                  </HStack>
                </VStack>

                <VStack space="xs">
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">
                      시장 최고가 매입
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">
                      현금 즉시 지급
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">
                      세금계산서 발급
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text className="text-white/80 text-sm">운송비 무료</Text>
                  </HStack>
                </VStack>

                <Pressable
                  className="rounded-2xl p-4 mt-2"
                  style={{
                    backgroundColor: "#1E3A8A",
                    shadowColor: "#1E3A8A",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <Text className="text-white text-center text-base font-bold">
                    서비스 요청
                  </Text>
                </Pressable>
              </VStack>
            </Box>
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
