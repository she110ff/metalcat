import React, { useState } from "react";
import { ScrollView, ActivityIndicator } from "react-native";
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
import { useAuction } from "@/hooks/useAuctions";
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
          startPrice: `₩${formatPrice((auction as any).desiredPrice || 0)}`,
          currentBid: `₩${formatPrice(auction.currentBid || 0)}`,
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

  const bidHistory: BidHistory[] = [
    {
      id: "1",
      bidder: "철강업체A",
      amount: "₩12,500,000",
      time: "2분 전",
    },
    {
      id: "2",
      bidder: "재활용업체B",
      amount: "₩12,300,000",
      time: "5분 전",
    },
    {
      id: "3",
      bidder: "메탈트레이더C",
      amount: "₩12,100,000",
      time: "8분 전",
    },
    {
      id: "4",
      bidder: "철강업체A",
      amount: "₩12,000,000",
      time: "12분 전",
    },
  ];

  const handleBid = () => {
    if (bidAmount) {
      // 실제로는 API 호출하여 입찰 처리
      console.log("입찰 금액:", bidAmount);
      setBidAmount("");
      // TODO: TanStack Query mutation으로 입찰 처리
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

                    <Button
                      className="rounded-2xl"
                      onPress={handleBid}
                      style={{
                        backgroundColor: "rgba(34, 197, 94, 0.15)",
                        borderColor: "rgba(34, 197, 94, 0.3)",
                        borderRadius: 18,
                        borderWidth: 1.5,
                        shadowColor: "#22C55E",
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                        elevation: 12,
                        minHeight: 56,
                      }}
                    >
                      <ButtonText className="font-bold text-green-300 tracking-wide text-base">
                        입찰하기
                      </ButtonText>
                    </Button>
                  </VStack>
                </Box>
              </VStack>

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
              </VStack>
            </VStack>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
