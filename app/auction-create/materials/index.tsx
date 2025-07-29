import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Image,
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
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import { Plus } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { materialsProductTypes } from "@/data";
import { PhotoInfo, MaterialProductType } from "@/data/types";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function MaterialsAuctionCreate() {
  const router = useRouter();
  const [selectedProductType, setSelectedProductType] =
    useState<MaterialProductType | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<"개" | "kg" | "m" | "㎡">("개");

  // 기본 사진들 추가 (중고자재 경매용 샘플 이미지)
  const [photos, setPhotos] = useState<PhotoInfo[]>([
    {
      id: "default_1",
      uri: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop",
      isRepresentative: true,
      type: "full",
    },
    {
      id: "default_2",
      uri: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop",
      isRepresentative: false,
      type: "full",
    },
    {
      id: "default_3",
      uri: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop",
      isRepresentative: false,
      type: "full",
    },
  ]);

  // 권한 요청 함수
  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || libraryStatus !== "granted") {
      Alert.alert(
        "권한 필요",
        "카메라와 갤러리 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요.",
        [{ text: "확인" }]
      );
      return false;
    }
    return true;
  };

  const handleBack = () => {
    router.back();
  };

  const handleProductTypeSelect = (productType: MaterialProductType) => {
    // 토글 기능: 같은 종류를 다시 클릭하면 선택 해제
    if (selectedProductType?.id === productType.id) {
      setSelectedProductType(null);
    } else {
      setSelectedProductType(productType);
    }
  };

  // 다음 단계로 이동 가능한지 체크
  const isNextButtonEnabled = () =>
    selectedProductType !== null &&
    quantity.trim() !== "" &&
    !isNaN(parseFloat(quantity)) &&
    parseFloat(quantity) >= 1 &&
    photos.length >= 3;

  // 진행 상태 텍스트
  const getProgressText = () => {
    if (!selectedProductType) return "자재 종류를 선택하세요";
    if (
      !quantity.trim() ||
      isNaN(parseFloat(quantity)) ||
      parseFloat(quantity) < 1
    )
      return "수량을 입력하세요";
    if (photos.length < 3) return `사진 ${photos.length}/3 (최소 3장 필요)`;
    return "다음 단계로 진행하세요";
  };

  const handleNext = () => {
    console.log("handleNext 호출됨");
    console.log("selectedProductType:", selectedProductType);
    console.log("quantity:", quantity);
    console.log("photos.length:", photos.length);

    if (!selectedProductType) {
      Alert.alert("알림", "자재 종류를 선택해주세요.");
      return;
    }
    if (!quantity.trim()) {
      Alert.alert("알림", "수량을 입력해주세요.");
      return;
    }

    const quantityValue = parseFloat(quantity);
    if (isNaN(quantityValue) || quantityValue < 1) {
      Alert.alert("입력 오류", "수량은 1 이상이어야 합니다.");
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
      quantity: quantityValue,
      unit: unit,
      photos: photos,
    };

    try {
      // URL params를 통해 데이터 전달
      const params = new URLSearchParams({
        firstStepData: JSON.stringify(firstStepData),
      });

      // 다음 화면으로 이동 (추가 정보 입력) - 절대 경로 사용
      router.push(
        `/auction-create/materials/additional-info?${params.toString()}`
      );
      console.log("✅ 라우팅 성공");
    } catch (error) {
      console.error("❌ 라우팅 오류:", error);
      Alert.alert("오류", "다음 단계로 이동할 수 없습니다. 다시 시도해주세요.");
    }
  };

  // 사진 추가 함수
  const addPhoto = async () => {
    if (photos.length >= 10) {
      Alert.alert("알림", "사진은 최대 10장까지 등록할 수 있습니다.");
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const options = ["카메라로 촬영", "갤러리에서 선택", "취소"];
    const cancelButtonIndex = 2;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            // 카메라
            await takePicture();
          } else if (buttonIndex === 1) {
            // 갤러리
            await pickFromGallery();
          }
        }
      );
    } else {
      Alert.alert("사진 추가", "원하는 방법을 선택하세요", [
        { text: "카메라로 촬영", onPress: takePicture },
        { text: "갤러리에서 선택", onPress: pickFromGallery },
        { text: "취소", style: "cancel" },
      ]);
    }
  };

  const takePicture = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto: PhotoInfo = {
          id: `photo_${Date.now()}`,
          uri: result.assets[0].uri,
          isRepresentative: photos.length === 0,
          type: "full",
        };
        setPhotos([...photos, newPhoto]);
      }
    } catch (error) {
      console.error("카메라 오류:", error);
      Alert.alert("오류", "사진 촬영 중 오류가 발생했습니다.");
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhoto: PhotoInfo = {
          id: `photo_${Date.now()}`,
          uri: result.assets[0].uri,
          isRepresentative: photos.length === 0,
          type: "full",
        };
        setPhotos([...photos, newPhoto]);
      }
    } catch (error) {
      console.error("갤러리 오류:", error);
      Alert.alert("오류", "사진 선택 중 오류가 발생했습니다.");
    }
  };

  const removePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter((photo) => photo.id !== photoId);
    setPhotos(updatedPhotos);
  };

  const setRepresentativePhoto = (photoId: string) => {
    const updatedPhotos = photos.map((photo) => ({
      ...photo,
      isRepresentative: photo.id === photoId,
    }));
    setPhotos(updatedPhotos);
  };

  // 개발용 샘플 데이터 채우기
  const fillSampleData = () => {
    setSelectedProductType(materialsProductTypes[0]); // H빔
    setQuantity("50");
    setUnit("개");
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={styles.container}
    >
      <SafeAreaView className="flex-1">
        {/* 헤더 */}
        <VStack space="md" className="px-6 py-4">
          <HStack className="items-center justify-between">
            <Pressable onPress={handleBack}>
              <HStack className="items-center space-x-2">
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color="#FFFFFF"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  }}
                />
                {Platform.OS === "ios" && (
                  <Text className="text-white text-base font-medium">뒤로</Text>
                )}
              </HStack>
            </Pressable>

            <Text
              className="text-white text-xl font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              중고자재 경매 등록
            </Text>

            {/* 오른쪽 여백 (대칭을 위해) */}
            <Box style={{ width: Platform.OS === "ios" ? 60 : 44 }} />
          </HStack>
        </VStack>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
        >
          <VStack space="xl" className="pb-8">
            {/* 개발용 샘플 데이터 버튼 */}
            {__DEV__ && (
              <HStack className="justify-end">
                <Pressable onPress={fillSampleData}>
                  <HStack className="items-center space-x-2 bg-purple-600/20 px-3 py-2 rounded-lg">
                    <Ionicons name="flask" size={16} color="#9333EA" />
                    <Text
                      className="text-purple-400 text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      샘플 데이터
                    </Text>
                  </HStack>
                </Pressable>
              </HStack>
            )}

            {/* 자재 종류 선택 */}
            <VStack space="lg">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                자재 종류 선택
              </Text>

              <VStack space="md">
                {selectedProductType ? (
                  // 선택된 자재만 표시
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
                  // 전체 자재 종류 표시
                  materialsProductTypes.map((productType) => (
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

            {/* 수량 입력 */}
            <VStack space="md">
              <HStack className="items-center space-x-3">
                <Ionicons name="calculator" size={20} color="#FCD34D" />
                <Text
                  className="text-yellow-300 text-lg font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  수량 입력
                </Text>
                <Text className="text-red-400 text-lg font-bold">*</Text>
              </HStack>

              <HStack space="md" className="items-end">
                <Box className="rounded-xl p-4 flex-1">
                  <Text
                    className="text-white text-sm mb-2"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    수량
                  </Text>
                  <Input className="bg-white/10 border-white/20 rounded-xl">
                    <InputField
                      placeholder="수량 입력"
                      placeholderTextColor="#9CA3AF"
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="numeric"
                      className="text-white text-base"
                      style={{ fontFamily: "NanumGothic" }}
                    />
                  </Input>
                </Box>

                <Box className="rounded-xl p-4">
                  <Text
                    className="text-white text-sm mb-2"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    단위
                  </Text>
                  <HStack space="sm">
                    {(["개", "kg", "m", "㎡"] as const).map((unitOption) => (
                      <Pressable
                        key={unitOption}
                        onPress={() => setUnit(unitOption)}
                        className={`px-3 py-2 rounded-lg border ${
                          unit === unitOption
                            ? "bg-purple-600/20 border-purple-500"
                            : "bg-white/5 border-white/20"
                        }`}
                      >
                        <Text
                          className="text-white text-sm font-medium"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          {unitOption}
                        </Text>
                      </Pressable>
                    ))}
                  </HStack>
                </Box>
              </HStack>
            </VStack>

            {/* 사진 등록 */}
            <VStack space="md">
              <HStack className="items-center justify-between">
                <HStack className="items-center space-x-3">
                  <Ionicons name="camera" size={20} color="#FCD34D" />
                  <Text
                    className="text-yellow-300 text-lg font-bold"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    사진 등록
                  </Text>
                  <Text className="text-red-400 text-lg font-bold">*</Text>
                </HStack>
                <Text
                  className="text-gray-400 text-sm"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {photos.length}/10장
                </Text>
              </HStack>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                <HStack space="md" className="px-1">
                  {/* 사진 추가 버튼 */}
                  <Pressable onPress={addPhoto}>
                    <Box className="w-24 h-24 rounded-xl bg-white/10 border-2 border-dashed border-white/30 items-center justify-center">
                      <Plus size={24} color="#9CA3AF" />
                      <Text
                        className="text-gray-400 text-xs mt-1"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        추가
                      </Text>
                    </Box>
                  </Pressable>

                  {/* 등록된 사진들 */}
                  {photos.map((photo, index) => (
                    <Box key={photo.id} className="relative">
                      <Image
                        source={{ uri: photo.uri }}
                        className="w-24 h-24 rounded-xl"
                        style={{ resizeMode: "cover" }}
                      />
                      {/* 대표 사진 표시 */}
                      {photo.isRepresentative && (
                        <Box className="absolute top-1 left-1 bg-purple-600 rounded px-1">
                          <Text
                            className="text-white text-xs"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            대표
                          </Text>
                        </Box>
                      )}
                      {/* 삭제 버튼 */}
                      <Pressable
                        onPress={() => removePhoto(photo.id)}
                        className="absolute top-1 right-1 bg-red-600 rounded-full w-5 h-5 items-center justify-center"
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </Pressable>
                    </Box>
                  ))}
                </HStack>
              </ScrollView>

              {/* 사진 등록 안내 */}
              <Box className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                <HStack className="items-center space-x-3">
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#60A5FA"
                  />
                  <VStack className="flex-1" space="xs">
                    <Text
                      className="text-blue-200 font-bold text-sm"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      고품질 사진 촬영 팁
                    </Text>
                    <Text
                      className="text-blue-300 text-xs leading-5"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      • 자재 전체가 잘 보이는 각도로 촬영{"\n"}• 손상 부위나
                      특징을 자세히 촬영{"\n"}• 밝은 곳에서 선명하게 촬영{"\n"}•
                      최소 3장 이상 등록 (권장: 5장 이상)
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            </VStack>
          </VStack>
        </ScrollView>

        {/* 하단 다음 버튼 */}
        <Box className="px-6 py-4 bg-black/20 border-t border-white/10">
          <Button
            variant="solid"
            onPress={handleNext}
            disabled={!isNextButtonEnabled()}
            className="w-full"
            style={{
              backgroundColor: isNextButtonEnabled()
                ? "rgba(147, 51, 234, 0.9)"
                : "rgba(107, 114, 128, 0.5)",
            }}
          >
            <ButtonText
              className="text-white font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              {isNextButtonEnabled()
                ? "📋 추가 정보 입력 →"
                : `진행하기 (${selectedProductType ? "✓" : "종류"} | ${
                    parseFloat(quantity) >= 1 ? "✓" : "수량"
                  } | ${photos.length}/3장)`}
            </ButtonText>
          </Button>
        </Box>
      </SafeAreaView>
    </LinearGradient>
  );
}
