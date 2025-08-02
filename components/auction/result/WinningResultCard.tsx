import React from "react";
import { View, TouchableOpacity, Linking } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import {
  Trophy,
  CheckCircle,
  CreditCard,
  MapPin,
  Phone,
  AlertTriangle,
  Info,
} from "lucide-react-native";
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
    // 판매자에게 연락하기 (향후 구현)
    console.log("판매자에게 연락하기:", auction.userId);
  };

  const handlePayment = () => {
    // 결제 진행하기 (향후 구현)
    console.log("결제 진행하기:", result.winningAmount);
  };

  const formatPaymentDeadline = (deadline?: Date) => {
    if (!deadline) return "미정";

    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}일 ${hours % 24}시간 후`;
    } else if (hours > 0) {
      return `${hours}시간 후`;
    } else if (diff > 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}분 후`;
    } else {
      return "기한 만료";
    }
  };

  const isPaymentOverdue =
    result.paymentDeadline && new Date() > result.paymentDeadline;

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

          {result.paymentDeadline && (
            <HStack className="justify-between items-center">
              <Text
                className={`text-lg font-bold ${
                  isPaymentOverdue ? "text-red-300" : "text-yellow-300"
                }`}
              >
                ⏰ 결제 기한
              </Text>
              <VStack className="items-end">
                <Text
                  className={`text-sm font-bold ${
                    isPaymentOverdue ? "text-red-300" : "text-white"
                  }`}
                >
                  {result.paymentDeadline.toLocaleDateString()}{" "}
                  {result.paymentDeadline.toLocaleTimeString()}
                </Text>
                <Text
                  className={`text-xs ${
                    isPaymentOverdue ? "text-red-400" : "text-white/60"
                  }`}
                >
                  {isPaymentOverdue
                    ? "⚠️ 기한 만료됨"
                    : formatPaymentDeadline(result.paymentDeadline)}
                </Text>
              </VStack>
            </HStack>
          )}

          <HStack className="justify-between items-center">
            <Text className="text-blue-300 text-lg font-bold">
              📅 낙찰 일시
            </Text>
            <Text className="text-white/80 text-sm">
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
              <Text className="text-white/80 text-sm ml-2">
                1. 판매자와 연락하여 거래 조건 확인
              </Text>
            </HStack>
            <HStack className="items-center">
              <CreditCard size={20} color="#F59E0B" />
              <Text className="text-white/80 text-sm ml-2">
                2. 결제 기한 내 대금 결제
              </Text>
            </HStack>
            <HStack className="items-center">
              <MapPin size={20} color="#3B82F6" />
              <Text className="text-white/80 text-sm ml-2">
                3. 물품 수령 장소 및 일정 조율
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      {/* 액션 버튼들 */}
      <VStack space="md">
        <Button
          onPress={handleContactSeller}
          className="bg-green-600 hover:bg-green-700 rounded-xl py-4"
        >
          <HStack className="items-center justify-center space-x-2">
            <Phone size={20} color="white" />
            <ButtonText className="text-white font-bold text-lg">
              판매자에게 연락하기
            </ButtonText>
          </HStack>
        </Button>

        {!isPaymentOverdue && (
          <Button
            onPress={handlePayment}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl py-4"
          >
            <HStack className="items-center justify-center space-x-2">
              <CreditCard size={20} color="white" />
              <ButtonText className="text-white font-bold text-lg">
                결제 진행하기
              </ButtonText>
            </HStack>
          </Button>
        )}

        {isPaymentOverdue && (
          <Box className="rounded-xl p-4 bg-red-500/10 border border-red-500/30">
            <VStack space="sm" className="items-center">
              <AlertTriangle size={24} color="#EF4444" />
              <Text className="text-red-300 font-bold text-center">
                결제 기한이 만료되었습니다
              </Text>
              <Text className="text-red-400 text-sm text-center">
                판매자와 연락하여 거래 가능 여부를 확인해주세요
              </Text>
            </VStack>
          </Box>
        )}
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
