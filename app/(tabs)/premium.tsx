import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { ScrollView, View } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { CheckCircle } from "lucide-react-native";
import { Crown } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function Premium() {
  const router = useRouter();

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
          <VStack className="flex-1 p-6" space="xl">
            {/* Header Section */}
            <VStack
              className="items-center"
              style={{ marginBottom: 40, marginTop: 20 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Crown size={32} color="#FCD34D" strokeWidth={2.5} />
                <Text
                  style={{
                    fontFamily: "SpaceMono",
                    fontSize: 28,
                    fontWeight: "900",
                    color: "#F8FAFC",
                    letterSpacing: 6,
                    marginLeft: 12,
                    lineHeight: 36,
                    paddingTop: 4,
                    textShadowColor: "rgba(255, 255, 255, 0.4)",
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 4,
                    textAlignVertical: "center",
                    includeFontPadding: false,
                  }}
                >
                  PREMIUM
                </Text>
              </View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 16,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                프리미엄 금속 서비스
              </Text>
            </VStack>

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
                <VStack space="sm">
                  <Text
                    className="text-white text-xl font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    현장 방문 감정
                  </Text>
                  <Text
                    className="text-white/60 text-sm"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    전문가가 직접 방문하여 특수금속을 정확히 감정합니다
                  </Text>
                </VStack>

                <VStack space="xs">
                  <HStack className="justify-between items-center">
                    <Text
                      className="text-green-400 text-2xl font-black"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      무료
                    </Text>
                    <Text
                      className="text-white/50 text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      1-2일
                    </Text>
                  </HStack>
                </VStack>

                <VStack space="xs">
                  <HStack className="items-center" space="sm">
                    <CheckCircle size={16} color="#4CAF50" />
                    <Text
                      className="text-white/80 text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      전문 감정사 파견
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <CheckCircle size={16} color="#4CAF50" />
                    <Text
                      className="text-white/80 text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      정밀 분석 장비 사용
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <CheckCircle size={16} color="#4CAF50" />
                    <Text
                      className="text-white/80 text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      현장 방문 무료
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <CheckCircle size={16} color="#4CAF50" />
                    <Text
                      className="text-white/80 text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
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
                  onPress={() => router.push("/service-request?type=appraisal")}
                >
                  <Text className="text-black text-center text-base font-bold">
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
                    <CheckCircle size={16} color="#4CAF50" />
                    <Text className="text-white/80 text-sm">
                      시장 최고가 매입
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <CheckCircle size={16} color="#4CAF50" />
                    <Text className="text-white/80 text-sm">
                      현금 즉시 지급
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <CheckCircle size={16} color="#4CAF50" />
                    <Text className="text-white/80 text-sm">
                      세금계산서 발급
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <CheckCircle size={16} color="#4CAF50" />
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
                  onPress={() => router.push("/service-request?type=purchase")}
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
