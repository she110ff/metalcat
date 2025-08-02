"use client";
import React from "react";

interface IconProps {
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
    accessible?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: string;
  }>;
  size?: number;
  color?: string;
  strokeWidth?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: "image" | "button" | "none";
}

export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 24,
  color = "#000000",
  strokeWidth = 2,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "image",
}) => {
  const IconElement = IconComponent;

  return (
    <IconElement
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
    />
  );
};
