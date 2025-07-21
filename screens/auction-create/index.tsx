import React, { useState } from "react";
import { ScrollView, Alert } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectItem,
} from "@/components/ui/select";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { useRouter } from "expo-router";

// 카테고리 데이터
const categories = [
  { id: "scrap", name: "고철", icon: "construct" },
  { id: "machinery", name: "중고기계", icon: "settings" },
  { id: "special", name: "특수금속", icon: "diamond" },
  { id: "demolition", name: "철거물", icon: "hammer" },
];

// 거래 종류
const transactionTypes = [
  { id: "normal", name: "일반 경매", duration: "72시간" },
  { id: "urgent", name: "긴급 경매", duration: "12시간" },
];

export const AuctionCreate = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    transactionType: "normal",
    weight: "",
    weightKnown: true,
    description: "",
    location: "",
    address: "",
    floor: "",
    hasElevator: false,
  });

  const router = useRouter();

  const handleNext = () => {
    if (step === 1 && (!formData.title || !formData.category)) {
      Alert.alert("입력 오류", "제목과 카테고리를 입력해주세요.");
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      // 경매 등록 완료
      Alert.alert("등록 완료", "경매가 성공적으로 등록되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView className="h-full w-full">
      <LinearGradient
        colors={["#1A1A1A", "#2D2D2D", "#404040"]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <Box className="pt-16 px-5 pb-5">
          <HStack className="items-center justify-between">
            <Pressable onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text
              className="text-xl font-black text-white"
              style={{ letterSpacing: 1 }}
            >
              경매 등록
            </Text>
            <Box className="w-6" />
          </HStack>

          {/* Progress Bar */}
          <Box className="mt-4 mb-2">
            <HStack className="space-sm">
              {[1, 2, 3].map((stepNumber) => (
                <Box
                  key={stepNumber}
                  className="flex-1 h-1 rounded-full"
                  style={{
                    backgroundColor:
                      step >= stepNumber
                        ? "rgba(255, 255, 255, 0.3)"
                        : "rgba(255, 255, 255, 0.1)",
                  }}
                />
              ))}
            </HStack>
          </Box>
          <Text
            className="text-sm text-white/60 uppercase"
            style={{ letterSpacing: 1 }}
          >
            Step {step} of 3
          </Text>
        </Box>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <VStack className="px-5 space-lg">
              <Box
                className="rounded-3xl p-6"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <Text
                  className="text-lg font-bold text-white mb-4"
                  style={{ letterSpacing: 0.5 }}
                >
                  기본 정보
                </Text>

                <VStack className="space-md">
                  <VStack>
                    <Text
                      className="text-sm font-semibold text-white/80 mb-2 uppercase"
                      style={{ letterSpacing: 1 }}
                    >
                      글 제목
                    </Text>
                    <Input className="bg-white/8 border-white/15 rounded-2xl">
                      <InputField
                        placeholder="경매 품목 제목을 입력하세요"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.title}
                        onChangeText={(text) =>
                          setFormData({ ...formData, title: text })
                        }
                        className="text-white text-base"
                      />
                    </Input>
                  </VStack>

                  <VStack>
                    <Text
                      className="text-sm font-semibold text-white/80 mb-2 uppercase"
                      style={{ letterSpacing: 1 }}
                    >
                      카테고리
                    </Text>
                    <Select
                      selectedValue={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger className="bg-white/8 border-white/15 rounded-2xl">
                        <SelectInput
                          placeholder="카테고리를 선택하세요"
                          placeholderTextColor="rgba(255, 255, 255, 0.4)"
                          className="text-white"
                        />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent className="bg-gray-800 border-white/15">
                          <SelectDragIndicatorWrapper>
                            <SelectDragIndicator />
                          </SelectDragIndicatorWrapper>
                          {categories.map((category) => (
                            <SelectItem
                              key={category.id}
                              label={category.name}
                              value={category.id}
                              className="text-white"
                            />
                          ))}
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  </VStack>

                  <VStack>
                    <Text
                      className="text-sm font-semibold text-white/80 mb-2 uppercase"
                      style={{ letterSpacing: 1 }}
                    >
                      거래 종류
                    </Text>
                    <VStack className="space-sm">
                      {transactionTypes.map((type) => (
                        <Pressable
                          key={type.id}
                          onPress={() =>
                            setFormData({
                              ...formData,
                              transactionType: type.id,
                            })
                          }
                          className={`p-4 rounded-2xl border ${
                            formData.transactionType === type.id
                              ? "bg-white/10 border-white/30"
                              : "bg-white/5 border-white/15"
                          }`}
                        >
                          <HStack className="justify-between items-center">
                            <VStack>
                              <Text className="text-white font-medium">
                                {type.name}
                              </Text>
                              <Text className="text-white/60 text-sm">
                                경매 기간: {type.duration}
                              </Text>
                            </VStack>
                            {formData.transactionType === type.id && (
                              <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color="#4CAF50"
                              />
                            )}
                          </HStack>
                        </Pressable>
                      ))}
                    </VStack>
                  </VStack>
                </VStack>
              </Box>
            </VStack>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <VStack className="px-5 space-lg">
              <Box
                className="rounded-3xl p-6"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.12)",
                }}
              >
                <Text
                  className="text-lg font-bold text-white mb-4"
                  style={{ letterSpacing: 0.5 }}
                >
                  상세 정보
                </Text>

                <VStack className="space-md">
                  <VStack>
                    <Text
                      className="text-sm font-semibold text-white/80 mb-2 uppercase"
                      style={{ letterSpacing: 1 }}
                    >
                      중량 (kg)
                    </Text>
                    <Input className="bg-white/8 border-white/15 rounded-2xl">
                      <InputField
                        placeholder="예상 중량을 입력하세요"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.weight}
                        onChangeText={(text) =>
                          setFormData({ ...formData, weight: text })
                        }
                        className="text-white text-base"
                        keyboardType="numeric"
                      />
                    </Input>
                  </VStack>

                  <VStack>
                    <Text
                      className="text-sm font-semibold text-white/80 mb-2 uppercase"
                      style={{ letterSpacing: 1 }}
                    >
                      상세 설명
                    </Text>
                    <Input className="bg-white/8 border-white/15 rounded-2xl">
                      <InputField
                        placeholder="품목에 대한 상세한 설명을 입력하세요"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.description}
                        onChangeText={(text) =>
                          setFormData({ ...formData, description: text })
                        }
                        className="text-white text-base"
                        multiline
                        numberOfLines={4}
                      />
                    </Input>
                  </VStack>
                </VStack>
              </Box>
            </VStack>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <VStack className="px-5 space-lg">
              <Box
                className="rounded-3xl p-6"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.12)",
                }}
              >
                <Text
                  className="text-lg font-bold text-white mb-4"
                  style={{ letterSpacing: 0.5 }}
                >
                  위치 정보
                </Text>

                <VStack className="space-md">
                  <VStack>
                    <Text
                      className="text-sm font-semibold text-white/80 mb-2 uppercase"
                      style={{ letterSpacing: 1 }}
                    >
                      주소
                    </Text>
                    <Input className="bg-white/8 border-white/15 rounded-2xl">
                      <InputField
                        placeholder="상세 주소를 입력하세요"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.address}
                        onChangeText={(text) =>
                          setFormData({ ...formData, address: text })
                        }
                        className="text-white text-base"
                      />
                    </Input>
                  </VStack>

                  <VStack>
                    <Text
                      className="text-sm font-semibold text-white/80 mb-2 uppercase"
                      style={{ letterSpacing: 1 }}
                    >
                      층수
                    </Text>
                    <Input className="bg-white/8 border-white/15 rounded-2xl">
                      <InputField
                        placeholder="예: 3층, 지하 1층"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={formData.floor}
                        onChangeText={(text) =>
                          setFormData({ ...formData, floor: text })
                        }
                        className="text-white text-base"
                      />
                    </Input>
                  </VStack>
                </VStack>
              </Box>
            </VStack>
          )}

          {/* Navigation Buttons */}
          <VStack className="px-5 pb-20 space-md">
            <Button
              className="w-full"
              onPress={handleNext}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: 16,
                borderWidth: 1,
              }}
            >
              <ButtonText className="font-medium text-white">
                {step === 3 ? "경매 등록 완료" : "다음"}
              </ButtonText>
            </Button>

            {step > 1 && (
              <Button
                variant="outline"
                className="w-full"
                onPress={handleBack}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: 16,
                }}
              >
                <ButtonText className="font-medium text-white">이전</ButtonText>
              </Button>
            )}
          </VStack>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};
