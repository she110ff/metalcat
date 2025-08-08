import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ScrollView,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Image,
  Platform,
  View,
  TouchableOpacity,
  Modal,
  StatusBar,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { AlertCircle, Expand, ChevronLeft, Images } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useAuction, useBids, useAuctionResult } from "@/hooks/useAuctions";
import { useAuth } from "@/hooks/useAuth";
import {
  formatAuctionPrice,
  getRemainingTime,
  getAuctionStatusColor,
} from "@/data";
import {
  BidStatusSection,
  BidInputSection,
  BidHistorySection,
} from "@/components/auction/bid";
import { AuctionResultSection } from "@/components/auction/result";
import { getOptimizedAuctionPhotoUrl } from "@/utils/imageOptimizer";
import { supabase } from "@/hooks/auctions/supabaseClient";
import { ImageSkeleton } from "@/components/ui/skeleton/ImageSkeleton";

const { width: screenWidth } = Dimensions.get("window");

export const AuctionDetail = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const { user } = useAuth();

  const auctionId = typeof id === "string" ? id : "";
  const hasValidId = !!auctionId;

  const { data: auction, isLoading, error } = useAuction(auctionId || "");

  const { data: bids = [], isLoading: bidsLoading } = useBids(auctionId || "");

  const {
    data: auctionResult,
    isLoading: resultLoading,
    error: resultError,
  } = useAuctionResult(auctionId || "");

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  console.log("경매 데이터 조회 결과:", {
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
    hasValidId,
  });

  // ID가 없으면 에러 화면 표시
  if (!hasValidId) {
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
            <AlertCircle size={64} color="rgba(239, 68, 68, 0.8)" />
            <Text className="text-red-300 text-xl font-bold text-center">
              잘못된 경매 ID입니다
            </Text>
            <Text className="text-white/60 text-sm text-center">
              유효하지 않은 경매 ID입니다.
            </Text>
            <Pressable
              onPress={handleBack}
              className="px-6 py-3 bg-blue-500/20 rounded-lg border border-blue-500/30"
            >
              <Text className="text-blue-300 font-semibold">뒤로 가기</Text>
            </Pressable>
          </VStack>
        </SafeAreaView>
      </LinearGradient>
    );
  }

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
    console.error("경매 데이터 로딩 실패:", error);
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
            <AlertCircle size={64} color="rgba(239, 68, 68, 0.8)" />
            <Text className="text-red-300 text-xl font-bold text-center">
              경매 정보를 불러올 수 없습니다
            </Text>
            <Text className="text-white/60 text-sm text-center">
              {error?.message || "알 수 없는 오류가 발생했습니다."}
            </Text>
            <Pressable
              onPress={handleBack}
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
    desiredPrice: (auction as any).desiredPrice || 0,
    description: (auction as any).description || "설명이 없습니다.",
    // 추가 속성들
    auctionCategory: (auction as any).auctionCategory || "scrap",
    metalType: auction.productType?.name || "고철",
    weight: (auction as any).quantity?.quantity
      ? `${(auction as any).quantity?.quantity}${
          (auction as any).quantity?.unit || "kg"
        }`
      : "1건",
    productName: (auction as any).productName || "정보 없음",
    manufacturer: (auction as any).manufacturer || "정보 없음",
    modelName: (auction as any).modelName || "정보 없음",
    manufacturingDate: (auction as any).manufacturingDate,
    salesEnvironment: (auction as any).salesEnvironment,
    // 누락된 속성들 추가
    purity: "99.5%", // 기본값
    transactionType:
      (auction as any).auctionCategory === "demolition" &&
      (auction as any).demolitionInfo
        ? (auction as any).demolitionInfo?.transactionType || "normal"
        : (auction as any).transactionType || "normal",
  };

  // 현재 최고 입찰가 계산
  const currentTopBid =
    bids.length > 0 ? Math.max(...bids.map((bid) => bid.amount)) : 0;

  // 현재 사용자가 경매 소유자인지 확인
  const isAuctionOwner = user?.id === auction?.userId;

  // 현재 사용자가 이미 입찰했는지 확인
  const hasUserBid = user?.id
    ? bids.some((bid) => bid.userId === user.id)
    : false;

  // 이미지 클릭 핸들러
  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageViewerVisible(true);
  };

  // 이미지 뷰어 닫기
  const closeImageViewer = () => {
    setIsImageViewerVisible(false);
  };

  // 이미지 뷰어용 이미지 데이터 준비
  const getImageViewerData = () => {
    if (!auction?.photos) return [];

    return auction.photos.map((photo: any) => ({
      url: getOptimizedAuctionPhotoUrl(
        supabase,
        photo.uri,
        "fullsize" // 전체 화면에서는 풀사이즈 사용
      ),
      props: {
        source: {
          uri: getOptimizedAuctionPhotoUrl(supabase, photo.uri, "fullsize"),
        },
      },
    }));
  };

  // 이미지 슬라이드 렌더링 함수
  const renderImageItem = ({ item, index }: { item: any; index: number }) => {
    const imageUrl = getOptimizedAuctionPhotoUrl(supabase, item.uri, "detail");

    return (
      <TouchableOpacity
        style={{ width: screenWidth, height: 256 }}
        onPress={() => handleImagePress(index)}
        activeOpacity={0.9}
        className="relative overflow-hidden"
      >
        {/* 메인 이미지 */}
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: screenWidth,
            height: 256,
            resizeMode: "cover",
          }}
        />

        {/* 확대 아이콘 힌트 */}
        <Box className="absolute top-4 right-4 p-2 bg-black/40 rounded-full">
          <Expand size={20} color="rgba(255, 255, 255, 0.9)" />
        </Box>

        {/* 이미지 순서 표시 */}
        <Box className="absolute top-4 left-4 px-2 py-1 bg-black/60 rounded-lg">
          <Text className="text-white/80 text-xs font-medium">
            {index + 1}/{auction?.photos?.length || 1}
          </Text>
        </Box>
      </TouchableOpacity>
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
              index === currentImageIndex ? "bg-white/90" : "bg-white/30"
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
          <VStack className="items-center justify-center p-8 flex-1" space="lg">
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text className="text-white text-lg font-semibold">
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
                    <ChevronLeft
                      size={Platform.OS === "ios" ? 28 : 24}
                      color="#FFFFFF"
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

              {/* 이미지 갤러리 */}
              {auction?.photos && auction.photos.length > 0 ? (
                <VStack space="md">
                  <Box style={{ width: screenWidth, height: 256 }}>
                    <FlatList
                      ref={flatListRef}
                      data={auction.photos}
                      renderItem={({ item, index }) =>
                        renderImageItem({ item, index })
                      }
                      keyExtractor={(item) => item.id}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      style={{ flex: 1 }}
                      nestedScrollEnabled={true}
                      onViewableItemsChanged={onViewableItemsChanged}
                      viewabilityConfig={viewabilityConfig}
                      removeClippedSubviews={true}
                      maxToRenderPerBatch={3}
                      windowSize={5}
                      initialNumToRender={1}
                      getItemLayout={(data, index) => ({
                        length: screenWidth,
                        offset: screenWidth * index,
                        index,
                      })}
                    />
                    {renderImageIndicator()}
                  </Box>
                </VStack>
              ) : (
                <VStack space="md">
                  <Text className="text-yellow-300 text-lg font-black tracking-[2px] uppercase px-6">
                    상품 사진
                  </Text>
                  <ImageSkeleton height={256} showText={true} />
                </VStack>
              )}

              {/* 경매 제목 */}
              <VStack space="md" className="px-6 py-8">
                <Text className="text-purple-300 text-sm font-medium tracking-[3px] uppercase">
                  {auctionDetail.auctionCategory === "machinery"
                    ? "Machinery"
                    : auctionDetail.auctionCategory === "demolition"
                    ? "Demolition"
                    : auctionDetail.auctionCategory === "materials"
                    ? "Materials"
                    : auctionDetail.metalType || "Scrap"}{" "}
                  Auction
                </Text>
                <Text className="text-white text-2xl font-black tracking-wide">
                  {auctionDetail.auctionCategory === "machinery" &&
                  auctionDetail.productName
                    ? auctionDetail.productName
                    : auctionDetail.auctionCategory === "demolition" &&
                      (auction as any)?.demolitionInfo?.demolitionTitle &&
                      Object.keys((auction as any).demolitionInfo || {})
                        .length > 0
                    ? (auction as any).demolitionInfo?.demolitionTitle
                    : auctionDetail.title}
                </Text>
              </VStack>

              {/* 상세 정보 */}
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
                              {auctionDetail.productName || "정보 없음"}
                            </Text>
                          </VStack>
                        )}

                        {auctionDetail.manufacturer && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              제조사
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auctionDetail.manufacturer || "정보 없음"}
                            </Text>
                          </VStack>
                        )}

                        {auctionDetail.modelName && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              모델명
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auctionDetail.modelName || "정보 없음"}
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
                              {auction.productType?.name || "정보 없음"} (
                              {auction.productType?.category || "일반"})
                            </Text>
                          </VStack>
                        )}

                        {auction?.productType?.description && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              자재 설명
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.productType?.description || "설명 없음"}
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
                                (auction as any).quantity?.quantity || 0
                              ).toLocaleString()}
                              {(auction as any).quantity?.unit || "개"}
                            </Text>
                          </VStack>
                        )}

                        {/* 희망 가격 정보 */}

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
                              {auction.productType?.name || "정보 없음"} (
                              {auction.productType?.category || "일반"})
                            </Text>
                          </VStack>
                        )}

                        {/* 단위당 가격 정보 */}

                        {(auction as any)?.quantity && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              총 중량
                            </Text>
                            <Text className="text-cyan-400 font-bold text-lg">
                              {(
                                (auction as any).quantity?.quantity || 0
                              ).toLocaleString()}
                              {(auction as any).quantity?.unit || "kg"}
                            </Text>
                          </VStack>
                        )}

                        {auction?.productType?.description && (
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              품질 정보
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {auction.productType?.description || "설명 없음"}
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
                      (auction as any)?.demolitionInfo &&
                      Object.keys((auction as any).demolitionInfo).length >
                        0 && (
                        <>
                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              건물 용도
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {(auction as any).demolitionInfo
                                .buildingPurpose === "residential"
                                ? "주거용"
                                : (auction as any).demolitionInfo
                                    .buildingPurpose === "commercial"
                                ? "산업/상업용"
                                : "공공시설"}
                            </Text>
                          </VStack>

                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              철거 방식
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {(auction as any).demolitionInfo
                                .demolitionMethod === "full"
                                ? "전면 철거"
                                : (auction as any).demolitionInfo
                                    .demolitionMethod === "partial"
                                ? "부분 철거"
                                : "내부 철거"}
                            </Text>
                          </VStack>

                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              구조 타입
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {(auction as any).demolitionInfo
                                ?.structureType === "masonry"
                                ? "조적조"
                                : (auction as any).demolitionInfo
                                    ?.structureType === "reinforced-concrete"
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
                              {(auction as any).demolitionInfo?.floorCount || 1}
                              층
                            </Text>
                          </VStack>

                          <VStack space="sm">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              폐기물 처리
                            </Text>
                            <Text className="text-white font-semibold text-base">
                              {(auction as any).demolitionInfo
                                ?.wasteDisposal === "self"
                                ? "제가 직접 처리할게요"
                                : "업체가 처리해주세요"}
                            </Text>
                          </VStack>
                        </>
                      )}

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

              {/* 입찰 상태 */}
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

              {/* 입찰 입력 */}
              {auctionDetail.status !== "ended" && auctionId && (
                <BidInputSection
                  auctionId={auctionId}
                  currentTopBid={currentTopBid}
                  isActive={
                    auctionDetail.status === "active" ||
                    auctionDetail.status === "ending"
                  }
                  isOwner={isAuctionOwner}
                  hasBid={hasUserBid}
                />
              )}

              {/* 종료된 경매 결과 */}
              {auctionDetail.status === "ended" && (
                <AuctionResultSection
                  auction={auction}
                  result={auctionResult}
                  isLoading={resultLoading}
                  error={resultError}
                />
              )}

              {/* 입찰 히스토리 */}
              <BidHistorySection auctionId={auctionId || ""} />
            </VStack>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* 이미지 뷰어 모달 */}
      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        onRequestClose={closeImageViewer}
        animationType="fade"
      >
        <StatusBar hidden />
        <ImageViewer
          imageUrls={getImageViewerData()}
          index={selectedImageIndex}
          onCancel={closeImageViewer}
          enableSwipeDown={true}
          swipeDownThreshold={50}
          saveToLocalByLongPress={false}
          menuContext={{
            saveToLocal: "이미지 저장",
            cancel: "취소",
          }}
          renderHeader={() => (
            <TouchableOpacity
              style={{
                position: "absolute",
                top: Platform.OS === "ios" ? 50 : 30,
                right: 20,
                zIndex: 999,
                paddingHorizontal: 16,
                paddingVertical: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.3)",
              }}
              onPress={closeImageViewer}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                닫기
              </Text>
            </TouchableOpacity>
          )}
          renderIndicator={(currentIndex, allSize) => (
            <Text
              style={{
                position: "absolute",
                top: Platform.OS === "ios" ? 60 : 40,
                left: 20,
                color: "white",
                fontSize: 16,
                fontWeight: "bold",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
              }}
            >
              {currentIndex! + 1} / {allSize}
            </Text>
          )}
          backgroundColor="rgba(0, 0, 0, 0.9)"
          enablePreload={true}
          loadingRender={() => (
            <ActivityIndicator size="large" color="#FFFFFF" />
          )}
        />
      </Modal>
    </LinearGradient>
  );
};
