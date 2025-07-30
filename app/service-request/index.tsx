import React, { useState, useEffect } from "react";
import { ScrollView, View, Alert, TextInput, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  Phone,
  FileText,
  Camera,
} from "lucide-react-native";
import {
  DaumAddressSearch,
  DaumAddressResult,
} from "@/components/DaumAddressSearch";
import { PhotoPicker, PhotoItem } from "@/components/PhotoPicker";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useServiceRequestForm } from "@/hooks/service-request";
import { ServiceType, ServiceRequestFormData } from "@/types/service-request";
import { Image } from "react-native";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

export default function ServiceRequest() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ✅ URL 파라미터에서 타입을 읽어와 자동 설정
  const getInitialServiceType = (): ServiceType => {
    const typeParam = params.type as string;
    if (typeParam === "purchase") {
      return "purchase";
    }
    return "appraisal"; // 기본값
  };

  const [serviceType, setServiceType] = useState<ServiceType>(
    getInitialServiceType()
  );

  // ✅ 서비스 요청 폼 처리 훅
  const {
    submitRequest,
    isLoading: isSubmitting,
    error: submitError,
  } = useServiceRequestForm();

  // 대표 이미지 선택을 위한 useImagePicker 훅 사용
  const {
    selectedImage: mainImage,
    selectImage: selectMainImage,
    clearImage: clearMainImage,
    isLoading: imageLoading,
  } = useImagePicker({
    aspect: [4, 3],
    quality: 0.8,
    title: "대표 이미지 선택",
    cameraText: "카메라로 촬영",
    galleryText: "갤러리에서 선택",
  });

  // ✅ 기본 사진들 추가 (서비스 요청용 샘플 이미지)
  const [photos, setPhotos] = useState<PhotoItem[]>([
    {
      id: "default_service_1",
      uri: "https://dummyimage.com/400x300/6366F1/FFFFFF&text=서비스+요청+1",
    },
    {
      id: "default_service_2",
      uri: "https://dummyimage.com/400x300/6366F1/FFFFFF&text=서비스+요청+2",
    },
    {
      id: "default_service_3",
      uri: "https://dummyimage.com/400x300/6366F1/FFFFFF&text=서비스+요청+3",
    },
  ]);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [selectedAddress, setSelectedAddress] =
    useState<DaumAddressResult | null>(null);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [description, setDescription] = useState("");

  // 필수 입력 항목 완성도 체크
  const checkRequiredFields = () => {
    const isComplete =
      photos.length > 0 &&
      phoneNumber.trim() !== "" &&
      address.trim() !== "" &&
      addressDetail.trim() !== "" &&
      description.trim() !== "";

    return isComplete;
  };

  const [isFormComplete, setIsFormComplete] = useState(false);

  // 폼 완성도 실시간 체크
  useEffect(() => {
    const complete = checkRequiredFields();
    setIsFormComplete(complete);
  }, [photos, phoneNumber, address, addressDetail, description]);

  // 주소 검색
  const openAddressModal = () => {
    setShowAddressSearch(true);
  };

  const handleAddressComplete = (result: DaumAddressResult) => {
    setSelectedAddress(result);
    // 도로명주소를 우선으로 사용, 없으면 지번주소 사용
    setAddress(result.roadAddress || result.jibunAddress || result.address);
    setShowAddressSearch(false);
  };

  const handleAddressClose = () => {
    setShowAddressSearch(false);
  };

  // 서비스 신청
  const handleSubmit = async () => {
    if (!isFormComplete) {
      Alert.alert("입력 오류", "모든 필수 항목을 입력해주세요.");
      return;
    }

    try {
      // 서비스 요청 데이터 구성
      const formData: ServiceRequestFormData = {
        service_type: serviceType,
        contact_phone: phoneNumber,
        address: address,
        address_detail: addressDetail,
        description: description,
        photos: photos,
      };

      console.log("📞 서비스 요청 데이터:", formData);

      // DB에 저장 (사진 업로드 포함)
      const newRequest = await submitRequest(formData);

      console.log("✅ 서비스 요청 생성 완료:", newRequest);

      // 성공 메시지 표시
      Alert.alert(
        "신청 완료",
        `${
          serviceType === "appraisal" ? "감정 서비스" : "매입 서비스"
        } 신청이 완료되었습니다.\n담당자가 빠른 시일 내에 연락드리겠습니다.`,
        [
          {
            text: "확인",
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error("서비스 신청 오류:", error);

      // 에러 메시지 개선
      const errorMessage =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";

      Alert.alert(
        "오류",
        `서비스 신청 중 문제가 발생했습니다.\n\n${errorMessage}\n\n다시 시도해주세요.`
      );
    }
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {showAddressSearch && (
          <DaumAddressSearch
            visible={showAddressSearch}
            onComplete={handleAddressComplete}
            onClose={handleAddressClose}
          />
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <VStack className="p-6" space="lg">
            {/* ✅ 개선된 헤더 */}
            <VStack space="md">
              <HStack className="items-center justify-between mb-6">
                <Pressable onPress={() => router.back()} className="p-2">
                  <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                </Pressable>
                <Text
                  className="text-white text-lg font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {serviceType === "appraisal" ? "감정 서비스" : "매입 서비스"}
                </Text>
                <View style={{ width: 24 }} />
              </HStack>

              {/* ✅ 서비스 타입 표시 */}
              <Box
                className="p-4 rounded-xl mb-4"
                style={{
                  backgroundColor:
                    serviceType === "appraisal"
                      ? "rgba(34, 197, 94, 0.1)"
                      : "rgba(59, 130, 246, 0.1)",
                  borderWidth: 1,
                  borderColor:
                    serviceType === "appraisal"
                      ? "rgba(34, 197, 94, 0.3)"
                      : "rgba(59, 130, 246, 0.3)",
                }}
              >
                <Text
                  className={`text-lg font-bold ${
                    serviceType === "appraisal"
                      ? "text-green-400"
                      : "text-blue-400"
                  }`}
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {serviceType === "appraisal"
                    ? "🔍 전문 감정 서비스"
                    : "💰 즉시 매입 서비스"}
                </Text>
                <Text
                  className="text-gray-300 text-sm mt-2"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {serviceType === "appraisal"
                    ? "전문가의 정확한 가치 평가를 받아보세요"
                    : "당일 현금 결제로 빠른 거래가 가능합니다"}
                </Text>
              </Box>
            </VStack>

            {/* PhotoPicker 컴포넌트 사용 */}
            <PhotoPicker
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={5}
              minPhotos={1}
              hasRepresentative={false}
              title="사진 등록"
              showCounter={true}
              size="medium"
              allowsMultipleSelection={true}
            />

            {/* 전화번호 */}
            <VStack space="md" className="mb-8">
              <HStack className="items-center" space="sm">
                <Phone size={20} color="#FCD34D" strokeWidth={2} />
                <Text
                  className="text-yellow-300 text-lg font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  연락처
                </Text>
                <Text className="text-red-400 text-lg font-bold">*</Text>
              </HStack>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="010-0000-0000"
                placeholderTextColor="#9CA3AF"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 16,
                  padding: 16,
                  color: "#FFFFFF",
                  fontFamily: "NanumGothic",
                  fontSize: 16,
                }}
                keyboardType="phone-pad"
              />
            </VStack>

            {/* 주소 */}
            <VStack space="md" className="mb-8">
              <HStack className="items-center" space="sm">
                <MapPin size={20} color="#FCD34D" strokeWidth={2} />
                <Text
                  className="text-yellow-300 text-lg font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  주소
                </Text>
                <Text className="text-red-400 text-lg font-bold">*</Text>
              </HStack>
              <Pressable
                onPress={openAddressModal}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 16,
                  padding: 16,
                  minHeight: 52,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: address ? "#FFFFFF" : "#9CA3AF",
                    fontFamily: "NanumGothic",
                    fontSize: 16,
                  }}
                >
                  {address || "주소를 검색하세요"}
                </Text>
              </Pressable>
              {address && (
                <TextInput
                  value={addressDetail}
                  onChangeText={setAddressDetail}
                  placeholder="상세 주소를 입력하세요 (건물명, 층수 등)"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 16,
                    padding: 16,
                    color: "#FFFFFF",
                    fontFamily: "NanumGothic",
                    fontSize: 16,
                  }}
                />
              )}
            </VStack>

            {/* 상세 설명 */}
            <VStack space="md" className="mb-8">
              <HStack className="items-center" space="sm">
                <FileText size={20} color="#FCD34D" strokeWidth={2} />
                <Text
                  className="text-yellow-300 text-lg font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  상세 설명
                </Text>
                <Text className="text-red-400 text-lg font-bold">*</Text>
              </HStack>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="금속 종류, 수량, 상태 등을 자세히 설명해주세요"
                placeholderTextColor="#9CA3AF"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 16,
                  padding: 16,
                  color: "#FFFFFF",
                  fontFamily: "NanumGothic",
                  fontSize: 16,
                  height: 120,
                  textAlignVertical: "top",
                }}
                multiline
                numberOfLines={6}
              />
            </VStack>
          </VStack>
        </ScrollView>

        {/* ✅ 하단 고정 버튼 */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 24,
            paddingBottom: 40,
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <Pressable
            onPress={handleSubmit}
            disabled={!isFormComplete || isSubmitting}
            style={{
              backgroundColor: isFormComplete
                ? "rgba(147, 51, 234, 0.9)"
                : "rgba(107, 114, 128, 0.5)",
              paddingVertical: 16,
              paddingHorizontal: 24,
              borderRadius: 16,
              alignItems: "center",
              minHeight: 56,
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "bold",
                fontFamily: "NanumGothic",
              }}
            >
              {isSubmitting
                ? "신청 중..."
                : isFormComplete
                ? `${
                    serviceType === "appraisal" ? "감정 서비스" : "매입 서비스"
                  } 신청하기 ✓`
                : "모든 필수 항목을 입력해주세요"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
