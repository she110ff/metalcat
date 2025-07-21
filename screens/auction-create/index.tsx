import React, { useState } from "react";
import { ScrollView, Alert } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { useRouter, useLocalSearchParams } from "expo-router";

export const AuctionCreate = () => {
  const router = useRouter();
  const { type } = useLocalSearchParams();

  const [formData, setFormData] = useState({
    title: "",
    metalType: (type as string) || "",
    weight: "",
    purity: "",
    startPrice: "",
    description: "",
    location: "",
    duration: "72",
  });

  const handleCreate = () => {
    if (
      !formData.title ||
      !formData.metalType ||
      !formData.weight ||
      !formData.startPrice
    ) {
      Alert.alert("입력 오류", "필수 항목을 모두 입력해주세요.");
      return;
    }

    Alert.alert("등록 완료", "경매가 성공적으로 등록되었습니다.", [
      { text: "확인", onPress: () => router.back() },
    ]);
  };

  const handleBack = () => {
    router.back();
  };

  const auctionTypes = [
    { id: "scrap", name: "고철", icon: "construct" },
    { id: "machinery", name: "중고기계", icon: "settings" },
    { id: "materials", name: "중고자재", icon: "cube" },
    { id: "demolition", name: "철거", icon: "hammer" },
  ];

  const getTypeName = (typeId: string) => {
    const type = auctionTypes.find((t) => t.id === typeId);
    return type ? type.name : "기타";
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          <VStack className="flex-1 p-6" space="xl">
            {/* Header */}
            <VStack space="lg">
              <HStack className="items-center justify-between">
                <Pressable onPress={handleBack}>
                  <Box
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                  </Box>
                </Pressable>
                <Text className="text-white font-bold text-lg tracking-wide">
                  경매 생성
                </Text>
                <Box className="w-10 h-10" />
              </HStack>

              <Box
                className="rounded-3xl p-8"
                style={{
                  backgroundColor: "rgba(147, 51, 234, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(147, 51, 234, 0.15)",
                  shadowColor: "#9333EA",
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                }}
              >
                <VStack space="md">
                  <Text className="text-purple-300 text-sm font-medium tracking-[3px] uppercase">
                    Create New Auction
                  </Text>
                  <Text className="text-white text-2xl font-black tracking-wide">
                    경매 등록
                  </Text>
                  <Text className="text-purple-200/80 text-sm font-medium tracking-wider uppercase">
                    새로운 경매를 등록하세요
                  </Text>
                </VStack>
              </Box>
            </VStack>

            {/* Basic Information */}
            <VStack space="lg">
              <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                기본 정보
              </Text>

              <Box
                className="rounded-2xl p-6"
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
                <VStack space="md">
                  <VStack>
                    <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
                      경매 제목
                    </Text>
                    <Input
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        borderRadius: 16,
                        overflow: "hidden",
                      }}
                    >
                      <InputField
                        placeholder="경매 품목 제목을 입력하세요"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.title}
                        onChangeText={(text) =>
                          setFormData({ ...formData, title: text })
                        }
                        style={{
                          color: "white",
                          fontSize: 16,
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                      />
                    </Input>
                  </VStack>

                  <VStack>
                    <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
                      경매 종류
                    </Text>
                    <HStack className="flex-wrap" space="sm">
                      {auctionTypes.map((auctionType) => (
                        <Pressable
                          key={auctionType.id}
                          onPress={() =>
                            setFormData({
                              ...formData,
                              metalType: auctionType.id,
                            })
                          }
                        >
                          <Box
                            className="px-4 py-2 rounded-xl"
                            style={{
                              backgroundColor:
                                formData.metalType === auctionType.id
                                  ? "rgba(147, 51, 234, 0.25)"
                                  : "rgba(147, 51, 234, 0.12)",
                              borderWidth: 1,
                              borderColor:
                                formData.metalType === auctionType.id
                                  ? "rgba(147, 51, 234, 0.4)"
                                  : "rgba(147, 51, 234, 0.25)",
                              shadowColor: "#9333EA",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.3,
                              shadowRadius: 4,
                              elevation: 4,
                            }}
                          >
                            <Text
                              className={`font-semibold text-sm tracking-wide ${
                                formData.metalType === auctionType.id
                                  ? "text-purple-200"
                                  : "text-purple-300"
                              }`}
                            >
                              {auctionType.name}
                            </Text>
                          </Box>
                        </Pressable>
                      ))}
                    </HStack>
                  </VStack>
                </VStack>
              </Box>
            </VStack>

            {/* Item Details */}
            <VStack space="lg">
              <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                품목 상세
              </Text>

              <Box
                className="rounded-2xl p-6"
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
                <VStack space="md">
                  <VStack>
                    <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
                      중량
                    </Text>
                    <Input
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        borderRadius: 16,
                        overflow: "hidden",
                      }}
                    >
                      <InputField
                        placeholder="킬로그램 단위로 입력"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.weight}
                        onChangeText={(text) =>
                          setFormData({ ...formData, weight: text })
                        }
                        style={{
                          color: "white",
                          fontSize: 16,
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                        keyboardType="numeric"
                      />
                    </Input>
                  </VStack>

                  <VStack>
                    <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
                      순도 (%)
                    </Text>
                    <Input
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        borderRadius: 16,
                        overflow: "hidden",
                      }}
                    >
                      <InputField
                        placeholder="순도를 입력하세요 (예: 99)"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.purity}
                        onChangeText={(text) =>
                          setFormData({ ...formData, purity: text })
                        }
                        style={{
                          color: "white",
                          fontSize: 16,
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                        keyboardType="numeric"
                      />
                    </Input>
                  </VStack>

                  <VStack>
                    <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
                      시작가
                    </Text>
                    <Input
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        borderRadius: 16,
                        overflow: "hidden",
                      }}
                    >
                      <InputField
                        placeholder="시작가를 입력하세요"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.startPrice}
                        onChangeText={(text) =>
                          setFormData({ ...formData, startPrice: text })
                        }
                        style={{
                          color: "white",
                          fontSize: 16,
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                        keyboardType="numeric"
                      />
                    </Input>
                  </VStack>
                </VStack>
              </Box>
            </VStack>

            {/* Additional Information */}
            <VStack space="lg">
              <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                추가 정보
              </Text>

              <Box
                className="rounded-2xl p-6"
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
                <VStack space="md">
                  <VStack>
                    <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
                      설명
                    </Text>
                    <Input
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        borderRadius: 16,
                        overflow: "hidden",
                      }}
                    >
                      <InputField
                        placeholder="품목에 대한 상세 설명을 입력하세요"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.description}
                        onChangeText={(text) =>
                          setFormData({ ...formData, description: text })
                        }
                        style={{
                          color: "white",
                          fontSize: 16,
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                        multiline
                        numberOfLines={3}
                      />
                    </Input>
                  </VStack>

                  <VStack>
                    <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
                      위치
                    </Text>
                    <Input
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        borderRadius: 16,
                        overflow: "hidden",
                      }}
                    >
                      <InputField
                        placeholder="품목 위치를 입력하세요"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.location}
                        onChangeText={(text) =>
                          setFormData({ ...formData, location: text })
                        }
                        style={{
                          color: "white",
                          fontSize: 16,
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                        }}
                      />
                    </Input>
                  </VStack>
                </VStack>
              </Box>
            </VStack>

            {/* Create Button */}
            <VStack space="md">
              <Button
                className="rounded-2xl"
                onPress={handleCreate}
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                  borderColor: "rgba(34, 197, 94, 0.3)",
                  borderRadius: 18,
                  borderWidth: 1.5,
                  shadowColor: "#22C55E",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 12,
                  minHeight: 56,
                }}
              >
                <ButtonText className="font-bold text-green-300 tracking-wide text-base">
                  경매 등록
                </ButtonText>
              </Button>
            </VStack>
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
