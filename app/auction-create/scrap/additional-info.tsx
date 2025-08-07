import React, { useState, useEffect } from "react";
import { Alert, Platform, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonText } from "@/components/ui/button";
import {
  DaumAddressSearch,
  DaumAddressResult,
} from "@/components/DaumAddressSearch";
import { Ionicons } from "@expo/vector-icons";
import { router, useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { useCreateAuction } from "@/hooks/useAuctions";
import { useAuth } from "@/hooks/useAuth";
import {
  calculateAuctionEndTime,
  getAuctionDurationInfo,
} from "@/data/utils/auction-utils";
import {
  ScrapAuctionItem,
  PhotoInfo,
  ScrapProductType,
} from "@/data/types/auction";
import { salesEnvironmentOptions } from "@/data/auction/sample-data";

// 첫 번째 단계에서 전달받은 데이터 타입
interface FirstStepData {
  productType: ScrapProductType;
  weight: number;
  photos: PhotoInfo[];
}

export default function AdditionalInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const createAuctionMutation = useCreateAuction();
  const { user, isLoading: isLoadingAuth } = useAuth();

  // 첫 번째 단계 데이터 파싱
  const [firstStepData, setFirstStepData] = useState<FirstStepData | null>(
    null
  );

  useEffect(() => {
    if (params.firstStepData) {
      try {
        const parsedData = JSON.parse(params.firstStepData as string);
        setFirstStepData(parsedData);
        console.log("📥 첫 번째 단계 데이터 수신:", parsedData);
      } catch (error) {
        console.error("❌ 첫 번째 단계 데이터 파싱 오류:", error);
        Alert.alert("오류", "이전 단계 데이터를 불러올 수 없습니다.", [
          { text: "이전으로", onPress: () => router.back() },
        ]);
      }
    } else {
      // 첫 번째 단계 데이터가 없으면 처음으로 리다이렉트
      Alert.alert("알림", "고철 종류와 중량을 먼저 입력해주세요.", [
        { text: "확인", onPress: () => router.push("/auction-create/scrap") },
      ]);
    }
  }, [params.firstStepData]);

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
  // 판매 조건 상태
  const [accessibility, setAccessibility] = useState<
    "easy" | "normal" | "difficult"
  >("normal");
  const [transportCondition, setTransportCondition] = useState<
    "buyer" | "negotiable" | "seller"
  >("buyer");
  const [shippingCost, setShippingCost] = useState<"buyer" | "seller">("buyer");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 필수 입력 항목 완성도 체크
  const checkRequiredFields = () => {
    const isComplete =
      title.trim() !== "" &&
      address.trim() !== "" &&
      (address ? addressDetail.trim() !== "" : true) &&
      description.trim() !== "" &&
      accessibility !== null &&
      transportCondition !== null &&
      shippingCost !== null;

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
      accessibility: accessibility !== null,
      transportCondition: transportCondition !== null,
      shippingCost: shippingCost !== null,
      isComplete: complete,
    });
  }, [
    title,
    address,
    addressDetail,
    description,
    accessibility,
    transportCondition,
    shippingCost,
  ]);

  // 개발용 샘플 데이터 채우기
  const fillSampleData = () => {
    setTitle("고품질 철강 스크랩");
    setAddress("서울특별시 강남구 테헤란로 123");
    setAddressDetail("테크노밸리 지하 1층");
    setDescription(
      "고품질 철강 스크랩입니다. 순도가 높고 분류가 잘 되어 있어 즉시 사용 가능합니다. 현장 접근성도 좋아 운반에 문제없습니다."
    );
    setAccessibility("easy");
    setTransportCondition("negotiable");
    setShippingCost("seller");
  };

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
    // 1. 로그인 상태 확인
    if (!user) {
      Alert.alert("로그인 필요", "경매를 등록하려면 먼저 로그인해주세요.", [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "로그인",
          onPress: () => router.push("/login"),
        },
      ]);
      return;
    }

    // 2. 필수 필드 검증
    if (!checkRequiredFields()) {
      Alert.alert("입력 확인", "모든 필수 항목을 입력해주세요.");
      return;
    }

    if (!firstStepData) {
      Alert.alert(
        "오류",
        "첫 번째 단계 데이터가 없습니다. 처음부터 다시 시작해주세요.",
        [{ text: "확인", onPress: () => router.push("/auction-create/scrap") }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 경매 종료 시간 계산 (긴급 경매는 2일, 일반 경매는 7일 - 오후 6시 종료)
      const endTime = calculateAuctionEndTime(transactionType);

      // 전체 경매 데이터 구성 (첫 번째 + 두 번째 단계 데이터 통합)
      const completeAuctionData: Partial<ScrapAuctionItem> = {
        title: title.trim(),
        productType: firstStepData.productType,
        transactionType,
        auctionCategory: "scrap" as const,
        quantity: {
          quantity: firstStepData.weight,
          unit: "kg",
        },
        salesEnvironment: {
          delivery: "buyer", // 기본값 설정
          shippingCost,
          accessibility,
          loading: "buyer",
          sacksNeeded: false,
        },
        photos: firstStepData.photos,
        address: {
          postalCode: selectedAddress?.zonecode || "",
          addressType: selectedAddress?.roadAddress ? "road" : "lot",
          address: address.trim(),
          detailAddress: addressDetail.trim(),
        },
        description: description.trim(),
        specialNotes: `접근성: ${accessibility}, 운반조건: ${transportCondition}`,
        endTime, // 계산된 종료 시간 추가
        currentBid: 0,
        status: "active" as const,
        bidders: 0,
        viewCount: 0,
        bids: [],
        userId: user?.id, // 현재 로그인한 사용자 ID
      };

      console.log("💾 완전한 경매 데이터 저장:", completeAuctionData);

      // ✅ 실제 데이터 저장 로직 연결
      const createdAuction = await createAuctionMutation.mutateAsync(
        completeAuctionData
      );

      console.log("🎉 경매 등록 성공:", {
        id: createdAuction.id,
        title: (createdAuction as any).title,
      });

      // 성공 시 약간의 지연 후 로딩 상태 해제 (사용자가 등록 완료를 인지할 수 있도록)
      setTimeout(() => {
        setIsSubmitting(false);

        Alert.alert(
          "등록 완료",
          `고철 경매가 성공적으로 등록되었습니다!\n\n${
            getAuctionDurationInfo(transactionType).fullDescription
          }`,
          [
            {
              text: "확인",
              onPress: () => {
                // 경매 목록 화면으로 이동
                router.push("/(tabs)/auction");
              },
            },
          ]
        );
      }, 500); // 0.5초 지연
    } catch (error) {
      console.error("❌ 경매 등록 오류:", error);
      setIsSubmitting(false); // 오류 시에만 로딩 상태 해제

      Alert.alert(
        "오류",
        `경매 등록 중 문제가 발생했습니다.\n${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`
      );
    }
  };

  // 색상 클래스 헬퍼 함수
  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-600/20 border-blue-500";
      case "purple":
        return "bg-purple-600/20 border-purple-500";
      case "green":
        return "bg-green-600/20 border-green-500";
      case "yellow":
        return "bg-yellow-600/20 border-yellow-500";
      case "red":
        return "bg-red-600/20 border-red-500";
      default:
        return "bg-gray-600/20 border-gray-500";
    }
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
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={20}
        >
          <View className="flex-1 px-6 py-6">
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
                  고철 경매 등록
                </Text>

                {/* 오른쪽 여백 (대칭을 위해) */}
                <Box style={{ width: Platform.OS === "ios" ? 60 : 44 }} />
              </HStack>
            </VStack>

            {/* 첫 번째 단계 데이터 표시 */}
            {firstStepData && (
              <Box
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: "rgba(147, 51, 234, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(147, 51, 234, 0.3)",
                }}
              >
                <VStack space="sm">
                  <Text
                    className="text-purple-300 text-sm font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    ✓ 선택한 정보
                  </Text>
                  <HStack className="justify-between">
                    <Text
                      className="text-white"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      고철 종류: {firstStepData.productType.name}
                    </Text>
                    <Text
                      className="text-white"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      중량: {firstStepData.weight}kg
                    </Text>
                  </HStack>
                  <Text
                    className="text-white text-xs"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    사진: {firstStepData.photos.length}장 등록됨
                  </Text>
                </VStack>
              </Box>
            )}

            {/* 필수 입력 안내 */}
            <Box className="bg-red-600/10 border border-red-500/30 rounded-2xl p-4 mb-6 mt-8">
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
                        일반 경매
                      </Text>
                      <Text
                        className="text-gray-400 text-sm"
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
                        긴급 경매
                      </Text>
                      <Text
                        className="text-gray-400 text-sm"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        2일간 진행
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

                {/* 운송비 부담 */}
                <VStack space="sm">
                  <HStack className="items-center space-x-2">
                    <Text
                      className="text-white font-semibold text-base"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      운송비 부담
                    </Text>
                    <Text className="text-red-400 text-sm font-bold">*</Text>
                  </HStack>
                  <HStack space="md">
                    {salesEnvironmentOptions.shippingCost.map((option) => (
                      <Pressable
                        key={option.id}
                        onPress={() =>
                          setShippingCost(option.id as "buyer" | "seller")
                        }
                        className="flex-1"
                      >
                        <Box
                          className={`rounded-xl p-4 items-center border ${
                            shippingCost === option.id
                              ? getColorClasses(option.color)
                              : "bg-white/5 border-white/20"
                          }`}
                        >
                          <Text
                            className="text-white font-medium text-sm"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            {option.label}
                          </Text>
                        </Box>
                      </Pressable>
                    ))}
                  </HStack>
                </VStack>

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
                    {salesEnvironmentOptions.accessibility.map((option) => (
                      <Pressable
                        key={option.id}
                        onPress={() =>
                          setAccessibility(
                            option.id as "easy" | "normal" | "difficult"
                          )
                        }
                        className="flex-1"
                      >
                        <Box
                          className={`rounded-xl p-4 items-center border ${
                            accessibility === option.id
                              ? getColorClasses(option.color)
                              : "bg-white/5 border-white/20"
                          }`}
                        >
                          <Text
                            className="text-white font-medium text-sm"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            {option.label}
                          </Text>
                        </Box>
                      </Pressable>
                    ))}
                  </HStack>
                </VStack>

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
        </KeyboardAwareScrollView>

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
                disabled={isSubmitting || isLoadingAuth || !user}
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
          currentAddress={selectedAddress}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
