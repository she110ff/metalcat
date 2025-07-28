import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Alert,
  Image,
  TextInput,
  Platform,
  ActionSheetIOS,
} from "react-native";
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
  Camera,
  MapPin,
  Phone,
  FileText,
  Plus,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import {
  DaumAddressSearch,
  DaumAddressResult,
} from "@/components/DaumAddressSearch";

interface PhotoItem {
  id: string;
  uri: string;
}

export default function ServiceRequest() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ✅ URL 파라미터에서 타입을 읽어와 자동 설정
  const getInitialServiceType = (): "appraisal" | "purchase" => {
    const typeParam = params.type as string;
    if (typeParam === "purchase") {
      return "purchase";
    }
    return "appraisal"; // 기본값
  };

  const [serviceType, setServiceType] = useState<"appraisal" | "purchase">(
    getInitialServiceType()
  );

  // ✅ 기본 사진들 추가 (서비스 요청용 샘플 이미지)
  const [photos, setPhotos] = useState<PhotoItem[]>([
    {
      id: "default_service_1",
      uri: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop",
    },
    {
      id: "default_service_2",
      uri: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop",
    },
    {
      id: "default_service_3",
      uri: "https://images.unsplash.com/photo-1583501563110-53c5b33a096d?w=400&h=300&fit=crop",
    },
  ]);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [selectedAddress, setSelectedAddress] =
    useState<DaumAddressResult | null>(null);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // ✅ 개선된 이미지 선택 옵션
  const showImagePickerOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["취소", "카메라", "갤러리"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto();
          } else if (buttonIndex === 2) {
            handlePickImage();
          }
        }
      );
    } else {
      Alert.alert("사진 선택", "사진을 어떻게 추가하시겠습니까?", [
        { text: "취소", style: "cancel" },
        { text: "카메라", onPress: handleTakePhoto },
        { text: "갤러리", onPress: handlePickImage },
      ]);
    }
  };

  // ✅ 카메라로 사진 촬영
  const handleTakePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("권한 필요", "카메라 접근 권한이 필요합니다.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto: PhotoItem = {
          id: `camera_${Date.now()}`,
          uri: asset.uri,
        };
        setPhotos((prev) => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error("카메라 촬영 오류:", error);
      Alert.alert("오류", "사진을 촬영하는 중 문제가 발생했습니다.");
    }
  };

  // ✅ 갤러리에서 이미지 선택
  const handlePickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newPhoto: PhotoItem = {
          id: `gallery_${Date.now()}`,
          uri: asset.uri,
        };
        setPhotos((prev) => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error("이미지 선택 오류:", error);
      Alert.alert("오류", "이미지를 선택하는 중 문제가 발생했습니다.");
    }
  };

  // ✅ 간소화된 이미지 제거
  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  };

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

  // 서비스 요청 제출
  const handleSubmit = async () => {
    if (!checkRequiredFields()) {
      Alert.alert("입력 확인", "모든 필수 항목을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const serviceData = {
        serviceType,
        photos: photos.map((p) => p.uri),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        addressDetail: addressDetail.trim(),
        description: description.trim(),
        selectedAddress,
        createdAt: new Date().toISOString(),
      };

      console.log("💾 서비스 요청 데이터:", serviceData);

      // 실제로는 API 호출
      // await submitServiceRequest(serviceData);

      Alert.alert(
        "요청 완료",
        "서비스 요청이 성공적으로 접수되었습니다!\n담당자가 곧 연락드리겠습니다.",
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
      console.error("❌ 서비스 요청 오류:", error);
      Alert.alert(
        "오류",
        "서비스 요청 중 문제가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={["#1A0F2A", "#2D1B3D", "#3D2F5A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          {/* Header */}
          <VStack className="px-6 pt-4 pb-6">
            <HStack className="items-center justify-between mb-6">
              <Pressable onPress={() => router.back()} className="p-2">
                <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
              </Pressable>
              <Text
                className="text-white text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                서비스 요청
              </Text>
              <View style={{ width: 32 }} />
            </HStack>

            {/* 서비스 타입 선택 */}
            <VStack space="md" className="mb-8">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                서비스 타입
              </Text>
              <HStack space="md">
                <Pressable
                  className={`flex-1 p-4 rounded-xl border ${
                    serviceType === "appraisal"
                      ? "bg-yellow-400/20 border-yellow-400/50"
                      : "bg-white/5 border-white/10"
                  }`}
                  onPress={() => setServiceType("appraisal")}
                >
                  <Text
                    className={`text-center font-semibold ${
                      serviceType === "appraisal"
                        ? "text-yellow-400"
                        : "text-white/70"
                    }`}
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    현장 방문 감정
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-1 p-4 rounded-xl border ${
                    serviceType === "purchase"
                      ? "bg-blue-400/20 border-blue-400/50"
                      : "bg-white/5 border-white/10"
                  }`}
                  onPress={() => setServiceType("purchase")}
                >
                  <Text
                    className={`text-center font-semibold ${
                      serviceType === "purchase"
                        ? "text-blue-400"
                        : "text-white/70"
                    }`}
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    즉시 매입 서비스
                  </Text>
                </Pressable>
              </HStack>
            </VStack>

            {/* 사진 등록 */}
            <VStack space="md" className="mb-8">
              <HStack className="items-center" space="sm">
                <Camera size={20} color="#FCD34D" strokeWidth={2} />
                <Text
                  className="text-yellow-300 text-lg font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  사진 등록
                </Text>
                <Text
                  className="text-white/60 text-sm ml-2"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  ({photos.length}/5)
                </Text>
              </HStack>

              {/* ✅ 개선된 사진 그리드 */}
              <VStack space="md">
                <HStack space="md" className="flex-wrap">
                  {photos.map((photo, index) => (
                    <Box key={photo.id} className="relative">
                      <Image
                        source={{ uri: photo.uri }}
                        className="w-20 h-20 rounded-lg"
                        style={{ resizeMode: "cover" }}
                        onError={(error) => {
                          console.warn("이미지 로딩 실패:", photo.uri, error);
                        }}
                        // ✅ 로딩 실패 시 기본 배경색 표시
                        defaultSource={{
                          uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                        }}
                      />

                      {/* ✅ 개선된 삭제 버튼 */}
                      <Pressable
                        onPress={() => handleRemovePhoto(photo.id)}
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: "#000000",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 2,
                          borderColor: "#FFFFFF",
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 16,
                            fontWeight: "bold",
                            lineHeight: 18,
                          }}
                        >
                          ×
                        </Text>
                      </Pressable>
                    </Box>
                  ))}

                  {/* ✅ 개선된 사진 추가 버튼 */}
                  {photos.length < 5 && (
                    <Pressable
                      onPress={showImagePickerOptions}
                      className="w-20 h-20 rounded-lg border-2 border-dashed items-center justify-center"
                      style={{
                        borderColor: "rgba(156, 163, 175, 0.5)",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <VStack className="items-center" space="xs">
                        <Plus size={20} color="#9CA3AF" strokeWidth={2} />
                        <Text
                          className="text-gray-400 text-xs"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          추가
                        </Text>
                      </VStack>
                    </Pressable>
                  )}
                </HStack>

                {/* ✅ 개선된 안내 메시지 */}
                <VStack space="xs">
                  <Text
                    className="text-white/60 text-sm"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    • 최대 5장까지 등록 가능합니다
                  </Text>
                  <Text
                    className="text-white/60 text-sm"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    • 금속 종류와 상태가 잘 보이는 사진을 등록해주세요
                  </Text>
                </VStack>
              </VStack>
            </VStack>

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
              </HStack>
              <TextInput
                placeholder="전화번호를 입력하세요"
                placeholderTextColor="#9CA3AF"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: 12,
                  padding: 16,
                  color: "#FFFFFF",
                  fontFamily: "NanumGothic",
                }}
              />
            </VStack>

            {/* 현장 위치 */}
            <VStack space="md" className="mb-8">
              <HStack className="items-center" space="sm">
                <MapPin size={20} color="#FCD34D" strokeWidth={2} />
                <Text
                  className="text-yellow-300 text-lg font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  현장 위치
                </Text>
              </HStack>

              <Pressable
                onPress={openAddressModal}
                className="p-4 rounded-xl bg-white/10 border border-white/20"
              >
                <Text
                  className={address ? "text-white" : "text-white/50"}
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {address || "주소를 검색하세요"}
                </Text>
              </Pressable>

              {address && (
                <TextInput
                  placeholder="상세주소를 입력하세요"
                  placeholderTextColor="#9CA3AF"
                  value={addressDetail}
                  onChangeText={setAddressDetail}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    borderRadius: 12,
                    padding: 16,
                    color: "#FFFFFF",
                    fontFamily: "NanumGothic",
                  }}
                />
              )}
            </VStack>

            {/* 설명 */}
            <VStack space="md" className="mb-8">
              <HStack className="items-center" space="sm">
                <FileText size={20} color="#FCD34D" strokeWidth={2} />
                <Text
                  className="text-yellow-300 text-lg font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  상세 설명
                </Text>
              </HStack>
              <TextInput
                placeholder="금속 종류, 수량, 상태 등을 자세히 설명해주세요"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: 12,
                  padding: 16,
                  color: "#FFFFFF",
                  fontFamily: "NanumGothic",
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />
            </VStack>

            {/* 제출 버튼 */}
            {isFormComplete ? (
              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                className="rounded-2xl p-4 bg-yellow-400"
                style={{
                  shadowColor: "#FFC107",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <Text className="text-black text-center text-base font-bold">
                  {isSubmitting ? "요청 중..." : "서비스 요청하기"}
                </Text>
              </Pressable>
            ) : (
              <Box className="bg-orange-600/10 border border-orange-500/30 rounded-xl p-4">
                <HStack className="items-center" space="sm">
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
                      모든 필수 항목을 입력하면 요청 버튼이 나타납니다
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            )}
          </VStack>
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
