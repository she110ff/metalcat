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

  // 다음 단계로 이동 가능한지 체크
  const isNextButtonEnabled = () => photos.length >= 3;

  // 진행 상태 텍스트
  const getProgressText = () => {
    if (photos.length < 3) return `사진 ${photos.length}/3 (최소 3장 필요)`;
    return "다음 단계로 진행하세요";
  };

  const handleNext = () => {
    console.log("handleNext 호출됨");
    console.log("photos.length:", photos.length);

    if (photos.length < 3) {
      Alert.alert("알림", "사진을 최소 3장 이상 등록해주세요.");
      return;
    }

    console.log("다음 화면으로 이동 시도");

    // 첫 번째 단계 데이터를 쿼리 파라미터로 전달
    const firstStepData = {
      productType: materialsProductTypes[0], // 기본값: H빔
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
    if (photos.length >= 5) {
      Alert.alert("알림", "사진은 최대 5장까지 등록할 수 있습니다.");
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
          type: "full",
        }));

        setPhotos((prev) => [...prev, ...newPhotos]);
      }
    } catch (error) {
      console.error("갤러리 오류:", error);
      Alert.alert("오류", "사진 선택 중 오류가 발생했습니다.");
    }
  };

  const removePhoto = (photoId: string) => {
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

  const setRepresentativePhoto = (photoId: string) => {
    const updatedPhotos = photos.map((photo) => ({
      ...photo,
      isRepresentative: photo.id === photoId,
    }));
    setPhotos(updatedPhotos);
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        {/* 헤더 */}
        <VStack space="md">
          <HStack className="items-center justify-between px-6 py-4">
            <Pressable onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text
              className="text-white text-lg font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              중고자재 경매 등록
            </Text>
            <Box style={{ width: 24 }} />
          </HStack>
        </VStack>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
        >
          <VStack space="xl" className="pb-8">
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
                  {photos.length}/5장
                </Text>
              </HStack>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
                contentContainerStyle={{ paddingVertical: 8 }}
              >
                <HStack space="md" className="px-3 py-2">
                  {/* 등록된 사진들 */}
                  {photos.map((photo, index) => (
                    <Box key={photo.id} className="relative">
                      <Image
                        source={{ uri: photo.uri }}
                        className="w-20 h-20 rounded-lg"
                        style={{ resizeMode: "cover" }}
                      />
                      {/* 삭제 버튼 개선 */}
                      <Pressable
                        onPress={() => removePhoto(photo.id)}
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

                  {/* 사진 추가 버튼 - 뒤쪽으로 이동 */}
                  {photos.length < 5 && (
                    <Pressable onPress={addPhoto}>
                      <Box className="w-20 h-20 rounded-lg bg-white/10 border-2 border-dashed border-white/30 items-center justify-center">
                        <Plus size={20} color="#9CA3AF" strokeWidth={2} />
                        <Text
                          className="text-gray-400 text-xs"
                          style={{ fontFamily: "NanumGothic" }}
                        >
                          추가
                        </Text>
                      </Box>
                    </Pressable>
                  )}
                </HStack>
              </ScrollView>

              {/* 사진 등록 안내 메시지 */}
              <Text
                className="text-gray-400 text-sm text-center"
                style={{ fontFamily: "NanumGothic" }}
              >
                사진 추가 버튼을 눌러 카메라 또는 갤러리에서 선택하세요
              </Text>
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
                ? `진행하기 ✓`
                : `진행하기 (${photos.length}/3장)`}
            </ButtonText>
          </Button>
        </Box>
      </SafeAreaView>
    </LinearGradient>
  );
}
