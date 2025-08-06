"use client";
import React from "react";
import { config } from "./config";
import { OverlayProvider } from "@gluestack-ui/overlay";
import { ToastProvider } from "@gluestack-ui/toast";
import { setFlushStyles } from "@gluestack-ui/nativewind-utils/flush";

export function GluestackUIProvider({
  mode = "light",
  ...props
}: {
  mode?: "light" | "dark";
  children?: any;
}) {
  // 🎨 UX Expert: 마이 화면과 관리자 화면에서 다크테마 비활성화
  const forcedMode = "light";
  const stringcssvars = Object.keys(config[forcedMode]).reduce((acc, cur) => {
    acc += `${cur}:${config[forcedMode][cur]};`;
    return acc;
  }, "");
  setFlushStyles(`:root {${stringcssvars}} `);

  if (config[forcedMode] && typeof document !== "undefined") {
    const element = document.documentElement;
    if (element) {
      const head = element.querySelector("head");
      const style = document.createElement("style");
      style.innerHTML = `:root {${stringcssvars}} `;
      if (head) head.appendChild(style);
    }
  }

  return (
    <OverlayProvider>
      <ToastProvider>{props.children}</ToastProvider>
    </OverlayProvider>
  );
}
