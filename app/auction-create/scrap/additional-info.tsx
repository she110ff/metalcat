import React, { useState, useEffect } from "react";
import { ScrollView, Alert, Platform, View } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { Pressable } from "@/components/ui/pressable";
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
  const [desiredPrice, setDesiredPrice] = useState("");
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
    setAddress(result.roadAddress || result.address);
    setShowAddressSearch(false);
  };

  const handleAddressClose = () => {
    console.log("🚪 주소 검색 닫기");
    setShowAddressSearch(false);
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
            <HStack className="items-center space-x-3 mb-8">
              <Ionicons name="add-circle" size={28} color="#FCD34D" />
              <Text
                className="text-white text-2xl font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                경매 등록 완성하기
              </Text>
            </HStack>

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
                        신뢰할 수 있는 거래를 위해 연락처가 관심있는
                        구매자들에게만 공개됩니다.
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

              {/* 희망 가격 */}
              <VStack space="md" className="mt-8">
                <HStack className="items-center space-x-3">
                  <Ionicons name="cash" size={20} color="#FCD34D" />
                  <Text
                    className="text-yellow-300 text-lg font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    목표 판매가격
                  </Text>
                </HStack>
                <Input className="bg-white/5 border-white/10 rounded-2xl min-h-14">
                  <InputField
                    placeholder="원하시는 판매 가격을 입력해주세요"
                    value={desiredPrice}
                    onChangeText={(text) => {
                      // 숫자만 입력 가능
                      const numericValue = text.replace(/[^0-9]/g, "");
                      setDesiredPrice(numericValue);
                    }}
                    keyboardType="numeric"
                    className="text-white text-base px-5 py-4"
                    style={{ fontFamily: "NanumGothic" }}
                  />
                </Input>
                <Text
                  className="text-gray-400 text-xs px-2"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  💡 시장 가격을 참고하여 합리적인 가격을 설정해보세요
                </Text>
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
                </HStack>

                {/* 현장 접근성 */}
                <VStack space="sm">
                  <Text
                    className="text-white font-semibold text-base"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    현장 접근성
                  </Text>
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
                  <Text
                    className="text-white font-semibold text-base"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    운반 조건
                  </Text>
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
                    <Text
                      className="text-gray-300 text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      상세 주소
                    </Text>
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
