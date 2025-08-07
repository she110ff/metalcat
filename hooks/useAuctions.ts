import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import { useEffect, useState } from "react";
import { type AuctionItem, type AuctionCategory } from "@/data/types/auction";
import { auctionAPI } from "./auctions/api";
import { useBatteryOptimizationContext } from "@/contexts/BatteryOptimizationContext";
import {
  getAuctionRefreshInterval,
  getCacheStaleTime,
  getCacheGcTime,
} from "@/utils/batteryOptimizationUtils";

// 쿼리 키 패턴
export const auctionKeys = {
  all: ["auctions"] as const,
  lists: () => [...auctionKeys.all, "list"] as const,
  list: (filters?: {
    category?: AuctionCategory;
    status?: string;
    sortBy?: "createdAt" | "endTime";
  }) => [...auctionKeys.lists(), filters] as const,
  details: () => [...auctionKeys.all, "detail"] as const,
  detail: (id: string) => [...auctionKeys.details(), id] as const,
  myAuctions: (userId: string) => [...auctionKeys.all, "my", userId] as const,
  bids: (auctionId: string) =>
    [...auctionKeys.detail(auctionId), "bids"] as const,
  // 낙찰/유찰 시스템 관련 키
  results: () => [...auctionKeys.all, "results"] as const,
  result: (auctionId: string) => [...auctionKeys.results(), auctionId] as const,
  transactions: () => [...auctionKeys.all, "transactions"] as const,
  transaction: (resultId: string) =>
    [...auctionKeys.transactions(), resultId] as const,
  myResults: (userId: string, type: "won" | "sold" | "bidding") =>
    [...auctionKeys.all, "my-results", userId, type] as const,
  stats: () => [...auctionKeys.all, "stats"] as const,
};

// Supabase 기반 API 사용 (기존 인터페이스 완전 호환)

// 경매 목록 조회 훅
export const useAuctions = (filters?: {
  category?: AuctionCategory;
  status?: string;
  sortBy?: "createdAt" | "endTime";
}) => {
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active"
  );
  const { settings } = useBatteryOptimizationContext();

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

  // 배터리 최적화 설정에 따른 간격 계산
  const effectiveInterval = getAuctionRefreshInterval(settings);
  const shouldPoll = isAppActive && !settings.disableBackgroundPolling;

  // 캐시 설정 동적 계산
  const staleTime = getCacheStaleTime(settings, effectiveInterval);
  const gcTime = getCacheGcTime(settings, effectiveInterval);

  return useQuery({
    queryKey: auctionKeys.list(filters),
    queryFn: () => auctionAPI.getAuctions(filters),
    staleTime: staleTime, // 동적 캐시 설정
    gcTime: gcTime, // 동적 캐시 보관 시간
    refetchOnWindowFocus: false, // 앱 포커스 시 자동 새로고침 비활성화
    refetchOnReconnect: true, // 네트워크 재연결 시에만 자동 새로고침
    refetchInterval: shouldPoll ? effectiveInterval : false, // 설정에 따른 간격 (앱 활성화 시에만)
    enabled: isAppActive, // 앱이 활성화된 경우에만 실행
  });
};

// 경매 상세 조회 훅 (캐시 최적화 적용)
export const useAuction = (id: string) => {
  const { settings } = useBatteryOptimizationContext();

  // 경매 상세는 더 오래 캐시 (변경이 적음)
  const baseInterval = 5 * 60 * 1000; // 5분 기준
  const staleTime = getCacheStaleTime(settings, baseInterval);
  const gcTime = getCacheGcTime(settings, baseInterval);

  return useQuery({
    queryKey: auctionKeys.detail(id),
    queryFn: () => auctionAPI.getAuctionById(id),
    enabled: !!id,
    staleTime: staleTime, // 동적 캐시 설정
    gcTime: gcTime, // 동적 캐시 보관 시간
  });
};

