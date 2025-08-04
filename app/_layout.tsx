import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import {
  LogBox,
  TouchableOpacity,
  Text,
  Platform,
  Pressable,
} from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryDebugger } from "@/components/QueryDebugger";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { useAppUpdates } from "@/hooks/useAppUpdates";
import {
  UpdateAvailableModal,
  UpdateProgressModal,
} from "@/components/updates";
import Constants from "expo-constants";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionRequestScreen } from "@/components/PermissionRequestScreen";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { useColorScheme } from "@/components/useColorScheme";
import "../global.css";

// Reanimated 로거 설정 - strict 모드 비활성화
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // strict 모드 비활성화로 경고 감소
});

// Configure LogBox to ignore specific warnings
LogBox.ignoreLogs([
  // Reanimated 관련 경고 (로거 설정으로 대체)
  "[Reanimated] Reading from `value` during component render",
  "[Reanimated]",

  // UI 스타일 관련 (React Native 호환성)
  "props.pointerEvents is deprecated",
  "shadow* style props are deprecated",
  "Use style.pointerEvents",
  "Use boxShadow",
  "Image: style.resizeMode is deprecated",
  "Please use props.resizeMode",

  // 순환 참조 관련 (Metro bundler)
  "Require cycles are allowed",
  "Consider refactoring to remove the need for a cycle",
  "factory",
  "Require cycle:",

  // 컴포넌트 관련
  "Access to storage is not allowed from this context",
  "Function components cannot be given refs",

  // 폰트 관련 경고 제거 (FontAwesome 제거 후 불필요)
]);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// ✅ 안전한 SplashScreen 초기화
const initializeSplashScreen = async () => {
  try {
    // 웹 환경에서는 SplashScreen API 없음
    if (Platform.OS === "web") {
      console.log("🌐 웹 환경: SplashScreen 스킵");
      return;
    }

    // SplashScreen API 존재 여부 확인
    if (!SplashScreen.preventAutoHideAsync) {
      console.warn("⚠️ SplashScreen API 사용 불가");
      return;
    }

    // 자동 숨김 방지 (안전하게 처리)
    await SplashScreen.preventAutoHideAsync();
    console.log("✅ SplashScreen 자동 숨김 방지 설정 완료");
  } catch (error) {
    console.warn("SplashScreen 초기화 실패 (앱은 정상 동작):", error);
  }
};

// 초기화 실행
initializeSplashScreen();

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    NanumGothic: require("../assets/fonts/NanumGothic.otf"),
    NanumGothicBold: require("../assets/fonts/NanumGothicBold.otf"),
    // FontAwesome.font 제거 - 실제로 사용되지 않으며 Asset Registry 오류 원인
  });

  // ✅ 안전한 SplashScreen 숨김 처리
  useEffect(() => {
    if (loaded || error) {
      hideSplashScreenSafely();
    }
  }, [loaded, error]);

  // Always render the app, even if fonts aren't loaded
  return <RootLayoutNav />;
}

