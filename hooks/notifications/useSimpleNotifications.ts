import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/hooks/auth/api";
import { useAuth } from "@/hooks/useAuth";

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
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // 푸시 토큰 등록
  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice || !user) return;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("알림 권한이 거부되었습니다");
      return;
    }

    try {
      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: "19829544-dd83-47d5-8c48-ffcdc913c8b1", // EAS 프로젝트 ID
        })
      ).data;

      // 서버에 토큰 등록
      const { error } = await supabase.from("user_push_tokens").upsert({
        user_id: user.id,
        expo_push_token: token,
        platform: Platform.OS,
        device_id: Device.osInternalBuildId,
        is_active: true,
      });

      if (error) {
        console.error("토큰 등록 실패:", error);
      } else {
        console.log("토큰 등록 성공:", token);
        setExpoPushToken(token);
      }
    } catch (error) {
      console.error("토큰 생성 실패:", error);
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

  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync();
      loadNotificationHistory();
    }
    setIsLoading(false);
  }, [user]);

  return {
    expoPushToken,
    history,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    loadNotificationHistory,
  };
}
