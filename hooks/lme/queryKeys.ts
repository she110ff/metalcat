/**
 * LME 데이터 쿼리 키 패턴
 *
 * TanStack Query v5 베스트 프랙티스를 따라 계층적 쿼리 키 구조 정의
 * 참고: https://tkdodo.eu/blog/effective-react-query-keys
 */

export const lmeKeys = {
  // 모든 LME 관련 쿼리의 베이스
  all: ["lme"] as const,

  // 최신 가격 관련 쿼리
  latest: () => [...lmeKeys.all, "latest"] as const,
  latestPrices: () => [...lmeKeys.latest(), "prices"] as const,

  // 히스토리 관련 쿼리
  history: () => [...lmeKeys.all, "history"] as const,

  // 특정 금속 관련 쿼리
  metal: (metalCode: string) => [...lmeKeys.all, "metal", metalCode] as const,
  metalHistory: (metalCode: string, days: number) =>
    [...lmeKeys.metal(metalCode), "history", days] as const,
  metalLatest: (metalCode: string) =>
    [...lmeKeys.metal(metalCode), "latest"] as const,

  // 시스템 상태 관련 쿼리
  status: () => [...lmeKeys.all, "status"] as const,
  crawlingStatus: () => [...lmeKeys.status(), "crawling"] as const,

  // 집계 데이터 쿼리
  analytics: () => [...lmeKeys.all, "analytics"] as const,
  priceStats: (period: string) =>
    [...lmeKeys.analytics(), "stats", period] as const,
} as const;

// 쿼리 키 타입 추출 (타입 안전성 확보)
export type LmeQueryKeys = typeof lmeKeys;

// 캐시 무효화를 위한 유틸리티 함수들
export const lmeQueryUtils = {
  // 모든 LME 캐시 무효화
  invalidateAll: () => lmeKeys.all,

  // 최신 가격만 무효화
  invalidateLatest: () => lmeKeys.latest(),

  // 특정 금속의 모든 데이터 무효화
  invalidateMetal: (metalCode: string) => lmeKeys.metal(metalCode),

  // 상태 데이터만 무효화
  invalidateStatus: () => lmeKeys.status(),
} as const;
