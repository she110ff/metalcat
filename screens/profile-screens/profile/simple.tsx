import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useMyServiceRequests } from "@/hooks/service-request/myRequests";
import { useMyAuctions, useMyBiddings } from "@/hooks/auctions/useMyAuctions";
import { SimpleRequestCard } from "@/components/service-request/SimpleRequestCard";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Alert } from "react-native";
import { Heading } from "@/components/ui/heading";
import { Image } from "react-native";
import { ScrollView } from "@/components/ui/scroll-view";
import { FlatList } from "react-native";
import { Avatar, AvatarBadge, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { cn } from "@gluestack-ui/nativewind-utils/cn";
import { Platform } from "react-native";
import { getAvatarUrl, testAvatarGeneration } from "@/utils/avatar";
import {
  getOptimizedAvatarUrl,
  getOptimizedServicePhotoUrl,
  testSupabaseImageOptimization,
} from "@/utils/imageOptimizer";
import { isSupabaseStorageUrl } from "@/utils/supabaseImageTransform";
import { supabase } from "@/hooks/auth/api";
import { Switch } from "@/components/ui/switch";
import { Divider } from "@/components/ui/divider";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { useAppUpdates } from "@/hooks/useAppUpdates";
import { UpdateStatusBadge } from "@/components/updates";
import Constants from "expo-constants";
import { usePermissions } from "@/hooks/usePermissions";
import { AllPermissionsStatus } from "@/components/PermissionStatus";
import { NotificationTokenManager } from "@/components/notifications/NotificationTokenManager";
import { MyPageNotificationHistory } from "@/components/notifications/MyPageNotificationHistory";
import { useBatteryOptimizationContext } from "@/contexts/BatteryOptimizationContext";

// 업데이트 설정 컴포넌트
const UpdateSettings = () => {
  const {
    isUpdateAvailable,
    isDownloading,
    isDownloaded,
    error,
    lastChecked,
    isAutoCheckEnabled,
    updateMessage,
    checkForUpdates,
    forceCheckForUpdates,
    downloadUpdate,
    applyUpdate,
    resetUpdateState,
    saveAutoCheckSetting,
  } = useAppUpdates();

  const formatDate = (date: Date | null) => {
    if (!date) return "알 수 없음";
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleManualCheck = async () => {
    await forceCheckForUpdates();
  };

  const handleDownload = async () => {
    await downloadUpdate();
  };

  const handleApply = async () => {
    await applyUpdate();
  };

  return (
    <VStack space="lg">
      <Text className="text-lg font-bold text-gray-900">🔄 앱 업데이트1</Text>

      {/* 현재 버전 정보 */}
      <Box className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <VStack space="md">
          <HStack className="items-center justify-between">
            <Text className="text-gray-700">현재 버전</Text>
            <Text className="text-blue-900 font-semibold">
              {Constants.expoConfig?.version || "알 수 없음"}
            </Text>
          </HStack>
          <HStack className="items-center justify-between">
            <Text className="text-gray-700">빌드 번호</Text>
            <Text className="text-blue-900 font-semibold">
              {Constants.expoConfig?.ios?.buildNumber ||
                Constants.expoConfig?.android?.versionCode ||
                "알 수 없음"}
            </Text>
          </HStack>
        </VStack>
      </Box>

      {/* 업데이트 상태 */}
      <Box className="bg-white rounded-lg p-4 border border-gray-200">
        <VStack space="md">
          <HStack className="items-center justify-between">
            <Text className="text-gray-700">업데이트 상태</Text>
            <UpdateStatusBadge
              updateState={{
                isUpdateAvailable,
                isDownloading,
                isDownloaded,
                error,
                updateStatus: "idle",
                downloadProgress: null,
                isUpdatePending: false,
                lastChecked,
                updateInfo: null,
                isAutoCheckEnabled,
                updateMessage,
                currentVersion: Constants.expoConfig?.version || "알 수 없음",
                buildNumber: String(
                  Constants.expoConfig?.ios?.buildNumber ||
                    Constants.expoConfig?.android?.versionCode ||
                    "알 수 없음"
                ),
              }}
            />
          </HStack>

          <HStack className="items-center justify-between">
            <Text className="text-gray-700">마지막 체크</Text>
            <Text className="text-gray-900">{formatDate(lastChecked)}</Text>
          </HStack>

          <HStack className="items-center justify-between">
            <Text className="text-gray-700">자동 체크</Text>
            <Switch
              value={isAutoCheckEnabled}
              onValueChange={saveAutoCheckSetting}
            />
          </HStack>

          {/* 업데이트 메시지 표시 */}
          {updateMessage && (
            <VStack space="sm" className="mt-2">
              <Text className="text-gray-700 font-medium">업데이트 메시지</Text>
              <Box className="bg-green-50 p-3 rounded-lg border border-green-200">
                <Text className="text-green-800 text-sm">{updateMessage}</Text>
              </Box>
            </VStack>
          )}
        </VStack>
      </Box>

      {/* 액션 버튼들 */}
      <VStack space="md">
        <Button
          onPress={handleManualCheck}
          disabled={isDownloading}
          className="bg-primary-600"
        >
          <ButtonText>업데이트 확인</ButtonText>
        </Button>

        {isUpdateAvailable && !isDownloading && !isDownloaded && (
          <Button
            onPress={handleDownload}
            variant="outline"
            className="border-primary-600"
          >
            <ButtonText>업데이트 다운로드</ButtonText>
          </Button>
        )}

        {isDownloaded && (
          <Button onPress={handleApply} className="bg-green-600">
            <ButtonText>업데이트 적용</ButtonText>
          </Button>
        )}

        {error && (
          <Box className="bg-red-50 p-3 rounded-lg border border-red-200">
            <Text className="text-red-700 text-sm">오류: {error}</Text>
            <Button
              size="sm"
              variant="outline"
              onPress={resetUpdateState}
              className="mt-2 border-red-300"
            >
              <ButtonText className="text-red-700">상태 초기화</ButtonText>
            </Button>
          </Box>
        )}
      </VStack>
    </VStack>
  );
};

// 간소화된 알림 설정 컴포넌트
const NotificationSettings = () => {
  const { user } = useAuth();
  const [
    auctionRegistrationNotifications,
    setAuctionRegistrationNotifications,
  ] = useState(true);
  const [myAuctionNotifications, setMyAuctionNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // 초기 설정 로드
  useEffect(() => {
    loadNotificationSettings();
  }, [user]);

  const loadNotificationSettings = async () => {
    if (!user?.id) return;

    setIsLoadingSettings(true);
    try {
      const { data, error } = await supabase.rpc(
        "get_user_notification_preferences",
        { p_user_id: user.id }
      );

      if (error) {
        console.error("알림 설정 조회 실패:", error);
        return;
      }

      if (data && data.length > 0) {
        const settings = data[0];
        setAuctionRegistrationNotifications(
          settings.auction_registration_enabled
        );
        setMyAuctionNotifications(settings.my_auction_enabled);
      }
    } catch (error) {
      console.error("알림 설정 조회 중 오류:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const updateNotificationSettings = async (
    auctionRegistration: boolean,
    myAuction: boolean
  ) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        "update_user_notification_preferences",
        {
          p_user_id: user.id,
          p_auction_registration_enabled: auctionRegistration,
          p_my_auction_enabled: myAuction,
        }
      );

      if (error) {
        console.error("알림 설정 저장 실패:", error);
        // 실패 시 원래 상태로 되돌리기
        await loadNotificationSettings();
        return;
      }

      console.log("✅ 알림 설정 저장 성공:", {
        auctionRegistration,
        myAuction,
      });
    } catch (error) {
      console.error("알림 설정 저장 중 오류:", error);
      // 실패 시 원래 상태로 되돌리기
      await loadNotificationSettings();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuctionRegistrationToggle = async (value: boolean) => {
    setAuctionRegistrationNotifications(value);
    await updateNotificationSettings(value, myAuctionNotifications);
  };

  const handleMyAuctionToggle = async (value: boolean) => {
    setMyAuctionNotifications(value);
    await updateNotificationSettings(auctionRegistrationNotifications, value);
  };

  if (isLoadingSettings) {
    return (
      <VStack space="md">
        <Text className="text-lg font-bold text-gray-900">🔔 알림 설정</Text>
        <Box className="bg-white rounded-xl p-4 border border-gray-200">
          <Text className="text-center text-gray-500">설정 로딩 중...</Text>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack space="md">
      <Text className="text-lg font-bold text-gray-900">🔔 알림 설정</Text>

      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <VStack space="md">
          {/* 경매 등록 알림 */}
          <HStack className="justify-between items-center">
            <VStack className="flex-1">
              <Text className="font-semibold text-gray-900">
                경매 등록 알림
              </Text>
              <Text className="text-sm text-gray-600">
                새로운 경매가 등록될 때 알림
              </Text>
            </VStack>
            <Switch
              value={auctionRegistrationNotifications}
              onValueChange={handleAuctionRegistrationToggle}
              disabled={isLoading}
            />
          </HStack>

          <Divider />

          {/* 내 경매 알림 */}
          <HStack className="justify-between items-center">
            <VStack className="flex-1">
              <Text className="font-semibold text-gray-900">내 경매 알림</Text>
              <Text className="text-sm text-gray-600">
                내 경매 종료, 낙찰, 유찰 알림
              </Text>
            </VStack>
            <Switch
              value={myAuctionNotifications}
              onValueChange={handleMyAuctionToggle}
              disabled={isLoading}
            />
          </HStack>
        </VStack>
      </Box>

      <Box className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <VStack space="sm">
          <Text className="text-sm text-blue-800">
            💡 알림 설정을 통해 원하는 경매 정보만 받아보세요.
          </Text>
          {isLoading && (
            <Text className="text-xs text-blue-600">설정 저장 중...</Text>
          )}
        </VStack>
      </Box>
    </VStack>
  );
};

// 배터리 최적화 설정 컴포넌트
const BatteryOptimizationSettings = () => {
  const router = useRouter();
  const { settings } = useBatteryOptimizationContext();

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}시간 ${minutes > 0 ? `${minutes}분` : ""}`;
    }
    return `${minutes}분`;
  };

  return (
    <VStack space="lg">
      <Text className="text-lg font-bold text-gray-900">🔋 배터리 최적화</Text>

      <Text className="text-sm text-gray-600 mb-4">
        앱의 배터리 사용량을 최적화하여 더 오래 사용할 수 있습니다.
      </Text>

      {/* 현재 설정 요약 */}
      <Box className="bg-green-50 rounded-lg p-4 border border-green-200">
        <VStack space="md">
          <HStack className="items-center space-x-2">
            <Text style={{ fontSize: 20 }}>⚡</Text>
            <Text className="text-green-900 font-semibold">현재 설정</Text>
          </HStack>

          <VStack space="sm">
            <HStack className="justify-between">
              <Text className="text-gray-700 text-sm">LME 크롤링</Text>
              <Text className="text-green-900 font-medium text-sm">
                {formatTime(settings.lmeCrawlingInterval)}
              </Text>
            </HStack>

            <HStack className="justify-between">
              <Text className="text-gray-700 text-sm">LME 가격</Text>
              <Text className="text-green-900 font-medium text-sm">
                {formatTime(settings.lmePriceInterval)}
              </Text>
            </HStack>

            <HStack className="justify-between">
              <Text className="text-gray-700 text-sm">경매 갱신</Text>
              <Text className="text-green-900 font-medium text-sm">
                {formatTime(settings.auctionRefreshInterval)}
              </Text>
            </HStack>

            <HStack className="justify-between">
              <Text className="text-gray-700 text-sm">이미지 품질</Text>
              <Text className="text-green-900 font-medium text-sm">
                {settings.imageQuality}%
              </Text>
            </HStack>

            <HStack className="justify-between">
              <Text className="text-gray-700 text-sm">캐시 StaleTime</Text>
              <Text className="text-green-900 font-medium text-sm">
                {settings.cacheStaleTimeMultiplier.toFixed(1)}x
              </Text>
            </HStack>

            <HStack className="justify-between">
              <Text className="text-gray-700 text-sm">공격적 캐싱</Text>
              <Text className="text-green-900 font-medium text-sm">
                {settings.enableAggressiveCaching ? "활성화" : "비활성화"}
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      {/* 설정 버튼 */}
      <Button
        onPress={() => router.push("/battery-optimization")}
        className="bg-green-500"
      >
        <ButtonText>배터리 최적화 설정</ButtonText>
      </Button>

      {/* 팁 */}
      <Box className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <VStack space="sm">
          <Text className="text-blue-900 font-semibold">💡 배터리 절약 팁</Text>
          <Text className="text-blue-800 text-sm">
            • 백그라운드 폴링을 비활성화하면 배터리를 절약할 수 있습니다.
          </Text>
          <Text className="text-blue-800 text-sm">
            • 이미지 품질을 낮추면 데이터 사용량과 배터리를 절약할 수 있습니다.
          </Text>
          <Text className="text-blue-800 text-sm">
            • 애니메이션을 비활성화하면 CPU 사용량을 줄일 수 있습니다.
          </Text>
          <Text className="text-blue-800 text-sm">
            • 공격적인 캐싱을 활성화하면 네트워크 요청을 줄일 수 있습니다.
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
};

// 🧪 개발용: 이미지 최적화 테스트 함수
const testImageOptimization = () => {
  if (__DEV__) {
    const testUrls = [
      // 아바타 이미지
      "http://127.0.0.1:54331/storage/v1/object/public/avatars/test-user/test-avatar.png",
      // 서비스 요청 이미지
      "http://127.0.0.1:54331/storage/v1/object/public/service-request-photos/test-request/test-service-photo.png",
      // 경매 이미지 (샘플)
      "http://127.0.0.1:54331/storage/v1/object/public/auction-photos/auction_123/photo_0.jpg",
      // UI Avatars (외부)
      "https://ui-avatars.com/api/?name=테스트&size=150&background=3B82F6&color=ffffff",
    ];

    console.log("🧪 === 전체 이미지 최적화 테스트 시작 ===");
    testSupabaseImageOptimization(supabase, testUrls);

    // 개별 최적화 함수 테스트
    console.log("\n🎯 === 개별 최적화 함수 테스트 ===");

    // 1. 아바타 최적화
    const avatarUrl = testUrls[0];
    console.log("📸 아바타 이미지 최적화:");
    console.log("  원본:", avatarUrl);
    console.log(
      "  small:",
      getOptimizedAvatarUrl(supabase, avatarUrl, "small")
    );
    console.log(
      "  medium:",
      getOptimizedAvatarUrl(supabase, avatarUrl, "medium")
    );

    // 2. 서비스 사진 최적화
    const serviceUrl = testUrls[1];
    console.log("\n📸 서비스 사진 최적화:");
    console.log("  원본:", serviceUrl);
    console.log(
      "  thumbnail:",
      getOptimizedServicePhotoUrl(supabase, serviceUrl, "thumbnail")
    );
    console.log(
      "  medium:",
      getOptimizedServicePhotoUrl(supabase, serviceUrl, "medium")
    );
  }
};

const MainContent = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    | "auction"
    | "bidding"
    | "premium"
    | "notifications"
    | "permissions"
    | "updates"
    | "battery"
  >("auction");

  // 현재 사용자 정보 확인용
  const { user, isLoggedIn, logout, isLoggingOut } = useAuth();
  const { isAdmin } = useAdminAuth();

  console.log("🔍 My 화면 - 로그인 상태:", isLoggedIn);
  console.log("🔍 My 화면 - 사용자 정보:", user);
  console.log("🔍 My 화면 - 사용자 ID:", user?.id);
  console.log("🔐 My 화면 - 관리자 권한:", isAdmin);

  // 탭 데이터 정의 (관리자에게만 배터리 탭 표시)
  const tabs = [
    { id: "auction", title: "경매", icon: "🏷️" },
    { id: "bidding", title: "입찰", icon: "💰" },
    { id: "premium", title: "프리미엄", icon: "⭐" },
    { id: "notifications", title: "알림", icon: "🔔" },
    { id: "permissions", title: "권한", icon: "🔐" },
    { id: "updates", title: "업데이트", icon: "🔄" },
    // 관리자에게만 배터리 탭 표시
    ...(isAdmin
      ? [{ id: "battery", title: "배터리", icon: "🔋" } as const]
      : []),
  ] as const;

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
          router.replace("/");
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
    if (activeTab === "updates") {
      return <UpdateSettings />;
    }

    if (activeTab === "notifications") {
      return (
        <VStack space="lg">
          <NotificationTokenManager />
          <NotificationSettings />
          <MyPageNotificationHistory showActions={true} />
        </VStack>
      );
    }

    if (activeTab === "permissions") {
      return (
        <VStack space="lg">
          <Text className="text-lg font-bold text-gray-900">📱 권한 관리</Text>
          <Text className="text-sm text-gray-600 mb-4">
            앱 기능을 원활하게 사용하기 위해 필요한 권한들을 관리할 수 있습니다.
          </Text>

          <AllPermissionsStatus
            showRequestButtons={true}
            showSettingsButtons={true}
          />
        </VStack>
      );
    }

    if (activeTab === "battery") {
      return <BatteryOptimizationSettings />;
    }

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
              onPress={() => router.push("/auction")}
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
                uri: (() => {
                  // 🔍 디버깅: 아바타 URL 최적화 확인
                  const originalUrl = user?.avatarUrl;
                  const isSupabaseUrl =
                    originalUrl && isSupabaseStorageUrl(originalUrl);

                  let finalUrl: string;

                  if (isSupabaseUrl) {
                    finalUrl = getOptimizedAvatarUrl(
                      supabase,
                      originalUrl,
                      "small"
                    );
                    console.log(
                      "🎯 [Profile Avatar] Supabase Storage 최적화 사용:"
                    );
                    console.log("  원본 URL:", originalUrl);
                    console.log("  최적화 URL:", finalUrl);
                    console.log("  크기:", "small (150x150, 80% 품질)");
                  } else {
                    finalUrl = getAvatarUrl(
                      originalUrl,
                      user?.name || user?.phoneNumber,
                      150
                    );
                    console.log("🎨 [Profile Avatar] UI Avatars 사용:");
                    console.log("  최종 URL:", finalUrl);
                  }

                  return finalUrl;
                })(),
              }}
            />
            <AvatarBadge />
          </Avatar>
          <VStack space="md" className="flex-1">
            {/* 사용자 이름, 편집 아이콘, 관리자 배지 */}
            <HStack space="sm" className="items-center">
              <Text size="2xl" className="font-roboto text-dark font-bold">
                {user?.name || "사용자"}
              </Text>

              {/* 편집 아이콘 */}
              <Pressable
                onPress={() => router.push("/profile-edit")}
                className="p-1"
              >
                <Text className="text-gray-500 text-lg">✏️</Text>
              </Pressable>

              {isAdmin && (
                <Pressable
                  onPress={() => router.push("/admin")}
                  className="bg-orange-500 px-3 py-1 rounded-full"
                >
                  <Text className="text-white text-xs font-bold">관리자</Text>
                </Pressable>
              )}
            </HStack>

            {/* 회사명 (비즈니스 사용자인 경우) */}
            {user?.isBusiness && user?.companyName && (
              <HStack space="sm" className="items-center">
                <Text className="text-gray-500">🏢</Text>
                <Text size="sm" className="text-gray-600 font-medium">
                  {user.companyName}
                </Text>
              </HStack>
            )}

            {/* 로그아웃 버튼 */}
            <Button
              variant="outline"
              action="negative"
              onPress={handleLogout}
              disabled={isLoggingOut}
              className="w-full mt-2"
            >
              <ButtonText className="text-red-600 font-medium">
                {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
              </ButtonText>
            </Button>
          </VStack>
        </HStack>
      </Box>

      {/* 활동 내역 탭 섹션 */}
      <VStack className="mx-6 flex-1" space="lg">
        {/* 스크롤 가능한 탭 헤더 */}
        <Box className="bg-gray-100 rounded-xl p-1">
          <FlatList
            data={tabs}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                className={`py-3 px-4 rounded-lg mx-1 min-w-[80px] ${
                  activeTab === item.id
                    ? "bg-white shadow-sm"
                    : "bg-transparent"
                }`}
                onPress={() => setActiveTab(item.id as any)}
              >
                <VStack className="items-center space-y-1">
                  <Text className="text-lg">{item.icon}</Text>
                  <Text
                    className={`text-center font-medium text-xs ${
                      activeTab === item.id ? "text-gray-900" : "text-gray-600"
                    }`}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </VStack>
              </Pressable>
            )}
          />
        </Box>

        {/* 탭 컨텐츠 - 스크롤 적용 */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 100, // 하단 메뉴 높이만큼 여백 추가
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
