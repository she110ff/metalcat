import React from "react";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Zap, Clock, Timer } from "lucide-react-native";
import {
  getAuctionDurationInfo,
  getTimeUntilAuctionEnd,
  getAuctionDeadlineText,
} from "@/data/utils/auction-utils";

interface AuctionDurationInfoProps {
  transactionType: "normal" | "urgent";
  endTime?: Date;
  showFullDescription?: boolean;
  variant?: "card" | "inline" | "compact";
}

export const AuctionDurationInfo: React.FC<AuctionDurationInfoProps> = ({
  transactionType,
  endTime,
  showFullDescription = false,
  variant = "card",
}) => {
  const durationInfo = getAuctionDurationInfo(transactionType);
  const timeRemaining = endTime ? getTimeUntilAuctionEnd(endTime) : null;
  const deadlineText = endTime
    ? getAuctionDeadlineText(transactionType, endTime)
    : null;

  // 아이콘 컬러 결정
  const iconColor = transactionType === "urgent" ? "#EF4444" : "#22C55E";
  const textColor =
    transactionType === "urgent" ? "text-red-400" : "text-green-400";
  const bgColor =
    transactionType === "urgent"
      ? "bg-red-500/10 border-red-500/20"
      : "bg-green-500/10 border-green-500/20";

  if (variant === "compact") {
    return (
      <HStack className="items-center" space="xs">
        {transactionType === "urgent" ? (
          <Zap size={14} color={iconColor} strokeWidth={2} />
        ) : (
          <Clock size={14} color={iconColor} strokeWidth={2} />
        )}
        <Text className={`${textColor} text-sm font-medium`}>
          {durationInfo.duration}
        </Text>
        {timeRemaining && timeRemaining !== "종료됨" && (
          <>
            <Text className="text-white/40 text-sm">•</Text>
            <Text className="text-white/60 text-sm">{timeRemaining} 남음</Text>
          </>
        )}
      </HStack>
    );
  }

  if (variant === "inline") {
    return (
      <HStack className="items-center justify-between">
        <HStack className="items-center" space="sm">
          {transactionType === "urgent" ? (
            <Zap size={16} color={iconColor} strokeWidth={2} />
          ) : (
            <Clock size={16} color={iconColor} strokeWidth={2} />
          )}
          <Text className={`${textColor} text-base font-semibold`}>
            {durationInfo.description}
          </Text>
        </HStack>
        {timeRemaining && (
          <Text className="text-white/60 text-sm">
            {timeRemaining === "종료됨" ? "경매 종료" : `${timeRemaining} 남음`}
          </Text>
        )}
      </HStack>
    );
  }

  // Card variant (default)
  return (
    <Box className={`rounded-xl p-4 ${bgColor}`}>
      <VStack space="sm">
        <HStack className="items-center justify-between">
          <HStack className="items-center" space="sm">
            {transactionType === "urgent" ? (
              <Zap size={20} color={iconColor} strokeWidth={2} />
            ) : (
              <Clock size={20} color={iconColor} strokeWidth={2} />
            )}
            <Text className={`${textColor} text-lg font-bold`}>
              {durationInfo.description}
            </Text>
          </HStack>
          {timeRemaining && (
            <Text className="text-white font-semibold text-base">
              {timeRemaining === "종료됨"
                ? "경매 종료"
                : `${timeRemaining} 남음`}
            </Text>
          )}
        </HStack>

        {showFullDescription && (
          <Text className="text-white/70 text-sm">
            {durationInfo.fullDescription}
          </Text>
        )}

        <HStack className="items-center" space="xs">
          <Timer size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
          <Text className="text-white/60 text-sm">{durationInfo.endTime}</Text>
        </HStack>
      </VStack>
    </Box>
  );
};
