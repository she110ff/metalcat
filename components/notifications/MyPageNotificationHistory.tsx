import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonText } from "@/components/ui/button";
import { useRouter } from "expo-router";
import { useOptimizedNotifications } from "@/hooks/notifications/useOptimizedNotifications";
import {
  Bell,
  Gavel,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
} from "lucide-react-native";

// 시간 포맷팅 함수
const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "방금 전";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}분 전`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}시간 전`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}일 전`;
  }
};

interface MyPageNotificationHistoryProps {
  maxItems?: number;
  showActions?: boolean;
}

export const MyPageNotificationHistory: React.FC<
  MyPageNotificationHistoryProps
> = ({
  maxItems, // 기본값 제거 - 페이징 모드로 동작
  showActions = true,
}) => {
  const router = useRouter();

  const {
    history,
    unreadCount,
    stats,
    isLoadingHistory,
    hasMore,
    loadNotificationHistory,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
  } = useOptimizedNotifications();

  // 표시할 알림 목록 (페이징 처리) - 무한 루프 방지
  const displayHistory = React.useMemo(() => {
    if (!history || history.length === 0) return [];

    if (maxItems !== undefined) {
      // maxItems가 설정된 경우 해당 개수만큼만 표시
      return history.slice(0, maxItems);
    }

    // 페이징 처리: 현재 페이지까지의 알림만 표시
    const currentPageSize = 10; // 한 페이지당 10개
    const currentPageCount = Math.ceil(history.length / currentPageSize);
    const displayCount = currentPageCount * currentPageSize;

    return history.slice(0, displayCount);
  }, [history?.length, maxItems]);

  // 더보기 버튼 표시 여부 - 무한 루프 방지
  const showLoadMoreButton = React.useMemo(() => {
    if (!history || history.length === 0) {
      return false;
    }

    if (maxItems !== undefined) {
      // maxItems가 설정된 경우 전체 알림 개수와 비교
      return history.length > maxItems;
    }

    // 페이징 처리: 더 불러올 알림이 있는지 확인
    const currentPageSize = 10;
    const currentPageCount = Math.ceil(history.length / currentPageSize);
    const totalPages = Math.ceil((stats?.total_count || 0) / currentPageSize);

    return currentPageCount < totalPages;
  }, [history?.length, maxItems, stats?.total_count]);

  // 알림 타입에 따른 아이콘과 색상
  const getNotificationIcon = (notification: any) => {
    const type = notification.notification_type || notification.type;

    switch (type) {
      case "auction_created":
        return { icon: Gavel, color: "#3B82F6" };
      case "auction_ended":
        return { icon: Clock, color: "#F59E0B" };
      case "auction_won":
        return { icon: CheckCircle, color: "#10B981" };
      case "auction_lost":
        return { icon: AlertCircle, color: "#EF4444" };
      default:
        return { icon: Bell, color: "#6B7280" };
    }
  };

  // 알림 타입에 따른 제목
  const getNotificationTitle = (notification: any) => {
    const type = notification.notification_type || notification.type;

    switch (type) {
      case "auction_created":
        return "새로운 경매";
      case "auction_ended":
        return "경매 종료";
      case "auction_won":
        return "경매 낙찰";
      case "auction_lost":
        return "경매 유찰";
      default:
        return "알림";
    }
  };

  // 알림 클릭 처리
  const handleNotificationPress = useCallback(
    async (notification: any) => {
      try {
        console.log("🔔 알림 클릭:", notification);

        // 읽음 처리
        if (!notification.is_read) {
          await markAsRead(notification.id);
        }

        // 경매 관련 알림인지 확인
        const data = notification.data;
        if (data?.auction_id) {
          console.log("🏷️ 경매 알림 - 상세 페이지로 이동:", data.auction_id);
          router.push(`/auction-detail/${data.auction_id}` as any);
        } else {
          console.log("ℹ️ 일반 알림 - 추가 처리 없음");
        }
      } catch (error) {
        console.error("❌ 알림 클릭 처리 실패:", error);
      }
    },
    [markAsRead, router]
  );

  // 알림 렌더링
  const renderNotification = useCallback(
    ({ item: notification }: { item: any }) => {
      const { icon: Icon, color } = getNotificationIcon(notification);
      const title = getNotificationTitle(notification);
      const isUnread = !notification.is_read;

      return (
        <Pressable
          onPress={() => handleNotificationPress(notification)}
          className={`active:scale-[0.98] transform transition-transform duration-150 ${
            isUnread ? "bg-blue-50" : "bg-white"
          }`}
        >
          <Box
            className={`rounded-xl p-4 border ${
              isUnread ? "border-blue-200" : "border-gray-200"
            }`}
          >
            <HStack space="sm" className="items-start">
              {/* 아이콘 */}
              <Box
                className={`p-2 rounded-lg`}
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon size={20} color={color} />
              </Box>

              {/* 내용 */}
              <VStack className="flex-1" space="xs">
                <HStack className="justify-between items-start">
                  <VStack className="flex-1">
                    <Text
                      className={`font-semibold ${
                        isUnread ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {notification.title || title}
                    </Text>
                    <Text
                      className={`text-sm ${
                        isUnread ? "text-blue-700" : "text-gray-600"
                      }`}
                    >
                      {notification.body}
                    </Text>
                  </VStack>

                  {/* 읽음 상태 표시 */}
                  {isUnread && (
                    <Box className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </HStack>

                {/* 시간 */}
                <Text className="text-xs text-gray-500">
                  {formatTimeAgo(new Date(notification.created_at))}
                </Text>
              </VStack>
            </HStack>
          </Box>
        </Pressable>
      );
    },
    [handleNotificationPress]
  );

  // 로딩 푸터 렌더링
  const renderFooter = useCallback(() => {
    if (!isLoadingHistory) return null;

    return (
      <Box className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text className="text-sm text-gray-500 mt-2">
          더 많은 알림을 불러오는 중...
        </Text>
      </Box>
    );
  }, [isLoadingHistory]);

  // 빈 상태 렌더링
  const renderEmptyState = useCallback(() => {
    return (
      <Box className="bg-white rounded-xl p-8 border border-gray-200">
        <VStack space="md" className="items-center">
          <Box className="p-4 rounded-full bg-gray-100">
            <Bell size={32} color="#6B7280" />
          </Box>
          <VStack space="xs" className="items-center">
            <Text className="text-lg font-semibold text-gray-900">
              알림이 없습니다
            </Text>
            <Text className="text-sm text-gray-600 text-center">
              새로운 알림이 오면 여기에 표시됩니다
            </Text>
          </VStack>
        </VStack>
      </Box>
    );
  }, []);

  return (
    <VStack space="md">
      {/* 헤더 */}
      <HStack className="justify-between items-center">
        <VStack>
          <Text className="text-lg font-bold text-gray-900">
            🔔 알림 ({displayHistory.length}/
            {stats?.total_count || history.length})
          </Text>
          {unreadCount > 0 && (
            <Text className="text-sm text-blue-600">
              읽지 않은 알림 {unreadCount}개
            </Text>
          )}
          {maxItems === undefined &&
            displayHistory.length < (stats?.total_count || 0) && (
              <Text className="text-xs text-gray-500">
                한 페이지당 10개씩 표시
              </Text>
            )}
        </VStack>

        {showActions && unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onPress={markAllAsRead}
            className="border-blue-300"
          >
            <ButtonText className="text-blue-600">모두 읽음</ButtonText>
          </Button>
        )}
      </HStack>

      {/* 알림 목록 */}
      {displayHistory.length > 0 ? (
        <FlatList
          data={displayHistory}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Box className="h-3" />}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingHistory}
              onRefresh={() => loadNotificationHistory(true)}
              tintColor="#3B82F6"
            />
          }
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      ) : (
        renderEmptyState()
      )}

      {/* 더보기 버튼 */}
      {showLoadMoreButton && (
        <Button
          variant="outline"
          onPress={() => {
            if (maxItems !== undefined) {
              // TODO: 전체 알림 화면으로 이동
              console.log("전체 알림 화면으로 이동");
            } else {
              // 페이징 처리: 더 많은 알림 로드
              loadMoreNotifications();
            }
          }}
          className="border-blue-300"
          disabled={isLoadingHistory}
        >
          <ButtonText className="text-blue-600">
            {isLoadingHistory
              ? "불러오는 중..."
              : maxItems !== undefined
              ? `모든 알림 보기 (${stats?.total_count || 0}개)`
              : "더보기 (10개씩)"}
          </ButtonText>
        </Button>
      )}
    </VStack>
  );
};
