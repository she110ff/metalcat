import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useMyServiceRequests } from "@/hooks/service-request/myRequests";
import { useMyAuctions, useMyBiddings } from "@/hooks/auctions/useMyAuctions";
import { SimpleRequestCard } from "@/components/service-request/SimpleRequestCard";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import {
  ChevronLeftIcon,
  EditIcon,
  Icon,
  SettingsIcon,
} from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Alert } from "react-native";
import { Heading } from "@/components/ui/heading";
import { Image } from "react-native";
import { ScrollView } from "@/components/ui/scroll-view";
import { Avatar, AvatarBadge, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { cn } from "@gluestack-ui/nativewind-utils/cn";
import { Platform } from "react-native";
import { getAvatarUrl, testAvatarGeneration } from "@/utils/avatar";

const MainContent = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"auction" | "bidding" | "premium">(
    "auction"
  );

  // 현재 사용자 정보 확인용
  const { user, isLoggedIn, logout, isLoggingOut } = useAuth();
  const { isAdmin } = useAdminAuth();

  console.log("🔍 My 화면 - 로그인 상태:", isLoggedIn);
  console.log("🔍 My 화면 - 사용자 정보:", user);
  console.log("🔍 My 화면 - 사용자 ID:", user?.id);
  console.log("🔐 My 화면 - 관리자 권한:", isAdmin);

  // 아바타 생성 테스트 (한 번만 실행)
  React.useEffect(() => {
    testAvatarGeneration();
  }, []);

  // 서비스 요청 목록 조회 (premium 탭용)
  const { data: myRequests, isLoading: requestsLoading } =
    useMyServiceRequests();

  // 내 경매 등록 목록 조회
  const {
    data: myAuctions,
    isLoading: auctionsLoading,
    error: auctionsError,
  } = useMyAuctions();

  // 내 입찰 목록 조회
  const {
    data: myBiddings,
    isLoading: biddingsLoading,
    error: biddingsError,
  } = useMyBiddings();

  // 로그아웃 처리
  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃하시겠습니까?", [
      {
        text: "취소",
        style: "cancel",
      },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/(tabs)/");
        },
      },
    ]);
  };

  // 경매 상태 텍스트 변환 헬퍼 함수
  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "진행중";
      case "ending":
        return "마감임박";
      case "ended":
        return "종료";
      case "cancelled":
        return "취소됨";
      default:
        return status;
    }
  };

  // 가격 포맷 헬퍼 함수
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(price);
  };

  // 남은 시간 계산 헬퍼 함수
  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const remaining = endTime.getTime() - now.getTime();

    if (remaining <= 0) {
      return "종료됨";
    }

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return `${days}일 ${hours}시간`;
    } else if (hours > 0) {
      return `${hours}시간`;
    } else {
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes}분`;
    }
  };

  const renderTabContent = () => {
    if (activeTab === "premium") {
      // 프리미엄 탭: 서비스 요청 목록
      if (requestsLoading) {
        return (
          <Box className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-500">로딩 중...</Text>
          </Box>
        );
      }

      if (!myRequests || myRequests.length === 0) {
        return (
          <VStack space="md" className="items-center py-8">
            <Text className="text-gray-500 text-center">
              아직 서비스 요청이 없습니다
            </Text>
            <Button
              variant="outline"
              onPress={() => router.push("/service-request")}
              className="mt-4"
            >
              <ButtonText>서비스 요청하기</ButtonText>
            </Button>
          </VStack>
        );
      }

      return (
        <VStack space="md">
          <Text className="text-lg font-bold text-gray-900">
            📋 나의 서비스 요청 ({myRequests.length}건)
          </Text>
          {myRequests.map((request) => (
            <SimpleRequestCard
              key={request.id}
              request={request}
              onPress={() => {
                // 나중에 상세 화면으로 이동 (현재는 없음)
                console.log("요청 상세:", request.id);
              }}
            />
          ))}
        </VStack>
      );
    }

    if (activeTab === "auction") {
      // 내가 등록한 경매 목록
      if (auctionsLoading) {
        return (
          <Box className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-500">로딩 중...</Text>
          </Box>
        );
      }

      if (auctionsError) {
        return (
          <Box className="flex-1 items-center justify-center py-8">
            <Text className="text-red-500">
              경매 목록을 불러오는데 실패했습니다.
            </Text>
          </Box>
        );
      }

      if (!myAuctions || myAuctions.length === 0) {
        return (
          <VStack space="md" className="items-center py-8">
            <Text className="text-gray-500 text-center">
              아직 등록한 경매가 없습니다
            </Text>
            <Button
              variant="outline"
              onPress={() => router.push("/auction-create")}
              className="mt-4"
            >
              <ButtonText>경매 등록하기</ButtonText>
            </Button>
          </VStack>
        );
      }

      return (
        <VStack space="md">
          <Text className="text-lg font-bold text-gray-900">
            🏷️ 내가 등록한 경매 ({myAuctions.length}건)
          </Text>
          {myAuctions.map((auction) => (
            <Pressable
              key={auction.id}
              onPress={() => router.push(`/auction-detail/${auction.id}`)}
            >
              <Box className="bg-white rounded-xl p-4 border border-gray-200">
                <VStack space="sm">
                  <HStack className="justify-between items-start">
                    <VStack className="flex-1">
                      <Text className="font-semibold text-lg">
                        {auction.title}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {auction.auctionCategory}
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="font-bold text-green-600">
                        {formatPrice(auction.currentBid || 0)}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {getTimeRemaining(auction.endTime)}
                      </Text>
                    </VStack>
                  </HStack>
                  <Box
                    className={`px-2 py-1 rounded self-start ${
                      auction.status === "active" || auction.status === "ending"
                        ? "bg-green-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        auction.status === "active" ||
                        auction.status === "ending"
                          ? "text-green-700"
                          : "text-gray-700"
                      }`}
                    >
                      {getStatusText(auction.status)}
                    </Text>
                  </Box>
                </VStack>
              </Box>
            </Pressable>
          ))}
        </VStack>
      );
    }

    if (activeTab === "bidding") {
      // 내가 입찰한 경매 목록
      if (biddingsLoading) {
        return (
          <Box className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-500">로딩 중...</Text>
          </Box>
        );
      }

      if (biddingsError) {
        return (
          <Box className="flex-1 items-center justify-center py-8">
            <Text className="text-red-500">
              입찰 목록을 불러오는데 실패했습니다.
            </Text>
          </Box>
        );
      }

      if (!myBiddings || myBiddings.length === 0) {
        return (
          <VStack space="md" className="items-center py-8">
            <Text className="text-gray-500 text-center">
              아직 입찰한 경매가 없습니다
            </Text>
            <Button
              variant="outline"
              onPress={() => router.push("/(tabs)/auction")}
              className="mt-4"
            >
              <ButtonText>경매 둘러보기</ButtonText>
            </Button>
          </VStack>
        );
      }

      return (
        <VStack space="md">
          <Text className="text-lg font-bold text-gray-900">
            💰 내가 입찰한 경매 ({myBiddings.length}건)
          </Text>
          {myBiddings.map((auction) => (
            <Pressable
              key={auction.id}
              onPress={() => router.push(`/auction-detail/${auction.id}`)}
            >
              <Box className="bg-white rounded-xl p-4 border border-gray-200">
                <VStack space="sm">
                  <HStack className="justify-between items-start">
                    <VStack className="flex-1">
                      <Text className="font-semibold text-lg">
                        {auction.title}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {auction.auctionCategory}
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="font-bold text-blue-600">
                        {formatPrice(auction.currentBid || 0)}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {getTimeRemaining(auction.endTime)}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack className="justify-between items-center">
                    <Box
                      className={`px-2 py-1 rounded ${
                        auction.status === "active" ||
                        auction.status === "ending"
                          ? "bg-green-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          auction.status === "active" ||
                          auction.status === "ending"
                            ? "text-green-700"
                            : "text-gray-700"
                        }`}
                      >
                        {getStatusText(auction.status)}
                      </Text>
                    </Box>
                    <Text className="text-xs text-blue-600">입찰 참여중</Text>
                  </HStack>
                </VStack>
              </Box>
            </Pressable>
          ))}
        </VStack>
      );
    }

    return null;
  };

  return (
    <VStack
      className="w-full flex-1"
      style={{ justifyContent: "flex-start", alignItems: "stretch" }}
    >
      {/* 배너 이미지 제거 */}

      {/* 아바타 및 프로필 정보 섹션 */}
      <Box className="w-full px-6 mb-5 mt-6">
        <HStack space="lg" className="items-center">
          <Avatar size="lg" className="bg-primary-600">
            <AvatarImage
              alt="Profile Image"
              source={{
                uri: getAvatarUrl(
                  user?.avatarUrl,
                  user?.name || user?.phoneNumber,
                  150
                ),
              }}
            />
            <AvatarBadge />
          </Avatar>
          <VStack space="md" className="flex-1">
            <HStack space="sm" className="items-center">
              <Text size="2xl" className="font-roboto text-dark">
                {user?.name || "사용자"}
              </Text>
              {isAdmin && (
                <Pressable
                  onPress={() => router.push("/admin")}
                  className="bg-orange-500 px-2 py-1 rounded-md"
                >
                  <Text className="text-white text-xs font-bold">관리자</Text>
                </Pressable>
              )}
            </HStack>
            {user?.isBusiness && user?.companyName && (
              <Text size="sm" className="text-gray-600 font-medium">
                🏢 {user.companyName}
              </Text>
            )}

            <HStack space="sm" className="items-center">
              <Button
                variant="outline"
                action="secondary"
                onPress={() => router.push("/profile-edit")}
                className="gap-3 relative flex-1"
              >
                <ButtonText className="text-dark">프로필 수정</ButtonText>
                <ButtonIcon as={EditIcon} />
              </Button>
              <Button
                variant="outline"
                action="negative"
                onPress={handleLogout}
                disabled={isLoggingOut}
                className="gap-3 relative"
              >
                <ButtonText className="text-red-600">
                  {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                </ButtonText>
              </Button>
            </HStack>
          </VStack>
        </HStack>
      </Box>

      {/* 활동 내역 탭 섹션 */}
      <VStack className="mx-6 flex-1" space="lg">
        {/* 탭 헤더 */}
        <HStack className="bg-gray-100 rounded-xl p-1" space="xs">
          <Pressable
            className={`flex-1 py-3 px-4 rounded-lg ${
              activeTab === "auction" ? "bg-white shadow-sm" : "bg-transparent"
            }`}
            onPress={() => setActiveTab("auction")}
          >
            <Text
              className={`text-center font-medium ${
                activeTab === "auction" ? "text-gray-900" : "text-gray-600"
              }`}
            >
              경매
            </Text>
          </Pressable>

          <Pressable
            className={`flex-1 py-3 px-4 rounded-lg ${
              activeTab === "bidding" ? "bg-white shadow-sm" : "bg-transparent"
            }`}
            onPress={() => setActiveTab("bidding")}
          >
            <Text
              className={`text-center font-medium ${
                activeTab === "bidding" ? "text-gray-900" : "text-gray-600"
              }`}
            >
              입찰
            </Text>
          </Pressable>

          <Pressable
            className={`flex-1 py-3 px-4 rounded-lg ${
              activeTab === "premium" ? "bg-white shadow-sm" : "bg-transparent"
            }`}
            onPress={() => setActiveTab("premium")}
          >
            <Text
              className={`text-center font-medium ${
                activeTab === "premium" ? "text-gray-900" : "text-gray-600"
              }`}
            >
              프리미엄
            </Text>
          </Pressable>
        </HStack>

        {/* 탭 컨텐츠 - 스크롤 적용 */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 20,
          }}
        >
          {renderTabContent()}
        </ScrollView>
      </VStack>
    </VStack>
  );
};

export const SimpleProfile = () => {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <SafeAreaView className="h-full w-full">
        <Box className="flex-1 items-center justify-center">
          <Text>로딩 중...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView className="h-full w-full">
        <Box className="flex-1 items-center justify-center px-6">
          <VStack space="xl" className="items-center">
            <Box className="w-20 h-20 rounded-full bg-yellow-400/20 items-center justify-center">
              <Text style={{ fontSize: 40 }}>🔒</Text>
            </Box>
            <VStack space="md" className="items-center">
              <Heading className="text-2xl text-center">
                로그인이 필요합니다
              </Heading>
              <Text className="text-center text-typography-600">
                프로필을 확인하고 설정을 변경하려면{"\n"}로그인해주세요
              </Text>
            </VStack>
            <VStack space="md" className="w-full">
              <Button
                onPress={() => router.push("/login")}
                className="bg-primary-600"
              >
                <ButtonText>로그인하기</ButtonText>
              </Button>
              <Button variant="outline" onPress={() => router.back()}>
                <ButtonText>돌아가기</ButtonText>
              </Button>
            </VStack>
          </VStack>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="h-full w-full bg-background-0"
      style={{ justifyContent: "flex-start" }}
    >
      {/* 헤더 */}
      <Box className="py-6 px-4 border-b border-border-300 bg-background-0">
        <HStack className="items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Text className="text-lg font-medium">뒤로</Text>
          </Pressable>
          <Text className="text-xl font-bold">My</Text>
          <Box style={{ width: 40 }} />
        </HStack>
      </Box>

      {/* 메인 컨텐츠 */}
      <MainContent />
    </SafeAreaView>
  );
};
