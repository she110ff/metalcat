import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMyServiceRequests } from "@/hooks/service-request/myRequests";
import { SimpleRequestCard } from "@/components/service-request/SimpleRequestCard";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { ChevronLeftIcon, EditIcon, Icon } from "@/components/ui/icon";
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

const MainContent = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"auction" | "bidding" | "premium">(
    "auction"
  );

  // 현재 사용자 정보 확인용
  const { user, isLoggedIn, logout, isLoggingOut } = useAuth();
  console.log("🔍 My 화면 - 로그인 상태:", isLoggedIn);
  console.log("🔍 My 화면 - 사용자 정보:", user);
  console.log("🔍 My 화면 - 사용자 ID:", user?.id);

  // 서비스 요청 목록 조회 (premium 탭용)
  const { data: myRequests, isLoading: requestsLoading } =
    useMyServiceRequests();

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

  // 간단한 샘플 데이터
  const myAuctions = [
    {
      id: "1",
      title: "고순도 구리 스크랩",
      currentBid: "₩12,500,000",
      status: "진행중",
      endTime: "2일 남음",
    },
    {
      id: "2",
      title: "알루미늄 캔 스크랩",
      currentBid: "₩3,600,000",
      status: "종료",
      endTime: "종료됨",
    },
    {
      id: "3",
      title: "스테인리스 스틸 파이프",
      currentBid: "₩8,900,000",
      status: "진행중",
      endTime: "1일 14시간",
    },
    {
      id: "4",
      title: "황동 배관 자재",
      currentBid: "₩5,200,000",
      status: "진행중",
      endTime: "3일 8시간",
    },
    {
      id: "5",
      title: "티타늄 합금 스크랩",
      currentBid: "₩18,750,000",
      status: "진행중",
      endTime: "12시간 30분",
    },
  ];

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

    // 기존 탭들 (auction, bidding): 기존 코드 유지
    return (
      <VStack space="md">
        {myAuctions.map((auction) => (
          <Box
            key={auction.id}
            className="bg-white rounded-xl p-4 border border-gray-200"
          >
            <VStack space="sm">
              <HStack className="justify-between items-start">
                <VStack className="flex-1">
                  <Text className="font-semibold text-lg">{auction.title}</Text>
                  <Text className="text-sm text-gray-600">고철</Text>
                </VStack>
                <VStack className="items-end">
                  <Text className="font-bold text-green-600">
                    {auction.currentBid}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {auction.endTime}
                  </Text>
                </VStack>
              </HStack>
              <Box
                className={`px-2 py-1 rounded self-start ${
                  auction.status === "진행중" ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-xs ${
                    auction.status === "진행중"
                      ? "text-green-700"
                      : "text-gray-700"
                  }`}
                >
                  {auction.status}
                </Text>
              </Box>
            </VStack>
          </Box>
        ))}
      </VStack>
    );
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
            <AvatarBadge />
          </Avatar>
          <VStack space="md" className="flex-1">
            <Text size="2xl" className="font-roboto text-dark">
              {user?.name || "사용자"}
            </Text>

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
