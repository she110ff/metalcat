import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, Alert, Linking } from "react-native";

export type PermissionType = "camera" | "photo" | "notification";
export type PermissionStatus = "unknown" | "granted" | "denied" | "blocked";

export interface PermissionState {
  camera: PermissionStatus;
  photo: PermissionStatus;
  notification: PermissionStatus;
}

export interface UsePermissionsResult {
  permissions: PermissionState;
  isFirstLaunch: boolean;
  isLoading: boolean;
  checkPermissions: () => Promise<void>;
  requestPermission: (type: PermissionType) => Promise<boolean>;
  requestAllPermissions: () => Promise<boolean>;
  openSettings: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
}

const FIRST_LAUNCH_KEY = "app_first_launch";
const ONBOARDING_COMPLETE_KEY = "onboarding_complete";

export const usePermissions = (): UsePermissionsResult => {
  const [permissions, setPermissions] = useState<PermissionState>({
    camera: "unknown",
    photo: "unknown",
    notification: "unknown",
  });
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 첫 실행 감지
  const checkFirstLaunch = useCallback(async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      if (!hasLaunched) {
        setIsFirstLaunch(true);
        await AsyncStorage.setItem(FIRST_LAUNCH_KEY, "true");
      }
    } catch (error) {
      console.error("첫 실행 확인 실패:", error);
    }
  }, []);

  // 온보딩 완료 상태 확인
  const checkOnboardingStatus = useCallback(async () => {
    try {
      const isComplete = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      return isComplete === "true";
    } catch (error) {
      console.error("온보딩 상태 확인 실패:", error);
      return false;
    }
  }, []);

  // 온보딩 완료 표시
  const markOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    } catch (error) {
      console.error("온보딩 완료 저장 실패:", error);
    }
  }, []);

  // 권한 상태 확인
  const checkPermissions = useCallback(async () => {
    try {
      const [cameraStatus, libraryStatus, notificationStatus] =
        await Promise.all([
          ImagePicker.getCameraPermissionsAsync(),
          ImagePicker.getMediaLibraryPermissionsAsync(),
          Notifications.getPermissionsAsync(),
        ]);

      // Expo PermissionStatus를 우리 타입으로 매핑
      const mapPermissionStatus = (status: any): PermissionStatus => {
        switch (status) {
          case "granted":
            return "granted";
          case "denied":
            return "denied";
          case "blocked":
            return "blocked";
          default:
            return "unknown";
        }
      };

      setPermissions({
        camera: mapPermissionStatus(cameraStatus.status),
        photo: mapPermissionStatus(libraryStatus.status),
        notification: mapPermissionStatus(notificationStatus.status),
      });
    } catch (error) {
      console.error("권한 상태 확인 실패:", error);
    }
  }, []);

  // 개별 권한 요청
  const requestPermission = useCallback(
    async (type: PermissionType): Promise<boolean> => {
      try {
        let result;

        switch (type) {
          case "camera":
            result = await ImagePicker.requestCameraPermissionsAsync();
            break;
          case "photo":
            result = await ImagePicker.requestMediaLibraryPermissionsAsync();
            break;
          case "notification":
            result = await Notifications.requestPermissionsAsync();
            break;
          default:
            return false;
        }

        // Expo PermissionStatus를 우리 타입으로 매핑
        const mapPermissionStatus = (status: any): PermissionStatus => {
          switch (status) {
            case "granted":
              return "granted";
            case "denied":
              return "denied";
            case "blocked":
              return "blocked";
            default:
              return "unknown";
          }
        };

        // 권한 상태 업데이트
        setPermissions((prev) => ({
          ...prev,
          [type]: mapPermissionStatus(result.status),
        }));

        if (result.status !== "granted") {
          Alert.alert(
            "권한 필요",
            `${getPermissionDescription(type)}을 위해 ${getPermissionName(
              type
            )} 권한이 필요합니다.`,
            [
              { text: "취소", style: "cancel" },
              { text: "설정으로 이동", onPress: openSettings },
            ]
          );
          return false;
        }

        return true;
      } catch (error) {
        console.error(`${type} 권한 요청 실패:`, error);
        return false;
      }
    },
    []
  );

  // 모든 권한 요청
  const requestAllPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const results = await Promise.all([
        requestPermission("camera"),
        requestPermission("photo"),
        requestPermission("notification"),
      ]);

      return results.every((result) => result);
    } catch (error) {
      console.error("모든 권한 요청 실패:", error);
      return false;
    }
  }, [requestPermission]);

  // 설정 화면 열기
  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("설정 열기 실패:", error);
      Alert.alert("오류", "설정을 열 수 없습니다.");
    }
  }, []);

  // 권한 이름 반환
  const getPermissionName = (type: PermissionType): string => {
    switch (type) {
      case "camera":
        return "카메라";
      case "photo":
        return "사진";
      case "notification":
        return "알림";
      default:
        return "";
    }
  };

  // 권한 설명 반환
  const getPermissionDescription = (type: PermissionType): string => {
    switch (type) {
      case "camera":
        return "경매 물품 사진 촬영";
      case "photo":
        return "기존 사진 업로드";
      case "notification":
        return "중요한 경매 정보 수신";
      default:
        return "";
    }
  };

  // 초기화
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await checkFirstLaunch();
      await checkPermissions();
      setIsLoading(false);
    };

    initialize();
  }, [checkFirstLaunch, checkPermissions]);

  return {
    permissions,
    isFirstLaunch,
    isLoading,
    checkPermissions,
    requestPermission,
    requestAllPermissions,
    openSettings,
    markOnboardingComplete,
  };
};
