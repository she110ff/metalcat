import React, { useState, useEffect } from "react";
import { Alert, Platform } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { machineryProductTypes } from "@/data";
import { MachineryProductType } from "@/data/types";
import { PhotoPicker, PhotoInfo } from "@/components/PhotoPicker";

export default function MachineryAuctionCreate() {
  const router = useRouter();
  const { slaveUserId, slaveName } = useLocalSearchParams();

  console.log("📥 [중고기계 1단계] URL 파라미터 확인:", {
    slaveUserId,
    slaveName,
  });
  const [selectedProductType, setSelectedProductType] =
    useState<MachineryProductType | null>(null);
  const [productName, setProductName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [modelName, setModelName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit] = useState("대"); // 고정된 단위

  // 빈 상태로 시작 - 사용자가 직접 사진을 선택해야 함
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);

  const handleBack = () => {
    router.back();
  };

  const handleProductTypeSelect = (productType: MachineryProductType) => {
    // 토글 기능: 같은 종류를 다시 클릭하면 선택 해제
    if (selectedProductType?.id === productType.id) {
      setSelectedProductType(null);
    } else {
      setSelectedProductType(productType);
    }
  };

  // 진행하기 버튼 활성화 조건 체크
  const isNextButtonEnabled = () => {
    const quantityValue = parseFloat(quantity);
    return (
      selectedProductType !== null &&
      productName.trim() !== "" &&
      manufacturer.trim() !== "" &&
      modelName.trim() !== "" &&
      quantity.trim() !== "" &&
      !isNaN(quantityValue) &&
      quantityValue >= 1 &&
      photos.length >= 3
    );
  };

  const handleNext = () => {
    console.log("handleNext 호출됨");
    console.log("selectedProductType:", selectedProductType);
    console.log("productName:", productName);
    console.log("quantity:", quantity);
    console.log("photos.length:", photos.length);

    if (!selectedProductType) {
      Alert.alert("알림", "기계 종류를 선택해주세요.");
      return;
    }
    if (!productName.trim()) {
      Alert.alert("알림", "제품명을 입력해주세요.");
      return;
    }
    if (!manufacturer.trim()) {
      Alert.alert("알림", "제조사를 입력해주세요.");
      return;
    }
    if (!modelName.trim()) {
      Alert.alert("알림", "모델명을 입력해주세요.");
      return;
    }
    if (!quantity.trim()) {
      Alert.alert("알림", "수량을 입력해주세요.");
      return;
    }

    const quantityValue = parseFloat(quantity);
    if (isNaN(quantityValue) || quantityValue < 1) {
      Alert.alert("입력 오류", "수량은 1개 이상이어야 합니다.");
      return;
    }
    if (photos.length < 3) {
      Alert.alert("알림", "사진을 최소 3장 이상 등록해주세요.");
      return;
    }

    console.log("다음 화면으로 이동 시도");

    // 첫 번째 단계 데이터를 쿼리 파라미터로 전달
    const firstStepData = {
      productType: selectedProductType,
      productName: productName.trim(),
      manufacturer: manufacturer.trim(),
      modelName: modelName.trim(),
      quantity: quantityValue,
      unit: unit,
      photos: photos,
    };

    // URL params를 통해 데이터 전달
    const params = new URLSearchParams({
      firstStepData: JSON.stringify(firstStepData),
    });

    // 슬레이브 유저 파라미터가 있으면 추가
    if (slaveUserId) {
      params.append("slaveUserId", slaveUserId as string);
    }
    if (slaveName) {
      params.append("slaveName", slaveName as string);
    }

    console.log("🔗 [중고기계 1단계] 다음 단계로 이동:", {
      slaveUserId,
      slaveName,
      finalUrl: `/auction-create/machinery/additional-info?${params.toString()}`,
    });

    // 다음 화면으로 이동 (추가 정보 입력)
    router.push(
      `/auction-create/machinery/additional-info?${params.toString()}`
    );
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <KeyboardAwareScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={20}
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
                  중고기계 경매 등록
                </Text>

                {/* 오른쪽 여백 (대칭을 위해) */}
                <Box style={{ width: Platform.OS === "ios" ? 60 : 44 }} />
              </HStack>
            </VStack>

            {/* 기계 종류 선택 */}
            <VStack space="lg">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                기계 종류 선택
              </Text>

              <VStack space="md">
                {selectedProductType ? (
                  // 선택된 기계만 표시
                  <Pressable
                    onPress={() => handleProductTypeSelect(selectedProductType)}
                  >
                    <Box
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: "rgba(147, 51, 234, 0.2)",
                        borderWidth: 1,
                        borderColor: "rgba(147, 51, 234, 0.5)",
                      }}
                    >
                      <HStack className="items-center justify-between">
                        <VStack className="flex-1">
                          <Text
                            className="text-white font-bold text-base"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            {selectedProductType.name}
                          </Text>
                          <Text
                            className="text-gray-400 text-sm mt-1"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            {selectedProductType.description}
                          </Text>
                        </VStack>
                        <HStack space="sm" className="items-center">
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color="#9333EA"
                          />
                          <Text
                            className="text-purple-400 text-sm"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            선택됨
                          </Text>
                        </HStack>
                      </HStack>
                    </Box>
                  </Pressable>
                ) : (
                  // 전체 기계 종류 표시
                  machineryProductTypes.map((productType) => (
                    <Pressable
                      key={productType.id}
                      onPress={() => handleProductTypeSelect(productType)}
                    >
                      <Box
                        className="rounded-xl p-4"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                          borderWidth: 1,
                          borderColor: "rgba(255, 255, 255, 0.08)",
                        }}
                      >
                        <HStack className="items-center justify-between">
                          <VStack className="flex-1">
                            <Text
                              className="text-white font-bold text-base"
                              style={{ fontFamily: "NanumGothic" }}
                            >
                              {productType.name}
                            </Text>
                            <Text
                              className="text-gray-400 text-sm mt-1"
                              style={{ fontFamily: "NanumGothic" }}
                            >
                              {productType.description}
                            </Text>
                          </VStack>
                        </HStack>
                      </Box>
                    </Pressable>
                  ))
                )}
              </VStack>
            </VStack>

            {/* 제품명 입력 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                제품명 *
              </Text>
              <Input className="bg-white/5 border-white/10 rounded-2xl min-h-14">
                <InputField
                  placeholder="예: CNC 선반, 밀링머신, 프레스 등"
                  value={productName}
                  onChangeText={setProductName}
                  className="text-white text-base px-5 py-4"
                  style={{ fontFamily: "NanumGothic" }}
                />
              </Input>
            </VStack>

            {/* 제조사 입력 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                제조사 *
              </Text>
              <Input className="bg-white/5 border-white/10 rounded-2xl min-h-14">
                <InputField
                  placeholder="제조사를 입력하세요 (예: 두산공작기계, 현대위아)"
                  value={manufacturer}
                  onChangeText={setManufacturer}
                  className="text-white text-base px-5 py-4"
                  style={{ fontFamily: "NanumGothic" }}
                />
              </Input>
            </VStack>

            {/* 모델명 입력 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                모델명 *
              </Text>
              <Input className="bg-white/5 border-white/10 rounded-2xl min-h-14">
                <InputField
                  placeholder="모델명을 입력하세요 (예: PUMA 2000, VF-2)"
                  value={modelName}
                  onChangeText={setModelName}
                  className="text-white text-base px-5 py-4"
                  style={{ fontFamily: "NanumGothic" }}
                />
              </Input>
            </VStack>

            {/* 수량 및 단위 입력 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                수량 *
              </Text>
              <HStack space="md" className="items-end">
                <Input className="bg-white/5 border-white/10 rounded-2xl min-h-14 flex-1">
                  <InputField
                    placeholder="수량을 입력하세요"
                    value={quantity}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, "");
                      const numValue = parseFloat(numericText);

                      if (
                        numericText === "" ||
                        (!isNaN(numValue) && numValue >= 0)
                      ) {
                        setQuantity(numericText);
                      }
                    }}
                    keyboardType="numeric"
                    className="text-white text-base px-5 py-4"
                    style={{ fontFamily: "NanumGothic" }}
                  />
                </Input>

                {/* 고정된 단위 표시 */}
                <Box className="pb-4">
                  <Text
                    className="text-white text-lg font-semibold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    대
                  </Text>
                </Box>
              </HStack>
            </VStack>

            {/* 사진 등록 */}
            <PhotoPicker
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={5}
              minPhotos={3}
              hasRepresentative={true}
              title="사진 등록"
              showCounter={false}
              size="medium"
              maxFileSizeMB={8}
            />

            <Text
              className="text-gray-400 text-sm text-center"
              style={{ fontFamily: "NanumGothic" }}
            >
              사진 추가 버튼을 눌러 카메라 또는 갤러리에서 선택하세요
            </Text>
          </VStack>
        </KeyboardAwareScrollView>

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
                : `진행하기 (${selectedProductType ? "✓" : "종류"} | ${
                    productName.trim() ? "✓" : "제품명"
                  } | ${manufacturer.trim() ? "✓" : "제조사"} | ${
                    modelName.trim() ? "✓" : "모델명"
                  } | ${parseFloat(quantity) >= 1 ? "✓" : "수량"} | ${
                    photos.length
                  }/3장)`}
            </ButtonText>
          </Button>
        </Box>
      </SafeAreaView>
    </LinearGradient>
  );
}
