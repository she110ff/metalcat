import React, { useState } from "react";
import { Alert } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/ui/input";
import { useCreateBid } from "@/hooks/useAuctions";
import { useAuth } from "@/hooks/useAuth";
import { formatAuctionPrice } from "@/data/utils/auction-utils";

interface BidInputSectionProps {
  auctionId: string;
  currentTopBid: number;
  isActive: boolean;
  isOwner?: boolean;
  onBidSuccess?: () => void;
}

export const BidInputSection: React.FC<BidInputSectionProps> = ({
  auctionId,
  currentTopBid,
  isActive,
  isOwner = false,
  onBidSuccess,
}) => {
  const [bidAmount, setBidAmount] = useState("");
  const createBidMutation = useCreateBid();
  const { user } = useAuth();

  // 숫자에 콤마 추가하는 함수
  const formatNumberWithComma = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, "");
    // 콤마 추가
    if (numbers.length > 0) {
      return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return "";
  };

  // 입력값 변경 처리
  const handleBidAmountChange = (text: string) => {
    // 콤마가 포함된 형식으로 변환
    const formattedText = formatNumberWithComma(text);
    setBidAmount(formattedText);
  };

  const handleBid = async () => {
    if (!bidAmount) {
      Alert.alert("입력 오류", "입찰 금액을 입력해주세요.");
      return;
    }

    // 콤마 제거 후 숫자 변환
    const amount = parseInt(bidAmount.replace(/[^\d]/g, ""));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("입력 오류", "올바른 금액을 입력해주세요.");
      return;
    }

    // 현재 최고 입찰가보다 낮은지 확인
    if (amount <= currentTopBid) {
      Alert.alert(
        "입찰 오류",
        "현재 최고 입찰가보다 높은 금액을 입력해주세요."
      );
      return;
    }

    try {
      // 🔐 로그인 상태 확인
      if (!user) {
        Alert.alert("로그인 필요", "입찰하려면 로그인이 필요합니다.");
        return;
      }

      await createBidMutation.mutateAsync({
        auctionId: auctionId,
        bidData: {
          userId: user.id,
          userName: user.name || "익명",
          amount: amount,
          location: user.address || "위치 미상",
        },
      });

      setBidAmount("");
      Alert.alert("입찰 성공", "입찰이 성공적으로 등록되었습니다.");
      onBidSuccess?.();
    } catch (error: any) {
      Alert.alert("입찰 실패", error.message || "입찰 중 오류가 발생했습니다.");
    }
  };

  // 진행중인 경매가 아니면 렌더링하지 않음
  if (!isActive) {
    return null;
  }

  // 🚫 자신의 경매인 경우 입찰 폼 대신 안내 메시지 표시
  if (isOwner) {
    return (
      <VStack space="lg" className="px-6">
        <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
          내 경매
        </Text>

        <Box className="rounded-2xl p-6 bg-orange-500/10 border border-orange-500/30 shadow-lg shadow-black/40">
          <VStack space="md" className="items-center">
            <Text className="text-orange-300 text-lg font-bold text-center">
              자신이 등록한 경매입니다
            </Text>
            <Text className="text-orange-200/80 text-sm text-center leading-relaxed">
              본인이 등록한 경매에는 입찰할 수 없습니다.{"\n"}
              다른 사용자들의 입찰을 기다려주세요.
            </Text>

            {currentTopBid > 0 && (
              <VStack space="xs" className="items-center mt-2">
                <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                  현재 최고가
                </Text>
                <Text className="text-yellow-300 text-xl font-bold">
                  {formatAuctionPrice(currentTopBid)}
                </Text>
              </VStack>
            )}
          </VStack>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack space="lg" className="px-6">
      <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
        입찰하기
      </Text>

      <Box className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg shadow-black/40">
        <VStack space="md">
          <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
            입찰 금액
          </Text>
          <Input className="bg-white/5 border-white/10 rounded-2xl">
            <InputField
              placeholder="입찰 금액을 입력하세요"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={bidAmount}
              onChangeText={handleBidAmountChange}
              className="text-white text-base px-4 py-3"
              keyboardType="numeric"
            />
          </Input>

          {currentTopBid > 0 && (
            <Text className="text-yellow-300 text-xs font-medium">
              최소 입찰가: {formatAuctionPrice(currentTopBid + 10000)}
            </Text>
          )}

          <Button
            onPress={handleBid}
            disabled={createBidMutation.isPending}
            className={`rounded-2xl border-2 min-h-14 ${
              createBidMutation.isPending
                ? "bg-gray-500/30 border-gray-500/30"
                : "bg-green-500/15 border-green-500/30"
            } shadow-xl ${
              createBidMutation.isPending
                ? "shadow-gray-500/40"
                : "shadow-green-500/40"
            }`}
          >
            <ButtonText
              className={`font-bold tracking-wide text-base ${
                createBidMutation.isPending ? "text-gray-400" : "text-green-300"
              }`}
            >
              {createBidMutation.isPending ? "입찰 중..." : "입찰하기"}
            </ButtonText>
          </Button>
        </VStack>
      </Box>
    </VStack>
  );
};
