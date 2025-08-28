import React from "react";
import { View, TouchableOpacity } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { formatAuctionPrice } from "@/data";
import { useRouter } from "expo-router";
import { maskBidderName } from "@/utils/nameUtils";
import type { AuctionItem, AuctionResultInfo } from "@/data/types/auction";

interface LosingResultCardProps {
  auction: AuctionItem;
  result: AuctionResultInfo;
  myHighestBid?: number; // 내가 입찰한 최고가 (향후 계산 로직 추가)
}

export const LosingResultCard: React.FC<LosingResultCardProps> = ({
  auction,
  result,
  myHighestBid,
}) => {
  const router = useRouter();

  const handleViewSimilarAuctions = () => {
    // 비슷한 경매 보기
    router.push(`/(tabs)/auction?category=${auction.auctionCategory}`);
  };

  const handleCreateSimilarAuction = () => {
    // 비슷한 경매 등록하기
    router.push(`/auction-create?category=${auction.auctionCategory}`);
  };

  const priceDifference =
    result.winningAmount && myHighestBid
      ? result.winningAmount - myHighestBid
      : 0;

  return (
    <VStack space="lg" className="px-6">
      {/* 아쉬움 헤더 */}
      <LinearGradient
        colors={["#6B7280", "#4B5563", "#374151"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-2xl p-6"
      >
        <VStack space="md" className="items-center">
          <Ionicons name="heart-dislike" size={48} color="#FFFFFF" />
          <Text className="text-white text-2xl font-black text-center">
            😔 아쉬워요
          </Text>
          <Text className="text-white/90 text-lg font-bold text-center">
            이번엔 낙찰받지 못했어요
          </Text>
        </VStack>
      </LinearGradient>

      {/* 경매 결과 정보 */}
      <Box className="rounded-2xl p-6 bg-gray-500/5 border border-gray-500/20">
        <VStack space="lg">
          <HStack className="justify-between items-center">
            <Text className="text-gray-300 text-lg font-bold">
              🏆 낙찰 금액
            </Text>
            <Text className="text-white text-xl font-black">
              {formatAuctionPrice(result.winningAmount || 0)}
            </Text>
          </HStack>

          {result.winningUserName && (
            <HStack className="justify-between items-center">
              <Text className="text-gray-300 text-lg font-bold">👤 낙찰자</Text>
              <Text className="text-white/80 text-sm">
                {maskBidderName(result.winningUserName)}
              </Text>
            </HStack>
          )}

          {myHighestBid && (
            <>
              <HStack className="justify-between items-center">
                <Text className="text-blue-300 text-lg font-bold">
                  💰 내 최고 입찰가
                </Text>
                <Text className="text-white text-lg font-bold">
                  {formatAuctionPrice(myHighestBid)}
                </Text>
              </HStack>

              {priceDifference > 0 && (
                <HStack className="justify-between items-center">
                  <Text className="text-orange-300 text-lg font-bold">
                    📊 차이 금액
                  </Text>
                  <Text className="text-orange-300 text-lg font-bold">
                    +{formatAuctionPrice(priceDifference)}
                  </Text>
                </HStack>
              )}
            </>
          )}

          <HStack className="justify-between items-center">
            <Text className="text-gray-300 text-lg font-bold">
              📅 낙찰 일시
            </Text>
            <Text className="text-white/80 text-sm">
              {result.processedAt.toLocaleDateString()}{" "}
              {result.processedAt.toLocaleTimeString()}
            </Text>
          </HStack>
        </VStack>
      </Box>

      {/* 격려 메시지 */}
      <Box className="rounded-2xl p-6 bg-purple-500/5 border border-purple-500/20">
        <VStack space="md" className="items-center">
          <Ionicons name="heart" size={32} color="#A855F7" />
          <Text className="text-purple-300 text-lg font-bold text-center">
            💪 다음 기회에는 꼭!
          </Text>
          <Text className="text-white/70 text-sm text-center">
            아쉽지만 좋은 경매는 또 있어요.{"\n"}
            비슷한 상품들을 계속 확인해보세요!
          </Text>
        </VStack>
      </Box>

      {/* 추천 액션 */}
      <Box className="rounded-2xl p-6 bg-blue-500/5 border border-blue-500/20">
        <VStack space="md">
          <Text className="text-blue-300 text-lg font-bold text-center">
            🎯 다음에 시도해볼 수 있는 것들
          </Text>

          <VStack space="sm">
            <HStack className="items-center">
              <Ionicons name="search" size={20} color="#3B82F6" />
              <Text className="text-white/80 text-sm ml-2">
                비슷한 상품의 다른 경매 찾아보기
              </Text>
            </HStack>
            <HStack className="items-center">
              <Ionicons name="trending-up" size={20} color="#10B981" />
              <Text className="text-white/80 text-sm ml-2">
                입찰 전략 개선 (조금 더 높은 가격으로)
              </Text>
            </HStack>
            <HStack className="items-center">
              <Ionicons name="add-circle" size={20} color="#F59E0B" />
              <Text className="text-white/80 text-sm ml-2">
                직접 원하는 조건으로 구매 경매 등록
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      {/* 팁 박스 */}
      <Box className="rounded-xl p-4 bg-yellow-500/5 border border-yellow-500/20">
        <VStack space="sm">
          <HStack className="items-center">
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text className="text-yellow-300 font-bold ml-2">
              💡 입찰 성공 팁
            </Text>
          </HStack>
          <Text className="text-white/70 text-sm">
            • 경매 마감 직전보다는 여유있게 입찰하세요{"\n"}• 시장 가격을 미리
            조사해보세요{"\n"}• 감정가 대신 실제 필요한 최대 금액을 설정하세요
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
};
