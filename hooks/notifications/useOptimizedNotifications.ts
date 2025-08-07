import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { AppState } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { supabase } from "@/hooks/auth/api";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationToken } from "./useNotificationToken";
import { useRouter } from "expo-router";

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationStats {
  total_count: number;
  unread_count: number;
  read_count: number;
  oldest_notification: string | null;
  newest_notification: string | null;
}

export function useOptimizedNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active"
  );
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // 새로운 토큰 관리 훅 사용
  const {
    token: expoPushToken,
    isLoading,
    forceRegister,
  } = useNotificationToken();

  // 앱 상태 변경 감지 (배터리 최적화)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      setIsAppActive(nextAppState === "active");
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, []);

  // 알림 히스토리 상태
  const [history, setHistory] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // 페이지 크기
  const PAGE_SIZE = 20;

  // 레거시 호환성을 위한 래퍼 함수
  const registerForPushNotificationsAsync = async () => {
    if (!user) return;

    try {
      forceRegister();
    } catch (error) {
      console.error("토큰 등록 실패:", error);
    }
  };

  // 성능 최적화된 알림 히스토리 조회
  const loadNotificationHistory = useCallback(
    async (reset = false) => {
      if (!user) return;

      try {
        setIsLoadingHistory(true);

        if (reset) {
          setCurrentPage(0);
          setHistory([]);
          setHasMore(true);
        }

        const offset = reset ? 0 : currentPage * PAGE_SIZE;

        // 최적화된 함수 사용
        const { data, error } = await supabase.rpc("get_user_notifications", {
          p_user_id: user.id,
          p_limit: PAGE_SIZE,
          p_offset: offset,
          p_unread_only: false,
        });

        if (error) {
          console.error("알림 히스토리 로드 실패:", error);
          return;
        }

        if (reset) {
          setHistory(data || []);
        } else {
          setHistory((prev) => [...prev, ...(data || [])]);
        }

        setHasMore((data || []).length === PAGE_SIZE);
        setCurrentPage((prev) => prev + 1);

        // 미읽 알림 개수 업데이트
        await loadUnreadCount();
      } catch (error) {
        console.error("알림 히스토리 로드 오류:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [user, currentPage]
  );

  // 미읽 알림 개수 조회 (최적화)
  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_user_unread_count", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("미읽 알림 개수 조회 실패:", error);
        return;
      }

      setUnreadCount(data || 0);
    } catch (error) {
      console.error("미읽 알림 개수 조회 오류:", error);
    }
  }, [user]);

  // 알림 통계 조회
  const loadNotificationStats = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc(
        "get_user_notification_stats",
        {
          p_user_id: user.id,
        }
      );

      if (error) {
        console.error("알림 통계 조회 실패:", error);
        return;
      }

      setStats(data?.[0] || null);
    } catch (error) {
      console.error("알림 통계 조회 오류:", error);
    }
  }, [user]);

  // 알림 읽음 처리 (배치 처리 지원)
  const markAsRead = useCallback(
    async (notificationIds: string | string[]) => {
      if (!user) return;

      try {
        const ids = Array.isArray(notificationIds)
          ? notificationIds
          : [notificationIds];

        const { error } = await supabase
          .from("notification_history")
          .update({ is_read: true })
          .in("id", ids)
          .eq("user_id", user.id);

        if (error) {
          console.error("알림 읽음 처리 실패:", error);
          return;
        }

        // 로컬 상태 업데이트
        setHistory((prev) =>
          prev.map((item) =>
            ids.includes(item.id) ? { ...item, is_read: true } : item
          )
        );

        // 미읽 개수 업데이트
        await loadUnreadCount();
      } catch (error) {
        console.error("알림 읽음 처리 오류:", error);
      }
    },
    [user, loadUnreadCount]
  );

  // 모든 알림 읽음 처리 (최적화)
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notification_history")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("모든 알림 읽음 처리 실패:", error);
        return;
      }

      // 로컬 상태 업데이트
      setHistory((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("모든 알림 읽음 처리 오류:", error);
    }
  }, [user]);

  // 경매 관련 알림 처리 함수
  const handleAuctionNotification = useCallback(
    (notificationData: any) => {
      try {
        console.log("🏷️ 경매 알림 처리:", notificationData);

        // 경매 ID가 있는지 확인
        const auctionId = notificationData?.auction_id;
        if (!auctionId) {
          console.log("⚠️ 경매 ID가 없습니다:", notificationData);
          return;
        }

        // 알림 타입에 따른 처리
        const notificationType = notificationData?.notification_type;
        console.log("📋 알림 타입:", notificationType);

        // 경매 상세 페이지로 이동
        console.log("🚀 경매 상세 페이지로 이동:", auctionId);
        router.push(`/auction-detail/${auctionId}` as any);
      } catch (error) {
        console.error("❌ 경매 알림 처리 실패:", error);
      }
    },
    [router]
  );

  // 더 많은 알림 로드 (무한 스크롤)
  const loadMoreNotifications = useCallback(() => {
    if (!isLoadingHistory && hasMore) {
      loadNotificationHistory(false);
    }
  }, [isLoadingHistory, hasMore, loadNotificationHistory]);

  // 알림 리스너 설정
  useEffect(() => {
    if (!user) return;

    // 알림 수신 리스너
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📱 알림 수신:", notification);
        // 알림 히스토리 새로고침 (첫 페이지만)
        loadNotificationHistory(true);
      });

    // 알림 응답 리스너 (사용자가 알림을 탭했을 때)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 알림 응답:", response);

        try {
          // 알림 데이터 추출
          const notificationData = response.notification.request.content.data;
          console.log("📊 알림 데이터:", notificationData);

          // 경매 관련 알림인지 확인
          if (
            notificationData?.auction_id ||
            (typeof notificationData?.notification_type === "string" &&
              notificationData.notification_type.includes("auction"))
          ) {
            handleAuctionNotification(notificationData);
          }
        } catch (error) {
          console.error("❌ 알림 응답 처리 실패:", error);
        }

        // 알림 히스토리 새로고침
        loadNotificationHistory(true);
      });

    // 초기 데이터 로드
    loadNotificationHistory(true);
    loadNotificationStats();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [
    user,
    loadNotificationHistory,
    loadNotificationStats,
    handleAuctionNotification,
  ]);

  // 알림 히스토리 조회 (배터리 최적화)
  const {
    data: notificationHistory = [],
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["notifications", "history", user?.id],
    queryFn: () => loadNotificationHistory(), // Use loadNotificationHistory directly
    enabled: !!user?.id && isAppActive, // 앱이 활성화된 경우에만 실행
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false, // 앱 포커스 시 갱신 비활성화
    refetchInterval: isAppActive ? 10 * 60 * 1000 : false, // 10분마다 (앱 활성화 시에만)
  });

  // 알림 통계 조회 (배터리 최적화)
  const {
    data: notificationStats = {
      total: 0,
      unread: 0,
      read: 0,
    },
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["notifications", "stats", user?.id],
    queryFn: () => loadNotificationStats(), // Use loadNotificationStats directly
    enabled: !!user?.id && isAppActive, // 앱이 활성화된 경우에만 실행
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false, // 앱 포커스 시 갱신 비활성화
    refetchInterval: isAppActive ? 10 * 60 * 1000 : false, // 10분마다 (앱 활성화 시에만)
  });

  return {
    expoPushToken,
    isLoading,
    registerForPushNotificationsAsync,
    history,
    unreadCount,
    stats,
    isLoadingHistory,
    hasMore,
    loadNotificationHistory,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    loadNotificationStats,
  };
}
