import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { tokenService, TokenResult } from "./tokenService";
import { useEffect } from "react";

export interface NotificationTokenState {
  token: string | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  source?: "cache" | "server" | "new";
  lastUpdated?: Date;
}

export const useNotificationToken = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 토큰 조회 쿼리
  const {
    data: tokenResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["notification-token", user?.id],
    queryFn: async (): Promise<TokenResult> => {
      if (!user?.id) {
        throw new Error("사용자 정보가 없습니다.");
      }
      return await tokenService.initializeToken(user.id);
    },
    enabled: !!user?.id,
    staleTime: 15 * 60 * 1000, // 15분 (배터리 최적화)
    gcTime: 60 * 60 * 1000, // 60분
    retry: (failureCount, error) => {
      // 권한 관련 오류는 재시도하지 않음
      if (error instanceof Error && error.message.includes("권한")) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // 토큰 새로고침 뮤테이션
  const refreshTokenMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("사용자 정보가 없습니다.");
      }
      return await tokenService.refreshToken(user.id);
    },
    onSuccess: (result) => {
      // 쿼리 캐시 업데이트
      queryClient.setQueryData(["notification-token", user?.id], result);
      console.log("토큰 새로고침 성공:", result.source);
    },
    onError: (error) => {
      console.error("토큰 새로고침 실패:", error);
    },
  });

  // 토큰 강제 재등록 뮤테이션
  const forceRegisterMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("사용자 정보가 없습니다.");
      }
      return await tokenService.forceRegister(user.id);
    },
    onSuccess: (result) => {
      // 쿼리 캐시 업데이트
      queryClient.setQueryData(["notification-token", user?.id], result);
      console.log("토큰 강제 재등록 성공:", result.source);
    },
    onError: (error) => {
      console.error("토큰 강제 재등록 실패:", error);
    },
  });

  // 토큰 동기화 뮤테이션
  const syncTokenMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("사용자 정보가 없습니다.");
      }
      return await tokenService.validateAndSync(user.id);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["notification-token", user?.id], result);
      console.log("토큰 동기화 성공:", result.source);
    },
    onError: (error) => {
      console.error("토큰 동기화 실패:", error);
    },
  });

  // 사용자 변경 시 자동 동기화
  useEffect(() => {
    if (user?.id && tokenResult?.success) {
      // 백그라운드에서 동기화 실행 (캐시 먼저 반환하고 서버와 동기화)
      syncTokenMutation.mutate();
    }
  }, [user?.id]);

  // 상태 정보 계산
  const state: NotificationTokenState = {
    token: tokenResult?.success ? tokenResult.token || null : null,
    isLoading:
      isLoading ||
      refreshTokenMutation.isPending ||
      forceRegisterMutation.isPending,
    isError: isError || !tokenResult?.success,
    error: tokenResult?.success
      ? null
      : tokenResult?.error ||
        (error instanceof Error ? error.message : "알 수 없는 오류"),
    source: tokenResult?.source,
    lastUpdated: tokenResult?.success ? new Date() : undefined,
  };

  return {
    // 상태
    ...state,

    // 액션
    refreshToken: refreshTokenMutation.mutate,
    forceRegister: forceRegisterMutation.mutate,
    syncToken: syncTokenMutation.mutate,
    refetch,

    // 로딩 상태
    isRefreshing: refreshTokenMutation.isPending,
    isForceRegistering: forceRegisterMutation.isPending,
    isSyncing: syncTokenMutation.isPending,

    // 에러 상태
    refreshError: refreshTokenMutation.error,
    forceRegisterError: forceRegisterMutation.error,
    syncError: syncTokenMutation.error,
  };
};