// ✅ 안전한 SplashScreen 숨김 함수
const hideSplashScreenSafely = async () => {
  try {
    // 웹 환경에서는 스킵
    if (Platform.OS === "web") {
      return;
    }

    // API 존재 여부 확인
    if (!SplashScreen.hideAsync) {
      console.warn("SplashScreen.hideAsync API 사용 불가");
      return;
    }

    await SplashScreen.hideAsync();
    console.log("✅ SplashScreen 숨김 완료");
  } catch (error) {
    console.warn("SplashScreen 숨김 실패 (앱은 정상 동작):", error);
  }
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [showDebugger, setShowDebugger] = useState(false);

  // 권한 관리 훅 사용
  const { isFirstLaunch, isLoading: permissionsLoading } = usePermissions();

  // 업데이트 관리 훅 사용
  const {
    isUpdateAvailable,
    isDownloading,
    isDownloaded,
    error,
    checkForUpdates,
    downloadUpdate,
    applyUpdate,
    resetUpdateState,
  } = useAppUpdates();

  // 업데이트 모달 상태 관리
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // 업데이트 사용 가능 시 모달 표시
  useEffect(() => {
    if (isUpdateAvailable && !isDownloading && !isDownloaded) {
      setShowUpdateModal(true);
    }
  }, [isUpdateAvailable, isDownloading, isDownloaded]);

  // 다운로드 시작 시 진행률 모달 표시
  useEffect(() => {
    if (isDownloading || isDownloaded || error) {
      setShowProgressModal(true);
      setShowUpdateModal(false);
    }
  }, [isDownloading, isDownloaded, error]);

  const handleDownload = async () => {
    setShowUpdateModal(false);
    await downloadUpdate();
  };

  const handleApplyUpdate = async () => {
    setShowProgressModal(false);
    await applyUpdate();
  };

  const handleDismissProgress = () => {
    setShowProgressModal(false);
    resetUpdateState();
  };

  // 첫 실행 시 권한 요청 화면 표시
  if (isFirstLaunch && !permissionsLoading) {
    return <PermissionRequestScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider mode={(colorScheme ?? "light") as "light" | "dark"}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              justifyContent: "flex-start",
              alignItems: "stretch",
              flex: 1,
            },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile-edit" />
          <Stack.Screen name="auction-detail/[id]" />
          <Stack.Screen name="auction-create" />
          {/* Removed manual Stack.Screen declarations for file-based routes:
              - auction-create/scrap and its sub-routes
              - auction-create/machinery and its sub-routes  
              - auction-create/materials and its sub-routes
              - auction-create/demolition and its sub-routes
              These are automatically handled by Expo Router */}
        </Stack>

        {/* 업데이트 모달들 */}
        <UpdateAvailableModal
          visible={showUpdateModal}
          updateState={{
            isUpdateAvailable,
            isDownloading,
            isDownloaded,
            error,
            updateStatus: "idle",
            downloadProgress: null,
            isUpdatePending: false,
            lastChecked: null,
            updateInfo: null,
            isAutoCheckEnabled: true,
            currentVersion: Constants.expoConfig?.version || "알 수 없음",
            buildNumber: String(
              Constants.expoConfig?.ios?.buildNumber ||
                Constants.expoConfig?.android?.versionCode ||
                "알 수 없음"
            ),
            updateMessage: null,
          }}
          onDownload={handleDownload}
          onDismiss={() => setShowUpdateModal(false)}
          onCheckAgain={() => checkForUpdates(true)}
        />

        <UpdateProgressModal
          visible={showProgressModal}
          updateState={{
            isUpdateAvailable,
            isDownloading,
            isDownloaded,
            error,
            updateStatus: "idle",
            downloadProgress: null,
            isUpdatePending: false,
            lastChecked: null,
            updateInfo: null,
            isAutoCheckEnabled: true,
            currentVersion: Constants.expoConfig?.version || "알 수 없음",
            buildNumber: String(
              Constants.expoConfig?.ios?.buildNumber ||
                Constants.expoConfig?.android?.versionCode ||
                "알 수 없음"
            ),
            updateMessage: null,
          }}
          onApplyUpdate={handleApplyUpdate}
          onDismiss={handleDismissProgress}
        />

        {/* 디버거 토글 (개발 모드에서만) */}
        {__DEV__ && (
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 50,
              right: 20,
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: 10,
              borderRadius: 5,
              zIndex: 1000,
            }}
            onPress={() => setShowDebugger(!showDebugger)}
          >
            <Text style={{ color: "white", fontSize: 12 }}>Debug</Text>
          </TouchableOpacity>
        )}

        {/* 쿼리 디버거 */}
        {showDebugger && (
          <QueryDebugger
            visible={showDebugger}
            onClose={() => setShowDebugger(false)}
          />
        )}
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
