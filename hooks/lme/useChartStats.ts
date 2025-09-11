import { useQuery } from "@tanstack/react-query";
import { lmeRpc } from "./supabaseClient";
import { lmeKeys } from "./queryKeys";
import { retryConfig, classifyError } from "./errorUtils";
import { useBatteryOptimizationContext } from "@/contexts/BatteryOptimizationContext";
import {
  getCacheStaleTime,
  getCacheGcTime,
} from "@/utils/batteryOptimizationUtils";

/**
 * 차트 통계 데이터 인터페이스
 */
export interface ChartStatsData {
  period_start: string;
  period_label: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  change_percent: number;
  change_type: "positive" | "negative" | "unchanged";
  data_points: number;
}

/**
 * 차트 기간 타입
 */
export type ChartPeriod = "daily" | "weekly" | "monthly";

/**
 * LME 차트 통계 조회 Hook
 *
 * @param metalCode 금속 코드 (예: 'CU', 'AL')
 * @param period 차트 기간 ('daily', 'weekly', 'monthly')
 * @param options 쿼리 옵션
 * @returns TanStack Query 결과 객체
 */
export function useChartStats(
  metalCode: string,
  period: ChartPeriod,
  options?: {
    limit?: number;
    enabled?: boolean;
  }
) {
  const { settings } = useBatteryOptimizationContext();
  const limit = options?.limit || 30;

  // 배터리 최적화에 따른 캐시 설정
  const baseInterval = period === "daily" ? 5 * 60 * 1000 : 15 * 60 * 1000;
  const staleTime = getCacheStaleTime(settings, baseInterval);
  const gcTime = getCacheGcTime(settings, baseInterval);

  return useQuery({
    queryKey: lmeKeys.chartStats(metalCode, period, limit),
    queryFn: async () => {
      try {
        console.log(`📊 차트 통계 조회: ${metalCode} (${period}, ${limit}개)`);

        const { data, error } = await lmeRpc.getChartStats(
          metalCode,
          period,
          limit
        );

        if (error) {
          console.error(`차트 통계 조회 오류:`, error);
          throw classifyError(error);
        }

        if (!data || !Array.isArray(data)) {
          console.warn(`차트 통계 데이터가 없습니다: ${metalCode} (${period})`);
          return [];
        }

        // 데이터 유효성 검증 및 변환
        const validatedData = data
          .filter(
            (item: any) =>
              item &&
              typeof item.avg_price === "number" &&
              item.avg_price > 0 &&
              item.period_start &&
              item.period_label
          )
          .map((item: any) => ({
            period_start: item.period_start,
            period_label: item.period_label,
            avg_price: Number(item.avg_price),
            min_price: Number(item.min_price || item.avg_price),
            max_price: Number(item.max_price || item.avg_price),
            change_percent: Number(item.change_percent || 0),
            change_type: (item.change_type || "unchanged") as
              | "positive"
              | "negative"
              | "unchanged",
            data_points: Number(item.data_points || 1),
          })) as ChartStatsData[];

        console.log(`✅ 차트 통계 조회 성공: ${validatedData.length}개 데이터`);
        return validatedData;
      } catch (error) {
        console.error(`차트 통계 조회 실패 (${metalCode}, ${period}):`, error);
        throw classifyError(error);
      }
    },

    // 캐시 전략 (기간별 차별화)
    staleTime: staleTime,
    gcTime: gcTime,

    // 재시도 설정
    ...retryConfig,

    // 조건부 실행
    enabled: !!metalCode && options?.enabled !== false,

    // 에러 시 빈 배열 반환
    placeholderData: [],

    // 데이터 검증
    select: (data: ChartStatsData[]) => {
      // 추가 데이터 정제 및 정렬 (차트용: 오래된 순서)
      return data
        .filter((item) => item.avg_price > 0)
        .sort(
          (a, b) =>
            new Date(a.period_start).getTime() -
            new Date(b.period_start).getTime()
        );
    },

    // 메타데이터
    meta: {
      description: `${metalCode} 금속의 ${period} 차트 통계`,
    },
  });
}

/**
 * 여러 금속의 차트 통계를 동시에 조회하는 Hook
 *
 * @param metalCodes 금속 코드 배열
 * @param period 차트 기간
 * @param options 쿼리 옵션
 */
export function useMultipleChartStats(
  metalCodes: string[],
  period: ChartPeriod,
  options?: {
    limit?: number;
    enabled?: boolean;
  }
) {
  const results = metalCodes.map((metalCode) =>
    useChartStats(metalCode, period, options)
  );

  return {
    data: results.map((result) => result.data),
    isLoading: results.some((result) => result.isLoading),
    error: results.find((result) => result.error)?.error,
    isSuccess: results.every((result) => result.isSuccess),
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

/**
 * 차트 통계 캐시 무효화 유틸리티
 */
export function useChartStatsInvalidation() {
  const { settings } = useBatteryOptimizationContext();

  return {
    // 특정 금속의 모든 차트 통계 무효화
    invalidateMetalChartStats: (metalCode: string) => {
      // 구현은 상위 컴포넌트에서 queryClient를 통해 처리
      console.log(`차트 통계 캐시 무효화 요청: ${metalCode}`);
    },

    // 모든 차트 통계 무효화
    invalidateAllChartStats: () => {
      console.log("모든 차트 통계 캐시 무효화 요청");
    },
  };
}
