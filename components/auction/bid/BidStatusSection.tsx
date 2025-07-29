import React from "react";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import { formatAuctionPrice } from "@/data/utils/auction-utils";

interface BidStatusSectionProps {
  auctionStatus: "active" | "ending" | "ended";
  currentBid: number;
  endTime: string; // 이미 포맷된 시간 문자열
  bidders: number;
  winnerInfo?: {
    userName: string;
    amount: number;
  };
  hasBids: boolean;
}

export const BidStatusSection: React.FC<BidStatusSectionProps> = ({
  auctionStatus,
  currentBid,
  endTime,
  bidders,
  winnerInfo,
  hasBids,
}) => {
  return (
    <VStack space="lg" className="px-6">
      <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
        현재 입찰 현황
      </Text>

      <Box className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg shadow-black/40">
        <VStack space="lg">
          <HStack className="items-center justify-between">
            <VStack space="xs">
              <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                {auctionStatus === "ended" ? "최종 입찰가" : "현재 입찰가"}
              </Text>
              <Text className="text-white font-bold text-2xl tracking-wide">
                {formatAuctionPrice(currentBid)}
              </Text>
            </VStack>

            <VStack className="items-end" space="xs">
              <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                {auctionStatus === "ended" ? "종료 시간" : "남은 시간"}
              </Text>
              <Text className="text-white font-semibold text-lg tracking-wide">
                {endTime}
              </Text>
            </VStack>
          </HStack>

          <HStack className="items-center justify-between">
            <HStack className="items-center" space="xs">
              <Ionicons
                name="people"
                size={16}
                color="rgba(255, 255, 255, 0.6)"
              />
              <Text className="text-white/60 text-xs">{bidders}명 참여</Text>
            </HStack>

            <Box
              className={`px-3 py-1 rounded-lg ${
                auctionStatus === "active"
                  ? "bg-green-500"
                  : auctionStatus === "ending"
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
            >
              <Text className="text-white font-semibold text-xs tracking-wide">
                {auctionStatus === "active"
                  ? "진행중"
                  : auctionStatus === "ending"
                  ? "마감임박"
                  : "종료"}
              </Text>
            </Box>
          </HStack>

          {/* 종료된 경매에서 낙찰자 정보 표시 */}
          {auctionStatus === "ended" && hasBids && winnerInfo && (
            <Box className="rounded-xl p-4 mt-2 bg-green-500/10 border border-green-500/20">
              <HStack className="items-center justify-between">
                <VStack space="xs">
                  <Text className="text-green-300 text-xs font-semibold uppercase tracking-[1px]">
                    낙찰자
                  </Text>
                  <Text className="text-white font-semibold text-base">
                    {winnerInfo.userName}
                  </Text>
                </VStack>
                <VStack className="items-end" space="xs">
                  <Text className="text-green-300 text-xs font-semibold uppercase tracking-[1px]">
                    낙찰가
                  </Text>
                  <Text className="text-white font-bold text-lg">
                    {formatAuctionPrice(winnerInfo.amount)}
                  </Text>
                </VStack>
              </HStack>
            </Box>
          )}

          {/* 종료된 경매에서 입찰이 없는 경우 */}
          {auctionStatus === "ended" && !hasBids && (
            <Box className="rounded-xl p-4 mt-2 bg-red-500/10 border border-red-500/20">
              <Text className="text-red-300 text-sm font-semibold text-center">
                입찰자가 없어 경매가 무효 처리되었습니다.
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
    </VStack>
  );
};
