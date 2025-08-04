import React from "react";
import { TouchableOpacity } from "react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react-native";
import { UpdateState } from "@/hooks/useAppUpdates";

interface UpdateStatusBadgeProps {
  updateState: UpdateState;
  onPress?: () => void;
  size?: "sm" | "md" | "lg";
}

export function UpdateStatusBadge({
  updateState,
  onPress,
  size = "md",
}: UpdateStatusBadgeProps) {
  const getStatusConfig = () => {
    if (updateState.error) {
      return {
        icon: AlertCircle,
        color: "#ef4444",
        bgColor: "#fef2f2",
        text: "업데이트 오류",
        textColor: "#b91c1c",
      };
    }

    if (updateState.isDownloaded) {
      return {
        icon: CheckCircle,
        color: "#22c55e",
        bgColor: "#f0fdf4",
        text: "업데이트 준비됨",
        textColor: "#15803d",
      };
    }

    if (updateState.isDownloading) {
      return {
        icon: Download,
        color: "#3b82f6",
        bgColor: "#eff6ff",
        text: "다운로드 중...",
        textColor: "#1d4ed8",
      };
    }

    if (updateState.isUpdateAvailable) {
      return {
        icon: RefreshCw,
        color: "#f59e0b",
        bgColor: "#fffbeb",
        text: "업데이트 사용 가능",
        textColor: "#d97706",
      };
    }

    return {
      icon: CheckCircle,
      color: "#22c55e",
      bgColor: "#f0fdf4",
      text: "최신 버전",
      textColor: "#15803d",
    };
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  const getSizeConfig = () => {
    switch (size) {
      case "sm":
        return {
          padding: "p-2",
          iconSize: 12,
          textSize: "xs",
          borderRadius: "rounded-sm",
        };
      case "lg":
        return {
          padding: "p-3",
          iconSize: 20,
          textSize: "md",
          borderRadius: "rounded-lg",
        };
      default:
        return {
          padding: "p-2.5",
          iconSize: 16,
          textSize: "sm",
          borderRadius: "rounded-md",
        };
    }
  };

  const sizeConfig = getSizeConfig();

  const BadgeContent = () => (
    <HStack
      className={`items-center space-x-2 ${config.bgColor} ${sizeConfig.padding} ${sizeConfig.borderRadius} border border-[${config.color}]`}
    >
      <IconComponent size={sizeConfig.iconSize} color={config.color} />
      <Text
        size={sizeConfig.textSize as "xs" | "sm" | "md"}
        className={`text-[${config.textColor}] font-medium`}
      >
        {config.text}
      </Text>
    </HStack>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <BadgeContent />
      </TouchableOpacity>
    );
  }

  return <BadgeContent />;
}
