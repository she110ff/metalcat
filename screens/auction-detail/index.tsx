import React, { useState } from "react";
import { ScrollView, ActivityIndicator, Alert } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/ui/input";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAuction, useCreateBid, useBids } from "@/hooks/useAuctions";
import { formatPrice, getRemainingTime, getAuctionStatusColor } from "@/data";

interface BidHistory {
  id: string;
  bidder: string;
  amount: string;
  time: string;
}

export const AuctionDetail = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [bidAmount, setBidAmount] = useState("");

  // TanStack Query로 경매 상세 데이터 조회
  const { data: auction, isLoading, error } = useAuction(id as string);

  // 입찰 기록 조회
  const { data: bids = [], isLoading: bidsLoading } = useBids(id as string);

  // 입찰 생성 뮤테이션
  const createBidMutation = useCreateBid();

  // 시간 차이 계산 함수
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}초 전`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}분 전`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)}일 전`;
    }
  };

  // 로딩 중이거나 에러가 있으면 기본 데이터 사용
  const auctionDetail =
    isLoading || error || !auction
      ? {
          id: id as string,
          title: "고순도 구리 스크랩",
          metalType: "구리",
          weight: "2,500kg",
          purity: "99.5%",
          startPrice: "₩10,000,000",
          currentBid: "₩12,500,000",
          endTime: "2시간 30분",
          status: "active" as const,
          bidders: 8,
          description:
            "고품질 구리 스크랩입니다. 순도 99.5% 이상 보장되며, 산업용으로 적합합니다.",
          location: "서울특별시 강남구",
          seller: "메탈코리아",
          startDate: "2025.01.20 09:00",
          endDate: "2025.01.21 18:00",
        }
      : {
          id: auction.id,
          title:
            (auction as any).title ||
            (auction as any).demolitionTitle ||
            (auction as any).productName ||
            "고철 경매",
          metalType: auction.productType?.name || "고철",
          weight: (auction as any).quantity?.estimatedWeight
            ? `${(auction as any).quantity.estimatedWeight}kg`
            : (auction as any).quantity?.quantity
            ? `${(auction as any).quantity.quantity}대`
            : "1건",
          purity: "99.5%", // 기본값
          transactionType: (auction as any).transactionType || "normal",
          startPrice: formatPrice((auction as any).desiredPrice || 0),
          currentBid: formatPrice(auction.currentBid || 0),
          endTime: getRemainingTime(auction.endTime),
          status: auction.status as "active" | "ending" | "ended",
          bidders: auction.bidders || 0,
          description:
            (auction as any).description || "고품질 경매 상품입니다.",
          location:
            (auction as any).address?.roadAddress || "서울특별시 강남구",
          seller: "메탈코리아", // 기본값
          startDate: auction.createdAt
            ? new Date(auction.createdAt).toLocaleString("ko-KR")
            : "2025.01.20 09:00",
          endDate: auction.endTime
            ? new Date(auction.endTime).toLocaleString("ko-KR")
            : "2025.01.21 18:00",
        };

  // 입찰 기록을 UI에 맞게 변환
  const bidHistory: BidHistory[] = bids.map((bid) => ({
    id: bid.id,
    bidder: bid.userName || "익명",
    amount: formatPrice(bid.amount),
    time: getTimeAgo(bid.bidTime),
  }));

  // 현재 최고 입찰가 계산
  const currentTopBid =
    bids.length > 0 ? Math.max(...bids.map((bid) => bid.amount)) : 0;

  const handleBid = async () => {
    if (!bidAmount) {
      Alert.alert("입력 오류", "입찰 금액을 입력해주세요.");
      return;
    }

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
      await createBidMutation.mutateAsync({
        auctionId: id as string,
        bidData: {
          userId: "current_user", // 실제로는 로그인된 사용자 ID
          userName: "현재 사용자", // 실제로는 로그인된 사용자 이름
          amount: amount,
          location: "서울특별시", // 실제로는 사용자 위치
        },
      });

      setBidAmount("");
      Alert.alert("입찰 성공", "입찰이 성공적으로 등록되었습니다.");
    } catch (error: any) {
      Alert.alert("입찰 실패", error.message || "입찰 중 오류가 발생했습니다.");
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* 로딩 상태 */}
          {isLoading && (
            <Box className="items-center justify-center p-8">
              <ActivityIndicator size="large" color="#9333EA" />
              <Text
                className="text-gray-400 text-base mt-4"
                style={{ fontFamily: "NanumGothic" }}
              >
                경매 정보를 불러오는 중...
              </Text>
            </Box>
          )}

          {/* 에러 상태 */}
          {error && (
            <Box className="items-center justify-center p-8">
              <Text
                className="text-red-500 text-base text-center"
                style={{ fontFamily: "NanumGothic" }}
              >
                경매 정보를 불러오는데 실패했습니다.
                {"\n"}다시 시도해주세요.
              </Text>
            </Box>
          )}

          {/* 경매 상세 정보 */}
          {!isLoading && !error && (
            <VStack className="flex-1 p-6" space="xl">
              {/* Header */}
              <VStack space="lg">
                <HStack className="items-center justify-between">
                  <Pressable onPress={handleBack}>
                    <Box
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </Box>
                  </Pressable>
                  <Text className="text-white font-bold text-lg tracking-wide">
                    경매 상세
                  </Text>
                  <Box className="w-10 h-10" />
                </HStack>

                <Box
                  className="rounded-3xl p-8"
                  style={{
                    backgroundColor: "rgba(147, 51, 234, 0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(147, 51, 234, 0.15)",
                    shadowColor: "#9333EA",
                    shadowOffset: { width: 0, height: 20 },
                    shadowOpacity: 0.3,
                    shadowRadius: 40,
                    elevation: 20,
                  }}
                >
                  <VStack space="md">
                    <Text className="text-purple-300 text-sm font-medium tracking-[3px] uppercase">
                      {auctionDetail.metalType} Auction
                    </Text>
                    <Text className="text-white text-2xl font-black tracking-wide">
                      {auctionDetail.title}
                    </Text>
                    <Text className="text-purple-200/80 text-sm font-medium tracking-wider uppercase">
                      {auctionDetail.weight} • {auctionDetail.purity}
                    </Text>
                  </VStack>
                </Box>
              </VStack>

              {/* Current Bid Status */}
              <VStack space="lg">
                <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                  현재 입찰 현황
                </Text>

                <Box
                  className="rounded-2xl p-6"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <VStack space="lg">
                    <HStack className="items-center justify-between">
                      <VStack>
                        <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                          현재 입찰가
                        </Text>
                        <Text className="text-white font-bold text-2xl tracking-wide">
                          {auctionDetail.currentBid}
                        </Text>
                      </VStack>

                      <VStack className="items-end">
                        <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                          남은 시간
                        </Text>
                        <Text className="text-white font-semibold text-lg tracking-wide">
                          {auctionDetail.endTime}
                        </Text>
                      </VStack>
                    </HStack>

                    <HStack className="items-center justify-between">
                      <HStack className="items-center">
                        <Ionicons
                          name="people"
                          size={16}
                          color="rgba(255, 255, 255, 0.6)"
                        />
                        <Text className="text-white/60 text-xs ml-1">
                          {auctionDetail.bidders}명 참여
                        </Text>
                      </HStack>

                      <Box
                        className="px-3 py-1 rounded-lg"
                        style={{
                          backgroundColor: "rgba(34, 197, 94, 0.9)",
                        }}
                      >
                        <Text className="text-white font-semibold text-xs tracking-wide">
                          진행중
                        </Text>
                      </Box>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>

              {/* Bid Input */}
              {auctionDetail.status === "active" && (
                <VStack space="lg">
                  <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                    입찰하기
                  </Text>

                  <Box
                    className="rounded-2xl p-6"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.08)",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <VStack space="md">
                      <Text className="text-white/80 text-sm font-semibold uppercase tracking-[1px]">
                        입찰 금액
                      </Text>
                      <Input
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                          borderWidth: 1,
                          borderColor: "rgba(255, 255, 255, 0.08)",
                          borderRadius: 16,
                          overflow: "hidden",
                        }}
                      >
                        <InputField
                          placeholder="입찰 금액을 입력하세요"
                          placeholderTextColor="rgba(255, 255, 255, 0.4)"
                          value={bidAmount}
                          onChangeText={setBidAmount}
                          style={{
                            color: "white",
                            fontSize: 16,
                            borderRadius: 16,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                          }}
                          keyboardType="numeric"
                        />
                      </Input>

                      {currentTopBid > 0 && (
                        <Text className="text-yellow-300 text-xs font-medium">
                          최소 입찰가: {formatPrice(currentTopBid + 10000)}
                        </Text>
                      )}

                      <Button
                        className="rounded-2xl"
                        onPress={handleBid}
                        disabled={createBidMutation.isPending}
                        style={{
                          backgroundColor: createBidMutation.isPending
                            ? "rgba(107, 114, 128, 0.3)"
                            : "rgba(34, 197, 94, 0.15)",
                          borderColor: createBidMutation.isPending
                            ? "rgba(107, 114, 128, 0.3)"
                            : "rgba(34, 197, 94, 0.3)",
                          borderRadius: 18,
                          borderWidth: 1.5,
                          shadowColor: createBidMutation.isPending
                            ? "#6B7280"
                            : "#22C55E",
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.4,
                          shadowRadius: 12,
                          elevation: 12,
                          minHeight: 56,
                        }}
                      >
                        <ButtonText
                          className={`font-bold tracking-wide text-base ${
                            createBidMutation.isPending
                              ? "text-gray-400"
                              : "text-green-300"
                          }`}
                        >
                          {createBidMutation.isPending
                            ? "입찰 중..."
                            : "입찰하기"}
                        </ButtonText>
                      </Button>
                    </VStack>
                  </Box>
                </VStack>
              )}

              {/* Auction Details */}
              <VStack space="lg">
                <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                  경매 정보
                </Text>

                <Box
                  className="rounded-2xl p-6"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <VStack space="md">
                    <HStack className="justify-between items-center">
                      <Text className="text-white/80">판매자:</Text>
                      <Text className="text-white font-semibold">
                        {auctionDetail.seller}
                      </Text>
                    </HStack>

                    <HStack className="justify-between items-center">
                      <Text className="text-white/80">위치:</Text>
                      <Text className="text-white font-semibold">
                        {auctionDetail.location}
                      </Text>
                    </HStack>

                    <HStack className="justify-between items-center">
                      <Text className="text-white/80">거래종류:</Text>
                      <Text className="text-white font-semibold">
                        {auctionDetail.transactionType === "urgent"
                          ? "긴급 경매"
                          : "일반 경매"}
                      </Text>
                    </HStack>

                    <HStack className="justify-between items-center">
                      <Text className="text-white/80">중량:</Text>
                      <Text className="text-white font-semibold">
                        {auctionDetail.weight}
                      </Text>
                    </HStack>

                    <HStack className="justify-between items-center">
                      <Text className="text-white/80">시작가:</Text>
                      <Text className="text-white font-semibold">
                        {auctionDetail.startPrice}
                      </Text>
                    </HStack>

                    <HStack className="justify-between items-center">
                      <Text className="text-white/80">시작일:</Text>
                      <Text className="text-white font-semibold">
                        {auctionDetail.startDate}
                      </Text>
                    </HStack>

                    <HStack className="justify-between items-center">
                      <Text className="text-white/80">종료일:</Text>
                      <Text className="text-white font-semibold">
                        {auctionDetail.endDate}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>

              {/* Bid History */}
              <VStack space="lg">
                <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                  입찰 기록
                </Text>

                {bidsLoading ? (
                  <Box className="items-center justify-center p-8">
                    <ActivityIndicator size="small" color="#9333EA" />
                    <Text className="text-gray-400 text-sm mt-2">
                      입찰 기록을 불러오는 중...
                    </Text>
                  </Box>
                ) : bidHistory.length > 0 ? (
                  <VStack space="md">
                    {bidHistory.map((bid) => (
                      <Box
                        key={bid.id}
                        className="rounded-2xl p-4"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                          borderWidth: 1,
                          borderColor: "rgba(255, 255, 255, 0.08)",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 4,
                        }}
                      >
                        <HStack className="items-center justify-between">
                          <VStack>
                            <Text className="text-white font-semibold text-base tracking-wide">
                              {bid.bidder}
                            </Text>
                            <Text className="text-white/50 text-xs tracking-[1px]">
                              {bid.time}
                            </Text>
                          </VStack>

                          <Text className="text-white font-bold text-lg tracking-wide">
                            {bid.amount}
                          </Text>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Box className="items-center justify-center p-8">
                    <Text className="text-gray-400 text-base text-center">
                      아직 입찰 기록이 없습니다.
                      {"\n"}첫 번째 입찰자가 되어보세요!
                    </Text>
                  </Box>
                )}
              </VStack>
            </VStack>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
