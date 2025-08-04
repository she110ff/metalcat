import React from "react";
import { Alert, Image, Platform, ActionSheetIOS } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Camera, Plus } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { getOptimizedServicePhotoUrl } from "@/utils/imageOptimizer";
import { isSupabaseStorageUrl } from "@/utils/supabaseImageTransform";
import { supabase } from "@/hooks/service-request/supabaseClient";
import { usePermissions } from "@/hooks/usePermissions";

// 사진 정보 타입들
export interface PhotoInfo {
  id: string;
  uri: string;
  isRepresentative?: boolean;
  type?: "full" | "detail" | "damage";
}

export interface PhotoItem {
  id: string;
  uri: string;
}

// 공통 사진 타입
type Photo = PhotoInfo | PhotoItem;

// PhotoPicker 컴포넌트 Props
interface PhotoPickerProps<T extends Photo> {
  photos: T[];
  onPhotosChange: (photos: T[]) => void;
  maxPhotos?: number;
  minPhotos?: number;
  hasRepresentative?: boolean;
  title?: string;
  showCounter?: boolean;
  size?: "small" | "medium" | "large";
  style?: "default" | "compact";
  allowsMultipleSelection?: boolean;
}

export const PhotoPicker = <T extends Photo>({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  minPhotos = 3,
  hasRepresentative = true,
  title = "사진 등록",
  showCounter = true,
  size = "medium",
  style = "default",
  allowsMultipleSelection = true,
}: PhotoPickerProps<T>) => {
  // 권한 관리 훅 사용
  const { permissions, requestPermission, openSettings } = usePermissions();

  // 권한 요청 함수
  const requestPermissions = async () => {
    const cameraGranted = await requestPermission("camera");
    const photoGranted = await requestPermission("photo");

    return cameraGranted && photoGranted;
  };

  // 이미지 선택 옵션
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
            handleLoadPhoto();
          }
        }
      );
    } else {
      Alert.alert("사진 선택", "사진을 어떻게 추가하시겠습니까?", [
        { text: "취소", style: "cancel" },
        { text: "카메라", onPress: handleTakePhoto },
        { text: "갤러리", onPress: handleLoadPhoto },
      ]);
    }
  };

  // 카메라로 사진 촬영
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
        const newPhoto = {
          id: `photo_${Date.now()}`,
          uri: result.assets[0].uri,
          ...(hasRepresentative && { isRepresentative: photos.length === 0 }),
          ...(hasRepresentative && { type: "full" }),
        } as T;

        onPhotosChange([...photos, newPhoto]);
      }
    } catch (error) {
      console.error("카메라 에러:", error);
      Alert.alert("오류", "카메라를 실행하는데 문제가 발생했습니다.");
    }
  };

  // 갤러리에서 사진 선택
  const handleLoadPhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection,
        allowsEditing: !allowsMultipleSelection,
        quality: 0.8,
        selectionLimit: allowsMultipleSelection ? maxPhotos - photos.length : 1,
      });

      if (!result.canceled && result.assets) {
        if (allowsMultipleSelection) {
          const newPhotos: T[] = result.assets.map((asset, index) => ({
            id: `photo_${Date.now()}_${index}`,
            uri: asset.uri,
            ...(hasRepresentative && {
              isRepresentative: photos.length === 0 && index === 0,
            }),
            ...(hasRepresentative && { type: "full" }),
          })) as T[];

          onPhotosChange([...photos, ...newPhotos]);
        } else {
          const newPhoto = {
            id: `photo_${Date.now()}`,
            uri: result.assets[0].uri,
            ...(hasRepresentative && { isRepresentative: photos.length === 0 }),
            ...(hasRepresentative && { type: "full" }),
          } as T;

          onPhotosChange([...photos, newPhoto]);
        }
      }
    } catch (error) {
      console.error("갤러리 에러:", error);
      Alert.alert("오류", "갤러리를 여는데 문제가 발생했습니다.");
    }
  };

  // 사진 삭제
  const handleRemovePhoto = (photoId: string) => {
    const filtered = photos.filter((photo) => photo.id !== photoId);

    // 대표 사진이 삭제된 경우, 첫 번째 사진을 대표 사진으로 설정
    if (
      hasRepresentative &&
      filtered.length > 0 &&
      !filtered.some(
        (photo) => "isRepresentative" in photo && photo.isRepresentative
      )
    ) {
      const firstPhoto = filtered[0] as any;
      if ("isRepresentative" in firstPhoto) {
        firstPhoto.isRepresentative = true;
      }
    }

    onPhotosChange(filtered);
  };

  // 크기별 클래스
  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-20 h-20",
    large: "w-24 h-24",
  };

  const iconSizes = {
    small: 16,
    medium: 20,
    large: 24,
  };

  return (
    <VStack space="md">
      {/* 제목 및 카운터 */}
      <HStack className="items-center justify-between">
        <HStack className="items-center space-x-3">
          <Camera size={20} color="#FCD34D" strokeWidth={2} />
          <Text
            className="text-yellow-300 text-lg font-bold"
            style={{ fontFamily: "NanumGothic" }}
          >
            {title}
          </Text>
          <Text className="text-red-400 text-lg font-bold">*</Text>
        </HStack>
        {showCounter && (
          <Text
            className="text-gray-400 text-sm"
            style={{ fontFamily: "NanumGothic" }}
          >
            {photos.length}/{maxPhotos}장
          </Text>
        )}
      </HStack>

      {/* 사진 리스트 */}
      <VStack space="md">
        <HStack space="md" className="flex-wrap">
          {photos.map((photo, index) => {
            // 🎯 서비스 요청 이미지 최적화 적용
            const optimizedImageUrl = (() => {
              const originalUrl = photo.uri;

              if (isSupabaseStorageUrl(originalUrl)) {
                // Supabase Storage 이미지는 최적화 적용
                const optimizedUrl = getOptimizedServicePhotoUrl(
                  supabase,
                  originalUrl,
                  "thumbnail" // PhotoPicker에서는 thumbnail 크기 사용 (200x150, 70% 품질)
                );

                if (__DEV__) {
                  console.log("🎯 [PhotoPicker] 서비스 이미지 최적화:");
                  console.log("  원본 URL:", originalUrl);
                  console.log("  최적화 URL:", optimizedUrl);
                  console.log("  크기:", "thumbnail (200x150, 70% 품질)");
                }

                return optimizedUrl;
              } else {
                // 로컬 이미지나 다른 URL은 원본 사용
                if (__DEV__) {
                  console.log(
                    "🎨 [PhotoPicker] 로컬 이미지 사용:",
                    originalUrl
                  );
                }
                return originalUrl;
              }
            })();

            return (
              <Box key={photo.id} className="relative">
                <Image
                  source={{ uri: optimizedImageUrl }}
                  className={`${sizeClasses[size]} rounded-lg`}
                  style={{ resizeMode: "cover" }}
                  onError={(error) => {
                    console.warn("이미지 로딩 실패:", photo.uri, error);
                  }}
                  defaultSource={{
                    uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                  }}
                />
                {/* 삭제 버튼 */}
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
            );
          })}

          {/* 사진 추가 버튼 */}
          {photos.length < maxPhotos && (
            <Pressable
              onPress={showImagePickerOptions}
              className={`${sizeClasses[size]} rounded-lg border-2 border-dashed items-center justify-center`}
              style={{
                borderColor: "rgba(156, 163, 175, 0.5)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <VStack className="items-center" space="xs">
                <Plus size={iconSizes[size]} color="#9CA3AF" strokeWidth={2} />
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

        {/* 안내 메시지 */}
        <Text
          className="text-gray-400 text-sm text-center"
          style={{ fontFamily: "NanumGothic" }}
        >
          사진 추가 버튼을 눌러 카메라 또는 갤러리에서 선택하세요
        </Text>
      </VStack>
    </VStack>
  );
};
