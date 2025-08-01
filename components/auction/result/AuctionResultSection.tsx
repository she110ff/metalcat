import React from "react";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { useAuth } from "@/hooks/useAuth";
import { WinningResultCard } from "./WinningResultCard";
import { LosingResultCard } from "./LosingResultCard";
import { FailedAuctionCard } from "./FailedAuctionCard";
import { ProcessingResultCard } from "./ProcessingResultCard";
import type { AuctionItem, AuctionResultInfo } from "@/data/types/auction";

interface AuctionResultSectionProps {
  auction: AuctionItem;
  result?: AuctionResultInfo | null;
  isLoading?: boolean;
  error?: Error | null;
}

export const AuctionResultSection: React.FC<AuctionResultSectionProps> = ({
  auction,
  result,
  isLoading = false,
  error,
}) => {
  const { user } = useAuth();

  // 로딩 중
  if (isLoading) {
    return <ProcessingResultCard auction={auction} />;
  }

  // 에러 발생
  if (error) {
    return (
      <VStack space="md" className="px-6">
        <Box className="rounded-2xl p-6 bg-red-500/5 border border-red-500/20">
          <VStack space="md" className="items-center">
            <Text className="text-red-300 text-lg font-bold text-center">
              ⚠️ 결과 조회 오류
            </Text>
            <Text className="text-white/70 text-sm text-center">
              경매 결과를 불러오는 중 오류가 발생했습니다.{"\n"}
              잠시 후 다시 시도해주세요.
            </Text>
            <Text className="text-red-400 text-xs text-center">
              오류: {error.message}
            </Text>
          </VStack>
        </Box>
      </VStack>
    );
  }

  // 결과가 아직 없는 경우 (처리 중)
  if (!result) {
    return <ProcessingResultCard auction={auction} />;
  }

  // 현재 사용자 관련 정보 계산
  const currentUserId = user?.id;
  const isWinner =
    result.result === "successful" && result.winningUserId === currentUserId;
  const isSeller = auction.userId === currentUserId;
  const isParticipant =
    auction.bids?.some((bid) => bid.userId === currentUserId) || false;

  // 🐛 디버깅 로그 추가
  console.log("🔍 [AuctionResultSection] 디버깅 정보:", {
    auctionId: auction.id,
    resultType: result.result,
    currentUserId,
    winningUserId: result.winningUserId,
    isWinner,
    isParticipant,
    isSeller,
    auctionBidsCount: auction.bids?.length || 0,
    myBids: auction.bids?.filter((bid) => bid.userId === currentUserId) || [],
  });

  // 내가 입찰한 최고가 계산 (향후 구현 시 사용)
  const myHighestBid =
    auction.bids
      ?.filter((bid) => bid.userId === currentUserId)
      ?.reduce((max, bid) => Math.max(max, bid.amount), 0) || 0;

  // 🔒 엄격한 낙찰자 검증
  const isConfirmedWinner =
    result.result === "successful" &&
    result.winningUserId === currentUserId &&
    currentUserId !== null &&
    currentUserId !== undefined;

  // 결과 타입에 따른 컴포넌트 렌더링
  switch (result.result) {
    case "successful":
      // 낙찰된 경우
      if (isConfirmedWinner) {
        // ✅ 확실히 내가 낙찰받은 경우만 축하 카드 표시
        console.log(
          "🎉 [AuctionResultSection] 정개발 낙찰 확인! 축하 카드 표시"
        );
        return <WinningResultCard auction={auction} result={result} />;
      } else if (isParticipant) {
        // 💔 내가 참여했지만 낙찰받지 못한 경우
        console.log(
          "💔 [AuctionResultSection] 정개발 낙찰 실패, 아쉬워요 카드 표시"
        );
        return (
          <LosingResultCard
            auction={auction}
            result={result}
            myHighestBid={myHighestBid}
          />
        );
      } else {
        // 👀 참여하지 않았던 경우 - 간단한 낙찰 정보만 표시 (축하 메시지 없음)
        console.log(
          "👀 [AuctionResultSection] 정개발 미참여, 일반 낙찰 정보만 표시"
        );
        return (
          <VStack space="md" className="px-6">
            <Box className="rounded-2xl p-6 bg-green-500/5 border border-green-500/20">
              <VStack space="md" className="items-center">
                <Text className="text-green-300 text-xl font-bold text-center">
                  🏆 낙찰 완료
                </Text>
                <Text className="text-white text-lg font-bold">
                  ₩{result.winningAmount?.toLocaleString()} 에 낙찰되었습니다
                </Text>
                {result.winningUserName && (
                  <Text className="text-white/70 text-sm">
                    낙찰자: {result.winningUserName}
                  </Text>
                )}
                <Text className="text-white/60 text-sm text-center">
                  {result.processedAt.toLocaleDateString()}{" "}
                  {result.processedAt.toLocaleTimeString()}
                </Text>
              </VStack>
            </Box>
          </VStack>
        );
      }

    case "failed":
      // 유찰된 경우
      return <FailedAuctionCard auction={auction} result={result} />;

    case "cancelled":
      // 취소된 경우
      return (
        <VStack space="md" className="px-6">
          <Box className="rounded-2xl p-6 bg-gray-500/5 border border-gray-500/20">
            <VStack space="md" className="items-center">
              <Text className="text-gray-300 text-xl font-bold text-center">
                ❌ 경매 취소
              </Text>
              <Text className="text-white/70 text-sm text-center">
                이 경매는 취소되었습니다.{"\n"}
                자세한 사항은 판매자에게 문의해주세요.
              </Text>
              <Text className="text-white/60 text-sm text-center">
                취소 일시: {result.processedAt.toLocaleDateString()}{" "}
                {result.processedAt.toLocaleTimeString()}
              </Text>
            </VStack>
          </Box>
        </VStack>
      );

    default:
      // 알 수 없는 상태
      return (
        <VStack space="md" className="px-6">
          <Box className="rounded-2xl p-6 bg-yellow-500/5 border border-yellow-500/20">
            <VStack space="md" className="items-center">
              <Text className="text-yellow-300 text-xl font-bold text-center">
                ❓ 알 수 없는 상태
              </Text>
              <Text className="text-white/70 text-sm text-center">
                경매 결과를 확인할 수 없습니다.{"\n"}
                관리자에게 문의해주세요.
              </Text>
              <Text className="text-white/60 text-xs text-center">
                결과 타입: {result.result}
              </Text>
            </VStack>
          </Box>
        </VStack>
      );
  }
};

// 편의를 위한 추가 export
export {
  WinningResultCard,
  LosingResultCard,
  FailedAuctionCard,
  ProcessingResultCard,
};
