import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { lmeKeys } from "./queryKeys";
import {
  fetchLatestLmePrices,
  fetchMetalHistory,
  fetchCrawlingStatus,
} from "./api";
import { retryConfig, cacheRecoveryUtils } from "./errorUtils";
import type {
  LatestLmePrice,
  MetalHistoryData,
  CrawlingStatus,
} from "../../types/lme";
import type { MetalPriceData } from "../../data/types/metal-price";
import { useBatteryOptimizationContext } from "@/contexts/BatteryOptimizationContext";
import {
  getLmeCrawlingInterval,
  getLmePriceInterval,
  getCacheStaleTime,
  getCacheGcTime,
} from "@/utils/batteryOptimizationUtils";

/**
 * LME 데이터 관련 TanStack Query Hooks
 *
 * 캐싱, 재시도, 에러 처리를 포함한 완전한 데이터 관리 솔루션
 */

/**
 * LatestLmePrice를 MetalPriceData 형식으로 변환
 * 기존 컴포넌트와의 호환성을 위함
 */
function transformToMetalPriceData(
  lmeData: LatestLmePrice[]
): MetalPriceData[] {
  return lmeData.map((item) => ({
    metalName: item.metal_name_kr,
    price: Math.round(item.price_krw_per_kg),
    unit: "원/KG",
    changePercent: item.change_percent
      ? `${item.change_percent > 0 ? "+" : ""}${item.change_percent.toFixed(
          2
        )}%`
      : "0.00%",
    changeType: (item.change_type === "positive" ? "positive" : "negative") as
      | "positive"
      | "negative",
  }));
}

/**
 * 최신 LME 가격 데이터 조회 Hook
 *
 * @param options 쿼리 옵션
 * @returns TanStack Query 결과 객체
 */
export function useLatestLmePrices(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const queryClient = useQueryClient();
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
  const effectiveInterval =
    options?.refetchInterval || getLmePriceInterval(settings);
  const shouldPoll = isAppActive && !settings.disableBackgroundPolling;

  // 캐시 설정 동적 계산
  const staleTime = getCacheStaleTime(settings, effectiveInterval);
  const gcTime = getCacheGcTime(settings, effectiveInterval);

  return useQuery({
    queryKey: lmeKeys.latestPrices(),
    queryFn: fetchLatestLmePrices,

    // 동적 캐시 전략 (배터리 최적화)
    staleTime: staleTime,
    gcTime: gcTime,

    // 재시도 설정
    ...retryConfig,

    // 백그라운드 업데이트 (배터리 최적화)
    refetchOnWindowFocus: false, // 앱 포커스 시 갱신 비활성화
    refetchOnReconnect: true, // 네트워크 재연결 시에만 갱신
    refetchInterval: shouldPoll ? effectiveInterval : false, // 설정에 따른 간격 (앱 활성화 시에만)

    // 조건부 실행 (앱이 활성화된 경우에만)
    enabled: isAppActive && options?.enabled !== false,

    // 에러 시 이전 데이터 유지
    placeholderData: (previousData) => {
      if (previousData) return previousData;

      // 백업 데이터 시도
      const backup = cacheRecoveryUtils.getBackupData("latest_prices");
      return backup?.data || undefined;
    },

    // meta에서 백업 저장 처리
    meta: {
      onSuccess: (data: LatestLmePrice[]) => {
        cacheRecoveryUtils.saveBackupData("latest_prices", data);
      },
    },

    // 데이터 검증
    select: (data: LatestLmePrice[]) => {
      // 데이터 유효성 검증 후 반환
      return data.filter(
        (item) =>
          item.metal_name_kr &&
          typeof item.price_krw_per_kg === "number" &&
          item.price_krw_per_kg > 0
      );
    },
  });
}

/**
 * 기존 컴포넌트와 호환되는 MetalPriceData 형식으로 변환된 Hook
 *
 * @param options 쿼리 옵션
 * @returns 변환된 MetalPriceData 배열
 */
export function useLatestLmePricesCompatible(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const query = useLatestLmePrices(options);

  return {
    ...query,
    data: query.data ? transformToMetalPriceData(query.data) : undefined,
  };
}