// 경매 생성 훅
export const useCreateAuction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: auctionAPI.createAuction,
    onSuccess: (newAuction) => {
      // 경매 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });

      // 새 경매를 상세 캐시에 추가
      queryClient.setQueryData(auctionKeys.detail(newAuction.id), newAuction);
    },
    onError: (error) => {
      console.error("경매 생성 실패:", error);
    },
  });
};

// 경매 수정 훅
export const useUpdateAuction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<AuctionItem>;
    }) => auctionAPI.updateAuction(id, updates),
    onSuccess: (updatedAuction) => {
      // 경매 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });

      // 상세 캐시 업데이트
      queryClient.setQueryData(
        auctionKeys.detail(updatedAuction.id),
        updatedAuction
      );
    },
  });
};

// 경매 삭제 훅
export const useDeleteAuction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: auctionAPI.deleteAuction,
    onSuccess: (_, deletedId) => {
      // 경매 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });

      // 상세 캐시에서 제거
      queryClient.removeQueries({ queryKey: auctionKeys.detail(deletedId) });
    },
  });
};

// 입찰 생성 훅
export const useCreateBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      auctionId,
      bidData,
    }: {
      auctionId: string;
      bidData: {
        userId: string;
        userName: string;
        amount: number;
        location: string;
      };
    }) => auctionAPI.createBid(auctionId, bidData),
    // ✅ 낙관적 업데이트 추가
    onMutate: async ({ auctionId, bidData }) => {
      // 진행 중인 쿼리들을 취소
      await queryClient.cancelQueries({
        queryKey: auctionKeys.detail(auctionId),
      });
      await queryClient.cancelQueries({ queryKey: auctionKeys.lists() });

      // 이전 데이터를 백업
      const previousAuctionDetail = queryClient.getQueryData(
        auctionKeys.detail(auctionId)
      );
      const previousAuctionsList = queryClient.getQueryData(
        auctionKeys.lists()
      );

      // 낙관적으로 경매 상세 업데이트
      queryClient.setQueryData(auctionKeys.detail(auctionId), (old: any) => {
        if (!old) return old;

        const newBid = {
          id: `optimistic_bid_${Date.now()}`,
          userId: bidData.userId,
          userName: bidData.userName,
          amount: bidData.amount,
          location: bidData.location,
          bidTime: new Date(),
          isTopBid: true,
        };

        // 기존 입찰들의 isTopBid를 false로 변경
        const updatedBids = (old.bids || []).map((bid: any) => ({
          ...bid,
          isTopBid: false,
        }));

        return {
          ...old,
          currentBid: bidData.amount,
          bidders: new Set([
            ...updatedBids.map((bid: any) => bid.userId),
            bidData.userId,
          ]).size,
          bids: [newBid, ...updatedBids],
        };
      });

      // 낙관적으로 경매 목록 업데이트
      queryClient.setQueryData(auctionKeys.lists(), (old: any) => {
        if (!old) return old;

        return old.map((auction: any) => {
          if (auction.id === auctionId) {
            return {
              ...auction,
              currentBid: bidData.amount,
              bidders: auction.bidders + 1, // 간단하게 +1
            };
          }
          return auction;
        });
      });

      // 롤백을 위한 이전 데이터 반환
      return { previousAuctionDetail, previousAuctionsList };
    },
    onSuccess: (newBid, { auctionId }) => {
      // 성공 시 서버 데이터로 새로고침
      queryClient.invalidateQueries({
        queryKey: auctionKeys.detail(auctionId),
      });

      // 입찰 기록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: auctionKeys.bids(auctionId) });

      // 경매 목록 캐시 무효화 (현재 입찰가 업데이트)
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });
    },
    onError: (error, { auctionId }, context) => {
      console.error("입찰 실패:", error);

      // 에러 시 이전 상태로 롤백
      if (context?.previousAuctionDetail) {
        queryClient.setQueryData(
          auctionKeys.detail(auctionId),
          context.previousAuctionDetail
        );
      }
      if (context?.previousAuctionsList) {
        queryClient.setQueryData(
          auctionKeys.lists(),
          context.previousAuctionsList
        );
      }
    },
  });
};

