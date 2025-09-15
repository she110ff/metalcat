import React from "react";
import { ScrollView, Platform, Alert } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import {
  ChevronLeft,
  Wrench,
  Settings,
  Package,
  Hammer,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function SlaveAuctionTypeSelection() {
  const router = useRouter();
  const { slaveUserId, slaveName } = useLocalSearchParams();

  const handleBack = () => {
    router.back();
  };

  const auctionTypes = [
    {
      id: "nonferrous",
      name: "비철",
      icon: Wrench,
      description:
        "A동, 상동, 파동, 황동, 알루미늄, 납, 스테인레스, 전자스크랩, 특수금속",
      color: "#FF6B35",
    },
    {
      id: "ferrous",
      name: "고철",
      icon: Hammer,
      description:
        "생철, 중량고철, 경량고철, 가공고철, 선반철, 금형고철, 작업철",
      color: "#E74C3C",
    },
    {
      id: "machinery",
      name: "중고기계",
      icon: Settings,
      description: "건설장비, 공작기계 등",
      color: "#4ECDC4",
    },
    {
      id: "materials",
      name: "중고자재",
      icon: Package,
      description: "H빔, 각파이프, 철근 등",
      color: "#45B7D1",
    },
    {
      id: "demolition",
      name: "철거",
      icon: Hammer,
      description: "건물철거, 구조물철거 등",
      color: "#96CEB4",
    },
  ];

  const handleTypeSelect = (type: string) => {
    if (!slaveUserId) {
      Alert.alert("오류", "슬레이브 유저 정보가 없습니다.");
      return;
    }

    console.log("🎯 [타입 선택] 경매 등록 화면으로 이동:", {
      type,
      slaveUserId,
      slaveName,
    });

    // 비철/고철의 경우 scrap 경로로 이동하되 ferrousType 파라미터 추가
    let targetUrl: string;
    if (type === "ferrous" || type === "nonferrous") {
      targetUrl = `/auction-create/scrap?slaveUserId=${slaveUserId}&slaveName=${encodeURIComponent(
        (slaveName as string) || ""
      )}&ferrousType=${type}`;
    } else {
      // 기존 로직 유지 (중고기계, 중고자재, 철거)
      targetUrl = `/auction-create/${type}?slaveUserId=${slaveUserId}&slaveName=${encodeURIComponent(
        (slaveName as string) || ""
      )}`;
    }

    console.log("🔗 [타입 선택] 이동할 URL:", targetUrl);

    router.push(targetUrl);
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <VStack className="flex-1 p-6" space="xl">
            {/* Header */}
            <VStack space="lg">
              <HStack className="items-center justify-between px-4 py-3">
                {/* 뒤로가기 버튼 */}
                <Pressable
                  onPress={handleBack}
                  className="active:opacity-60"
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: -8,
                  }}
                >
                  <HStack className="items-center" space="xs">
                    <ChevronLeft
                      size={Platform.OS === "ios" ? 28 : 24}
                      color="#FFFFFF"
                      style={{
                        fontWeight: Platform.OS === "ios" ? "600" : "normal",
                      }}
                    />
                    {Platform.OS === "ios" && (
                      <Text className="text-white text-base font-medium">
                        뒤로
                      </Text>
                    )}
                  </HStack>
                </Pressable>

                <Text
                  className="text-white text-xl font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  경매 타입 선택
                </Text>

                {/* 오른쪽 여백 */}
                <Box style={{ width: Platform.OS === "ios" ? 60 : 44 }} />
              </HStack>

              {/* 슬레이브 유저 정보 */}
              <Box className="mx-4 p-4 bg-white/10 rounded-xl border border-white/20">
                <VStack space="xs">
                  <Text className="text-yellow-300 text-sm font-medium">
                    선택된 사용자
                  </Text>
                  <Text className="text-white text-lg font-bold">
                    {decodeURIComponent((slaveName as string) || "알 수 없음")}
                  </Text>
                  <Text className="text-white/70 text-sm">
                    이 사용자 계정으로 경매가 등록됩니다
                  </Text>
                </VStack>
              </Box>
            </VStack>

            {/* 경매 타입 선택 */}
            <VStack space="lg">
              <Text
                className="text-yellow-300 text-lg font-bold px-4"
                style={{ fontFamily: "NanumGothic" }}
              >
                경매 타입을 선택하세요
              </Text>

              <VStack space="md" className="px-4">
                {auctionTypes.map((auctionType) => {
                  const IconComponent = auctionType.icon;
                  return (
                    <Pressable
                      key={auctionType.id}
                      onPress={() => handleTypeSelect(auctionType.id)}
                      className="active:opacity-80"
                    >
                      <Box
                        className="rounded-xl p-6 border-2"
                        style={{
                          backgroundColor: `${auctionType.color}15`,
                          borderColor: `${auctionType.color}40`,
                        }}
                      >
                        <HStack className="items-center" space="lg">
                          <Box
                            className="w-16 h-16 rounded-full items-center justify-center"
                            style={{
                              backgroundColor: `${auctionType.color}25`,
                            }}
                          >
                            <IconComponent
                              size={32}
                              color={auctionType.color}
                            />
                          </Box>

                          <VStack className="flex-1" space="xs">
                            <Text
                              className="text-white text-xl font-bold"
                              style={{ fontFamily: "NanumGothic" }}
                            >
                              {auctionType.name}
                            </Text>
                            <Text
                              className="text-white/70 text-sm"
                              style={{ fontFamily: "NanumGothic" }}
                            >
                              {auctionType.description}
                            </Text>
                          </VStack>

                          <ChevronLeft
                            size={20}
                            color="#FFFFFF60"
                            style={{ transform: [{ rotate: "180deg" }] }}
                          />
                        </HStack>
                      </Box>
                    </Pressable>
                  );
                })}
              </VStack>
            </VStack>

            {/* 안내 메시지 */}
            <Box className="mx-4 p-4 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <VStack space="xs">
                <Text className="text-blue-300 text-sm font-medium">
                  💡 안내사항
                </Text>
                <Text className="text-white/80 text-sm leading-5">
                  선택한 경매 타입에 따라 해당 등록 화면으로 이동합니다. 등록된
                  경매는 선택된 슬레이브 유저의 계정으로 등록됩니다.
                </Text>
              </VStack>
            </Box>
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
