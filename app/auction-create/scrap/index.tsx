import React, { useState } from "react";
import { ScrollView, Image, Alert, Platform } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/ui/input";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Ionicons } from "@expo/vector-icons";
import { scrapProductTypes } from "@/data";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

interface PhotoInfo {
  id: string;
  uri: string;
  isRepresentative: boolean;
}

export default function ScrapAuctionCreate() {
  const router = useRouter();
  const [selectedProductType, setSelectedProductType] = useState<any>(null);
  const [weight, setWeight] = useState("");
  const [photos, setPhotos] = useState<PhotoInfo[]>([
    // 기본 사진 3개 미리 추가
    {
      id: "default_1",
      uri: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop",
      isRepresentative: true,
    },
    {
      id: "default_2",
      uri: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop",
      isRepresentative: false,
    },
    {
      id: "default_3",
      uri: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop",
      isRepresentative: false,
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

  const handleProductTypeSelect = (productType: any) => {
    // 토글 기능: 같은 종류를 다시 클릭하면 선택 해제
    if (selectedProductType?.id === productType.id) {
      setSelectedProductType(null);
    } else {
      setSelectedProductType(productType);
    }
  };

  const handleTakePhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const newPhoto: PhotoInfo = {
          id: `photo_${Date.now()}`,
          uri: result.assets[0].uri,
          isRepresentative: photos.length === 0, // 첫 번째 사진을 대표 사진으로
        };

        setPhotos((prev) => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error("카메라 에러:", error);
      Alert.alert("오류", "카메라를 실행하는데 문제가 발생했습니다.");
    }
  };

  const handleLoadPhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 5 - photos.length, // 최대 5장까지
      });

      if (!result.canceled && result.assets) {
        const newPhotos: PhotoInfo[] = result.assets.map((asset, index) => ({
          id: `photo_${Date.now()}_${index}`,
          uri: asset.uri,
          isRepresentative: photos.length === 0 && index === 0, // 첫 번째 사진을 대표 사진으로
        }));

        setPhotos((prev) => [...prev, ...newPhotos]);
      }
    } catch (error) {
      console.error("갤러리 에러:", error);
      Alert.alert("오류", "갤러리를 여는데 문제가 발생했습니다.");
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const filtered = prev.filter((photo) => photo.id !== photoId);

      // 대표 사진이 삭제된 경우, 첫 번째 사진을 대표 사진으로 설정
      if (
        filtered.length > 0 &&
        !filtered.some((photo) => photo.isRepresentative)
      ) {
        filtered[0].isRepresentative = true;
      }

      return filtered;
    });
  };

  const handleSetRepresentative = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((photo) => ({
        ...photo,
        isRepresentative: photo.id === photoId,
      }))
    );
  };

  const handleNext = () => {
    console.log("handleNext 호출됨");
    console.log("selectedProductType:", selectedProductType);
    console.log("weight:", weight);
    console.log("photos.length:", photos.length);

    if (!selectedProductType) {
      Alert.alert("알림", "고철 종류를 선택해주세요.");
      return;
    }
    if (!weight.trim()) {
      Alert.alert("알림", "중량을 입력해주세요.");
      return;
    }
    if (photos.length < 3) {
      Alert.alert("알림", "사진을 최소 3장 이상 등록해주세요.");
      return;
    }

    console.log("다음 화면으로 이동 시도");
    // 다음 화면으로 이동 (추가 정보 입력)
    router.push("/auction-create/scrap/additional-info" as any);
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
                  고철 경매 등록
                </Text>

                {/* 오른쪽 여백 (대칭을 위해) */}
                <Box style={{ width: Platform.OS === "ios" ? 60 : 44 }} />
              </HStack>
            </VStack>

            {/* 고철 종류 선택 */}
            <VStack space="lg">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                고철 종류 선택
              </Text>

              <VStack space="md">
                {selectedProductType ? (
                  // 선택된 고철만 표시
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
                  // 전체 고철 종류 표시
                  scrapProductTypes.map((productType) => (
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

            {/* 중량 입력 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                중량 (kg)
              </Text>
              <Box
                className="rounded-xl p-4"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                <Input>
                  <InputField
                    placeholder="중량을 입력하세요 (예: 1000)"
                    value={weight}
                    onChangeText={(text) => {
                      // 숫자만 입력 가능
                      const numericValue = text.replace(/[^0-9]/g, "");
                      setWeight(numericValue);
                    }}
                    keyboardType="numeric"
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "NanumGothic",
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderColor: "rgba(255, 255, 255, 0.08)",
                    }}
                  />
                </Input>
              </Box>
            </VStack>

            {/* 사진 등록 */}
            <VStack space="lg">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                사진 등록
              </Text>

              {/* 사진 미리보기 */}
              <VStack space="md">
                <HStack space="md" className="flex-wrap">
                  {photos.map((photo, index) => (
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
                      {photo.isRepresentative && (
                        <Box className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-b-lg p-1">
                          <Text
                            className="text-white text-xs text-center font-bold"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            대표
                          </Text>
                        </Box>
                      )}
                      {!photo.isRepresentative && (
                        <Pressable
                          onPress={() => handleSetRepresentative(photo.id)}
                          className="absolute bottom-0 left-0 right-0 bg-gray-600 rounded-b-lg p-1"
                        >
                          <Text
                            className="text-white text-xs text-center"
                            style={{ fontFamily: "NanumGothic" }}
                          >
                            대표로
                          </Text>
                        </Pressable>
                      )}
                    </Box>
                  ))}

                  {/* 사진 추가 버튼 */}
                  {photos.length < 5 && (
                    <Pressable
                      onPress={handleLoadPhoto}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-400 items-center justify-center"
                    >
                      <Ionicons name="images" size={24} color="#6B7280" />
                    </Pressable>
                  )}
                </HStack>

                <Text
                  className="text-gray-400 text-sm"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  사진은 최소 3장 이상 · 최대 5장 까지 등록 가능합니다.
                  {photos.length > 0 && ` (현재 ${photos.length}장)`}
                </Text>
              </VStack>

              {/* 사진 등록 버튼 */}
              <Button
                variant="outline"
                onPress={handleTakePhoto}
                className="w-full"
              >
                <Ionicons name="camera" size={20} color="#9333EA" />
                <ButtonText
                  className="ml-2"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  사진 찍기
                </ButtonText>
              </Button>
            </VStack>
          </VStack>
        </ScrollView>

        {/* 하단 진행 버튼 */}
        <Box className="p-6">
          <Button
            variant="solid"
            onPress={handleNext}
            className="w-full"
            style={{
              backgroundColor:
                selectedProductType && photos.length >= 3
                  ? "rgba(147, 51, 234, 0.9)"
                  : "rgba(107, 114, 128, 0.5)",
            }}
            disabled={!selectedProductType || photos.length < 3}
          >
            <ButtonText
              className="text-white font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              진행하기 ({photos.length}/3+ 장)
            </ButtonText>
          </Button>
        </Box>
      </SafeAreaView>
    </LinearGradient>
  );
}
