import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { ChevronLeftIcon, EditIcon, Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Image } from "react-native";
import { ScrollView } from "@/components/ui/scroll-view";
import { Avatar, AvatarBadge, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { cn } from "@gluestack-ui/nativewind-utils/cn";
import { Platform } from "react-native";

const bottomTabsList = [
  { iconName: Icon, iconText: "시세" },
  { iconName: Icon, iconText: "계산기" },
  { iconName: Icon, iconText: "경매" },
  { iconName: Icon, iconText: "프리미엄" },
  { iconName: Icon, iconText: "My" },
];

function MobileFooter({ footerIcons }: { footerIcons: any }) {
  const router = useRouter();
  return (
    <HStack
      className={cn(
        "bg-background-0 justify-between w-full absolute left-0 bottom-0 right-0 p-3 overflow-hidden items-center border-t-border-300 border-t",
        { "pb-5": Platform.OS === "ios" },
        { "pb-5": Platform.OS === "android" }
      )}
    >
      {footerIcons.map(
        (item: { iconText: string; iconName: any }, index: number) => (
          <Pressable
            className="px-0.5 flex-1 flex-col items-center"
            key={index}
            onPress={() => router.push("/(tabs)/")}
          >
            <Icon as={item.iconName} size="md" className="h-[32px] w-[65px]" />
            <Text className="text-xs text-center text-typography-600">
              {item.iconText}
            </Text>
          </Pressable>
        )
      )}
    </HStack>
  );
}

const MainContent = () => {
  const [activeTab, setActiveTab] = useState<"auction" | "bidding" | "premium">(
    "auction"
  );

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
      className="w-full mb-16"
      style={{ justifyContent: "flex-start", alignItems: "stretch" }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 0 }}
        contentContainerStyle={{
          paddingBottom: 110,
          flexGrow: 0,
          justifyContent: "flex-start",
        }}
      >
        <VStack className="w-full pb-8">
          {/* 배너 이미지 제거 */}

          {/* 아바타 및 Edit Profile 섹션 - negative margin 제거 */}
          <Box className="w-full px-6 mb-5 mt-6">
            <HStack space="lg" className="items-center">
              <Avatar size="lg" className="bg-primary-600">
                <AvatarBadge />
              </Avatar>
              <VStack space="md" className="flex-1">
                <Text size="2xl" className="font-roboto text-dark">
                  Alexander Leslie
                </Text>
                <Button
                  variant="outline"
                  action="secondary"
                  className="gap-3 relative self-start"
                >
                  <ButtonText className="text-dark">Edit Profile</ButtonText>
                  <ButtonIcon as={EditIcon} />
                </Button>
              </VStack>
            </HStack>
          </Box>

          {/* 활동 내역 탭 섹션 */}
          <VStack className="mx-6" space="lg">
            {/* 탭 헤더 */}
            <HStack className="bg-gray-100 rounded-xl p-1" space="xs">
              <Pressable
                className={`flex-1 py-3 px-4 rounded-lg ${
                  activeTab === "auction"
                    ? "bg-white shadow-sm"
                    : "bg-transparent"
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
                  activeTab === "bidding"
                    ? "bg-white shadow-sm"
                    : "bg-transparent"
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
                  activeTab === "premium"
                    ? "bg-white shadow-sm"
                    : "bg-transparent"
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

            {/* 탭 컨텐츠 */}
            <Box className="min-h-[300px]">{renderTabContent()}</Box>
          </VStack>
        </VStack>
      </ScrollView>
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
      {/* 간단한 모바일 헤더 */}
      <Box className="py-6 px-4 border-b border-border-300 bg-background-0">
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.back()}>
            <Text className="text-lg font-medium">뒤로</Text>
          </Pressable>
        </HStack>
      </Box>

      {/* 메인 컨텐츠 */}
      <MainContent />

      <MobileFooter footerIcons={bottomTabsList} />
    </SafeAreaView>
  );
};
