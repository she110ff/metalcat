import { useState, useEffect, useRef } from "react";
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
      setUnreadCount(data?.filter((item: any) => !item.is_read).length || 0);
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
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) {
        console.error("알림 읽음 처리 실패:", error);
        return;
      }

      // 로컬 상태 업데이트
      setHistory((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
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
  };

  // 알림 리스너 설정
  useEffect(() => {
    if (!user) return;

    // 알림 수신 리스너
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📱 알림 수신:", notification);
        // 알림 히스토리 새로고침
        loadNotificationHistory();
      });

    // 알림 응답 리스너 (사용자가 알림을 탭했을 때)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 알림 응답:", response);
        // 알림 히스토리 새로고침
        loadNotificationHistory();
      });

    // 초기 알림 히스토리 로드
    loadNotificationHistory();

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
    isLoading,
    registerForPushNotificationsAsync,
    history,
    unreadCount,
    loadNotificationHistory,
    markAsRead,
    markAllAsRead,
  };
}
