import React from "react";
import { config } from "./config";
import { View } from "react-native";
import { OverlayProvider } from "@gluestack-ui/overlay";
import { ToastProvider } from "@gluestack-ui/toast";

export function GluestackUIProvider({
  mode = "light",
  ...props
}: {
  mode?: "light" | "dark";
  children?: any;
}) {
  // 🎨 UX Expert: 마이 화면과 관리자 화면에서 다크테마 비활성화
  const forcedMode = "light";
  return (
    <View
      style={[
        config[forcedMode],
        { flex: 1, height: "100%", width: "100%" },
        // @ts-ignore
        props.style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
