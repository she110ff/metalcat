import React from "react";
import { View, TouchableOpacity } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import {
  Users,
  TrendingDown,
  Camera,
  Clock,
  MapPin,
  Heart,
  RefreshCw,
  Edit3,
  Search,
  Info,
} from "lucide-react-native";
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

  // 유찰 사유 분석
  const getFailureReason = () => {
    const reason = result.metadata?.reason;
    switch (reason) {
      case "no_bids":
        return {
          title: "입찰자가 없었습니다",
          description: "아무도 입찰하지 않아 경매가 유찰되었습니다.",
          icon: Users,
          color: "#6B7280",
        };
      case "below_starting_price":
        return {
          title: "시작가에 미달되었습니다",
          description: "최고 입찰가가 시작가보다 낮아 유찰되었습니다.",
          icon: TrendingDown,
          color: "#EF4444",
        };
      default:
        return {
          title: "경매가 유찰되었습니다",
          description: "조건에 맞는 낙찰자가 없어 유찰되었습니다.",
          icon: Users,
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
          <failureInfo.icon size={48} color="#FFFFFF" strokeWidth={2} />
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
          <Text className="text-red-300 text-lg font-bold text-center">
            유찰 상세 정보
          </Text>

          <VStack space="md">
            <HStack className="items-center justify-between">
              <HStack className="items-center">
                <TrendingDown size={20} color="#F59E0B" strokeWidth={2} />
                <Text className="text-white/80 text-sm ml-2">최고 입찰가</Text>
              </HStack>
              <Text className="text-white font-bold">
                {formatAuctionPrice(highestBid)}
              </Text>
            </HStack>

            <HStack className="items-center justify-between">
              <HStack className="items-center">
                <Camera size={20} color="#10B981" strokeWidth={2} />
                <Text className="text-white/80 text-sm ml-2">시작가</Text>
              </HStack>
              <Text className="text-white font-bold">
                {formatAuctionPrice(startingPrice)}
              </Text>
            </HStack>

            <HStack className="items-center justify-between">
              <HStack className="items-center">
                <Clock size={20} color="#3B82F6" strokeWidth={2} />
                <Text className="text-white/80 text-sm ml-2">경매 기간</Text>
              </HStack>
              <Text className="text-white font-bold">72시간</Text>
            </HStack>

            <HStack className="items-center justify-between">
              <HStack className="items-center">
                <MapPin size={20} color="#A855F7" strokeWidth={2} />
                <Text className="text-white/80 text-sm ml-2">위치</Text>
              </HStack>
              <Text className="text-white font-bold">서울시 강남구</Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      {/* 다음 단계 안내 */}
      <Box className="rounded-2xl p-6 bg-purple-500/5 border border-purple-500/20">
        <VStack space="md" className="items-center">
          <Heart size={32} color="#A855F7" strokeWidth={2} />
          <Text className="text-purple-300 text-lg font-bold text-center">
            다음 단계
          </Text>
          <Text className="text-white/80 text-sm text-center">
            경매 조건을 조정하여 재경매를 진행하거나, 다른 경매를 둘러보세요.
          </Text>
        </VStack>
      </Box>

      {/* 안내 메시지 */}
      <Box className="rounded-xl p-4 bg-gray-500/10 border border-gray-500/20">
        <VStack space="sm">
          <HStack className="items-center">
            <Info size={20} color="#6B7280" strokeWidth={2} />
            <Text className="text-gray-300 font-bold ml-2">유찰 관련 안내</Text>
          </HStack>
          <Text className="text-gray-400 text-sm">
            • 유찰된 경매는 7일 후 자동으로 삭제됩니다.
            {"\n"}• 재경매 신청 시 새로운 경매 ID가 발급됩니다.
            {"\n"}• 경매 조건 수정 후 즉시 재경매가 가능합니다.
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
};
