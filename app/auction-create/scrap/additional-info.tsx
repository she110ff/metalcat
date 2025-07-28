import React, { useState } from "react";
import { ScrollView, Alert, Platform } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TextareaInput } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxIndicator } from "@/components/ui/checkbox";
import { CheckboxIcon } from "@/components/ui/checkbox";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Ionicons } from "@expo/vector-icons";
import { scrapSalesEnvironmentOptions } from "@/data";
import {
  DaumAddressSearch,
  DaumAddressResult,
} from "@/components/DaumAddressSearch";
import {
  ScrapAuctionItem,
  ScrapQuantityInfo,
  ScrapSalesEnvironment,
  AddressInfo,
  PhotoInfo,
} from "@/data/types/auction";
import { useCreateAuction } from "@/hooks/useAuctions";

export default function ScrapAdditionalInfo() {
  const router = useRouter();
  const createAuctionMutation = useCreateAuction();
  const [title, setTitle] = useState("");
  const [transactionType, setTransactionType] = useState<"normal" | "urgent">(
    "normal"
  );
  const [desiredPrice, setDesiredPrice] = useState("");
  const [phoneNumberDisclosure, setPhoneNumberDisclosure] = useState(false);
  const [salesEnvironment, setSalesEnvironment] = useState({
    delivery: [] as string[],
    shippingCost: [] as string[],
    additional: [] as string[],
  });
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [description, setDescription] = useState("");
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [selectedAddress, setSelectedAddress] =
    useState<DaumAddressResult | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleAddressSearch = () => {
    console.log("🔍 주소 검색 시작 - 모달 열기");
    setShowAddressSearch(true);
    console.log("✅ showAddressSearch 상태:", true);
  };

  const handleAddressComplete = (result: DaumAddressResult) => {
    console.log("🎯 주소 검색 완료 - 받은 데이터:");
    console.log("📋 전체 결과:", result);
    console.log("📍 기본 주소:", result.address);
    console.log("🛣️ 도로명 주소:", result.roadAddress);
    console.log("📮 우편번호:", result.zonecode);
    console.log("🏢 건물명:", result.buildingName);
    console.log("🌍 시도:", result.sido);
    console.log("🏘️ 시군구:", result.sigungu);
    console.log("📌 법정동:", result.bname);

    // 선택된 주소 객체 저장
    setSelectedAddress(result);
    console.log("✅ selectedAddress 상태 업데이트됨");

    // 표시할 주소 결정 (도로명 주소 우선, 없으면 기본 주소)
    const mainAddress = result.roadAddress || result.address;
    console.log("🏠 표시할 메인 주소:", mainAddress);

    if (!mainAddress) {
      console.error("❌ 표시할 주소가 없음!");
      Alert.alert("오류", "주소 정보를 가져올 수 없습니다. 다시 시도해주세요.");
      return;
    }

    // 주소 입력 필드 업데이트
    setAddress(mainAddress);
    console.log("✅ address 상태 업데이트됨:", mainAddress);

    // 주소 검색 모달 닫기
    setShowAddressSearch(false);
    console.log("🚪 주소 검색 모달 닫힘");

    // 성공 피드백
    console.log("🎉 주소 선택 완료! 사용자에게 결과 표시됨");
  };

  const handleAddressClose = () => {
    console.log("❌ 주소 검색 취소 - 모달 닫기");
    setShowAddressSearch(false);
    console.log("✅ showAddressSearch 상태:", false);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("알림", "글 제목을 입력해주세요.");
      return;
    }

    if (!desiredPrice.trim()) {
      Alert.alert("알림", "희망 가격을 입력해주세요.");
      return;
    }
    if (!phoneNumberDisclosure) {
      Alert.alert("알림", "전화번호 노출에 동의해주세요.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("알림", "현장 주소를 입력해주세요.");
      return;
    }

    try {
      // 주소 정보 구성
      const addressInfo: AddressInfo = {
        postalCode: selectedAddress?.zonecode || "",
        roadAddress: selectedAddress?.roadAddress || address,
        lotAddress: selectedAddress?.jibunAddress || "",
        detailAddress: addressDetail,
        city: selectedAddress?.sido || "",
        district: selectedAddress?.sigungu || "",
      };

      // 사진 정보 구성 (기본 사진 3개)
      const photoInfo: PhotoInfo[] = [
        {
          id: "default_1",
          uri: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop",
          isRepresentative: true,
          type: "full",
        },
        {
          id: "default_2",
          uri: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop",
          isRepresentative: false,
          type: "closeup",
        },
        {
          id: "default_3",
          uri: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop",
          isRepresentative: false,
          type: "detail",
        },
      ];

      // 수량 정보 구성 (기본값 사용)
      const quantityInfo: ScrapQuantityInfo = {
        knowsWeight: false,
        estimatedWeight: 1000,
        unit: "kg",
      };

      // 판매 환경 정보 구성
      const salesEnvironmentInfo: ScrapSalesEnvironment = {
        delivery:
          salesEnvironment.delivery.length > 0
            ? (salesEnvironment.delivery[0] as "seller" | "buyer")
            : "seller",
        shippingCost:
          salesEnvironment.shippingCost.length > 0
            ? (salesEnvironment.shippingCost[0] as "seller" | "buyer")
            : "buyer",
        truckAccess: salesEnvironment.additional.includes("truckAccess"),
        loading: "seller", // 기본값
        sacksNeeded: salesEnvironment.additional.includes("sacksNeeded"),
      };

      // 새로운 경매 데이터 생성
      const newAuctionData = {
        title: title,
        productType: {
          id: "copper",
          name: "구리",
          category: "copper",
          description: "구리 스크랩",
          auctionCategory: "scrap" as const,
        }, // 기본값
        transactionType: transactionType,
        auctionCategory: "scrap" as const,
        quantity: quantityInfo,
        salesEnvironment: salesEnvironmentInfo,
        photos: photoInfo,
        address: addressInfo,
        description: description || "고철 경매입니다.",
        desiredPrice: parseInt(desiredPrice, 10),
        phoneNumberDisclosure: phoneNumberDisclosure,
        userId: "current_user", // 실제로는 로그인된 사용자 ID
        endTime: new Date(
          Date.now() +
            (transactionType === "urgent" ? 3 : 7) * 24 * 60 * 60 * 1000
        ), // 거래종류에 따라 종료일 설정
      };

      // TanStack Query를 사용하여 경매 데이터 저장
      createAuctionMutation.mutate(newAuctionData, {
        onSuccess: (savedAuction) => {
          Alert.alert("등록 완료", "고철 경매가 성공적으로 등록되었습니다!", [
            {
              text: "확인",
              onPress: () => {
                // 메인 화면으로 이동
                router.push("/auction" as any);
              },
            },
          ]);
        },
        onError: (error) => {
          console.error("경매 등록 에러:", error);
          Alert.alert(
            "오류",
            "경매 등록 중 문제가 발생했습니다. 다시 시도해주세요."
          );
        },
      });
    } catch (error) {
      console.error("경매 등록 에러:", error);
      Alert.alert(
        "오류",
        "경매 등록 중 문제가 발생했습니다. 다시 시도해주세요."
      );
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
                  추가 정보 입력
                </Text>

                {/* 오른쪽 여백 (대칭을 위해) */}
                <Box style={{ width: Platform.OS === "ios" ? 60 : 44 }} />
              </HStack>
            </VStack>

            {/* 전화번호 노출 동의 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                전화번호 노출 안내
              </Text>
              <Text
                className="text-gray-300 text-sm"
                style={{ fontFamily: "NanumGothic" }}
              >
                중고 거래에서는 전화번호가 반드시 노출 되야 합니다
              </Text>

              <Pressable
                onPress={() => setPhoneNumberDisclosure(!phoneNumberDisclosure)}
              >
                <HStack className="items-center space-x-3">
                  <Box
                    className={`w-5 h-5 rounded border-2 items-center justify-center ${
                      phoneNumberDisclosure
                        ? "border-purple-600 bg-purple-600"
                        : "border-white/30 bg-transparent"
                    }`}
                  >
                    {phoneNumberDisclosure && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </Box>
                  <Text
                    className="text-white text-base"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    네 전화 번호 노출하는 것에 동의합니다
                  </Text>
                </HStack>
              </Pressable>
            </VStack>

            {/* 글 제목 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                글 제목
              </Text>
              <Input className="bg-white/5 border-white/10 rounded-2xl">
                <InputField
                  placeholder="글 제목을 입력하세요"
                  value={title}
                  onChangeText={setTitle}
                  className="text-white text-base px-4 py-3 font-nanum"
                />
              </Input>
            </VStack>

            {/* 거래 종류 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                거래 종류
              </Text>
              <HStack space="md">
                <Pressable
                  onPress={() => setTransactionType("normal")}
                  className="flex-1"
                >
                  <Box
                    className={`rounded-xl p-4 items-center border ${
                      transactionType === "normal"
                        ? "bg-purple-600/20 border-purple-500/50"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <Text
                      className="text-white font-bold text-base"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      일반 경매
                    </Text>
                    <Text
                      className="text-gray-400 text-sm mt-1"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      7일간 진행
                    </Text>
                  </Box>
                </Pressable>

                <Pressable
                  onPress={() => setTransactionType("urgent")}
                  className="flex-1"
                >
                  <Box
                    className={`rounded-xl p-4 items-center border ${
                      transactionType === "urgent"
                        ? "bg-red-500/20 border-red-500/50"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <Text
                      className="text-white font-bold text-base"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      긴급 경매
                    </Text>
                    <Text
                      className="text-gray-400 text-sm mt-1"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      3일간 진행
                    </Text>
                  </Box>
                </Pressable>
              </HStack>
            </VStack>

            {/* 희망 가격 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                희망 가격 설정 (원)
              </Text>
              <Input className="bg-white/5 border-white/10 rounded-2xl">
                <InputField
                  placeholder="희망 가격을 입력하세요 (예: 1000000)"
                  value={desiredPrice}
                  onChangeText={(text) => {
                    // 숫자만 입력 가능
                    const numericValue = text.replace(/[^0-9]/g, "");
                    setDesiredPrice(numericValue);
                  }}
                  keyboardType="numeric"
                  className="text-white text-base px-4 py-3 font-nanum"
                />
              </Input>
            </VStack>

            {/* 판매 환경 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                고철 판매 환경
              </Text>
              <Text
                className="text-gray-300 text-sm"
                style={{ fontFamily: "NanumGothic" }}
              >
                해당하는 것을 전부 선택해 주세요.
              </Text>

              <VStack space="md">
                {/* 배송 방식 */}
                <VStack space="sm">
                  <Text
                    className="text-white text-base font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    배송 방식
                  </Text>
                  {scrapSalesEnvironmentOptions.delivery.map((option) => (
                    <Pressable
                      key={option.id}
                      onPress={() => {
                        const isSelected = salesEnvironment.delivery.includes(
                          option.id
                        );
                        setSalesEnvironment({
                          ...salesEnvironment,
                          delivery: isSelected
                            ? salesEnvironment.delivery.filter(
                                (id) => id !== option.id
                              )
                            : [...salesEnvironment.delivery, option.id],
                        });
                      }}
                    >
                      <HStack className="items-center space-x-3">
                        <Box
                          className={`w-4 h-4 border-2 items-center justify-center ${
                            salesEnvironment.delivery.includes(option.id)
                              ? "border-purple-600 bg-purple-600"
                              : "border-white/30 bg-transparent"
                          }`}
                        >
                          {salesEnvironment.delivery.includes(option.id) && (
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color="#FFFFFF"
                            />
                          )}
                        </Box>
                        <VStack className="flex-1">
                          <Text
                            className="text-white text-base"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            {option.label}
                          </Text>
                          <Text
                            className="text-gray-400 text-sm"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            {option.description}
                          </Text>
                        </VStack>
                      </HStack>
                    </Pressable>
                  ))}
                </VStack>

                {/* 운송비 부담 */}
                <VStack space="sm">
                  <Text
                    className="text-white text-base font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    운송비 부담
                  </Text>
                  {scrapSalesEnvironmentOptions.shippingCost.map((option) => (
                    <Pressable
                      key={option.id}
                      onPress={() => {
                        const isSelected =
                          salesEnvironment.shippingCost.includes(option.id);
                        setSalesEnvironment({
                          ...salesEnvironment,
                          shippingCost: isSelected
                            ? salesEnvironment.shippingCost.filter(
                                (id) => id !== option.id
                              )
                            : [...salesEnvironment.shippingCost, option.id],
                        });
                      }}
                    >
                      <HStack className="items-center space-x-3">
                        <Box
                          className={`w-4 h-4 border-2 items-center justify-center ${
                            salesEnvironment.shippingCost.includes(option.id)
                              ? "border-purple-600 bg-purple-600"
                              : "border-white/30 bg-transparent"
                          }`}
                        >
                          {salesEnvironment.shippingCost.includes(
                            option.id
                          ) && (
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color="#FFFFFF"
                            />
                          )}
                        </Box>
                        <Text
                          className="text-white text-base"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          {option.label}
                        </Text>
                      </HStack>
                    </Pressable>
                  ))}
                </VStack>

                {/* 추가 옵션 */}
                <VStack space="sm">
                  <Text
                    className="text-white text-base font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    추가 옵션
                  </Text>
                  <Box className="flex-row flex-wrap">
                    {scrapSalesEnvironmentOptions.additional.map((option) => (
                      <Pressable
                        key={option.id}
                        onPress={() => {
                          const isSelected =
                            salesEnvironment.additional.includes(option.id);
                          setSalesEnvironment({
                            ...salesEnvironment,
                            additional: isSelected
                              ? salesEnvironment.additional.filter(
                                  (id) => id !== option.id
                                )
                              : [...salesEnvironment.additional, option.id],
                          });
                        }}
                        className="w-1/2 pr-2 mb-2"
                      >
                        <HStack className="items-center space-x-2">
                          <Box
                            className={`w-4 h-4 border-2 items-center justify-center ${
                              salesEnvironment.additional.includes(option.id)
                                ? "border-purple-600 bg-purple-600"
                                : "border-white/30 bg-transparent"
                            }`}
                          >
                            {salesEnvironment.additional.includes(
                              option.id
                            ) && (
                              <Ionicons
                                name="checkmark"
                                size={12}
                                color="#FFFFFF"
                              />
                            )}
                          </Box>
                          <Text
                            className="text-white text-sm flex-1"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            {option.label}
                          </Text>
                        </HStack>
                      </Pressable>
                    ))}
                  </Box>
                </VStack>
              </VStack>
            </VStack>

            {/* 현장 주소 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                현장 주소
              </Text>

              {/* 주소 검색 결과 표시 */}
              {selectedAddress && (
                <Box className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                  <VStack space="sm">
                    <HStack className="items-center">
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#10B981"
                      />
                      <Text
                        className="text-green-400 text-sm font-bold ml-2"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        선택된 주소
                      </Text>
                    </HStack>
                    <Text
                      className="text-white text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      {selectedAddress.roadAddress || selectedAddress.address}
                    </Text>
                    {selectedAddress.buildingName && (
                      <Text
                        className="text-gray-400 text-xs"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        건물: {selectedAddress.buildingName}
                      </Text>
                    )}
                  </VStack>
                </Box>
              )}

              <VStack space="sm">
                <HStack space="md">
                  <Input className="flex-1 bg-white/5 border-white/10 rounded-2xl">
                    <InputField
                      placeholder="주소를 직접 입력하거나 검색 버튼을 이용하세요"
                      value={address}
                      onChangeText={(text) => {
                        setAddress(text);
                        // 직접 입력 시 selectedAddress 초기화
                        if (selectedAddress) {
                          setSelectedAddress(null);
                        }
                      }}
                      className="text-white text-base px-4 py-3 font-nanum"
                      multiline={false}
                      returnKeyType="done"
                    />
                  </Input>
                  <Pressable
                    onPress={handleAddressSearch}
                    className="bg-purple-600 active:bg-purple-700 px-6 py-4 rounded-2xl flex-row items-center justify-center"
                    style={{
                      minWidth: 110,
                      shadowColor: "#9333EA",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 5,
                    }}
                  >
                    <Ionicons
                      name="location"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className="text-white font-bold text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      주소 찾기
                    </Text>
                  </Pressable>
                </HStack>

                {/* 주소 상태별 미리보기 */}
                {selectedAddress ? (
                  // API로 검색된 주소
                  <Box className="bg-purple-600/10 border border-purple-600/20 rounded-xl p-4">
                    <HStack className="items-start justify-between">
                      <VStack className="flex-1 mr-3">
                        <HStack className="items-center mb-2">
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#A855F7"
                          />
                          <Text
                            className="text-purple-300 text-sm font-medium ml-2"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            검색된 주소
                          </Text>
                        </HStack>
                        <Text
                          className="text-white text-base leading-5"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          {selectedAddress.roadAddress ||
                            selectedAddress.address}
                        </Text>
                        {selectedAddress.buildingName && (
                          <Text
                            className="text-gray-400 text-sm mt-1"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            📍 {selectedAddress.buildingName}
                          </Text>
                        )}
                      </VStack>
                      <Pressable
                        onPress={() => {
                          setAddress("");
                          setSelectedAddress(null);
                        }}
                        className="p-2 active:opacity-60"
                        style={{ minWidth: 36, minHeight: 36 }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#A855F7"
                        />
                      </Pressable>
                    </HStack>
                  </Box>
                ) : address.trim() ? (
                  // 직접 입력된 주소
                  <Box className="bg-yellow-600/10 border border-yellow-600/20 rounded-xl p-4">
                    <HStack className="items-start justify-between">
                      <VStack className="flex-1 mr-3">
                        <HStack className="items-center mb-2">
                          <Ionicons name="create" size={16} color="#FBBF24" />
                          <Text
                            className="text-yellow-300 text-sm font-medium ml-2"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            직접 입력된 주소
                          </Text>
                        </HStack>
                        <Text
                          className="text-white text-base leading-5"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          {address}
                        </Text>
                        <Text
                          className="text-yellow-400/70 text-xs mt-1"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          💡 정확한 주소 검색을 원하시면 주소 찾기 버튼을
                          이용해주세요
                        </Text>
                      </VStack>
                      <Pressable
                        onPress={() => {
                          setAddress("");
                          setSelectedAddress(null);
                        }}
                        className="p-2 active:opacity-60"
                        style={{ minWidth: 36, minHeight: 36 }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#FBBF24"
                        />
                      </Pressable>
                    </HStack>
                  </Box>
                ) : null}
              </VStack>

              {/* 상세 주소 입력 */}
              <Input className="bg-white/5 border-white/10 rounded-2xl">
                <InputField
                  placeholder="상세 주소 (동, 호수 등)"
                  value={addressDetail}
                  onChangeText={setAddressDetail}
                  className="text-white text-base px-4 py-3 font-nanum"
                />
              </Input>
            </VStack>

            {/* 설명 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                설명
              </Text>
              <Textarea className="bg-white/5 border-white/10 rounded-2xl min-h-24">
                <TextareaInput
                  placeholder="고철에 대한 상세 설명을 입력하세요"
                  value={description}
                  onChangeText={setDescription}
                  numberOfLines={4}
                  className="text-white text-base px-4 py-3 font-nanum"
                />
              </Textarea>
            </VStack>
          </VStack>
        </ScrollView>

        {/* 하단 등록 버튼 */}
        <Box className="p-6">
          <Button
            variant="solid"
            onPress={handleSubmit}
            disabled={createAuctionMutation.isPending}
            className={`w-full rounded-2xl min-h-14 ${
              createAuctionMutation.isPending
                ? "bg-gray-500/50"
                : "bg-purple-600/90"
            }`}
          >
            <ButtonText
              className="text-white font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              {createAuctionMutation.isPending ? "등록 중..." : "경매 등록"}
            </ButtonText>
          </Button>
        </Box>
      </SafeAreaView>

      {/* 주소 검색 모달 */}
      <DaumAddressSearch
        visible={showAddressSearch}
        onComplete={handleAddressComplete}
        onClose={handleAddressClose}
      />
    </LinearGradient>
  );
}
