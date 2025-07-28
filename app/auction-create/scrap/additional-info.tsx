import React, { useState, useEffect } from "react";
import { ScrollView, Alert, Platform, View } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { Pressable } from "@/components/ui/pressable";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import {
  DaumAddressSearch,
  DaumAddressResult,
} from "@/components/DaumAddressSearch";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";

export default function AdditionalInfoScreen() {
  const [title, setTitle] = useState("");
  const [transactionType, setTransactionType] = useState<"normal" | "urgent">(
    "normal"
  );
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [selectedAddress, setSelectedAddress] =
    useState<DaumAddressResult | null>(null);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [accessibility, setAccessibility] = useState<
    "easy" | "normal" | "difficult"
  >("normal");
  const [transportCondition, setTransportCondition] = useState<
    "buyer" | "negotiable" | "seller"
  >("buyer");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 필수 입력 항목 완성도 체크
  const checkRequiredFields = () => {
    const isComplete =
      title.trim() !== "" &&
      address.trim() !== "" &&
      (address ? addressDetail.trim() !== "" : true) &&
      description.trim() !== "";

    return isComplete;
  };

  const [isFormComplete, setIsFormComplete] = useState(false);

  // 폼 완성도 실시간 체크
  useEffect(() => {
    const complete = checkRequiredFields();
    setIsFormComplete(complete);
    console.log("📋 폼 완성도 체크:", {
      title: title.trim() !== "",
      address: address.trim() !== "",
      addressDetail: address ? addressDetail.trim() !== "" : true,
      description: description.trim() !== "",
      isComplete: complete,
    });
  }, [title, address, addressDetail, description]);

  // 개발용 샘플 데이터 채우기
  const fillSampleData = () => {
    setTitle("고품질 구리파이프 대량 판매");
    setAddress("서울특별시 강남구 테헤란로 123");
    setAddressDetail("메탈캣빌딩 1층");
    setDescription(
      "구리파이프 약 50kg 정도입니다. 상태가 매우 깨끗하고 트럭 접근이 용이합니다. 포장이 필요하지 않으며 즉시 운반 가능합니다."
    );
    setAccessibility("easy");
    setTransportCondition("buyer");
  };

  // 주소 검색 상태 디버깅
  useEffect(() => {
    console.log("🎯 주소 검색 상태 변경됨:", showAddressSearch);
  }, [showAddressSearch]);

  const handleBack = () => {
    router.back();
  };

  const openAddressModal = () => {
    console.log("🏠 다음 주소 검색 열기");
    setShowAddressSearch(true);
  };

  const handleAddressComplete = (result: DaumAddressResult) => {
    console.log("🎉 주소 선택 완료:", result);
    setSelectedAddress(result);
    // 도로명주소를 우선으로 사용, 없으면 지번주소 사용
    setAddress(result.roadAddress || result.jibunAddress || result.address);
    setShowAddressSearch(false);
  };

  const handleAddressClose = () => {
    console.log("🚪 주소 검색 닫기");
    setShowAddressSearch(false);
  };

  // 경매 등록 처리
  const handleSubmit = async () => {
    if (!checkRequiredFields()) {
      Alert.alert("입력 확인", "모든 필수 항목을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 경매 데이터 구성
      const auctionData = {
        title: title.trim(),
        transactionType,
        accessibility,
        transportCondition,
        address: address.trim(),
        addressDetail: addressDetail.trim(),
        description: description.trim(),
        selectedAddress,
        createdAt: new Date().toISOString(),
      };

      console.log("💾 경매 데이터 저장:", auctionData);

      // 실제로는 API 호출이나 로컬 스토리지 저장
      // await saveAuctionData(auctionData);

      // 성공 메시지
      Alert.alert("등록 완료", "경매가 성공적으로 등록되었습니다!", [
        {
          text: "확인",
          onPress: () => {
            // 경매 목록 화면으로 이동
            router.push("/(tabs)/auction");
          },
        },
      ]);
    } catch (error) {
      console.error("❌ 경매 등록 오류:", error);
      Alert.alert(
        "오류",
        "경매 등록 중 문제가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
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
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="flex-1 px-6 py-6">
            {/* 헤더 */}
            <HStack className="items-center justify-between mb-8">
              <HStack className="items-center space-x-3">
                <Ionicons name="add-circle" size={28} color="#FCD34D" />
                <Text
                  className="text-white text-2xl font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  경매 등록 완성하기
                </Text>
              </HStack>

              {/* 개발용 샘플 데이터 버튼 */}
              {__DEV__ && (
                <Pressable
                  onPress={fillSampleData}
                  className="bg-blue-600/20 border border-blue-500/30 rounded-lg px-3 py-2"
                >
                  <Text
                    className="text-blue-300 text-xs font-semibold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    샘플 데이터
                  </Text>
                </Pressable>
              )}
            </HStack>

            {/* 필수 입력 안내 */}
            <Box className="bg-red-600/10 border border-red-500/30 rounded-2xl p-4 mb-6">
              <HStack className="items-center space-x-3">
                <Ionicons name="alert-circle" size={20} color="#F87171" />
                <VStack className="flex-1" space="xs">
                  <Text
                    className="text-red-300 font-bold text-base"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    모든 항목 입력 필수
                  </Text>
                  <Text
                    className="text-red-200 text-sm leading-5"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    높은 품질의 경매를 위해 모든 항목을 빠짐없이 입력해주세요.
                    완성도 높은 정보가 더 좋은 거래 결과를 만듭니다.
                  </Text>
                </VStack>
              </HStack>
            </Box>

            <VStack space="xl" className="flex-1">
              {/* 전화번호 노출 안내 */}
              <VStack space="md">
                <HStack className="items-center space-x-3">
                  <Ionicons name="call" size={20} color="#FCD34D" />
                  <Text
                    className="text-yellow-300 text-lg font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    안전한 거래 연결
                  </Text>
                </HStack>
                <Box className="bg-blue-600/20 border border-blue-500/30 rounded-2xl p-5">
                  <HStack className="items-center space-x-3">
                    <Ionicons
                      name="information-circle"
                      size={24}
                      color="#60A5FA"
                    />
                    <VStack className="flex-1" space="xs">
                      <Text
                        className="text-blue-200 font-bold text-base"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        구매자와 직접 소통 가능
                      </Text>
                      <Text
                        className="text-blue-300 text-sm leading-5"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        신뢰할 수 있는 거래를 위해 연락처가 낙찰된 구매자에게만
                        공개됩니다.
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              </VStack>

              {/* 글 제목 */}
              <VStack space="md" className="mt-8">
                <HStack className="items-center space-x-3">
                  <Ionicons name="create" size={20} color="#FCD34D" />
                  <Text
                    className="text-yellow-300 text-lg font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    매력적인 제목 작성
                  </Text>
                  <Text className="text-red-400 text-lg font-bold">*</Text>
                </HStack>
                <Input className="bg-white/5 border-white/10 rounded-2xl min-h-14">
                  <InputField
                    placeholder="구매자의 관심을 끌 수 있는 제목을 작성해보세요"
                    value={title}
                    onChangeText={setTitle}
                    className="text-white text-base px-5 py-4"
                    style={{ fontFamily: "NanumGothic" }}
                  />
                </Input>
              </VStack>

              {/* 거래 종류 */}
              <VStack space="md" className="mt-8">
                <HStack className="items-center space-x-3">
                  <Ionicons name="time" size={20} color="#FCD34D" />
                  <Text
                    className="text-yellow-300 text-lg font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    경매 진행 방식
                  </Text>
                  <Text className="text-red-400 text-lg font-bold">*</Text>
                </HStack>
                <HStack space="md">
                  <Pressable
                    onPress={() => setTransactionType("normal")}
                    className="flex-1"
                  >
                    <Box
                      className={`rounded-2xl p-5 items-center border-2 min-h-20 justify-center ${
                        transactionType === "normal"
                          ? "bg-purple-600/20 border-purple-500"
                          : "bg-white/5 border-white/20"
                      }`}
                    >
                      <Text
                        className="text-white font-bold text-base mb-1"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        표준 경매
                      </Text>
                      <Text
                        className="text-gray-400 text-sm"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        충분한 검토 시간
                      </Text>
                    </Box>
                  </Pressable>

                  <Pressable
                    onPress={() => setTransactionType("urgent")}
                    className="flex-1"
                  >
                    <Box
                      className={`rounded-2xl p-5 items-center border-2 min-h-20 justify-center ${
                        transactionType === "urgent"
                          ? "bg-red-500/20 border-red-500"
                          : "bg-white/5 border-white/20"
                      }`}
                    >
                      <Text
                        className="text-white font-bold text-base mb-1"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        빠른 경매
                      </Text>
                      <Text
                        className="text-gray-400 text-sm"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        신속한 거래 완료
                      </Text>
                    </Box>
                  </Pressable>
                </HStack>
              </VStack>

              {/* 판매 조건 설정 */}
              <VStack space="md" className="mt-8">
                <HStack className="items-center space-x-3">
                  <Ionicons name="settings" size={20} color="#FCD34D" />
                  <Text
                    className="text-yellow-300 text-lg font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    판매 조건 설정
                  </Text>
                  <Text className="text-red-400 text-lg font-bold">*</Text>
                </HStack>

                {/* 현장 접근성 */}
                <VStack space="sm">
                  <HStack className="items-center space-x-2">
                    <Text
                      className="text-white font-semibold text-base"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      현장 접근성
                    </Text>
                    <Text className="text-red-400 text-sm font-bold">*</Text>
                  </HStack>
                  <HStack space="md">
                    <Pressable
                      onPress={() => setAccessibility("easy")}
                      className="flex-1"
                    >
                      <Box
                        className={`rounded-xl p-4 items-center border ${
                          accessibility === "easy"
                            ? "bg-green-600/20 border-green-500"
                            : "bg-white/5 border-white/20"
                        }`}
                      >
                        <Text
                          className="text-white font-medium text-sm"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          접근 용이
                        </Text>
                      </Box>
                    </Pressable>
                    <Pressable
                      onPress={() => setAccessibility("normal")}
                      className="flex-1"
                    >
                      <Box
                        className={`rounded-xl p-4 items-center border ${
                          accessibility === "normal"
                            ? "bg-yellow-600/20 border-yellow-500"
                            : "bg-white/5 border-white/20"
                        }`}
                      >
                        <Text
                          className="text-white font-medium text-sm"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          보통
                        </Text>
                      </Box>
                    </Pressable>
                    <Pressable
                      onPress={() => setAccessibility("difficult")}
                      className="flex-1"
                    >
                      <Box
                        className={`rounded-xl p-4 items-center border ${
                          accessibility === "difficult"
                            ? "bg-red-600/20 border-red-500"
                            : "bg-white/5 border-white/20"
                        }`}
                      >
                        <Text
                          className="text-white font-medium text-sm"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          제한적
                        </Text>
                      </Box>
                    </Pressable>
                  </HStack>
                </VStack>

                {/* 운반 조건 */}
                <VStack space="sm">
                  <HStack className="items-center space-x-2">
                    <Text
                      className="text-white font-semibold text-base"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      운반 조건
                    </Text>
                    <Text className="text-red-400 text-sm font-bold">*</Text>
                  </HStack>
                  <HStack space="md">
                    <Pressable
                      onPress={() => setTransportCondition("buyer")}
                      className="flex-1"
                    >
                      <Box
                        className={`rounded-xl p-4 items-center border ${
                          transportCondition === "buyer"
                            ? "bg-blue-600/20 border-blue-500"
                            : "bg-white/5 border-white/20"
                        }`}
                      >
                        <Text
                          className="text-white font-medium text-sm"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          구매자 직접
                        </Text>
                      </Box>
                    </Pressable>
                    <Pressable
                      onPress={() => setTransportCondition("negotiable")}
                      className="flex-1"
                    >
                      <Box
                        className={`rounded-xl p-4 items-center border ${
                          transportCondition === "negotiable"
                            ? "bg-purple-600/20 border-purple-500"
                            : "bg-white/5 border-white/20"
                        }`}
                      >
                        <Text
                          className="text-white font-medium text-sm"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          협의 가능
                        </Text>
                      </Box>
                    </Pressable>
                    <Pressable
                      onPress={() => setTransportCondition("seller")}
                      className="flex-1"
                    >
                      <Box
                        className={`rounded-xl p-4 items-center border ${
                          transportCondition === "seller"
                            ? "bg-green-600/20 border-green-500"
                            : "bg-white/5 border-white/20"
                        }`}
                      >
                        <Text
                          className="text-white font-medium text-sm"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          판매자 지원
                        </Text>
                      </Box>
                    </Pressable>
                  </HStack>
                </VStack>
              </VStack>

              {/* 판매 현장 위치 */}
              <VStack space="md" className="mt-8">
                <HStack className="items-center space-x-3">
                  <Ionicons name="location" size={20} color="#FCD34D" />
                  <Text
                    className="text-yellow-300 text-lg font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    판매 현장 위치
                  </Text>
                  <Text className="text-red-400 text-lg font-bold">*</Text>
                </HStack>

                {/* 주소 선택 */}
                <Pressable onPress={openAddressModal}>
                  <Box className="bg-white/5 border border-white/10 rounded-2xl p-5 min-h-14 justify-center">
                    <Text
                      className={`text-base ${
                        address ? "text-white" : "text-gray-400"
                      }`}
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      {address || "정확한 현장 주소를 선택해주세요"}
                    </Text>
                  </Box>
                </Pressable>

                {/* 상세 주소 입력 (주소가 선택되었을 때만 표시) */}
                {address && (
                  <VStack space="sm">
                    <HStack className="items-center space-x-2">
                      <Text
                        className="text-gray-300 text-sm"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        상세 주소
                      </Text>
                      <Text className="text-red-400 text-sm font-bold">*</Text>
                    </HStack>
                    <Input className="bg-white/5 border-white/10 rounded-2xl min-h-14">
                      <InputField
                        placeholder="상세 주소를 입력하세요 (동, 호수, 층수 등)"
                        value={addressDetail}
                        onChangeText={setAddressDetail}
                        className="text-white text-base px-5 py-4"
                        style={{ fontFamily: "NanumGothic" }}
                      />
                    </Input>
                  </VStack>
                )}
              </VStack>

              {/* 상세 정보 안내 */}
              <VStack space="md" className="mt-8">
                <HStack className="items-center space-x-3">
                  <Ionicons name="document-text" size={20} color="#FCD34D" />
                  <Text
                    className="text-yellow-300 text-lg font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    상세 정보 안내
                  </Text>
                  <Text className="text-red-400 text-lg font-bold">*</Text>
                </HStack>

                {/* 안내 텍스트 추가 */}
                <Text
                  className="text-gray-300 text-sm px-2"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  💡 구체적인 정보를 작성하면 더 많은 관심을 받을 수 있어요
                </Text>

                <Textarea className="bg-white/5 border-white/10 rounded-2xl min-h-32">
                  <TextareaInput
                    placeholder="예시: 구리파이프 50kg, 깨끗한 상태, 트럭 접근 가능, 포장 불필요 등..."
                    value={description}
                    onChangeText={setDescription}
                    className="text-white text-base px-5 py-4"
                    style={{
                      fontFamily: "NanumGothic",
                      color: "#FFFFFF",
                      textAlignVertical: "top",
                    }}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={6}
                  />
                </Textarea>

                {/* 작성 가이드 추가 */}
                <VStack space="xs" className="bg-gray-800/50 rounded-xl p-4">
                  <Text
                    className="text-blue-300 font-semibold text-sm"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    📝 작성 가이드
                  </Text>
                  <Text
                    className="text-gray-300 text-xs leading-5"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    • 고철 종류와 상태를 구체적으로 설명{"\n"}• 대략적인 무게나
                    수량 정보{"\n"}• 현장 접근성 및 특별한 조건{"\n"}• 포장
                    상태나 분리 여부
                  </Text>
                </VStack>
              </VStack>
            </VStack>
          </View>
        </ScrollView>

        {/* 하단 완성도 및 등록 버튼 */}
        <Box className="px-6 py-4 bg-black/20 border-t border-white/10">
          {/* 완성도 표시 */}
          <VStack space="md">
            <HStack className="items-center justify-between">
              <VStack className="flex-1" space="xs">
                <Text
                  className="text-white text-sm font-semibold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  필수 항목 완성도
                </Text>
                <Text
                  className={`text-xs ${
                    isFormComplete ? "text-green-400" : "text-orange-400"
                  }`}
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {isFormComplete
                    ? "✅ 모든 항목이 완성되었습니다"
                    : "📝 필수 항목을 모두 입력해주세요"}
                </Text>
              </VStack>

              {/* 완성도 퍼센트 */}
              <Box
                className={`px-3 py-1 rounded-full ${
                  isFormComplete
                    ? "bg-green-600/20 border border-green-500/30"
                    : "bg-orange-600/20 border border-orange-500/30"
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    isFormComplete ? "text-green-400" : "text-orange-400"
                  }`}
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {isFormComplete ? "100%" : "진행중"}
                </Text>
              </Box>
            </HStack>

            {/* 경매 등록 버튼 (완성시에만 표시) */}
            {isFormComplete && (
              <Button
                onPress={handleSubmit}
                disabled={isSubmitting}
                className={`w-full rounded-2xl min-h-16 ${
                  isSubmitting
                    ? "bg-gray-500/50"
                    : "bg-gradient-to-r from-purple-600 to-blue-600"
                }`}
                style={{
                  shadowColor: "#9333EA",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <HStack className="items-center space-x-3">
                  {isSubmitting ? (
                    <Ionicons name="sync" size={24} color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#FFFFFF"
                    />
                  )}
                  <ButtonText
                    className="text-white font-bold text-lg"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    {isSubmitting ? "등록 중..." : "🔨 경매 등록하기"}
                  </ButtonText>
                </HStack>
              </Button>
            )}

            {/* 미완성시 안내 메시지 */}
            {!isFormComplete && (
              <Box className="bg-orange-600/10 border border-orange-500/30 rounded-xl p-4">
                <HStack className="items-center space-x-3">
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#FB923C"
                  />
                  <VStack className="flex-1" space="xs">
                    <Text
                      className="text-orange-300 font-semibold text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      아직 완성되지 않았어요
                    </Text>
                    <Text
                      className="text-orange-200 text-xs"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      모든 필수 항목을 입력하면 경매 등록 버튼이 나타납니다
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            )}
          </VStack>
        </Box>

        {/* 다음 주소 검색 컴포넌트 */}
        <DaumAddressSearch
          visible={showAddressSearch}
          onComplete={handleAddressComplete}
          onClose={handleAddressClose}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
