import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
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

interface CalculationResult {
  metalType: string;
  weight: number;
  purity: number;
  pricePerUnit: number;
  totalValue: number;
}

export const Calculator = () => {
  const [selectedMetal, setSelectedMetal] = useState("구리");
  const [weight, setWeight] = useState("");
  const [purity, setPurity] = useState("99");
  const [result, setResult] = useState<CalculationResult | null>(null);

  const router = useRouter();

  const metalPrices: { [key: string]: { price: number; unit: string } } = {
    구리: { price: 9.25, unit: "$/kg" },
    알루미늄: { price: 2.34, unit: "$/kg" },
    아연: { price: 2.89, unit: "$/kg" },
    납: { price: 2.16, unit: "$/kg" },
    금: { price: 65.8, unit: "$/g" },
    은: { price: 0.8, unit: "$/g" },
    백금: { price: 32.9, unit: "$/g" },
  };

  const calculate = () => {
    if (!weight || !purity) return;

    const metalPrice = metalPrices[selectedMetal];
    const weightNum = parseFloat(weight);
    const purityNum = parseFloat(purity);

    if (isNaN(weightNum) || isNaN(purityNum)) return;

    const adjustedPrice = metalPrice.price * (purityNum / 100);
    const totalValue =
      selectedMetal === "금" ||
      selectedMetal === "은" ||
      selectedMetal === "백금"
        ? adjustedPrice * weightNum // 귀금속은 그램 단위
        : adjustedPrice * weightNum; // 기본 금속은 킬로그램 단위

    setResult({
      metalType: selectedMetal,
      weight: weightNum,
      purity: purityNum,
      pricePerUnit: adjustedPrice,
      totalValue,
    });
  };

  const reset = () => {
    setWeight("");
    setPurity("99");
    setResult(null);
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
            <VStack className="items-center">
              <Text
                className="text-white text-2xl font-black uppercase text-center"
                style={{
                  fontFamily: "SpaceMono",
                  textShadowColor: "rgba(255, 255, 255, 0.4)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                  letterSpacing: 6,
                  fontWeight: "900",
                  color: "#F8FAFC",
                }}
              >
                CALCULATOR
              </Text>
            </VStack>
            {/* Metal Selection */}
            <Box
              className="rounded-3xl p-6 mt-10"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              <Text
                className="text-yellow-300 text-xl font-black tracking-[2px] uppercase mb-4"
                style={{ fontFamily: "NanumGothic" }}
              >
                금속 종류
              </Text>

              <VStack className="space-sm">
                <Select
                  selectedValue={selectedMetal}
                  onValueChange={(value) => setSelectedMetal(value)}
                >
                  <SelectTrigger
                    className="rounded-2xl"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <SelectInput
                      placeholder="금속을 선택하세요"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      className="text-white text-base"
                    />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent
                      className="rounded-2xl"
                      style={{
                        backgroundColor: "rgba(26, 26, 26, 0.95)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      {Object.keys(metalPrices).map((metal) => (
                        <SelectItem
                          key={metal}
                          label={metal}
                          value={metal}
                          className="py-3"
                        >
                          <Text className="text-white text-base">{metal}</Text>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </VStack>
            </Box>

            {/* Input Fields */}
            <Box
              className="rounded-3xl p-6"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              <Text
                className="text-yellow-300 text-xl font-black tracking-[2px] uppercase mb-4"
                style={{ fontFamily: "NanumGothic" }}
              >
                계산 정보
              </Text>

              <VStack className="space-lg">
                <VStack className="space-sm">
                  <Text
                    className="text-white/80 text-sm font-semibold uppercase tracking-[1px]"
                    style={{ fontFamily: "NanumGothic" }}
                  >
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
                      placeholder={
                        selectedMetal === "금" ||
                        selectedMetal === "은" ||
                        selectedMetal === "백금"
                          ? "그램 단위로 입력"
                          : "킬로그램 단위로 입력"
                      }
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={weight}
                      onChangeText={setWeight}
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

                <VStack className="space-sm mt-2">
                  <Text
                    className="text-white/80 text-sm font-semibold uppercase tracking-[1px]"
                    style={{ fontFamily: "NanumGothic" }}
                  >
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
                      value={purity}
                      onChangeText={setPurity}
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

                <VStack className="space-md mt-4">
                  <HStack>
                    <Button
                      className="flex-1"
                      onPress={calculate}
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
                        marginRight: 16,
                      }}
                    >
                      <ButtonText className="font-bold text-green-300 tracking-wide text-base">
                        계산하기
                      </ButtonText>
                    </Button>

                    <Button
                      variant="outline"
                      className="flex-1"
                      onPress={reset}
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        borderColor: "rgba(255, 255, 255, 0.12)",
                        borderRadius: 16,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        elevation: 6,
                        minHeight: 56,
                      }}
                    >
                      <ButtonText className="font-semibold text-white/70 tracking-wide text-sm">
                        초기화
                      </ButtonText>
                    </Button>
                  </HStack>
                </VStack>
              </VStack>
            </Box>

            {/* Result */}
            {result && (
              <Box
                className="rounded-3xl p-6"
                style={{
                  backgroundColor: "rgba(147, 51, 234, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(147, 51, 234, 0.15)",
                  shadowColor: "#9333EA",
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.4,
                  shadowRadius: 24,
                  elevation: 12,
                }}
              >
                <Text className="text-purple-300 text-xl font-black tracking-[2px] uppercase mb-4">
                  계산 결과
                </Text>

                <VStack className="space-sm">
                  <HStack className="justify-between items-center">
                    <Text className="text-white/80">금속 종류:</Text>
                    <Text className="text-white font-semibold">
                      {result.metalType}
                    </Text>
                  </HStack>

                  <HStack className="justify-between items-center">
                    <Text className="text-white/80">중량:</Text>
                    <Text className="text-white font-semibold">
                      {result.weight}{" "}
                      {result.metalType === "금" ||
                      result.metalType === "은" ||
                      result.metalType === "백금"
                        ? "g"
                        : "kg"}
                    </Text>
                  </HStack>

                  <HStack className="justify-between items-center">
                    <Text className="text-white/80">순도:</Text>
                    <Text className="text-white font-semibold">
                      {result.purity}%
                    </Text>
                  </HStack>

                  <HStack className="justify-between items-center">
                    <Text className="text-white/80">단가:</Text>
                    <Text className="text-white font-semibold">
                      ${result.pricePerUnit.toFixed(2)}{" "}
                      {metalPrices[result.metalType].unit}
                    </Text>
                  </HStack>

                  <Box className="border-t border-white/20 pt-4">
                    <HStack className="justify-between items-center">
                      <Text className="text-lg font-bold text-white">
                        총 가치:
                      </Text>
                      <Text className="text-2xl font-black text-green-400">
                        ${result.totalValue.toFixed(2)}
                      </Text>
                    </HStack>
                  </Box>
                </VStack>
              </Box>
            )}
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
