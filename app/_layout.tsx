import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { LogBox, TouchableOpacity, Text, Platform } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryDebugger } from "@/components/QueryDebugger";

// Configure LogBox to ignore specific warnings
LogBox.ignoreLogs([
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
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { useColorScheme } from "@/components/useColorScheme";
import "../global.css";

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

  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider mode={(colorScheme ?? "light") as "light" | "dark"}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auction-detail/[id]" />
            <Stack.Screen name="auction-create" />
          </Stack>
        </ThemeProvider>
      </GluestackUIProvider>
      {/* 개발 환경에서만 Query Debugger 표시 */}
      {__DEV__ && (
        <>
          <QueryDebugger
            visible={showDebugger}
            onClose={() => setShowDebugger(false)}
          />
          {/* 디버거 토글 버튼 */}
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 50,
              right: 10,
              backgroundColor: "#333",
              padding: 10,
              borderRadius: 5,
              zIndex: 999,
            }}
            onPress={() => setShowDebugger(!showDebugger)}
          >
            <Text style={{ color: "#fff", fontSize: 12 }}>Query Debug</Text>
          </TouchableOpacity>
        </>
      )}
    </QueryClientProvider>
  );
}