/**
 * 특정 금속의 히스토리 데이터 조회 Hook
 *
 * @param metalCode 금속 코드 (예: 'copper')
 * @param days 조회할 일수 (기본값: 30일)
 * @param options 쿼리 옵션
 */
export function useMetalHistory(
  metalCode: string,
  days: number = 30,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: lmeKeys.metalHistory(metalCode, days),
    queryFn: () => fetchMetalHistory(metalCode, days),

    // 캐시 전략 (히스토리는 더 오래 캐시)
    staleTime: 5 * 60 * 1000, // 5분간 fresh
    gcTime: 30 * 60 * 1000, // 30분간 캐시 보관

    // 재시도 설정
    ...retryConfig,

    // 조건부 실행
    enabled: !!metalCode && options?.enabled !== false,

    // 에러 시 빈 배열 반환
    placeholderData: [],
  });
}

/**
 * 크롤링 상태 조회 Hook
 *
 * @param options 쿼리 옵션
 */
export function useCrawlingStatus(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
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
  const effectiveInterval =
    options?.refetchInterval || getLmeCrawlingInterval(settings);
  const shouldPoll = isAppActive && !settings.disableBackgroundPolling;

  // 캐시 설정 동적 계산 (크롤링 상태는 더 짧게)
  const staleTime = Math.min(
    getCacheStaleTime(settings, effectiveInterval),
    5 * 60 * 1000 // 최대 5분
  );
  const gcTime = Math.min(
    getCacheGcTime(settings, effectiveInterval),
    15 * 60 * 1000 // 최대 15분
  );

  return useQuery({
    queryKey: lmeKeys.crawlingStatus(),
    queryFn: fetchCrawlingStatus,

    // 동적 캐시 전략 (배터리 최적화)
    staleTime: staleTime,
    gcTime: gcTime,

    // 폴링으로 실시간 모니터링 (배터리 최적화)
    refetchInterval: shouldPoll ? effectiveInterval : false, // 설정에 따른 간격 (앱 활성화 시에만)
    refetchOnWindowFocus: false, // 앱 포커스 시 갱신 비활성화

    // 조건부 실행 (앱이 활성화된 경우에만)
    enabled: isAppActive && options?.enabled !== false,

    // 기본값 제공
    placeholderData: {
      last_success_at: null,
      last_failure_at: null,
      is_currently_running: false,
      success_rate_24h: 0,
      avg_duration_ms: 0,
    },
  });
}

/**
 * LME 관련 캐시 무효화 유틸리티 Hook
 */
export function useLmeCacheInvalidation() {
  const queryClient = useQueryClient();

  return {
    // 모든 LME 데이터 무효화
    invalidateAll: () => {
      return queryClient.invalidateQueries({ queryKey: lmeKeys.all });
    },

    // 최신 가격만 무효화
    invalidateLatest: () => {
      return queryClient.invalidateQueries({ queryKey: lmeKeys.latest() });
    },

    // 특정 금속 데이터 무효화
    invalidateMetal: (metalCode: string) => {
      return queryClient.invalidateQueries({
        queryKey: lmeKeys.metal(metalCode),
      });
    },

    // 상태 데이터 무효화
    invalidateStatus: () => {
      return queryClient.invalidateQueries({ queryKey: lmeKeys.status() });
    },

    // 수동으로 최신 데이터 다시 가져오기
    refetchLatest: () => {
      return queryClient.refetchQueries({ queryKey: lmeKeys.latestPrices() });
    },
  };
}

/**
 * LME 데이터 프리페칭 Hook
 * 성능 최적화를 위해 사용자가 접근하기 전에 미리 데이터를 로드
 */
export function useLmePrefetch() {
  const queryClient = useQueryClient();

  return {
    // 최신 가격 데이터 프리페치
    prefetchLatest: () => {
      return queryClient.prefetchQuery({
        queryKey: lmeKeys.latestPrices(),
        queryFn: fetchLatestLmePrices,
        staleTime: 2 * 60 * 1000,
      });
    },

    // 특정 금속의 히스토리 프리페치
    prefetchMetalHistory: (metalCode: string, days: number = 30) => {
      return queryClient.prefetchQuery({
        queryKey: lmeKeys.metalHistory(metalCode, days),
        queryFn: () => fetchMetalHistory(metalCode, days),
        staleTime: 5 * 60 * 1000,
      });
    },
  };
}
