import React from "react";
import { View, TouchableOpacity, Linking } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Trophy, CheckCircle, MapPin, Phone, Info } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { formatAuctionPrice } from "@/data";
import { useAuth } from "@/hooks/useAuth";
import type { AuctionItem, AuctionResultInfo } from "@/data/types/auction";

interface WinningResultCardProps {
  auction: AuctionItem;
  result: AuctionResultInfo;
}

export const WinningResultCard: React.FC<WinningResultCardProps> = ({
  auction,
  result,
}) => {
  // 🔒 추가 안전 검증: 이 컴포넌트는 오직 낙찰받은 사용자에게만 보여져야 함
  const { user } = useAuth();
  const currentUserId = user?.id;

  // 🚨 안전장치: 혹시라도 잘못 호출된 경우 에러 표시
  if (
    result.result !== "successful" ||
    result.winningUserId !== currentUserId
  ) {
    console.error(
      "🚨 [WinningResultCard] 잘못된 호출! 낙찰받지 않은 사용자에게 축하 카드 표시 시도:",
      {
        auctionId: auction.id,
        resultType: result.result,
        currentUserId,
        winningUserId: result.winningUserId,
      }
    );

    return (
      <VStack space="md" className="px-6">
        <Box className="rounded-2xl p-6 bg-red-500/5 border border-red-500/20">
          <Text className="text-red-300 text-center">
            ⚠️ 표시 오류: 낙찰받지 않은 사용자입니다
          </Text>
        </Box>
      </VStack>
    );
  }

  // 🐛 디버깅 로그
  console.log("🏆 [WinningResultCard] 정상 렌더링됨:", {
    auctionId: auction.id,
    auctionTitle: auction.title,
    winningAmount: result.winningAmount,
    winningUserId: result.winningUserId,
    currentUserId,
  });

  const handleContactSeller = () => {
    // 판매자 전화번호로 전화 걸기
    const sellerPhone = auction.sellerPhone || "010-0000-0000";
    Linking.openURL(`tel:${sellerPhone}`);
  };

  return (
    <VStack space="lg" className="px-6">
      {/* 축하 헤더 */}
      <LinearGradient
        colors={["#FCD34D", "#F59E0B", "#D97706"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-2xl p-6"
      >
        <VStack space="md" className="items-center">
          <Trophy size={48} color="#FFFFFF" />
          <Text className="text-white text-2xl font-black text-center">
            🎉 축하합니다!
          </Text>
          <Text className="text-white/90 text-lg font-bold text-center">
            낙찰받으셨습니다!
          </Text>
        </VStack>
      </LinearGradient>

      {/* 낙찰 정보 */}
      <Box className="rounded-2xl p-6 bg-green-500/5 border border-green-500/20">
        <VStack space="lg">
          <HStack className="justify-between items-center">
            <Text className="text-green-300 text-lg font-bold">
              💰 낙찰 금액
            </Text>
            <Text className="text-white text-xl font-black">
              {formatAuctionPrice(result.winningAmount || 0)}
            </Text>
          </HStack>

          <HStack className="justify-between items-center">
            <Text className="text-blue-300 text-lg font-bold">
              📅 낙찰 일시
            </Text>
            <Text className="text-white text-sm">
              {result.processedAt.toLocaleDateString()}{" "}
              {result.processedAt.toLocaleTimeString()}
            </Text>
          </HStack>
        </VStack>
      </Box>

      {/* 다음 단계 안내 */}
      <Box className="rounded-2xl p-6 bg-blue-500/5 border border-blue-500/20">
        <VStack space="md">
          <Text className="text-blue-300 text-lg font-bold text-center">
            📋 다음 단계
          </Text>

          <VStack space="sm">
            <HStack className="items-center">
              <CheckCircle size={20} color="#10B981" />
              <Text className="text-white text-sm ml-2">
                1. 판매자와 연락하여 거래 조건 확인
              </Text>
            </HStack>
            <HStack className="items-center">
              <MapPin size={20} color="#3B82F6" />
              <Text className="text-white text-sm ml-2">
                2. 물품 수령 장소 및 일정 조율
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      {/* 판매자 연락하기 버튼 */}
      <VStack space="md">
        <TouchableOpacity
          onPress={handleContactSeller}
          className="bg-green-700 rounded-xl py-6"
          activeOpacity={0.8}
        >
          <VStack className="items-center space-y-2">
            <HStack className="items-center justify-center space-x-4">
              <Phone size={24} color="white" />
              <Text className="text-white font-black text-2xl">
                판매자에게 연락하기
              </Text>
            </HStack>
            <Text className="text-white font-bold text-lg">
              {auction.sellerPhone || "010-0000-0000"}
            </Text>
          </VStack>
        </TouchableOpacity>
      </VStack>

      {/* 주의사항 */}
      <Box className="rounded-xl p-4 bg-yellow-500/5 border border-yellow-500/20">
        <VStack space="sm">
          <HStack className="items-center">
            <Info size={20} color="#F59E0B" />
            <Text className="text-yellow-300 font-bold ml-2">
              거래 시 주의사항
            </Text>
          </HStack>
          <Text className="text-white/70 text-sm">
            • 직접 거래 시 안전한 장소에서 만나주세요{"\n"}• 물품 상태를 반드시
            확인 후 결제하세요{"\n"}• 의심스러운 거래는 즉시 신고해주세요
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
};
