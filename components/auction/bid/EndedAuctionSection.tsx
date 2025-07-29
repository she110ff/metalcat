import React from "react";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";

interface EndedAuctionSectionProps {
  hasBids: boolean;
}

export const EndedAuctionSection: React.FC<EndedAuctionSectionProps> = ({
  hasBids,
}) => {
  return (
    <VStack space="lg" className="px-6">
      <Text className="text-red-300 text-xl font-black tracking-[2px] uppercase">
        경매 종료
      </Text>

      <Box className="rounded-2xl p-6 bg-red-500/5 border border-red-500/15 shadow-lg shadow-black/40">
        <VStack space="md" className="items-center">
          <Ionicons
            name="time-outline"
            size={48}
            color="rgba(239, 68, 68, 0.8)"
          />
          <Text className="text-red-300 text-lg font-bold text-center">
            이 경매는 종료되었습니다
          </Text>
          <Text className="text-white/60 text-sm text-center">
            {hasBids
              ? "다른 경매에 참여해보세요!"
              : "입찰자가 없어 경매가 무효 처리되었습니다."}
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
};
