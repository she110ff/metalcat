import { useEffect, useState, useRef } from "react";
import * as Notifications from "expo-notifications";
import { supabase } from "@/hooks/auth/api";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationToken } from "./useNotificationToken";

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useSimpleNotifications() {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // 새로운 토큰 관리 훅 사용
  const {
    token: expoPushToken,
    isLoading,
    forceRegister,
  } = useNotificationToken();

  // 레거시 호환성을 위한 래퍼 함수
  const registerForPushNotificationsAsync = async () => {
    if (!user) return;

    try {
      forceRegister();
    } catch (error) {
      console.error("토큰 등록 실패:", error);
    }
  };

  // 알림 히스토리 조회
  const [history, setHistory] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotificationHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notification_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("알림 히스토리 로드 실패:", error);
        return;
      }

      setHistory(data || []);
      setUnreadCount(data?.filter((item: any) => !item.read_at).length || 0);
    } catch (error) {
      console.error("알림 히스토리 로드 오류:", error);
    }
  };

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notification_history")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) {
        console.error("알림 읽음 처리 실패:", error);
        return;
      }

      // 로컬 상태 업데이트
      setHistory((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("알림 읽음 처리 오류:", error);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notification_history")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (error) {
        console.error("모든 알림 읽음 처리 실패:", error);
        return;
      }

      // 로컬 상태 업데이트
      setHistory((prev) =>
        prev.map((item) => ({ ...item, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("모든 알림 읽음 처리 오류:", error);
    }
  };

  // 알림 리스너 설정
  useEffect(() => {
    if (!user) return;

    // 앱이 포그라운드에 있을 때 알림을 받는 리스너
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📱 포그라운드 알림 수신:", notification);

        // 서버에서 이미 저장하므로 프론트엔드에서는 저장하지 않음
        // 대신 알림 히스토리만 새로고침
        loadNotificationHistory();
      });

    // 사용자가 알림을 탭했을 때의 리스너
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 알림 탭됨:", response);

        // 알림 데이터에서 경매 ID가 있으면 해당 경매로 이동
        const auctionId =
          response.notification.request.content.data?.auction_id;
        if (auctionId) {
          // 여기서 네비게이션 처리 (useRouter 등 사용)
          console.log("경매 상세로 이동:", auctionId);
          // router.push(`/auction-detail/${auctionId}`);
        }
      });

    // 초기 알림 히스토리 로드
    loadNotificationHistory();

    // 클린업
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
  }, [user]);

  return {
    expoPushToken,
    history,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    loadNotificationHistory,
    registerForPushNotificationsAsync,
  };
}
