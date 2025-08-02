import React from "react";
import { View } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Trophy, Heart, X, Ban, HelpCircle } from "lucide-react-native";
import type { AuctionResult } from "@/data/types/auction";

interface ResultBadgeProps {
  result: AuctionResult;
  winningAmount?: number;
  isWinner?: boolean;
  size?: "sm" | "md" | "lg";
  showAmount?: boolean;
}

export const ResultBadge: React.FC<ResultBadgeProps> = ({
  result,
  winningAmount,
  isWinner = false,
  size = "md",
  showAmount = false,
}) => {
  // 결과가 null이면 렌더링하지 않음 (진행 중인 경매)
  if (!result) return null;

  const getBadgeConfig = () => {
    switch (result) {
      case "successful":
        if (isWinner) {
          return {
            text: "🏆 낙찰",
            backgroundColor: "bg-yellow-500",
            textColor: "text-black",
            borderColor: "border-yellow-600",
            icon: Trophy,
            iconColor: "#000000",
          };
        } else {
          return {
            text: "💔 아쉬워요",
            backgroundColor: "bg-gray-500",
            textColor: "text-white",
            borderColor: "border-gray-600",
            icon: Heart,
            iconColor: "#FFFFFF",
          };
        }

      case "failed":
        return {
          text: "📤 유찰",
          backgroundColor: "bg-red-500",
          textColor: "text-white",
          borderColor: "border-red-600",
          icon: X,
          iconColor: "#FFFFFF",
        };

      case "cancelled":
        return {
          text: "❌ 취소",
          backgroundColor: "bg-gray-600",
          textColor: "text-white",
          borderColor: "border-gray-700",
          icon: Ban,
          iconColor: "#FFFFFF",
        };

      default:
        return {
          text: "❓ 알 수 없음",
          backgroundColor: "bg-gray-500",
          textColor: "text-white",
          borderColor: "border-gray-600",
          icon: HelpCircle,
          iconColor: "#FFFFFF",
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case "sm":
        return {
          containerClass: "px-2 py-1 rounded-md",
          textClass: "text-xs",
          iconSize: 12,
        };
      case "md":
        return {
          containerClass: "px-3 py-1.5 rounded-lg",
          textClass: "text-sm",
          iconSize: 16,
        };
      case "lg":
        return {
          containerClass: "px-4 py-2 rounded-xl",
          textClass: "text-base",
          iconSize: 20,
        };
      default:
        return {
          containerClass: "px-3 py-1.5 rounded-lg",
          textClass: "text-sm",
          iconSize: 16,
        };
    }
  };

  const config = getBadgeConfig();
  const sizeConfig = getSizeConfig();
  const IconComponent = config.icon;

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만`;
    } else {
      return `${amount.toLocaleString()}`;
    }
  };

  return (
    <View
      className={`${config.backgroundColor} ${config.borderColor} border ${sizeConfig.containerClass} shadow-sm`}
    >
      <HStack className="items-center space-x-1">
        <IconComponent
          size={sizeConfig.iconSize}
          color={config.iconColor}
          strokeWidth={2}
        />
        <Text
          className={`${config.textColor} ${sizeConfig.textClass} font-bold`}
        >
          {config.text}
        </Text>
        {showAmount && winningAmount && result === "successful" && (
          <Text
            className={`${config.textColor} ${sizeConfig.textClass} font-semibold`}
          >
            ₩{formatAmount(winningAmount)}
          </Text>
        )}
      </HStack>
    </View>
  );
};

// 컴팩트한 버전 (아이콘만)
export const ResultBadgeCompact: React.FC<
  Pick<ResultBadgeProps, "result" | "isWinner" | "size">
> = ({ result, isWinner = false, size = "md" }) => {
  if (!result) return null;

  const getBadgeConfig = () => {
    switch (result) {
      case "successful":
        return {
          icon: isWinner ? Trophy : Heart,
          color: isWinner ? "#FCD34D" : "#6B7280",
          backgroundColor: isWinner ? "bg-yellow-500/20" : "bg-gray-500/20",
        };
      case "failed":
        return {
          icon: X,
          color: "#EF4444",
          backgroundColor: "bg-red-500/20",
        };
      case "cancelled":
        return {
          icon: Ban,
          color: "#6B7280",
          backgroundColor: "bg-gray-500/20",
        };
      default:
        return {
          icon: HelpCircle,
          color: "#6B7280",
          backgroundColor: "bg-gray-500/20",
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case "sm":
        return { iconSize: 16, containerClass: "w-8 h-8" };
      case "md":
        return { iconSize: 20, containerClass: "w-10 h-10" };
      case "lg":
        return { iconSize: 24, containerClass: "w-12 h-12" };
      default:
        return { iconSize: 20, containerClass: "w-10 h-10" };
    }
  };

  const config = getBadgeConfig();
  const sizeConfig = getSizeConfig();
  const IconComponent = config.icon;

  return (
    <View
      className={`${config.backgroundColor} ${sizeConfig.containerClass} rounded-full items-center justify-center`}
    >
      <IconComponent
        size={sizeConfig.iconSize}
        color={config.color}
        strokeWidth={2}
      />
    </View>
  );
};
