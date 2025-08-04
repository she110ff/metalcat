import { useState } from "react";
import { Alert, Platform, ActionSheetIOS } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { usePermissions } from "@/hooks/usePermissions";

export interface ImagePickerOptions {
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
  allowsMultipleSelection?: boolean;
  maxImages?: number;
  title?: string;
  cancelText?: string;
  cameraText?: string;
  galleryText?: string;
}

export interface UseImagePickerResult {
  selectedImage: string | null;
  selectedImages: string[];
  selectImage: () => void;
  clearImage: () => void;
  clearAllImages: () => void;
  removeImage: (uri: string) => void;
  isLoading: boolean;
}

export const useImagePicker = (
  options: ImagePickerOptions = {}
): UseImagePickerResult => {
  const {
    aspect = [1, 1],
    quality = 0.8,
    allowsEditing = true,
    allowsMultipleSelection = false,
    maxImages = 5,
    title = "사진 선택",
    cancelText = "취소",
    cameraText = "카메라",
    galleryText = "갤러리",
  } = options;

  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 단일 이미지용 (기존 호환성 유지)
  const selectedImage = selectedImages.length > 0 ? selectedImages[0] : null;

  // 권한 관리 훅 사용
  const { requestPermission } = usePermissions();

  // 권한 요청 함수
  const requestPermissions = async (): Promise<boolean> => {
    try {
      const cameraGranted = await requestPermission("camera");
      const photoGranted = await requestPermission("photo");

      return cameraGranted && photoGranted;
    } catch (error) {
      console.error("권한 요청 에러:", error);
      return false;
    }
  };

  // 카메라로 사진 촬영
  const handleTakePhoto = async (): Promise<void> => {
    setIsLoading(true);
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        aspect,
        quality,
      });

      if (!result.canceled && result.assets?.[0]) {
        const newImageUri = result.assets[0].uri;

        if (allowsMultipleSelection) {
          setSelectedImages((prev) => {
            if (prev.length >= maxImages) {
              Alert.alert(
                "알림",
                `최대 ${maxImages}장까지 선택할 수 있습니다.`
              );
              return prev;
            }
            return [...prev, newImageUri];
          });
        } else {
          setSelectedImages([newImageUri]);
        }
      }
    } catch (error) {
      console.error("카메라 에러:", error);
      Alert.alert("오류", "카메라를 실행하는데 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 갤러리에서 사진 선택
  const handleLoadPhoto = async (): Promise<void> => {
    setIsLoading(true);
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection,
        allowsEditing: allowsMultipleSelection ? false : allowsEditing,
        aspect,
        quality,
        selectionLimit: allowsMultipleSelection
          ? Math.max(1, maxImages - selectedImages.length)
          : 1,
      });

      if (!result.canceled && result.assets) {
        if (allowsMultipleSelection) {
          const newImageUris = result.assets.map((asset) => asset.uri);
          setSelectedImages((prev) => {
            const combined = [...prev, ...newImageUris];
            if (combined.length > maxImages) {
              Alert.alert(
                "알림",
                `최대 ${maxImages}장까지 선택할 수 있습니다.`
              );
              return combined.slice(0, maxImages);
            }
            return combined;
          });
        } else {
          setSelectedImages([result.assets[0].uri]);
        }
      }
    } catch (error) {
      console.error("갤러리 에러:", error);
      Alert.alert("오류", "갤러리를 여는데 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 이미지 선택 옵션 표시
  const selectImage = (): void => {
    if (allowsMultipleSelection && selectedImages.length >= maxImages) {
      Alert.alert("알림", `최대 ${maxImages}장까지 선택할 수 있습니다.`);
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [cancelText, cameraText, galleryText],
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
      Alert.alert(title, "사진을 어떻게 선택하시겠습니까?", [
        { text: cancelText, style: "cancel" },
        { text: cameraText, onPress: handleTakePhoto },
        { text: galleryText, onPress: handleLoadPhoto },
      ]);
    }
  };

  // 선택된 이미지 초기화 (단일)
  const clearImage = (): void => {
    setSelectedImages([]);
  };

  // 모든 이미지 초기화
  const clearAllImages = (): void => {
    setSelectedImages([]);
  };

  // 특정 이미지 제거
  const removeImage = (uri: string): void => {
    setSelectedImages((prev) => prev.filter((imageUri) => imageUri !== uri));
  };

  return {
    selectedImage,
    selectedImages,
    selectImage,
    clearImage,
    clearAllImages,
    removeImage,
    isLoading,
  };
};
