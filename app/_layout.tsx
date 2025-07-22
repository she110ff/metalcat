import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { LogBox, TouchableOpacity, Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryDebugger } from "@/components/QueryDebugger";

// Configure LogBox to ignore specific warnings
LogBox.ignoreLogs([
  "props.pointerEvents is deprecated",
  "shadow* style props are deprecated",
  "Use style.pointerEvents",
  "Use boxShadow",
  "Require cycles are allowed",
  "Consider refactoring to remove the need for a cycle",
  "factory",
  "Require cycle:",
  "Failed to decode downloaded font",
  "OTS parsing error",
  "Access to storage is not allowed from this context",
  "Function components cannot be given refs",
  "Image: style.resizeMode is deprecated",
  "Please use props.resizeMode",
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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
    NanumGothic: require("../assets/fonts/NanumGothic.ttf"),
    NanumGothicBold: require("../assets/fonts/NanumGothicBold.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) {
      console.warn("Font loading error:", error);
      // Don't throw error, just log it
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Always render the app, even if fonts aren't loaded
  return <RootLayoutNav />;
}

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
