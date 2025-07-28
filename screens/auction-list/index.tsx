import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native";
import {
  Gavel,
  Plus,
  Clock,
  Users,
  Hammer,
  Settings,
  Package,
  AlertCircle,
} from "lucide-react-native";
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
  console.log("🏛️ AuctionList 렌더링 - 순수 React Native 스타일 버전");

  const router = useRouter();
  console.log("📱 Router 객체:", router);
  console.log("📱 Router canGoBack:", router.canGoBack());
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
    { id: "scrap", name: "고철", IconComponent: Hammer, enabled: true },
    {
      id: "machinery",
      name: "중고기계",
      IconComponent: Settings,
      enabled: false,
    },
    {
      id: "materials",
      name: "중고자재",
      IconComponent: Package,
      enabled: false,
    },
    { id: "demolition", name: "철거", IconComponent: Gavel, enabled: false },
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
    console.log("🔍 handleCreateAuction 호출됨, 타입:", auctionType);

    setShowActionMenu(false);
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    // 현재는 고철 경매만 활성화
    if (auctionType === "scrap") {
      console.log("🚀 고철 경매 생성 화면으로 이동 시도 중...");

      // 원래 고철 경매 플로우로 복원
      const routes = [
        "/auction-create/scrap", // 1순위: 고철 경매 생성 화면 (금속 종류, 이미지 선택)
        "/auction-create", // 2순위: 메인 경매 생성 화면 (대안)
      ];

      let routeSuccess = false;

      for (const route of routes) {
        try {
          console.log("📁 시도하는 라우팅 경로:", route);
          router.push(route as any);
          console.log("✅ 라우팅 성공:", route);
          routeSuccess = true;
          break;
        } catch (error) {
          console.error("❌ 라우팅 실패:", route, error);
        }
      }

      if (!routeSuccess) {
        console.error("🚫 모든 라우팅 경로 실패");
        Alert.alert(
          "라우팅 오류",
          "경매 생성 화면으로 이동할 수 없습니다.\n\n시도된 경로:\n" +
            routes.join("\n") +
            "\n\n메인 경매 화면을 사용하시겠습니까?",
          [
            { text: "취소", style: "cancel" },
            {
              text: "메인 경매",
              onPress: () => {
                try {
                  router.push("/(tabs)/auction");
                  console.log("📱 대안 라우팅: 메인 경매 화면으로 이동");
                } catch (e) {
                  console.error("❌ 대안 라우팅도 실패:", e);
                }
              },
            },
          ]
        );
      }
    } else {
      // 다른 타입들은 아직 구현되지 않음
      Alert.alert(
        "준비중",
        `${
          auctionTypes.find((t) => t.id === auctionType)?.name
        } 경매는 준비중입니다.`
      );
      console.log(`${auctionType} 경매는 아직 구현되지 않았습니다.`);
    }
  };

  const toggleActionMenu = () => {
    console.log("🎬 toggleActionMenu 호출됨, 현재 상태:", showActionMenu);

    if (showActionMenu) {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setShowActionMenu(false);
        console.log("🎬 액션 메뉴 닫힌됨");
      });
    } else {
      setShowActionMenu(true);
      console.log("🎬 액션 메뉴 열림됨");
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
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          <View style={{ flex: 1, padding: 24 }}>
            {/* Header */}
            <View
              style={{ alignItems: "center", marginBottom: 40, marginTop: 20 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Gavel size={32} color="#FCD34D" strokeWidth={2.5} />
                <Text
                  style={{
                    fontFamily: "SpaceMono",
                    fontSize: 28,
                    fontWeight: "900",
                    color: "#F8FAFC",
                    letterSpacing: 6,
                    marginLeft: 12,
                    textShadowColor: "rgba(255, 255, 255, 0.4)",
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 4,
                  }}
                >
                  AUCTION
                </Text>
              </View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 16,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                금속 스크랩 경매 플랫폼
              </Text>
            </View>

            {/* Auction List */}
            <View style={{ marginTop: 24 }}>
              <Text
                style={{
                  color: "#FCD34D",
                  fontSize: 20,
                  fontWeight: "bold",
                  letterSpacing: 2,
                  marginBottom: 20,
                }}
              >
                진행중인 경매
              </Text>

              {/* 로딩 상태 */}
              {isLoading && (
                <View
                  style={{
                    paddingVertical: 32,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityIndicator size="large" color="#9333EA" />
                  <Text
                    style={{
                      color: "white",
                      fontSize: 16,
                      marginTop: 16,
                    }}
                  >
                    경매 목록을 불러오는 중...
                  </Text>
                </View>
              )}

              {/* 에러 상태 */}
              {error && (
                <View
                  style={{
                    paddingVertical: 32,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertCircle size={48} color="#EF4444" strokeWidth={2} />
                  <Text
                    style={{
                      color: "#EF4444",
                      fontSize: 16,
                      marginTop: 16,
                      textAlign: "center",
                    }}
                  >
                    경매 목록을 불러오는데 실패했습니다.
                  </Text>
                </View>
              )}

              {/* 경매 목록 */}
              {!isLoading && !error && (
                <View style={{ gap: 16 }}>
                  {auctionItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleAuctionPress(item.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                          borderWidth: 1,
                          borderColor: "rgba(255, 255, 255, 0.08)",
                          borderRadius: 16,
                          padding: 16,
                        }}
                      >
                        <View style={{ gap: 12 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  color: "white",
                                  fontWeight: "600",
                                  fontSize: 16,
                                  marginBottom: 4,
                                }}
                              >
                                {item.title}
                              </Text>
                              <Text
                                style={{
                                  color: "rgba(255,255,255,0.6)",
                                  fontSize: 14,
                                }}
                              >
                                {item.metalType} • {item.weight}
                              </Text>
                            </View>

                            <View style={{ alignItems: "flex-end" }}>
                              <Text
                                style={{
                                  color: "white",
                                  fontWeight: "bold",
                                  fontSize: 18,
                                }}
                              >
                                {item.currentBid}
                              </Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  marginTop: 2,
                                }}
                              >
                                <Users
                                  size={12}
                                  color="rgba(255,255,255,0.6)"
                                  strokeWidth={2}
                                />
                                <Text
                                  style={{
                                    color: "rgba(255,255,255,0.6)",
                                    fontSize: 12,
                                    marginLeft: 4,
                                  }}
                                >
                                  {item.bidders}명 참여
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: getStatusColor(item.status),
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 8,
                              }}
                            >
                              <Text
                                style={{
                                  color: "white",
                                  fontWeight: "600",
                                  fontSize: 12,
                                }}
                              >
                                {getStatusText(item.status)}
                              </Text>
                            </View>

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                            >
                              <Clock
                                size={14}
                                color="rgba(255,255,255,0.6)"
                                strokeWidth={2}
                              />
                              <Text
                                style={{
                                  color: "rgba(255,255,255,0.6)",
                                  fontSize: 14,
                                  marginLeft: 4,
                                }}
                              >
                                {item.status === "ended"
                                  ? "종료됨"
                                  : item.endTime}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Floating Action Menu */}
        {showActionMenu && (
          <Animated.View
            style={{
              position: "absolute",
              bottom: 200, // 좀 더 위로 올려서 확실히 보이도록
              right: 24,
              opacity: animatedValue,
              zIndex: 10, // 메뉴를 최상위에 배치
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
            pointerEvents="auto"
          >
            <View style={{ gap: 12 }}>
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
                  pointerEvents="auto"
                >
                  <TouchableOpacity
                    onPress={() => {
                      console.log(
                        "🖱️ 플로팅 버튼 터치됨, 타입:",
                        type.id,
                        "활성화됨:",
                        type.enabled
                      );
                      console.log("🖱️ 터치된 버튼 이름:", type.name);
                      if (type.enabled) {
                        console.log(
                          "✅ 활성화된 버튼이므로 handleCreateAuction 호출"
                        );
                        handleCreateAuction(type.id);
                      } else {
                        console.log("⚠️ 비활성화된 버튼이 터치됨:", type.name);
                      }
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: type.enabled
                        ? "rgba(15, 10, 26, 0.95)"
                        : "rgba(15, 10, 26, 0.5)",
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 16, // 터치 영역 확대
                      borderWidth: 1,
                      borderColor: type.enabled
                        ? "rgba(147, 51, 234, 0.3)"
                        : "rgba(107, 114, 128, 0.3)",
                      minWidth: 160,
                      minHeight: 50, // 최소 높이 추가
                      opacity: type.enabled ? 1 : 0.5,
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // 터치 영역 확장
                  >
                    <View
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
                      <type.IconComponent
                        size={18}
                        color={type.enabled ? "#9333EA" : "#6B7280"}
                        strokeWidth={2}
                      />
                    </View>
                    <Text
                      style={{
                        color: type.enabled ? "#FFFFFF" : "#6B7280",
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      {type.name}
                      {!type.enabled && " (준비중)"}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Floating Action Button */}
        <TouchableOpacity
          onPress={() => {
            console.log("➕ 메인 플로팅 버튼 터치됨");
            toggleActionMenu();
          }}
          style={{
            position: "absolute",
            bottom: 120,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "rgba(147, 51, 234, 0.9)",
            justifyContent: "center",
            alignItems: "center",
            transform: [
              {
                rotate: showActionMenu ? "45deg" : "0deg",
              },
            ],
          }}
          activeOpacity={0.8}
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Backdrop */}
        {showActionMenu && (
          <TouchableOpacity
            onPress={() => {
              console.log("🔙 백드롭 터치됨 - 메뉴 닫기");
              toggleActionMenu();
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              zIndex: 1, // 백드롭을 메뉴보다 뒤에 배치
            }}
            activeOpacity={1}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};
