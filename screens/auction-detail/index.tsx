import React, { useState } from "react";
import {
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
  Image,
} from "react-native";
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

const { width: screenWidth } = Dimensions.get("window");

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
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

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

  const handleBack = () => {
    router.back();
  };

  // 이미지 로딩 상태 관리
  const handleImageLoad = (imageId: string) => {
    setLoadedImages((prev) => new Set([...prev, imageId]));
  };

  const handleImageError = (imageId: string) => {
    setLoadedImages((prev) => new Set([...prev, imageId]));
  };

  // 이미지 슬라이드 렌더링 함수
  const renderImageItem = ({ item }: { item: any }) => {
    const isLoaded = loadedImages.has(item.id);

    return (
      <Box style={{ width: screenWidth, height: 256 }}>
        <Image
          source={{ uri: item.uri }}
          style={{
            width: screenWidth,
            height: 256,
            resizeMode: "cover",
          }}
          onLoadEnd={() => handleImageLoad(item.id)}
          onError={() => handleImageError(item.id)}
        />
        {!isLoaded && (
          <Box
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
          </Box>
        )}
      </Box>
    );
  };

  // 이미지 인디케이터 렌더링 함수
  const renderImageIndicator = () => {
    const photos = auction?.photos || [];
    if (photos.length <= 1) return null;

    return (
      <HStack
        className="absolute bottom-4 left-0 right-0 justify-center"
        space="sm"
      >
        {photos.map((_, index) => (
          <Box
            key={index}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor:
                index === 0
                  ? "rgba(255, 255, 255, 0.9)"
                  : "rgba(255, 255, 255, 0.3)",
            }}
          />
        ))}
      </HStack>
    );
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* 로딩 상태 */}
        {isLoading && (
          <Box className="items-center justify-center p-8 flex-1">
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
          <Box className="items-center justify-center p-8 flex-1">
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
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 110 }}
            nestedScrollEnabled={true}
          >
            <VStack space="xl">
              {/* Header */}
              <VStack space="lg">
                <HStack className="items-center justify-between p-6">
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

                {/* 이미지 슬라이드 */}
                {auction?.photos && auction.photos.length > 0 ? (
                  <Box style={{ width: screenWidth, height: 256 }}>
                    <FlatList
                      data={auction.photos}
                      renderItem={renderImageItem}
                      keyExtractor={(item) => item.id}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      style={{ flex: 1 }}
                      nestedScrollEnabled={true}
                    />
                    {renderImageIndicator()}
                  </Box>
                ) : (
                  // 기본 이미지 (이미지가 없는 경우)
                  <Box
                    style={{
                      width: screenWidth,
                      height: 256,
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="images-outline"
                      size={64}
                      color="rgba(255, 255, 255, 0.3)"
                    />
                    <Text className="text-white/40 text-sm mt-2">
                      이미지 없음
                    </Text>
                  </Box>
                )}

                <Box
                  className="rounded-3xl p-8 mx-6"
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

              {/* 경매 상세 정보 */}
              <VStack space="lg" className="px-6">
                <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                  상세 정보
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
                    <VStack space="sm">
                      <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                        상품 설명
                      </Text>
                      <Text className="text-white font-semibold text-base">
                        {auctionDetail.description}
                      </Text>
                    </VStack>

                    <VStack space="sm">
                      <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                        판매자
                      </Text>
                      <Text className="text-white font-semibold text-base">
                        {auctionDetail.seller}
                      </Text>
                    </VStack>

                    <VStack space="sm">
                      <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                        위치
                      </Text>
                      <Text className="text-white font-semibold text-base">
                        {auctionDetail.location}
                      </Text>
                    </VStack>

                    <VStack space="sm">
                      <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                        거래 종류
                      </Text>
                      <Text className="text-white font-semibold text-base">
                        {auctionDetail.transactionType === "urgent"
                          ? "긴급 경매"
                          : "일반 경매"}
                      </Text>
                    </VStack>

                    <VStack space="sm">
                      <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                        시작가
                      </Text>
                      <Text className="text-white font-semibold text-base">
                        {auctionDetail.startPrice}
                      </Text>
                    </VStack>

                    <VStack space="sm">
                      <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                        시작 시간
                      </Text>
                      <Text className="text-white font-semibold text-base">
                        {auctionDetail.startDate}
                      </Text>
                    </VStack>

                    <VStack space="sm">
                      <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                        종료 시간
                      </Text>
                      <Text className="text-white font-semibold text-base">
                        {auctionDetail.endDate}
                      </Text>
                    </VStack>
                  </VStack>
                </Box>
              </VStack>

              {/* Current Bid Status */}
              <VStack space="lg" className="px-6">
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
                          {auctionDetail.status === "ended"
                            ? "최종 입찰가"
                            : "현재 입찰가"}
                        </Text>
                        <Text className="text-white font-bold text-2xl tracking-wide">
                          {auctionDetail.currentBid}
                        </Text>
                      </VStack>

                      <VStack className="items-end">
                        <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                          {auctionDetail.status === "ended"
                            ? "종료 시간"
                            : "남은 시간"}
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
                          backgroundColor:
                            auctionDetail.status === "active"
                              ? "rgba(34, 197, 94, 0.9)"
                              : auctionDetail.status === "ending"
                              ? "rgba(245, 158, 11, 0.9)"
                              : "rgba(239, 68, 68, 0.9)",
                        }}
                      >
                        <Text className="text-white font-semibold text-xs tracking-wide">
                          {auctionDetail.status === "active"
                            ? "진행중"
                            : auctionDetail.status === "ending"
                            ? "마감임박"
                            : "종료"}
                        </Text>
                      </Box>
                    </HStack>

                    {/* 종료된 경매에서 낙찰자 정보 표시 */}
                    {auctionDetail.status === "ended" && bids.length > 0 && (
                      <Box
                        className="rounded-xl p-4 mt-2"
                        style={{
                          backgroundColor: "rgba(34, 197, 94, 0.1)",
                          borderWidth: 1,
                          borderColor: "rgba(34, 197, 94, 0.2)",
                        }}
                      >
                        <HStack className="items-center justify-between">
                          <VStack>
                            <Text className="text-green-300 text-xs font-semibold uppercase tracking-[1px]">
                              낙찰자
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {bids[0]?.userName || "익명"}
                            </Text>
                          </VStack>
                          <VStack className="items-end">
                            <Text className="text-green-300 text-xs font-semibold uppercase tracking-[1px]">
                              낙찰가
                            </Text>
                            <Text className="text-white font-bold text-lg">
                              {formatPrice(bids[0]?.amount || 0)}
                            </Text>
                          </VStack>
                        </HStack>
                      </Box>
                    )}

                    {/* 종료된 경매에서 입찰이 없는 경우 */}
                    {auctionDetail.status === "ended" && bids.length === 0 && (
                      <Box
                        className="rounded-xl p-4 mt-2"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderWidth: 1,
                          borderColor: "rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        <Text className="text-red-300 text-sm font-semibold text-center">
                          입찰자가 없어 경매가 무효 처리되었습니다.
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </Box>
              </VStack>

              {/* Bid Input */}
              {auctionDetail.status === "active" && (
                <VStack space="lg" className="px-6">
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
                          onChangeText={handleBidAmountChange}
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

              {/* 종료된 경매 안내 */}
              {auctionDetail.status === "ended" && (
                <VStack space="lg" className="px-6">
                  <Text className="text-red-300 text-xl font-black tracking-[2px] uppercase">
                    경매 종료
                  </Text>

                  <Box
                    className="rounded-2xl p-6"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.05)",
                      borderWidth: 1,
                      borderColor: "rgba(239, 68, 68, 0.15)",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <VStack space="md" className="items-center">
                      <Ionicons
                        name="time-outline"
                        size={48}
                        color="rgba(239, 68, 68, 0.8)"
                      />
                      <Text className="text-red-300 text-lg font-bold text-center">
                        이 경매는 종료되었습니다
                      </Text>
                      <Text className="text-white/60 text-sm text-center">
                        {bids.length > 0
                          ? "다른 경매에 참여해보세요!"
                          : "입찰자가 없어 경매가 무효 처리되었습니다."}
                      </Text>
                    </VStack>
                  </Box>
                </VStack>
              )}

              {/* Bid History */}
              {bidHistory.length > 0 && (
                <VStack space="lg" className="px-6">
                  <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                    입찰 기록
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
                      {bidHistory.map((bid) => (
                        <HStack
                          key={bid.id}
                          className="items-center justify-between p-3 rounded-xl"
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.02)",
                            borderWidth: 1,
                            borderColor: "rgba(255, 255, 255, 0.05)",
                          }}
                        >
                          <VStack>
                            <Text className="text-white font-semibold text-base">
                              {bid.bidder}
                            </Text>
                            <Text className="text-white/60 text-xs">
                              {bid.time}
                            </Text>
                          </VStack>
                          <Text className="text-yellow-300 font-bold text-lg">
                            {bid.amount}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                </VStack>
              )}
            </VStack>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};
