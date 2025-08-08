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
  BarChart3,
  Filter
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

// 알림 카테고리 타입 정의
type NotificationCategory = 'all' | 'registration' | 'my_auction';

interface OptimizedNotificationHistoryProps {
  maxItems?: number;
  showActions?: boolean;
  showStats?: boolean;
  enableInfiniteScroll?: boolean;
  showCategoryFilter?: boolean;
}

export const OptimizedNotificationHistory: React.FC<OptimizedNotificationHistoryProps> = ({
  maxItems,
  showActions = true,
  showStats = true,
  enableInfiniteScroll = true,
  showCategoryFilter = true,
}) => {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all');
  
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

  // 알림 카테고리별 분류 함수
  const getCategoryFromNotificationType = (type: string): NotificationCategory => {
    switch (type) {
      case 'auction_created':
        return 'registration';
      case 'auction_ended':
      case 'auction_won':
      case 'auction_lost':
      case 'auction_failed':
        return 'my_auction';
      default:
        return 'my_auction'; // 기본값은 내 경매 알림으로 분류
    }
  };

  // 카테고리별 필터링된 알림 목록
  const filteredHistory = React.useMemo(() => {
    if (selectedCategory === 'all') {
      return history;
    }
    
    return history.filter(notification => {
      const type = notification.notification_type || notification.type;
      const category = getCategoryFromNotificationType(type);
      return category === selectedCategory;
    });
  }, [history, selectedCategory]);

  // 카테고리별 통계
  const categoryStats = React.useMemo(() => {
    const registrationCount = history.filter(n => 
      getCategoryFromNotificationType(n.notification_type || n.type) === 'registration'
    ).length;
    
    const myAuctionCount = history.filter(n => 
      getCategoryFromNotificationType(n.notification_type || n.type) === 'my_auction'
    ).length;
    
    return {
      all: history.length,
      registration: registrationCount,
      my_auction: myAuctionCount
    };
  }, [history]);

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
  const handleNotificationPress = useCallback(async (notification: any) => {
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
  }, [markAsRead, router]);

  // 알림 렌더링
  const renderNotification = useCallback(({ item: notification }: { item: any }) => {
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
  }, [handleNotificationPress]);

  // 로딩 푸터 렌더링
  const renderFooter = useCallback(() => {
    if (!isLoadingHistory) return null;
    
    return (
      <Box className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text className="text-sm text-gray-500 mt-2">더 많은 알림을 불러오는 중...</Text>
      </Box>
    );
  }, [isLoadingHistory]);

  // 빈 상태 렌더링
  const renderEmptyState = useCallback(() => {
    const getEmptyMessage = () => {
      switch (selectedCategory) {
        case 'registration':
          return {
            title: '경매 등록 알림이 없습니다',
            description: '새로운 경매가 등록되면 알림을 받을 수 있습니다'
          };
        case 'my_auction':
          return {
            title: '내 경매 알림이 없습니다',
            description: '내 경매 활동에 대한 알림이 없습니다'
          };
        default:
          return {
            title: '알림이 없습니다',
            description: '새로운 알림이 오면 여기에 표시됩니다'
          };
      }
    };

    const { title, description } = getEmptyMessage();

    return (
      <Box className="bg-white rounded-xl p-8 border border-gray-200">
        <VStack space="md" className="items-center">
          <Box className="p-4 rounded-full bg-gray-100">
            <Bell size={32} color="#6B7280" />
          </Box>
          <VStack space="xs" className="items-center">
            <Text className="text-lg font-semibold text-gray-900">
              {title}
            </Text>
            <Text className="text-sm text-gray-600 text-center">
              {description}
            </Text>
          </VStack>
        </VStack>
      </Box>
    );
  }, [selectedCategory]);

  // 통계 섹션 렌더링
  const renderStats = useCallback(() => {
    if (!showStats || !stats) return null;

    return (
      <Box className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <VStack space="sm">
          <HStack className="items-center space="sm"">
            <BarChart3 size={16} color="#3B82F6" />
            <Text className="text-sm font-medium text-blue-800">알림 통계</Text>
          </HStack>
          <HStack className="justify-between">
            <VStack className="items-center">
              <Text className="text-lg font-bold text-blue-900">{stats.total_count}</Text>
              <Text className="text-xs text-blue-700">전체</Text>
            </VStack>
            <VStack className="items-center">
              <Text className="text-lg font-bold text-orange-600">{stats.unread_count}</Text>
              <Text className="text-xs text-orange-700">미읽</Text>
            </VStack>
            <VStack className="items-center">
              <Text className="text-lg font-bold text-green-600">{stats.read_count}</Text>
              <Text className="text-xs text-green-700">읽음</Text>
            </VStack>
          </HStack>
        </VStack>
      </Box>
    );
  }, [showStats, stats]);

  // 카테고리 필터 렌더링
  const renderCategoryFilter = useCallback(() => {
    if (!showCategoryFilter) return null;

    const categories = [
      { key: 'all' as const, label: '전체', count: categoryStats.all },
      { key: 'registration' as const, label: '경매 등록', count: categoryStats.registration },
      { key: 'my_auction' as const, label: '내 경매', count: categoryStats.my_auction },
    ];

    return (
      <Box className="bg-white rounded-xl p-3 border border-gray-200">
        <HStack space="xs" className="items-center">
          <Filter size={16} color="#6B7280" />
          <Text className="text-sm font-medium text-gray-700 mr-2">카테고리:</Text>
          {categories.map((category) => (
            <Pressable
              key={category.key}
              onPress={() => setSelectedCategory(category.key)}
              className={`px-3 py-1.5 rounded-full ${
                selectedCategory === category.key
                  ? "bg-blue-100 border border-blue-300"
                  : "bg-gray-100 border border-gray-200"
              }`}
            >
              <HStack space="xs" className="items-center">
                <Text
                  className={`text-sm font-medium ${
                    selectedCategory === category.key
                      ? "text-blue-700"
                      : "text-gray-600"
                  }`}
                >
                  {category.label}
                </Text>
                {category.count > 0 && (
                  <Box
                    className={`px-1.5 py-0.5 rounded-full min-w-[20px] items-center ${
                      selectedCategory === category.key
                        ? "bg-blue-200"
                        : "bg-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        selectedCategory === category.key
                          ? "text-blue-800"
                          : "text-gray-700"
                      }`}
                    >
                      {category.count}
                    </Text>
                  </Box>
                )}
              </HStack>
            </Pressable>
          ))}
        </HStack>
      </Box>
    );
  }, [showCategoryFilter, selectedCategory, categoryStats]);

  // 표시할 알림 목록 (페이징 처리) - 무한 루프 방지
  const displayHistory = React.useMemo(() => {
    if (!filteredHistory || filteredHistory.length === 0) return [];
    
    if (maxItems !== undefined) {
      // maxItems가 설정된 경우 해당 개수만큼만 표시
      return filteredHistory.slice(0, maxItems);
    }
    
    // 페이징 처리: 현재 페이지까지의 알림만 표시
    const currentPageSize = 10; // 한 페이지당 10개
    const currentPageCount = Math.ceil(filteredHistory.length / currentPageSize);
    const displayCount = currentPageCount * currentPageSize;
    
    return filteredHistory.slice(0, displayCount);
  }, [filteredHistory?.length, maxItems]);

  // 더보기 버튼 표시 여부 - 무한 루프 방지
  const showLoadMoreButton = React.useMemo(() => {
    if (!filteredHistory || filteredHistory.length === 0) return false;
    
    if (maxItems !== undefined) {
      // maxItems가 설정된 경우 전체 알림 개수와 비교
      return filteredHistory.length > maxItems;
    }
    
    // 페이징 처리: 더 불러올 알림이 있는지 확인
    const currentPageSize = 10;
    const currentPageCount = Math.ceil(filteredHistory.length / currentPageSize);
    const totalPages = Math.ceil((stats?.total_count || 0) / currentPageSize);
    
    return currentPageCount < totalPages;
  }, [filteredHistory?.length, maxItems, stats?.total_count]);

  // 무한 스크롤 처리
  const handleLoadMore = useCallback(() => {
    if (enableInfiniteScroll && !isLoadingHistory && hasMore) {
      loadMoreNotifications();
    }
  }, [enableInfiniteScroll, isLoadingHistory, hasMore, loadMoreNotifications]);

  return (
    <VStack space="md">
      {/* 헤더 */}
      <HStack className="justify-between items-center">
        <VStack>
          <Text className="text-lg font-bold text-gray-900">
            🔔 알림 ({displayHistory.length}/{stats?.total_count || filteredHistory.length})
          </Text>
          {unreadCount > 0 && (
            <Text className="text-sm text-blue-600">
              읽지 않은 알림 {unreadCount}개
            </Text>
          )}
          {selectedCategory !== 'all' && (
            <Text className="text-xs text-gray-500">
              {selectedCategory === 'registration' ? '경매 등록' : '내 경매'} 알림만 표시
            </Text>
          )}
          {!maxItems && displayHistory.length < (stats?.total_count || 0) && (
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

      {/* 통계 섹션 */}
      {renderStats()}

      {/* 카테고리 필터 */}
      {renderCategoryFilter()}

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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true} // 성능 최적화
          maxToRenderPerBatch={10} // 렌더링 배치 크기 제한
          windowSize={10} // 윈도우 크기 제한
        />
      ) : (
        renderEmptyState()
      )}

      {/* 더보기 버튼 */}
      {showLoadMoreButton && (
        <Button
          variant="outline"
          onPress={() => {
            if (maxItems) {
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
            {isLoadingHistory ? "불러오는 중..." : 
             maxItems ? `모든 알림 보기 (${stats?.total_count || 0}개)` : 
             "더보기 (10개씩)"}
          </ButtonText>
        </Button>
      )}

      {/* 페이징 안내 */}
      {!maxItems && enableInfiniteScroll && hasMore && !isLoadingHistory && (
        <Box className="items-center py-2">
          <Text className="text-xs text-gray-500">
            더보기 버튼을 눌러 추가 알림을 불러오세요
          </Text>
          <ChevronDown size={12} color="#6B7280" />
        </Box>
      )}
    </VStack>
  );
};
