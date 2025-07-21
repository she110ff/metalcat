import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
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

  const MetalButton = ({
    metal,
    isSelected,
    onPress,
  }: {
    metal: string;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <Pressable onPress={onPress} className="flex-1">
      <Box
        className={`rounded-md p-3 items-center border ${
          isSelected
            ? "bg-white/10 border-white/30"
            : "bg-white/5 border-white/15"
        }`}
      >
        <Text
          className={`text-sm ${
            isSelected
              ? "font-semibold text-white"
              : "font-medium text-white/80"
          }`}
        >
          {metal}
        </Text>
      </Box>
    </Pressable>
  );

  return (
    <SafeAreaView className="h-full w-full">
      <LinearGradient
        colors={["#1A1A1A", "#2D2D2D", "#404040"]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <Box className="pt-16 px-5 pb-5">
          <HStack className="items-center justify-between">
            <Pressable onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text
              className="text-xl font-black text-white"
              style={{ letterSpacing: 1 }}
            >
              가격 계산기
            </Text>
            <Box className="w-6" />
          </HStack>
        </Box>

        <ScrollView showsVerticalScrollIndicator={false}>
          <VStack className="px-5 space-lg">
            {/* Metal Selection */}
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
                금속 종류 선택
              </Text>

              <VStack className="space-sm">
                <HStack className="space-sm">
                  <MetalButton
                    metal="구리"
                    isSelected={selectedMetal === "구리"}
                    onPress={() => setSelectedMetal("구리")}
                  />
                  <MetalButton
                    metal="알루미늄"
                    isSelected={selectedMetal === "알루미늄"}
                    onPress={() => setSelectedMetal("알루미늄")}
                  />
                  <MetalButton
                    metal="아연"
                    isSelected={selectedMetal === "아연"}
                    onPress={() => setSelectedMetal("아연")}
                  />
                </HStack>
                <HStack className="space-sm">
                  <MetalButton
                    metal="납"
                    isSelected={selectedMetal === "납"}
                    onPress={() => setSelectedMetal("납")}
                  />
                  <MetalButton
                    metal="금"
                    isSelected={selectedMetal === "금"}
                    onPress={() => setSelectedMetal("금")}
                  />
                  <MetalButton
                    metal="은"
                    isSelected={selectedMetal === "은"}
                    onPress={() => setSelectedMetal("은")}
                  />
                </HStack>
                <HStack className="space-sm">
                  <MetalButton
                    metal="백금"
                    isSelected={selectedMetal === "백금"}
                    onPress={() => setSelectedMetal("백금")}
                  />
                  <Box className="flex-1" />
                  <Box className="flex-1" />
                </HStack>
              </VStack>
            </Box>

            {/* Input Fields */}
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
                계산 정보
              </Text>

              <VStack className="space-md">
                <VStack>
                  <Text
                    className="text-sm font-semibold text-white/80 mb-2 uppercase"
                    style={{ letterSpacing: 1 }}
                  >
                    중량
                  </Text>
                  <Input className="bg-white/8 border-white/15 rounded-2xl">
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
                    순도 (%)
                  </Text>
                  <Input className="bg-white/8 border-white/15 rounded-2xl">
                    <InputField
                      placeholder="순도를 입력하세요 (예: 99)"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={purity}
                      onChangeText={setPurity}
                      className="text-white text-base"
                      keyboardType="numeric"
                    />
                  </Input>
                </VStack>

                <HStack className="space-md">
                  <Button
                    className="flex-1"
                    onPress={calculate}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      borderRadius: 16,
                      borderWidth: 1,
                    }}
                  >
                    <ButtonText className="font-medium text-white">
                      계산하기
                    </ButtonText>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1"
                    onPress={reset}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: 16,
                    }}
                  >
                    <ButtonText className="font-medium text-white">
                      초기화
                    </ButtonText>
                  </Button>
                </HStack>
              </VStack>
            </Box>

            {/* Result */}
            {result && (
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
                  계산 결과
                </Text>

                <VStack className="space-md">
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

            {/* Price Info */}
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
                현재 시세 정보
              </Text>

              <VStack className="space-sm">
                {Object.entries(metalPrices).map(([metal, info]) => (
                  <HStack
                    key={metal}
                    className="justify-between items-center py-2"
                  >
                    <Text className="text-white/80">{metal}</Text>
                    <Text className="text-white font-semibold">
                      ${info.price} {info.unit}
                    </Text>
                  </HStack>
                ))}
              </VStack>

              <Text className="text-xs text-white/60 mt-4 text-center">
                * 시세는 실시간으로 변동될 수 있습니다
              </Text>
            </Box>
          </VStack>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};
