import React from "react";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { useBids } from "@/hooks/useAuctions";
import { formatAuctionPrice } from "@/data/utils/auction-utils";

interface BidHistorySectionProps {
  auctionId: string;
  maxItems?: number; // 표시할 최대 항목 수
  showTitle?: boolean; // 제목 표시 여부
}

// 시간 차이를 계산하여 "몇 분 전" 형태로 반환
const getTimeAgo = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days}일 전`;
  } else if (hours > 0) {
    return `${hours}시간 전`;
  } else if (minutes > 0) {
    return `${minutes}분 전`;
  } else {
    return "방금 전";
  }
};

export const BidHistorySection: React.FC<BidHistorySectionProps> = ({
  auctionId,
  maxItems,
  showTitle = true,
}) => {
  const { data: bids = [], isLoading } = useBids(auctionId);

  // 입찰 기록을 UI에 맞게 변환
  const bidHistory = bids
    .map((bid) => ({
      id: bid.id,
      bidder: bid.userName || "익명",
      amount: formatAuctionPrice(bid.amount),
      time: getTimeAgo(bid.bidTime),
    }))
    .slice(0, maxItems); // maxItems가 있으면 해당 개수만큼만 표시

  // 입찰 기록이 없으면 렌더링하지 않음
  if (bidHistory.length === 0) {
    return null;
  }

  return (
    <VStack space="lg" className="px-6">
      {showTitle && (
        <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
          입찰 기록
        </Text>
      )}

      <Box className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg shadow-black/40">
        <VStack space="md">
          {bidHistory.map((bid) => (
            <HStack
              key={bid.id}
              className="items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5"
            >
              <VStack space="xs">
                <Text className="text-white font-semibold text-base">
                  {bid.bidder}
                </Text>
                <Text className="text-white/60 text-xs">{bid.time}</Text>
              </VStack>
              <Text className="text-yellow-300 font-bold text-lg">
                {bid.amount}
              </Text>
            </HStack>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
};
