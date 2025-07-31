import React, { useState } from "react";
import {
  ScrollView,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Image,
  Platform,
  View,
  TouchableOpacity,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAuction, useBids } from "@/hooks/useAuctions";
import {
  formatAuctionPrice,
  getRemainingTime,
  getAuctionStatusColor,
} from "@/data";
import {
  BidStatusSection,
  BidInputSection,
  BidHistorySection,
  EndedAuctionSection,
} from "@/components/auction/bid";

const { width: screenWidth } = Dimensions.get("window");

export const AuctionDetail = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  console.log("🔍 경매 상세 화면 진입, ID:", id);

  // TanStack Query로 경매 상세 데이터 조회
  const { data: auction, isLoading, error } = useAuction(id as string);

  // 입찰 기록 조회
  const { data: bids = [], isLoading: bidsLoading } = useBids(id as string);

  console.log("📊 경매 데이터 조회 결과:", {
    auction: auction
      ? {
          id: auction.id,
          title: (auction as any).title,
          auctionCategory: (auction as any).auctionCategory,
          demolitionInfo: (auction as any).demolitionInfo,
          demolitionArea: (auction as any).demolitionArea,
          areaUnit: (auction as any).areaUnit,
        }
      : null,
    isLoading,
    error: error?.message,
    requestedId: id,
  });

  if (isLoading) {
    return (
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <VStack
            space="lg"
            className="flex-1 items-center justify-center px-6"
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text className="text-white text-lg font-semibold">
              경매 정보를 불러오는 중...
            </Text>
          </VStack>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error || !auction) {
    console.error("❌ 경매 데이터 로딩 실패:", error);
    return (
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <VStack
            space="lg"
            className="flex-1 items-center justify-center px-6"
          >
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="rgba(239, 68, 68, 0.8)"
            />
            <Text className="text-red-300 text-xl font-bold text-center">
              경매 정보를 불러올 수 없습니다
            </Text>
            <Text className="text-white/60 text-sm text-center">
              {error?.message || "알 수 없는 오류가 발생했습니다."}
            </Text>
            <Pressable
              onPress={() => router.back()}
              className="px-6 py-3 bg-blue-500/20 rounded-lg border border-blue-500/30"
            >
              <Text className="text-blue-300 font-semibold">뒤로 가기</Text>
            </Pressable>
          </VStack>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // 샘플 데이터 (실제로는 API에서 받아올 데이터)
  const sampleAuctionDetail = {
    id: auction.id,
    title: (auction as any).title || "경매 상품",
    status: "active" as const,
    startPrice: "₩10,000,000",
    currentBid: "₩12,500,000",
    endTime: "2일 14시간 남음",
    startDate: "2024년 3월 15일 오전 10:00",
    endDate: "2024년 3월 20일 오후 6:00",
    bidders: 8,
    location: "서울시 강남구",
    desiredPrice: 15000000,
    description:
      "고품질 구리 스크랩입니다. 깨끗하게 분리되어 있으며 순도가 높습니다.",
  };

  // 실제 데이터를 사용하여 auctionDetail 구성
  const auctionDetail = {
    id: auction.id,
    title:
      (auction as any).title || (auction as any).productName || "경매 상품",
    status: auction.status || "active",
    startPrice: formatAuctionPrice((auction as any).desiredPrice || 0),
    currentBid: formatAuctionPrice(auction.currentBid || 0),
    endTime: getRemainingTime(auction.endTime),
    startDate: auction.createdAt
      ? new Date(auction.createdAt).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "정보 없음",
    endDate: auction.endTime
      ? new Date(auction.endTime).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "정보 없음",
    bidders: auction.bidders || 0,
    location:
      typeof (auction as any).address === "object" && (auction as any).address
        ? `${(auction as any).address.address || ""} ${
            (auction as any).address.detailAddress || ""
          }`.trim() || "위치 정보 없음"
        : (auction as any).address || "위치 정보 없음",
    desiredPrice: (auction as any).desiredPrice || 0,
    description: (auction as any).description || "설명이 없습니다.",
    // 추가 속성들
    auctionCategory: (auction as any).auctionCategory || "scrap",
    metalType: auction.productType?.name || "고철",
    weight: (auction as any).quantity?.quantity
      ? `${(auction as any).quantity.quantity}${
          (auction as any).quantity?.unit || "kg"
        }`
      : "1건",
    productName: (auction as any).productName,
    manufacturer: (auction as any).manufacturer,
    modelName: (auction as any).modelName,
    manufacturingDate: (auction as any).manufacturingDate,
    salesEnvironment: (auction as any).salesEnvironment,
    // 누락된 속성들 추가
    purity: "99.5%", // 기본값
    seller: "메탈코리아", // 기본값
    transactionType:
      (auction as any).auctionCategory === "demolition" &&
      (auction as any).demolitionInfo
        ? (auction as any).demolitionInfo.transactionType || "normal"
        : (auction as any).transactionType || "normal",
  };

  // 현재 최고 입찰가 계산
  const currentTopBid =
    bids.length > 0 ? Math.max(...bids.map((bid) => bid.amount)) : 0;

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
          <Box className="absolute inset-0 bg-black/30 items-center justify-center">
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
            className={`w-2 h-2 rounded-full ${
              index === 0 ? "bg-white/90" : "bg-white/30"
            }`}
          />
        ))}
      </HStack>
    );
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        {/* 로딩 상태 */}
        {isLoading && (
          <VStack className="items-center justify-center p-8 flex-1" space="md">
            <ActivityIndicator size="large" color="#9333EA" />
            <Text className="text-gray-400 text-base mt-4 font-nanum">
              경매 정보를 불러오는 중...
            </Text>
          </VStack>
        )}

        {/* 에러 상태 */}
        {error && (
          <VStack className="items-center justify-center p-8 flex-1" space="md">
            <Text className="text-red-500 text-base text-center font-nanum">
              경매 정보를 불러오는데 실패했습니다.
              {"\n"}다시 시도해주세요.
            </Text>
          </VStack>
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
                <HStack className="items-center justify-between px-4 py-3">
                  {/* 모바일 표준 뒤로가기 버튼 */}
                  <Pressable
                    onPress={handleBack}
                    className="active:opacity-60"
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: -8,
                    }}
                  >
                    <HStack className="items-center" space="xs">
                      <Ionicons
                        name={
                          Platform.OS === "ios" ? "chevron-back" : "arrow-back"
                        }
                        size={Platform.OS === "ios" ? 28 : 24}
                        color="#FFFFFF"
                        style={{
                          fontWeight: Platform.OS === "ios" ? "600" : "normal",
                        }}
                      />
                      {Platform.OS === "ios" && (
                        <Text className="text-white text-base font-medium">
                          뒤로
                        </Text>
                      )}
                    </HStack>
                  </Pressable>

                  <Text className="text-white font-bold text-lg tracking-wide">
                    경매 상세
                  </Text>

                  {/* 오른쪽 여백 (대칭을 위해) */}
                  <Box style={{ width: Platform.OS === "ios" ? 60 : 44 }} />
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
                    style={{ width: screenWidth, height: 256 }}
                    className="bg-white/5 border border-white/10 items-center justify-center"
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

                <Box className="rounded-3xl p-8 mx-6 bg-purple-600/8 border border-purple-500/15 shadow-2xl shadow-purple-600/30">
                  <VStack space="md">
                    <Text className="text-purple-300 text-sm font-medium tracking-[3px] uppercase">
                      {auctionDetail.auctionCategory === "machinery"
                        ? "Machinery"
                        : auctionDetail.auctionCategory === "demolition"
                        ? "Demolition"
                        : auctionDetail.metalType}{" "}
                      Auction
                    </Text>
                    <Text className="text-white text-2xl font-black tracking-wide">
                      {auctionDetail.auctionCategory === "machinery" &&
                      auctionDetail.productName
                        ? auctionDetail.productName
                        : auctionDetail.auctionCategory === "demolition" &&
                          auction?.demolitionInfo?.demolitionTitle
                        ? auction.demolitionInfo.demolitionTitle
                        : auctionDetail.title}
                    </Text>
                    {auctionDetail.auctionCategory === "machinery" ? (
                      <VStack space="xs">
                        <Text className="text-purple-200/80 text-sm font-medium tracking-wider">
                          {auctionDetail.weight}
                          {auctionDetail.manufacturer &&
                            ` • ${auctionDetail.manufacturer}`}
                        </Text>
                        {auctionDetail.modelName && (
                          <Text className="text-purple-200/60 text-xs tracking-wider">
                            모델: {auctionDetail.modelName}
                          </Text>
                        )}
                      </VStack>
                    ) : auctionDetail.auctionCategory === "demolition" &&
                      auction?.demolitionInfo ? (
                      <VStack space="xs">
                        <Text className="text-purple-200/80 text-sm font-medium tracking-wider">
                          {auction.demolitionInfo.buildingPurpose ===
                          "residential"
                            ? "주거용"
                            : auction.demolitionInfo.buildingPurpose ===
                              "commercial"
                            ? "산업/상업용"
                            : "공공시설"}
                          •{" "}
                          {(auction as any)?.demolitionArea?.toLocaleString() ||
                            "미상"}{" "}
                          {(auction as any)?.areaUnit === "sqm" ? "㎡" : "평"}
                        </Text>
                        <Text className="text-purple-200/60 text-xs tracking-wider">
                          {auction.demolitionInfo.demolitionMethod === "full"
                            ? "전면 철거"
                            : auction.demolitionInfo.demolitionMethod ===
                              "partial"
                            ? "부분 철거"
                            : "내부 철거"}
                          • {auction.demolitionInfo.floorCount}층
                        </Text>
                      </VStack>
                    ) : (
                      <Text className="text-purple-200/80 text-sm font-medium tracking-wider uppercase">
                        {auctionDetail.weight} • {auctionDetail.purity}
                      </Text>
                    )}
                  </VStack>
                </Box>
              </VStack>

              {/* 경매 상세 정보 */}
              <VStack space="lg" className="px-6">
                <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                  상세 정보
                </Text>

                <Box className="rounded-2xl p-6 bg-white/5 border border-white/10 shadow-lg shadow-black/40">
                  <VStack space="md">
                    <VStack space="sm">
                      <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                        상품 설명
                      </Text>
                      <Text className="text-white font-semibold text-base">
                        {auctionDetail.description}
                      </Text>
                    </VStack>

                    {/* 중고기계 특화 정보 */}
                    {auctionDetail.auctionCategory === "machinery" && (
                      <>
                        {auctionDetail.productName && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              제품명
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auctionDetail.productName}
                            </Text>
                          </VStack>
                        )}

                        {auctionDetail.manufacturer && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              제조사
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auctionDetail.manufacturer}
                            </Text>
                          </VStack>
                        )}

                        {auctionDetail.modelName && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              모델명
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auctionDetail.modelName}
                            </Text>
                          </VStack>
                        )}

                        {auctionDetail.manufacturingDate && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              제조일
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {new Date(
                                auctionDetail.manufacturingDate
                              ).toLocaleDateString("ko-KR", {
                                year: "numeric",
                                month: "long",
                              })}
                            </Text>
                          </VStack>
                        )}

                        {auctionDetail.desiredPrice && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              희망 가격
                            </Text>
                            <Text className="text-yellow-400 font-bold text-lg">
                              {formatAuctionPrice(auctionDetail.desiredPrice)}
                            </Text>
                          </VStack>
                        )}

                        {/* 판매 조건 정보 */}
                        {auctionDetail.salesEnvironment && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              판매 조건
                            </Text>
                            <VStack space="xs">
                              <HStack className="justify-between">
                                <Text className="text-gray-300 text-sm">
                                  운송비 부담:
                                </Text>
                                <Text className="text-white text-sm font-medium">
                                  {auctionDetail.salesEnvironment
                                    .shippingCost === "buyer"
                                    ? "구매자 부담"
                                    : "판매자 부담"}
                                </Text>
                              </HStack>
                              <HStack className="justify-between">
                                <Text className="text-gray-300 text-sm">
                                  현장 접근성:
                                </Text>
                                <Text className="text-white text-sm font-medium">
                                  {auctionDetail.salesEnvironment
                                    .accessibility === "easy"
                                    ? "접근 용이 (5톤 집게차 진입 가능)"
                                    : auctionDetail.salesEnvironment
                                        .accessibility === "normal"
                                    ? "보통 (일반 트럭 접근 가능)"
                                    : "제한적 (접근성 제한적)"}
                                </Text>
                              </HStack>
                              <HStack className="justify-between">
                                <Text className="text-gray-300 text-sm">
                                  적재 조건:
                                </Text>
                                <Text className="text-white text-sm font-medium">
                                  {auctionDetail.salesEnvironment.loading ===
                                  "buyer"
                                    ? "구매자 직접"
                                    : auctionDetail.salesEnvironment.loading ===
                                      "seller"
                                    ? "판매자 지원"
                                    : "협의 가능"}
                                </Text>
                              </HStack>
                              {auctionDetail.salesEnvironment.sacksNeeded && (
                                <HStack className="justify-between">
                                  <Text className="text-gray-300 text-sm">
                                    추가 조건:
                                  </Text>
                                  <Text className="text-blue-300 text-sm font-medium">
                                    마대 필요
                                  </Text>
                                </HStack>
                              )}
                            </VStack>
                          </VStack>
                        )}
                      </>
                    )}

                    {/* 중고자재 특화 정보 */}
                    {auctionDetail.auctionCategory === "materials" && (
                      <>
                        {auction?.productType && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              자재 종류
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.productType.name} (
                              {auction.productType.category})
                            </Text>
                          </VStack>
                        )}

                        {auction?.productType?.description && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              자재 설명
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.productType.description}
                            </Text>
                          </VStack>
                        )}

                        {(auction as any)?.quantity && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              수량
                            </Text>
                            <Text className="text-cyan-400 font-bold text-lg">
                              {(
                                (auction as any).quantity.quantity || 0
                              ).toLocaleString()}
                              {(auction as any).quantity.unit || "개"}
                            </Text>
                          </VStack>
                        )}

                        {(auction as any)?.desiredPrice && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              희망 가격
                            </Text>
                            <Text className="text-yellow-400 font-bold text-lg">
                              ₩
                              {(
                                (auction as any).desiredPrice || 0
                              ).toLocaleString()}
                            </Text>
                          </VStack>
                        )}

                        {/* 판매 조건 정보 */}
                        {(auction as any)?.salesEnvironment && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              판매 조건
                            </Text>
                            <VStack space="xs">
                              <HStack className="justify-between">
                                <Text className="text-gray-300 text-sm">
                                  배송비 부담:
                                </Text>
                                <Text className="text-white text-sm font-medium">
                                  {(auction as any).salesEnvironment
                                    .shippingCost === "buyer"
                                    ? "구매자 부담"
                                    : "판매자 부담"}
                                </Text>
                              </HStack>
                              <HStack className="justify-between">
                                <Text className="text-gray-300 text-sm">
                                  현장 접근성:
                                </Text>
                                <Text className="text-white text-sm font-medium">
                                  {(auction as any).salesEnvironment
                                    .accessibility === "easy"
                                    ? "접근 용이 (5톤 집게차 진입 가능)"
                                    : (auction as any).salesEnvironment
                                        .accessibility === "normal"
                                    ? "보통 (일반 트럭 접근 가능)"
                                    : "제한적 (접근성 제한적)"}
                                </Text>
                              </HStack>
                              <HStack className="justify-between">
                                <Text className="text-gray-300 text-sm">
                                  적재 조건:
                                </Text>
                                <Text className="text-white text-sm font-medium">
                                  {(auction as any).salesEnvironment.loading ===
                                  "buyer"
                                    ? "구매자 직접"
                                    : (auction as any).salesEnvironment
                                        .loading === "seller"
                                    ? "판매자 지원"
                                    : "협의 가능"}
                                </Text>
                              </HStack>
                            </VStack>
                          </VStack>
                        )}
                      </>
                    )}

                    {/* 고철 특화 정보 */}
                    {auctionDetail.auctionCategory === "scrap" && (
                      <>
                        {auction?.productType && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              제품 종류
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.productType.name} (
                              {auction.productType.category})
                            </Text>
                          </VStack>
                        )}

                        {(auction as any)?.pricePerUnit && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              단위당 가격
                            </Text>
                            <Text className="text-yellow-400 font-bold text-lg">
                              ₩
                              {(
                                (auction as any).pricePerUnit || 0
                              ).toLocaleString()}
                              /kg
                            </Text>
                          </VStack>
                        )}

                        {(auction as any)?.quantity && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              총 중량
                            </Text>
                            <Text className="text-cyan-400 font-bold text-lg">
                              {(
                                (auction as any).quantity.quantity || 0
                              ).toLocaleString()}
                              {(auction as any).quantity.unit || "kg"}
                            </Text>
                          </VStack>
                        )}

                        {auction?.productType?.description && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              품질 정보
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.productType.description}
                            </Text>
                          </VStack>
                        )}

                        {/* 판매 조건 정보 */}
                        {(auction as any)?.salesEnvironment && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              판매 조건
                            </Text>
                            <VStack space="xs">
                              <HStack className="justify-between">
                                <Text className="text-gray-300 text-sm">
                                  배송비 부담:
                                </Text>
                                <Text className="text-white text-sm font-medium">
                                  {(auction as any).salesEnvironment
                                    .shippingCost === "buyer"
                                    ? "구매자 부담"
                                    : "판매자 부담"}
                                </Text>
                              </HStack>
                              <HStack className="justify-between">
                                <Text className="text-gray-300 text-sm">
                                  현장 접근성:
                                </Text>
                                <Text className="text-white text-sm font-medium">
                                  {(auction as any).salesEnvironment
                                    .accessibility === "easy"
                                    ? "접근 용이 (5톤 집게차 진입 가능)"
                                    : (auction as any).salesEnvironment
                                        .accessibility === "normal"
                                    ? "보통 (일반 트럭 접근 가능)"
                                    : "제한적 (접근성 제한적)"}
                                </Text>
                              </HStack>
                              <HStack className="justify-between">
                                <Text className="text-gray-300 text-sm">
                                  적재 조건:
                                </Text>
                                <Text className="text-white text-sm font-medium">
                                  {(auction as any).salesEnvironment.loading ===
                                  "buyer"
                                    ? "구매자 직접"
                                    : (auction as any).salesEnvironment
                                        .loading === "seller"
                                    ? "판매자 지원"
                                    : "협의 가능"}
                                </Text>
                              </HStack>
                              {(auction as any).salesEnvironment
                                .sacksNeeded && (
                                <HStack className="justify-between">
                                  <Text className="text-gray-300 text-sm">
                                    추가 조건:
                                  </Text>
                                  <Text className="text-blue-300 text-sm font-medium">
                                    마대 필요
                                  </Text>
                                </HStack>
                              )}
                            </VStack>
                          </VStack>
                        )}
                      </>
                    )}

                    {/* 철거 특화 정보 */}
                    {auctionDetail.auctionCategory === "demolition" &&
                      auction?.demolitionInfo && (
                        <>
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              건물 용도
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.demolitionInfo.buildingPurpose ===
                              "residential"
                                ? "주거용"
                                : auction.demolitionInfo.buildingPurpose ===
                                  "commercial"
                                ? "산업/상업용"
                                : "공공시설"}
                            </Text>
                          </VStack>

                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              철거 방식
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.demolitionInfo.demolitionMethod ===
                              "full"
                                ? "전면 철거"
                                : auction.demolitionInfo.demolitionMethod ===
                                  "partial"
                                ? "부분 철거"
                                : "내부 철거"}
                            </Text>
                          </VStack>

                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              구조 타입
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.demolitionInfo.structureType ===
                              "masonry"
                                ? "조적조"
                                : auction.demolitionInfo.structureType ===
                                  "reinforced-concrete"
                                ? "철근콘크리트"
                                : "철골조"}
                            </Text>
                          </VStack>

                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              철거 면적
                            </Text>
                            <Text className="text-cyan-400 font-bold text-lg">
                              {(
                                auction as any
                              )?.demolitionArea?.toLocaleString() ||
                                "미상"}{" "}
                              {(auction as any)?.areaUnit === "sqm"
                                ? "㎡"
                                : "평"}
                            </Text>
                          </VStack>

                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              현장 층수
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.demolitionInfo.floorCount}층
                            </Text>
                          </VStack>

                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              폐기물 처리
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.demolitionInfo.wasteDisposal === "self"
                                ? "제가 직접 처리할게요"
                                : "업체가 처리해주세요"}
                            </Text>
                          </VStack>
                        </>
                      )}

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
                          ? "긴급 경매 (2일간)"
                          : "일반 경매 (7일간)"}
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
              <BidStatusSection
                auctionStatus={auctionDetail.status}
                currentBid={auction?.currentBid || 0}
                endTime={auctionDetail.endTime}
                bidders={auctionDetail.bidders}
                winnerInfo={
                  auctionDetail.status === "ended" && bids.length > 0
                    ? {
                        userName: bids[0]?.userName || "익명",
                        amount: bids[0]?.amount || 0,
                      }
                    : undefined
                }
                hasBids={bids.length > 0}
              />

              {/* Bid Input */}
              <BidInputSection
                auctionId={id as string}
                currentTopBid={currentTopBid}
                isActive={auctionDetail.status === "active"}
              />

              {/* Ended Auction Notice */}
              {auctionDetail.status === "ended" && (
                <EndedAuctionSection hasBids={bids.length > 0} />
              )}

              {/* Bid History */}
              <BidHistorySection auctionId={id as string} />
            </VStack>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};
