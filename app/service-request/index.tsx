import React, { useState, useEffect } from "react";
import { ScrollView, View, Alert, Image, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Camera,
  MapPin,
  Phone,
  FileText,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { DaumAddressSearch } from "@/components/DaumAddressSearch";

interface DaumAddressResult {
  address: string;
  roadAddress?: string;
  zonecode: string;
  [key: string]: any;
}

interface PhotoItem {
  id: string;
  uri: string;
  isRepresentative: boolean;
}

export default function ServiceRequest() {
  const router = useRouter();
  const [serviceType, setServiceType] = useState<"appraisal" | "purchase">(
    "appraisal"
  );
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
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

  // 이미지 선택
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
          id: Date.now().toString(),
          uri: asset.uri,
          isRepresentative: photos.length === 0,
        };
        setPhotos((prev) => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error("이미지 선택 오류:", error);
      Alert.alert("오류", "이미지를 선택하는 중 문제가 발생했습니다.");
    }
  };

  // 이미지 제거
  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  };

  // 주소 검색
  const openAddressModal = () => {
    setShowAddressSearch(true);
  };

  const handleAddressComplete = (result: DaumAddressResult) => {
    setSelectedAddress(result);
    setAddress(result.roadAddress || result.address);
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
              </HStack>

              <HStack space="md" className="flex-wrap">
                {photos.map((photo) => (
                  <Box key={photo.id} className="relative">
                    <Image
                      source={{ uri: photo.uri }}
                      className="w-20 h-20 rounded-lg"
                      style={{ resizeMode: "cover" }}
                    />
                    <Pressable
                      onPress={() => handleRemovePhoto(photo.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 items-center justify-center"
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </Pressable>
                  </Box>
                ))}

                {photos.length < 5 && (
                  <Pressable
                    onPress={handlePickImage}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-white/30 items-center justify-center bg-white/5"
                  >
                    <Ionicons name="camera" size={24} color="#9CA3AF" />
                  </Pressable>
                )}
              </HStack>

              <Text
                className="text-white/60 text-sm"
                style={{ fontFamily: "NanumGothic" }}
              >
                최대 5장까지 등록 가능합니다
              </Text>
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
