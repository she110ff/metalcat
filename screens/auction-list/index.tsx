import React, { useState } from "react";
import { ScrollView, Animated } from "react-native";
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

  // 샘플 경매 데이터
  const auctionItems: AuctionItem[] = [
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
  ];

  const auctionTypes = [
    { id: "scrap", name: "고철", icon: "construct" },
    { id: "machinery", name: "중고기계", icon: "settings" },
    { id: "materials", name: "중고자재", icon: "cube" },
    { id: "demolition", name: "철거", icon: "hammer" },
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

    router.push("/auction-create");
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
              <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                진행중인 경매
              </Text>

              <VStack space="md">
                {auctionItems.map((item) => (
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
                            <Text className="text-white font-bold text-lg mb-1 tracking-wide">
                              {item.title}
                            </Text>
                            <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                              {item.metalType} • {item.weight}
                            </Text>
                          </VStack>
                          <Box
                            className="px-3 py-1 rounded-lg"
                            style={{
                              backgroundColor: getStatusColor(item.status),
                            }}
                          >
                            <Text className="text-white font-semibold text-xs tracking-wide">
                              {getStatusText(item.status)}
                            </Text>
                          </Box>
                        </HStack>

                        <HStack className="items-center justify-between">
                          <VStack>
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              현재 입찰가
                            </Text>
                            <Text className="text-white font-bold text-base tracking-wide">
                              {item.currentBid}
                            </Text>
                          </VStack>

                          <VStack className="items-end">
                            <Text className="text-white/60 text-xs uppercase tracking-[1px]">
                              남은 시간
                            </Text>
                            <Text className="text-white font-semibold text-sm tracking-wide">
                              {item.endTime}
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
                              {item.bidders}명 참여
                            </Text>
                          </HStack>

                          <HStack className="items-center">
                            <Ionicons
                              name="arrow-forward"
                              size={16}
                              color="rgba(255, 255, 255, 0.6)"
                            />
                            <Text className="text-white/60 text-xs ml-1">
                              상세보기
                            </Text>
                          </HStack>
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
                    onPress={() => handleCreateAuction(type.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(15, 10, 26, 0.95)",
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: "rgba(147, 51, 234, 0.3)",
                      shadowColor: "#9333EA",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      elevation: 8,
                      minWidth: 160,
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "rgba(147, 51, 234, 0.2)",
                        borderWidth: 1,
                        borderColor: "rgba(147, 51, 234, 0.4)",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={18}
                        color="#9333EA"
                      />
                    </Box>
                    <Text className="text-white font-semibold text-sm tracking-wide">
                      {type.name}
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
