import React, { useState, useEffect } from "react";
import { Alert } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/ui/input";
import { useCreateBid } from "@/hooks/useAuctions";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { formatAuctionPrice } from "@/data/utils/auction-utils";
import { SlaveUserSelectionModal } from "./SlaveUserSelectionModal";
import { SlaveUser } from "@/hooks/admin/useSlaveUsers";
import { Users } from "lucide-react-native";
import { AuctionItem } from "@/data/types/auction";

interface BidInputSectionProps {
  auctionId: string;
  currentTopBid: number;
  isActive: boolean;
  isOwner?: boolean;
  onBidSuccess?: () => void;
  auction?: AuctionItem; // 경매 정보 (고철 경매 여부 및 중량 확인용)
}

export const BidInputSection: React.FC<BidInputSectionProps> = ({
  auctionId,
  currentTopBid,
  isActive,
  isOwner = false,
  onBidSuccess,
  auction,
}) => {
  const [bidAmount, setBidAmount] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState(""); // 단위가격 (원/kg)
  const [showSlaveUserModal, setShowSlaveUserModal] = useState(false);
  const createBidMutation = useCreateBid();
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();

  // 고철 경매 여부 확인
  const isScrapAuction = auction?.auctionCategory === "scrap";

  // 고철 경매의 중량 정보 가져오기
  const scrapWeight = isScrapAuction
    ? (auction as any)?.quantity?.quantity || (auction as any)?.weightKg || 0
    : 0;

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

  // 단위가격 입력값 변경 처리
  const handlePricePerUnitChange = (text: string) => {
    // 숫자와 소수점만 허용
    const numericText = text.replace(/[^0-9.]/g, "");
    const numValue = parseFloat(numericText);

    // 빈 문자열이거나 유효한 숫자인 경우에만 업데이트
    if (numericText === "" || (!isNaN(numValue) && numValue >= 0)) {
      setPricePerUnit(numericText);
    }
  };

  // 입찰금액 입력값 변경 처리 (고철이 아닌 경우에만 사용)
  const handleBidAmountChange = (text: string) => {
    // 콤마가 포함된 형식으로 변환
    const formattedText = formatNumberWithComma(text);
    setBidAmount(formattedText);
  };

  // 단위가격 * 중량으로 총 입찰금액 자동 계산
  useEffect(() => {
    if (isScrapAuction && pricePerUnit && scrapWeight > 0) {
      const unitPrice = parseFloat(pricePerUnit);
      if (!isNaN(unitPrice)) {
        const totalAmount = Math.round(unitPrice * scrapWeight);
        const formattedAmount = formatNumberWithComma(totalAmount.toString());
        setBidAmount(formattedAmount);
      }
    }
  }, [pricePerUnit, scrapWeight, isScrapAuction]);

  const handleBid = async () => {
    // 고철 경매인 경우 단위가격 검증
    if (isScrapAuction) {
      if (!pricePerUnit) {
        Alert.alert("입력 오류", "단위가격을 입력해주세요.");
        return;
      }
      const unitPrice = parseFloat(pricePerUnit);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        Alert.alert("입력 오류", "올바른 단위가격을 입력해주세요.");
        return;
      }
      if (scrapWeight <= 0) {
        Alert.alert("오류", "경매 중량 정보를 확인할 수 없습니다.");
        return;
      }
    } else {
      // 고철이 아닌 경우 기존 로직
      if (!bidAmount) {
        Alert.alert("입력 오류", "입찰 금액을 입력해주세요.");
        return;
      }
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

      // 입찰 데이터 구성
      const bidData: any = {
        userId: user.id,
        userName: user.name || "익명",
        amount: amount,
        location: user.address || "위치 미상",
      };

      // 고철 경매인 경우 단위가격도 포함
      if (isScrapAuction && pricePerUnit) {
        bidData.pricePerUnit = parseFloat(pricePerUnit);
      }

      await createBidMutation.mutateAsync({
        auctionId: auctionId,
        bidData: bidData,
      });

      setBidAmount("");
      setPricePerUnit("");
      Alert.alert("입찰 성공", "입찰이 성공적으로 등록되었습니다.");
      onBidSuccess?.();
    } catch (error: any) {
      Alert.alert("입찰 실패", error.message || "입찰 중 오류가 발생했습니다.");
    }
  };

  // 관리자 슬레이브 유저 입찰 처리
  const handleAdminSlaveUserBid = () => {
    // 고철 경매인 경우 단위가격 검증
    if (isScrapAuction) {
      if (!pricePerUnit) {
        Alert.alert("입력 오류", "단위가격을 입력해주세요.");
        return;
      }
      const unitPrice = parseFloat(pricePerUnit);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        Alert.alert("입력 오류", "올바른 단위가격을 입력해주세요.");
        return;
      }
    } else {
      if (!bidAmount) {
        Alert.alert("입력 오류", "입찰 금액을 입력해주세요.");
        return;
      }
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

    setShowSlaveUserModal(true);
  };

  // 슬레이브 유저 선택 후 입찰 처리
  const handleSlaveUserSelected = async (selectedUser: SlaveUser) => {
    const amount = parseInt(bidAmount.replace(/[^\d]/g, ""));

    try {
      // 입찰 데이터 구성
      const bidData: any = {
        userId: selectedUser.id,
        userName: selectedUser.name,
        amount: amount,
        location: selectedUser.address || "위치 미상",
      };

      // 고철 경매인 경우 단위가격도 포함
      if (isScrapAuction && pricePerUnit) {
        bidData.pricePerUnit = parseFloat(pricePerUnit);
      }

      await createBidMutation.mutateAsync({
        auctionId: auctionId,
        bidData: bidData,
      });

      setBidAmount("");
      setPricePerUnit("");
      Alert.alert(
        "입찰 성공",
        `${selectedUser.name} 유저로 입찰이 성공적으로 등록되었습니다.`
      );
      onBidSuccess?.();
    } catch (error: any) {
      Alert.alert("입찰 실패", error.message || "입찰 중 오류가 발생했습니다.");
    }
  };

  // 진행중인 경매가 아니면 렌더링하지 않음
  if (!isActive) {
    return null;
  }

  // 🚫 자신의 경매인 경우 - 관리자가 아니면 입찰 폼 대신 안내 메시지 표시
  if (isOwner && !isAdmin) {
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
        <VStack space="md" className="mb-6">
          {/* 고철 경매인 경우 단위가격 입력 필드 추가 */}
          {isScrapAuction && (
            <VStack space="md">
              <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
                단위가격 (원/kg)
              </Text>
              <Input className="bg-white/5 border-white/10 rounded-2xl">
                <InputField
                  placeholder="kg당 가격을 입력하세요"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={pricePerUnit}
                  onChangeText={handlePricePerUnitChange}
                  className="text-white text-base px-4 py-3"
                  keyboardType="numeric"
                />
              </Input>
              {scrapWeight > 0 && (
                <Text className="text-blue-300 text-xs font-medium">
                  중량: {scrapWeight}kg
                </Text>
              )}
            </VStack>
          )}

          <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
            입찰 금액
          </Text>
          <Input className="bg-white/5 border-white/10 rounded-2xl">
            <InputField
              placeholder={
                isScrapAuction ? "자동 계산됩니다" : "입찰 금액을 입력하세요"
              }
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={bidAmount}
              onChangeText={isScrapAuction ? undefined : handleBidAmountChange}
              className="text-white text-base px-4 py-3"
              keyboardType="numeric"
              editable={!isScrapAuction}
              style={{
                opacity: isScrapAuction ? 0.7 : 1,
                backgroundColor: isScrapAuction
                  ? "rgba(255, 255, 255, 0.02)"
                  : "transparent",
              }}
            />
          </Input>

          {currentTopBid > 0 && (
            <Text className="text-yellow-300 text-xs font-medium">
              최소 입찰가: {formatAuctionPrice(currentTopBid + 10000)}
            </Text>
          )}

          {/* 일반 사용자 입찰 버튼 - 관리자가 자신의 경매인 경우 비활성화 */}
          {!(isOwner && isAdmin) && (
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
                  createBidMutation.isPending
                    ? "text-gray-400"
                    : "text-green-300"
                }`}
              >
                {createBidMutation.isPending ? "입찰 중..." : "입찰하기"}
              </ButtonText>
            </Button>
          )}

          {/* 관리자 전용 슬레이브 유저 입찰 버튼 */}
          {isAdmin && (
            <VStack space="sm">
              {/* 자신의 경매인 경우 안내 메시지 */}
              {isOwner && (
                <Box className="rounded-xl p-3 bg-blue-500/10 border border-blue-500/20">
                  <Text className="text-blue-300 text-xs font-medium text-center">
                    관리자 권한으로 슬레이브 유저를 통해 입찰 가능합니다
                  </Text>
                </Box>
              )}

              <Button
                onPress={handleAdminSlaveUserBid}
                disabled={createBidMutation.isPending}
                className={`rounded-2xl border-2 min-h-14 ${
                  isOwner ? "" : "mt-3"
                } ${
                  createBidMutation.isPending
                    ? "bg-gray-500/30 border-gray-500/30"
                    : "bg-blue-500/15 border-blue-500/30"
                } shadow-xl ${
                  createBidMutation.isPending
                    ? "shadow-gray-500/40"
                    : "shadow-blue-500/40"
                }`}
              >
                <HStack className="items-center" space="sm">
                  <Users
                    size={20}
                    color={createBidMutation.isPending ? "#9CA3AF" : "#60A5FA"}
                  />
                  <ButtonText
                    className={`font-bold tracking-wide text-base ${
                      createBidMutation.isPending
                        ? "text-gray-400"
                        : "text-blue-300"
                    }`}
                  >
                    슬레이브 유저로 입찰
                  </ButtonText>
                </HStack>
              </Button>
            </VStack>
          )}
        </VStack>
      </Box>

      {/* 슬레이브 유저 선택 모달 */}
      <SlaveUserSelectionModal
        visible={showSlaveUserModal}
        onClose={() => setShowSlaveUserModal(false)}
        onSelectUser={handleSlaveUserSelected}
        auctionId={auctionId}
        bidAmount={parseInt(bidAmount.replace(/[^\d]/g, "")) || 0}
        pricePerUnit={
          isScrapAuction ? parseFloat(pricePerUnit) || 0 : undefined
        }
      />
    </VStack>
  );
};
