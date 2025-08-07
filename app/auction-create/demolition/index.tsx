import React, { useState, useEffect } from "react";
import { Alert, ScrollView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { demolitionProductTypes } from "@/data";
import { PhotoPicker, PhotoInfo } from "@/components/PhotoPicker";
import { demolitionSpecificOptions } from "@/data/auction/sample-data";

export default function DemolitionAuctionCreate() {
  const router = useRouter();

  const [demolitionArea, setDemolitionArea] = useState("100");
  const [areaUnit, setAreaUnit] = useState<"sqm" | "pyeong">("sqm");

  // 빈 상태로 시작 - 사용자가 직접 사진을 선택해야 함
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);

  const handleBack = () => {
    router.back();
  };

  const handleAreaUnitSelect = (unit: "sqm" | "pyeong") => {
    setAreaUnit(unit);
  };

  // 진행하기 버튼 활성화 조건 체크
  const isNextButtonEnabled = () => {
    const areaValue = parseFloat(demolitionArea);
    return (
      demolitionArea.trim() !== "" &&
      !isNaN(areaValue) &&
      areaValue >= 10 &&
      photos.length >= 3
    );
  };

  const handleNext = () => {
    console.log("handleNext 호출됨");
    console.log("demolitionArea:", demolitionArea);
    console.log("areaUnit:", areaUnit);
    console.log("photos.length:", photos.length);
    if (!demolitionArea.trim()) {
      Alert.alert("알림", "철거 면적을 입력해주세요.");
      return;
    }

    const areaValue = parseFloat(demolitionArea);
    if (isNaN(areaValue) || areaValue < 10) {
      Alert.alert("입력 오류", "철거 면적은 10㎡ 이상이어야 합니다.");
      return;
    }
    if (photos.length < 3) {
      Alert.alert("알림", "사진을 최소 3장 이상 등록해주세요.");
      return;
    }

    console.log("다음 화면으로 이동 시도");

    // 첫 번째 단계 데이터를 쿼리 파라미터로 전달 (기본 철거 종류는 건축물)
    const firstStepData = {
      productType: demolitionProductTypes[0], // 기본값: 건축물
      demolitionArea: areaValue,
      areaUnit: areaUnit,
      photos: photos,
    };

    // URL params를 통해 데이터 전달
    const params = new URLSearchParams({
      firstStepData: JSON.stringify(firstStepData),
    });

    // 다음 화면으로 이동 (추가 정보 입력)
    router.push(
      `/auction-create/demolition/additional-info?${params.toString()}`
    );
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
                {/* 모바일 표준 뒤로가기 버튼 */}
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
                    <Ionicons
                      name={
                        Platform.OS === "ios" ? "chevron-back" : "arrow-back"
                      }
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
                  철거 경매 등록
                </Text>

                {/* 오른쪽 여백 (대칭을 위해) */}
                <Box style={{ width: Platform.OS === "ios" ? 60 : 44 }} />
              </HStack>
            </VStack>

            {/* 면적 단위 선택 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                면적 단위
              </Text>
              <HStack space="md">
                {demolitionSpecificOptions.areaUnit.map((unit) => (
                  <Pressable
                    key={unit.id}
                    onPress={() =>
                      handleAreaUnitSelect(unit.id as "sqm" | "pyeong")
                    }
                    className="flex-1"
                  >
                    <Box
                      className={`rounded-xl p-4 items-center border ${
                        areaUnit === unit.id
                          ? "bg-purple-600/20 border-purple-500"
                          : "bg-white/5 border-white/20"
                      }`}
                    >
                      <Text
                        className="text-white font-medium text-sm"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        {unit.label}
                      </Text>
                      <Text
                        className="text-gray-400 text-xs mt-1"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        {unit.description}
                      </Text>
                    </Box>
                  </Pressable>
                ))}
              </HStack>
            </VStack>

            {/* 철거 면적 입력 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                철거 면적 ({areaUnit === "sqm" ? "㎡" : "평"})
              </Text>
              <Input className="bg-white/5 border-white/10 rounded-2xl min-h-14">
                <InputField
                  placeholder={`철거 면적을 입력하세요 (최소 10${
                    areaUnit === "sqm" ? "㎡" : "평"
                  })`}
                  value={demolitionArea}
                  onChangeText={(text) => {
                    // 숫자와 소수점만 허용
                    const numericText = text.replace(/[^0-9.]/g, "");
                    const numValue = parseFloat(numericText);

                    // 빈 문자열이거나 유효한 숫자인 경우에만 업데이트
                    if (
                      numericText === "" ||
                      (!isNaN(numValue) && numValue >= 0)
                    ) {
                      setDemolitionArea(numericText);
                    }
                  }}
                  keyboardType="numeric"
                  className="text-white text-base px-5 py-4"
                  style={{ fontFamily: "NanumGothic" }}
                />
              </Input>
            </VStack>

            {/* 사진 등록 */}
            <PhotoPicker
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={5}
              minPhotos={3}
              hasRepresentative={true}
              title="현장 사진 등록"
              showCounter={false}
              size="medium"
            />
          </VStack>
        </ScrollView>

        {/* 하단 진행 버튼 */}
        <Box className="p-6">
          <Button
            variant="solid"
            onPress={handleNext}
            className="w-full"
            style={{
              backgroundColor: isNextButtonEnabled()
                ? "rgba(147, 51, 234, 0.9)"
                : "rgba(107, 114, 128, 0.5)",
            }}
            disabled={!isNextButtonEnabled()}
          >
            <ButtonText
              className="text-white font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              {isNextButtonEnabled()
                ? `진행하기 ✓`
                : `진행하기 (${
                    parseFloat(demolitionArea) >= 10 ? "✓" : "면적"
                  } | ${photos.length}/3장)`}
            </ButtonText>
          </Button>
        </Box>
      </SafeAreaView>
    </LinearGradient>
  );
}
