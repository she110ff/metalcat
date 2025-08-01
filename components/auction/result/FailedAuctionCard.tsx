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
import { useAuth } from "@/hooks/useAuth";
import type { AuctionItem, AuctionResultInfo } from "@/data/types/auction";

interface FailedAuctionCardProps {
  auction: AuctionItem;
  result: AuctionResultInfo;
}

export const FailedAuctionCard: React.FC<FailedAuctionCardProps> = ({
  auction,
  result,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  // 현재 사용자가 판매자인지 확인
  const isSeller = auction.userId === user?.id;

  // 유찰 사유 분석
  const getFailureReason = () => {
    const reason = result.metadata?.reason;
    switch (reason) {
      case "no_bids":
        return {
          title: "입찰자가 없었습니다",
          description: "아무도 입찰하지 않아 경매가 유찰되었습니다.",
          icon: "people-outline" as const,
          color: "#6B7280",
        };
      case "below_starting_price":
        return {
          title: "시작가에 미달되었습니다",
          description: "최고 입찰가가 시작가보다 낮아 유찰되었습니다.",
          icon: "trending-down" as const,
          color: "#EF4444",
        };
      default:
        return {
          title: "경매가 유찰되었습니다",
          description: "조건에 맞는 낙찰자가 없어 유찰되었습니다.",
          icon: "close-circle" as const,
          color: "#6B7280",
        };
    }
  };

  const failureInfo = getFailureReason();
  const highestBid = result.metadata?.highest_bid || 0;
  const startingPrice =
    result.metadata?.starting_price || auction.startingPrice || 0;

  const handleRelistAuction = () => {
    // 재경매 신청 (향후 구현)
    console.log("재경매 신청:", auction.id);
  };

  const handleEditAuction = () => {
    // 경매 조건 수정 (향후 구현)
    router.push(`/auction-create?edit=${auction.id}`);
  };

  const handleViewSimilarAuctions = () => {
    // 비슷한 경매 보기
    router.push(`/(tabs)/auction?category=${auction.auctionCategory}`);
  };

  return (
    <VStack space="lg" className="px-6">
      {/* 유찰 헤더 */}
      <LinearGradient
        colors={["#EF4444", "#DC2626", "#B91C1C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-2xl p-6"
      >
        <VStack space="md" className="items-center">
          <Ionicons name={failureInfo.icon} size={48} color="#FFFFFF" />
          <Text className="text-white text-2xl font-black text-center">
            📤 유찰됨
          </Text>
          <Text className="text-white/90 text-lg font-bold text-center">
            {failureInfo.title}
          </Text>
        </VStack>
      </LinearGradient>

      {/* 유찰 상세 정보 */}
      <Box className="rounded-2xl p-6 bg-red-500/5 border border-red-500/20">
        <VStack space="lg">
          <VStack space="sm" className="items-center">
            <Text className="text-red-300 text-lg font-bold">
              {failureInfo.description}
            </Text>
          </VStack>

          <HStack className="justify-between items-center">
            <Text className="text-gray-300 text-lg font-bold">
              🎯 시작 가격
            </Text>
            <Text className="text-white text-lg font-bold">
              {formatAuctionPrice(startingPrice)}
            </Text>
          </HStack>

          {highestBid > 0 && (
            <HStack className="justify-between items-center">
              <Text className="text-orange-300 text-lg font-bold">
                📊 최고 입찰가
              </Text>
              <Text className="text-orange-300 text-lg font-bold">
                {formatAuctionPrice(highestBid)}
              </Text>
            </HStack>
          )}

          <HStack className="justify-between items-center">
            <Text className="text-blue-300 text-lg font-bold">
              👥 참여 입찰자
            </Text>
            <Text className="text-white/80 text-sm">
              {auction.bidders || 0}명
            </Text>
          </HStack>

          <HStack className="justify-between items-center">
            <Text className="text-gray-300 text-lg font-bold">
              📅 유찰 일시
            </Text>
            <Text className="text-white/80 text-sm">
              {result.processedAt.toLocaleDateString()}{" "}
              {result.processedAt.toLocaleTimeString()}
            </Text>
          </HStack>
        </VStack>
      </Box>

      {/* 판매자용 권장사항 */}
      {isSeller && (
        <Box className="rounded-2xl p-6 bg-blue-500/5 border border-blue-500/20">
          <VStack space="md">
            <Text className="text-blue-300 text-lg font-bold text-center">
              💡 개선 방안
            </Text>

            <VStack space="sm">
              {highestBid > 0 && highestBid < startingPrice && (
                <HStack className="items-center">
                  <Ionicons name="trending-down" size={20} color="#F59E0B" />
                  <Text className="text-white/80 text-sm ml-2">
                    시작가를 {formatAuctionPrice(highestBid)} 정도로 낮춰보세요
                  </Text>
                </HStack>
              )}

              {auction.bidders === 0 && (
                <HStack className="items-center">
                  <Ionicons name="camera" size={20} color="#10B981" />
                  <Text className="text-white/80 text-sm ml-2">
                    더 매력적인 사진이나 설명을 추가해보세요
                  </Text>
                </HStack>
              )}

              <HStack className="items-center">
                <Ionicons name="time" size={20} color="#3B82F6" />
                <Text className="text-white/80 text-sm ml-2">
                  경매 기간을 늘려 더 많은 사람이 참여할 수 있도록 하세요
                </Text>
              </HStack>

              <HStack className="items-center">
                <Ionicons name="location" size={20} color="#A855F7" />
                <Text className="text-white/80 text-sm ml-2">
                  거래 지역을 확대하거나 배송 옵션을 추가해보세요
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </Box>
      )}

      {/* 일반 사용자용 안내 */}
      {!isSeller && (
        <Box className="rounded-2xl p-6 bg-purple-500/5 border border-purple-500/20">
          <VStack space="md" className="items-center">
            <Ionicons name="heart" size={32} color="#A855F7" />
            <Text className="text-purple-300 text-lg font-bold text-center">
              🔍 다른 기회를 찾아보세요
            </Text>
            <Text className="text-white/70 text-sm text-center">
              이 상품은 유찰되었지만,{"\n"}
              비슷한 다른 경매들이 진행 중일 수 있어요!
            </Text>
          </VStack>
        </Box>
      )}

      {/* 액션 버튼들 */}
      <VStack space="md">
        {isSeller ? (
          <>
            <Button
              onPress={handleRelistAuction}
              className="bg-green-600 hover:bg-green-700 rounded-xl py-4"
            >
              <HStack className="items-center justify-center space-x-2">
                <Ionicons name="refresh" size={20} color="white" />
                <ButtonText className="text-white font-bold text-lg">
                  재경매 신청하기
                </ButtonText>
              </HStack>
            </Button>

            <Button
              onPress={handleEditAuction}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl py-4"
            >
              <HStack className="items-center justify-center space-x-2">
                <Ionicons name="create" size={20} color="white" />
                <ButtonText className="text-white font-bold text-lg">
                  경매 조건 수정하기
                </ButtonText>
              </HStack>
            </Button>
          </>
        ) : (
          <Button
            onPress={handleViewSimilarAuctions}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl py-4"
          >
            <HStack className="items-center justify-center space-x-2">
              <Ionicons name="search" size={20} color="white" />
              <ButtonText className="text-white font-bold text-lg">
                비슷한 경매 보기
              </ButtonText>
            </HStack>
          </Button>
        )}
      </VStack>

      {/* 참고 정보 */}
      <Box className="rounded-xl p-4 bg-gray-500/5 border border-gray-500/20">
        <VStack space="sm">
          <HStack className="items-center">
            <Ionicons name="information-circle" size={20} color="#6B7280" />
            <Text className="text-gray-300 font-bold ml-2">참고 정보</Text>
          </HStack>
          <Text className="text-white/70 text-sm">
            {isSeller
              ? "• 유찰된 경매는 언제든 재등록할 수 있습니다\n• 시장 상황에 맞춰 조건을 조정해보세요\n• 더 자세한 상품 정보를 제공하면 도움이 됩니다"
              : "• 유찰된 상품은 판매자가 재등록할 수 있습니다\n• 관심있는 카테고리를 자주 확인해보세요\n• 알림 설정으로 새 경매 소식을 받아보세요"}
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
};