// 입찰 기록 조회 훅
export const useBids = (auctionId: string) => {
  return useQuery({
    queryKey: auctionKeys.bids(auctionId),
    queryFn: () => auctionAPI.getBids(auctionId),
    enabled: !!auctionId,
    staleTime: 30 * 1000, // 30초
  });
};

// ========================================
// 낙찰/유찰 시스템 훅들
// ========================================

/**
 * 경매 결과 조회 훅
 */
export const useAuctionResult = (auctionId: string) => {
  return useQuery({
    queryKey: auctionKeys.result(auctionId),
    queryFn: () => auctionAPI.getAuctionResult(auctionId),
    enabled: !!auctionId,
    staleTime: 30 * 1000, // 30초 (크론 처리 결과를 빠르게 반영)
    refetchOnWindowFocus: true, // 앱 포커스 시 자동 새로고침 (크론 테스트에 중요)
    refetchOnReconnect: true, // 네트워크 재연결 시 자동 새로고침
    retry: 2, // 경매 결과가 아직 처리되지 않을 수 있으므로 재시도
  });
};

/**
 * 거래 정보 조회 훅
 */
export const useAuctionTransaction = (auctionResultId: string) => {
  return useQuery({
    queryKey: auctionKeys.transaction(auctionResultId),
    queryFn: () => auctionAPI.getAuctionTransaction(auctionResultId),
    enabled: !!auctionResultId,
    staleTime: 30 * 1000, // 30초 (거래 상태는 자주 변경될 수 있음)
  });
};

/**
 * 내 경매 결과 목록 조회 훅
 */
export const useMyAuctionResults = (
  type: "won" | "sold" | "bidding",
  userId?: string
) => {
  return useQuery({
    queryKey: auctionKeys.myResults(userId || "unknown", type),
    queryFn: () => auctionAPI.getMyAuctionResults(type, userId),
    enabled: !!userId || type === "bidding", // bidding의 경우 내부에서 현재 사용자 조회
    staleTime: 2 * 60 * 1000, // 2분
  });
};

/**
 * 경매 통계 조회 훅
 */
export const useAuctionStats = () => {
  return useQuery({
    queryKey: auctionKeys.stats(),
    queryFn: () => auctionAPI.getAuctionStats(),
    staleTime: 10 * 60 * 1000, // 10분 (통계는 자주 변경되지 않음)
    refetchInterval: 15 * 60 * 1000, // 15분마다 자동 갱신 (배터리 최적화)
  });
};

/**
 * 경매 결과와 거래 정보를 함께 조회하는 조합 훅
 */
export const useAuctionResultWithTransaction = (auctionId: string) => {
  const resultQuery = useAuctionResult(auctionId);
  const transactionQuery = useAuctionTransaction(resultQuery.data?.id || "");

  return {
    result: resultQuery.data,
    transaction: transactionQuery.data,
    isLoading: resultQuery.isLoading || transactionQuery.isLoading,
    error: resultQuery.error || transactionQuery.error,
    isSuccess: resultQuery.isSuccess && transactionQuery.isSuccess,
  };
};

/**
 * 경매 결과 캐시 무효화 유틸리티
 */
export const useInvalidateAuctionResult = () => {
  const queryClient = useQueryClient();

  return {
    invalidateResult: (auctionId: string) => {
      queryClient.invalidateQueries({
        queryKey: auctionKeys.result(auctionId),
      });
    },
    invalidateTransaction: (resultId: string) => {
      queryClient.invalidateQueries({
        queryKey: auctionKeys.transaction(resultId),
      });
    },
    invalidateMyResults: (
      userId: string,
      type?: "won" | "sold" | "bidding"
    ) => {
      if (type) {
        queryClient.invalidateQueries({
          queryKey: auctionKeys.myResults(userId, type),
        });
      } else {
        // 모든 타입 무효화
        ["won", "sold", "bidding"].forEach((t) => {
          queryClient.invalidateQueries({
            queryKey: auctionKeys.myResults(userId, t as any),
          });
        });
      }
    },
    invalidateStats: () => {
      queryClient.invalidateQueries({
        queryKey: auctionKeys.stats(),
      });
    },
  };
};
