import React, { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
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
  Calendar,
  Timer,
  Play,
  CheckCircle,
  Filter,
  Grid3X3,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { useAuctions } from "@/hooks/useAuctions";
import {
  formatAuctionPrice,
  getRemainingTime,
  getAuctionStatusColor,
} from "@/data";
import { AuctionCategory } from "@/data/types/auction";

interface AuctionItem {
  id: string;
  title: string;
  metalType: string;
  weight: string;
  currentBid: string;
  endTime: string;
  status: "active" | "ending" | "ended";
  bidders: number;
  endTimeMinutes?: number; // 정렬용 선택적 속성
}

type SortFilter = "createdAt" | "endTime";
type StatusFilter = "active" | "ended" | "all";

interface AuctionFilters {
  category?: AuctionCategory;
  status?: string;
  sortBy?: SortFilter;
}

export const AuctionList = () => {
  console.log("🏛️ AuctionList 렌더링 - 순수 React Native 스타일 버전");

  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  console.log("📱 Router 객체:", router);
  console.log("📱 Router canGoBack:", router.canGoBack());
  console.log("🔐 로그인 상태:", isLoggedIn);

  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortFilter>("createdAt");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const animatedValue = useState(new Animated.Value(0))[0];
  const filterAnimatedValue = useState(new Animated.Value(0))[0];

  // 로그인이 필요한 화면임을 알리는 효과
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      // 로그인이 필요하다는 안내를 표시
      console.log("⚠️ 경매 화면 접근 - 로그인 필요");
    }
  }, [isLoggedIn, authLoading]);

  // 마감시간 정렬 시 상태 자동 조정
  useEffect(() => {
    if (selectedSort === "endTime" && selectedStatus === "all") {
      setSelectedStatus("active");
    }
  }, [selectedSort, selectedStatus]);

  // TanStack Query로 경매 데이터 조회
  const getEffectiveStatus = () => {
    // 마감시간 정렬 시에는 진행중인 경매만 보여줌
    if (selectedSort === "endTime") {
      return "active";
    }
    return selectedStatus !== "all" ? selectedStatus : undefined;
  };

  const filters: AuctionFilters = {
    sortBy: selectedSort,
    ...(getEffectiveStatus() && { status: getEffectiveStatus() }),
  };
  const { data: queryAuctions = [], isLoading, error } = useAuctions(filters);

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
            endTimeMinutes: 150, // 정렬용
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
            endTimeMinutes: 315, // 정렬용
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
            endTimeMinutes: 105, // 정렬용
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
            endTimeMinutes: -1, // 정렬용 (종료됨)
          },
        ]
          .filter((item) => {
            // 마감시간 정렬 시 종료된 경매 제외
            if (selectedSort === "endTime" && item.status === "ended") {
              return false;
            }

            // 상태 필터 적용
            const effectiveStatus = getEffectiveStatus();
            if (effectiveStatus === "active") {
              return item.status === "active" || item.status === "ending";
            } else if (effectiveStatus === "ended") {
              return item.status === "ended";
            }

            return true;
          })
          .sort((a, b) => {
            // 마감시간 정렬
            if (selectedSort === "endTime") {
              return (a.endTimeMinutes || 0) - (b.endTimeMinutes || 0);
            }
            // 기본 등록일 정렬 (ID 순서로 가정)
            return parseInt(a.id) - parseInt(b.id);
          })
      : queryAuctions.map((auction) => ({
          id: auction.id,
          title:
            (auction as any).title ||
            (auction as any).productName ||
            "고철 경매",
          metalType: auction.productType?.name || "고철",
          weight: (auction as any).quantity?.quantity
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
      enabled: true,
    },
    {
      id: "materials",
      name: "중고자재",
      IconComponent: Package,
      enabled: true, // 활성화
    },
    { id: "demolition", name: "철거", IconComponent: Gavel, enabled: true },
  ];

  const sortOptions = [
    {
      id: "createdAt" as SortFilter,
      name: "등록일",
      IconComponent: Calendar,
      description: "최신 등록순",
    },
    {
      id: "endTime" as SortFilter,
      name: "마감시간",
      IconComponent: Timer,
      description: "마감 임박순",
    },
  ];

  const statusOptions = [
    {
      id: "all" as StatusFilter,
      name: "전체",
      IconComponent: Grid3X3,
      description: "모든 경매",
    },
    {
      id: "active" as StatusFilter,
      name: "진행중",
      IconComponent: Play,
      description: "진행중인 경매만",
    },
    {
      id: "ended" as StatusFilter,
      name: "종료",
      IconComponent: CheckCircle,
      description: "종료된 경매만",
    },
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

  const handleSortChange = (sortId: SortFilter) => {
    setSelectedSort(sortId);
  };

  const handleStatusChange = (statusId: StatusFilter) => {
    // 마감시간 정렬 중에는 전체나 종료 선택 불가
    if (
      selectedSort === "endTime" &&
      (statusId === "all" || statusId === "ended")
    ) {
      return;
    }
    setSelectedStatus(statusId);
  };

  // 현재 선택된 상태를 실제 표시되는 상태로 변환
  const getDisplayStatus = () => {
    if (selectedSort === "endTime") {
      return "active";
    }
    return selectedStatus;
  };

  // 필터 토글 함수
  const toggleFilter = () => {
    const toValue = isFilterExpanded ? 0 : 1;
    setIsFilterExpanded(!isFilterExpanded);

    Animated.timing(filterAnimatedValue, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // 현재 필터 상태를 간략하게 표시하는 텍스트
  const getFilterSummary = () => {
    const sortText = selectedSort === "createdAt" ? "등록일순" : "마감시간순";
    const statusText =
      getDisplayStatus() === "all"
        ? "전체"
        : getDisplayStatus() === "active"
        ? "진행중"
        : "종료";
    return `${sortText} · ${statusText}`;
  };

  const handleCreateAuction = (auctionType: string) => {
    console.log("🔍 handleCreateAuction 호출됨, 타입:", auctionType);

    // 로그인 체크
    if (!isLoggedIn) {
      Alert.alert("로그인 필요", "경매 등록을 위해 로그인이 필요합니다.", [
        { text: "취소", style: "cancel" },
        {
          text: "로그인",
          onPress: () => router.push("/login"),
        },
      ]);
      return;
    }

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
    } else if (auctionType === "machinery") {
      console.log("🚀 중고기계 경매 생성 화면으로 이동 시도 중...");
      const routes = [
        "/auction-create/machinery", // 1순위: 중고기계 경매 생성 화면 (종류, 이미지 선택)
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
          "중고기계 경매 생성 화면으로 이동할 수 없습니다.\n\n시도된 경로:\n" +
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
    } else if (auctionType === "materials") {
      console.log("🚀 중고자재 경매 생성 화면으로 이동 시도 중...");
      const routes = [
        "/auction-create/materials", // 1순위: 중고자재 경매 생성 화면 (정확한 스크린 이름)
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
          "중고자재 경매 생성 화면으로 이동할 수 없습니다.\n\n시도된 경로:\n" +
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
    } else if (auctionType === "demolition") {
      console.log("🚀 철거 경매 생성 화면으로 이동 시도 중...");
      const routes = [
        "/auction-create/demolition", // 1순위: 철거 경매 생성 화면
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
          "철거 경매 생성 화면으로 이동할 수 없습니다.\n\n시도된 경로:\n" +
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
              style={{ alignItems: "center", marginBottom: 32, marginTop: 20 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
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
                쉽고 빠른 경매 플랫폼
              </Text>
            </View>

            {/* Filter Section */}
            <View style={{ marginBottom: isFilterExpanded ? 1 : 0 }}>
              {/* Filter Header - Always Visible */}
              <TouchableOpacity
                onPress={toggleFilter}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  paddingHorizontal: 4,
                  paddingVertical: 8,
                }}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <Filter size={18} color="#FCD34D" strokeWidth={2} />
                  <Text
                    style={{
                      color: "#FCD34D",
                      fontSize: 16,
                      fontWeight: "bold",
                      marginLeft: 8,
                    }}
                  >
                    필터
                  </Text>

                  {/* Collapsed State Summary */}
                  {!isFilterExpanded && (
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: 14,
                        marginLeft: 12,
                        flex: 1,
                      }}
                    >
                      {getFilterSummary()}
                    </Text>
                  )}
                </View>

                {/* Toggle Icon */}
                {isFilterExpanded ? (
                  <ChevronUp size={20} color="#FCD34D" strokeWidth={2} />
                ) : (
                  <ChevronDown size={20} color="#FCD34D" strokeWidth={2} />
                )}
              </TouchableOpacity>

              {/* Expandable Filter Content */}
              <Animated.View
                style={{
                  height: filterAnimatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 160], // 높이를 160으로 증가하여 버튼 잘림 방지
                  }),
                  opacity: filterAnimatedValue,
                  overflow: "hidden",
                }}
              >
                {/* Sort Filter Group */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: 13,
                      fontWeight: "600",
                      marginBottom: 8,
                      paddingHorizontal: 4,
                    }}
                  >
                    정렬
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
                  >
                    {sortOptions.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => handleSortChange(option.id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor:
                            selectedSort === option.id
                              ? "rgba(147, 51, 234, 0.3)"
                              : "rgba(255, 255, 255, 0.04)",
                          borderWidth: 1,
                          borderColor:
                            selectedSort === option.id
                              ? "rgba(147, 51, 234, 0.6)"
                              : "rgba(255, 255, 255, 0.08)",
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.7}
                      >
                        <option.IconComponent
                          size={14}
                          color={
                            selectedSort === option.id
                              ? "#9333EA"
                              : "rgba(255,255,255,0.7)"
                          }
                          strokeWidth={2}
                        />
                        <Text
                          style={{
                            color:
                              selectedSort === option.id
                                ? "#9333EA"
                                : "rgba(255,255,255,0.7)",
                            fontSize: 13,
                            fontWeight: "600",
                            marginLeft: 6,
                          }}
                        >
                          {option.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Status Filter Group */}
                <View style={{ marginBottom: 8 }}>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: 13,
                      fontWeight: "600",
                      marginBottom: 8,
                      paddingHorizontal: 4,
                    }}
                  >
                    상태{" "}
                    {selectedSort === "endTime" && (
                      <Text
                        style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}
                      >
                        (마감시간 정렬 시 진행중만 표시)
                      </Text>
                    )}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      paddingHorizontal: 4,
                      gap: 8,
                      paddingBottom: 8,
                    }}
                  >
                    {statusOptions.map((option) => {
                      const isDisabled =
                        selectedSort === "endTime" &&
                        (option.id === "all" || option.id === "ended");
                      const isSelected = getDisplayStatus() === option.id;

                      return (
                        <TouchableOpacity
                          key={option.id}
                          onPress={() => handleStatusChange(option.id)}
                          disabled={isDisabled}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: isSelected
                              ? "rgba(147, 51, 234, 0.3)"
                              : isDisabled
                              ? "rgba(255, 255, 255, 0.02)"
                              : "rgba(255, 255, 255, 0.04)",
                            borderWidth: 1,
                            borderColor: isSelected
                              ? "rgba(147, 51, 234, 0.6)"
                              : isDisabled
                              ? "rgba(255, 255, 255, 0.04)"
                              : "rgba(255, 255, 255, 0.08)",
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            opacity: isDisabled ? 0.4 : 1,
                          }}
                          activeOpacity={isDisabled ? 1 : 0.7}
                        >
                          <option.IconComponent
                            size={14}
                            color={
                              isSelected
                                ? "#9333EA"
                                : isDisabled
                                ? "rgba(255,255,255,0.3)"
                                : "rgba(255,255,255,0.7)"
                            }
                            strokeWidth={2}
                          />
                          <Text
                            style={{
                              color: isSelected
                                ? "#9333EA"
                                : isDisabled
                                ? "rgba(255,255,255,0.3)"
                                : "rgba(255,255,255,0.7)",
                              fontSize: 13,
                              fontWeight: "600",
                              marginLeft: 6,
                            }}
                          >
                            {option.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </Animated.View>
            </View>

            {/* Auction List */}
            <View style={{ marginTop: 24 }}>
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

              {/* 로그인 필요 안내 */}
              {!authLoading && !isLoggedIn && (
                <View
                  style={{
                    paddingVertical: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255, 193, 7, 0.1)",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(255, 193, 7, 0.3)",
                    marginTop: 20,
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: "rgba(255, 193, 7, 0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🔒</Text>
                  </View>
                  <Text
                    style={{
                      color: "#FCD34D",
                      fontSize: 18,
                      fontWeight: "bold",
                      marginBottom: 8,
                      textAlign: "center",
                    }}
                  >
                    로그인이 필요합니다
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: 14,
                      textAlign: "center",
                      marginBottom: 20,
                    }}
                  >
                    경매 참여 및 등록을 위해{"\n"}로그인해주세요
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/login")}
                    style={{
                      backgroundColor: "#FCD34D",
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: "#000",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      로그인하기
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 경매 목록 */}
              {!isLoading && !error && isLoggedIn && (
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
