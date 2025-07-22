import React, { useState } from "react";
import { ScrollView, Animated, ActivityIndicator } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAuctions } from "@/hooks/useAuctions";
import {
  formatAuctionPrice,
  getRemainingTime,
  getAuctionStatusColor,
} from "@/data";

interface AuctionItem {
  id: string;
  title: string;
  metalType: string;
  weight: string;
  currentBid: string;
  endTime: string;
  status: "active" | "ending" | "ended";
  bidders: number;
}

export const AuctionList = () => {
  const router = useRouter();
  const [showActionMenu, setShowActionMenu] = useState(false);
  const animatedValue = useState(new Animated.Value(0))[0];

  // TanStack Query로 경매 데이터 조회
  const { data: queryAuctions = [], isLoading, error } = useAuctions(); // status 필터 제거하여 모든 경매 표시

  // TanStack Query 데이터를 사용하되, 로딩 중이거나 에러가 있으면 기본 데이터 사용
  const auctionItems =
    isLoading || error
      ? [
          {
            id: "1",
            title: "고순도 구리 스크랩",
            metalType: "구리",
            weight: "2,500kg",
            currentBid: "₩12,500,000",
            endTime: "2시간 30분",
            status: "active",
            bidders: 8,
          },
          {
            id: "2",
            title: "알루미늄 캔 스크랩",
            metalType: "알루미늄",
            weight: "1,800kg",
            currentBid: "₩3,600,000",
            endTime: "5시간 15분",
            status: "active",
            bidders: 12,
          },
          {
            id: "3",
            title: "스테인리스 스틸 스크랩",
            metalType: "스테인리스",
            weight: "3,200kg",
            currentBid: "₩8,960,000",
            endTime: "1시간 45분",
            status: "ending",
            bidders: 15,
          },
          {
            id: "4",
            title: "황동 스크랩",
            metalType: "황동",
            weight: "950kg",
            currentBid: "₩4,750,000",
            endTime: "종료됨",
            status: "ended",
            bidders: 6,
          },
        ]
      : queryAuctions.map((auction) => ({
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
          currentBid: formatAuctionPrice(auction.currentBid || 0),
          endTime: getRemainingTime(auction.endTime),
          status: auction.status as "active" | "ending" | "ended",
          bidders: auction.bidders || 0,
        }));

  const auctionTypes = [
    { id: "scrap", name: "고철", icon: "construct", enabled: true },
    { id: "machinery", name: "중고기계", icon: "settings", enabled: false },
    { id: "materials", name: "중고자재", icon: "cube", enabled: false },
    { id: "demolition", name: "철거", icon: "hammer", enabled: false },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "rgba(34, 197, 94, 0.9)";
      case "ending":
        return "rgba(245, 158, 11, 0.9)";
      case "ended":
        return "rgba(239, 68, 68, 0.9)";
      default:
        return "rgba(107, 114, 128, 0.9)";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "진행중";
      case "ending":
        return "마감임박";
      case "ended":
        return "종료";
      default:
        return "알 수 없음";
    }
  };

  const handleAuctionPress = (auctionId: string) => {
    router.push(`/auction-detail/${auctionId}` as any);
  };

  const handleCreateAuction = (auctionType: string) => {
    setShowActionMenu(false);
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    // 현재는 고철 경매만 활성화
    if (auctionType === "scrap") {
      router.push("/auction-create/scrap" as any);
    } else {
      // 다른 타입들은 아직 구현되지 않음
      console.log(`${auctionType} 경매는 아직 구현되지 않았습니다.`);
      // TODO: 추후 구현 예정
    }
  };

  const toggleActionMenu = () => {
    if (showActionMenu) {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => setShowActionMenu(false));
    } else {
      setShowActionMenu(true);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
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
          <VStack className="flex-1 p-6" space="xl">
            {/* Header */}
            <VStack space="lg">
              <VStack className="items-center">
                <Text
                  className="text-white text-2xl font-black uppercase text-center"
                  style={{
                    fontFamily: "SpaceMono",
                    textShadowColor: "rgba(255, 255, 255, 0.4)",
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 4,
                    letterSpacing: 6,
                    fontWeight: "900",
                    color: "#F8FAFC",
                  }}
                >
                  AUCTION
                </Text>
              </VStack>
            </VStack>

            {/* Auction List */}
            <VStack space="lg" className="mt-10">
              <Text
                className="text-yellow-300 text-xl font-black tracking-[2px] uppercase"
                style={{ fontFamily: "NanumGothic" }}
              >
                진행중인 경매
              </Text>

              <VStack space="md">
                {/* 로딩 상태 */}
                {isLoading && (
                  <Box className="py-8 items-center justify-center">
                    <ActivityIndicator size="large" color="#9333EA" />
                    <Text
                      className="text-white text-base mt-4"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      경매 목록을 불러오는 중...
                    </Text>
                  </Box>
                )}

                {/* 에러 상태 */}
                {error && (
                  <Box className="py-8 items-center justify-center">
                    <Ionicons name="alert-circle" size={48} color="#EF4444" />
                    <Text
                      className="text-red-400 text-base mt-4 text-center"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      경매 목록을 불러오는데 실패했습니다.
                    </Text>
                  </Box>
                )}

                {/* 경매 목록 */}
                {!isLoading &&
                  !error &&
                  auctionItems.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => handleAuctionPress(item.id)}
                    >
                      <Box
                        className="rounded-2xl p-4"
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
                          <HStack className="items-center justify-between">
                            <VStack className="flex-1">
                              <Text className="text-white font-semibold text-base tracking-wide">
                                {item.title}
                              </Text>
                              <Text className="text-white/60 text-sm">
                                {item.metalType} • {item.weight}
                              </Text>
                            </VStack>

                            <VStack className="items-end">
                              <Text className="text-white font-bold text-lg tracking-wide">
                                {item.currentBid}
                              </Text>
                              <Text className="text-white/60 text-xs">
                                {item.bidders}명 참여
                              </Text>
                            </VStack>
                          </HStack>

                          <HStack className="items-center justify-between mt-2">
                            <Box
                              className="px-2 py-1 rounded-lg"
                              style={{
                                backgroundColor: getStatusColor(item.status),
                              }}
                            >
                              <Text className="text-white font-semibold text-xs tracking-wide">
                                {getStatusText(item.status)}
                              </Text>
                            </Box>

                            <Text className="text-white/60 text-sm">
                              {item.status === "ended"
                                ? "종료됨"
                                : item.endTime}
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>
                    </Pressable>
                  ))}
              </VStack>
            </VStack>
          </VStack>
        </ScrollView>

        {/* Floating Action Menu */}
        {showActionMenu && (
          <Animated.View
            style={{
              position: "absolute",
              bottom: 185,
              right: 24,
              opacity: animatedValue,
              transform: [
                {
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
                {
                  translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }}
            pointerEvents="box-none"
          >
            <VStack space="md">
              {auctionTypes.reverse().map((type, index) => (
                <Animated.View
                  key={type.id}
                  style={{
                    opacity: animatedValue,
                    transform: [
                      {
                        translateY: animatedValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  }}
                  pointerEvents="box-none"
                >
                  <Pressable
                    onPress={() => type.enabled && handleCreateAuction(type.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: type.enabled
                        ? "rgba(15, 10, 26, 0.95)"
                        : "rgba(15, 10, 26, 0.5)",
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: type.enabled
                        ? "rgba(147, 51, 234, 0.3)"
                        : "rgba(107, 114, 128, 0.3)",
                      shadowColor: type.enabled ? "#9333EA" : "#6B7280",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: type.enabled ? 0.4 : 0.2,
                      shadowRadius: 12,
                      elevation: type.enabled ? 8 : 4,
                      minWidth: 160,
                      opacity: type.enabled ? 1 : 0.5,
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: type.enabled
                          ? "rgba(147, 51, 234, 0.2)"
                          : "rgba(107, 114, 128, 0.2)",
                        borderWidth: 1,
                        borderColor: type.enabled
                          ? "rgba(147, 51, 234, 0.4)"
                          : "rgba(107, 114, 128, 0.4)",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={18}
                        color={type.enabled ? "#9333EA" : "#6B7280"}
                      />
                    </Box>
                    <Text
                      className="font-semibold text-sm tracking-wide"
                      style={{
                        color: type.enabled ? "#FFFFFF" : "#6B7280",
                        fontFamily: "NanumGothic",
                      }}
                    >
                      {type.name}
                      {!type.enabled && " (준비중)"}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </VStack>
          </Animated.View>
        )}

        {/* Floating Action Button */}
        <Pressable
          onPress={toggleActionMenu}
          style={{
            position: "absolute",
            bottom: 120,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "rgba(147, 51, 234, 0.9)",
            shadowColor: "#9333EA",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 12,
            justifyContent: "center",
            alignItems: "center",
            transform: [
              {
                rotate: showActionMenu ? "45deg" : "0deg",
              },
            ],
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>

        {/* Backdrop */}
        {showActionMenu && (
          <Pressable
            onPress={toggleActionMenu}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.2)",
            }}
            pointerEvents="box-none"
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};
