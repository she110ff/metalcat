import { QueryClient } from "@tanstack/react-query";
import { LmeError } from "../../types/lme";

/**
 * LME 관련 에러 처리 유틸리티
 *
 * 네트워크 에러, API 에러, 데이터 검증 에러 등을 포괄적으로 처리
 */

// 에러 코드 정의
export const LME_ERROR_CODES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  API_ERROR: "API_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  CRAWLER_DOWN: "CRAWLER_DOWN",
  DATA_STALE: "DATA_STALE",
} as const;

export type LmeErrorCode = keyof typeof LME_ERROR_CODES;

// 사용자 친화적 에러 메시지 매핑
export const ERROR_MESSAGES: Record<LmeErrorCode, string> = {
  NETWORK_ERROR: "네트워크 연결을 확인해주세요",
  API_ERROR: "서버에 일시적인 문제가 발생했습니다",
  VALIDATION_ERROR: "데이터 형식이 올바르지 않습니다",
  TIMEOUT_ERROR: "요청 시간이 초과되었습니다",
  UNAUTHORIZED: "접근 권한이 없습니다",
  CRAWLER_DOWN: "LME 데이터 수집 서비스가 중단되었습니다",
  DATA_STALE: "데이터가 오래되었습니다. 새로고침을 시도해주세요",
};

// 에러 분류 함수
export function classifyError(error: any): LmeError {
  // 네트워크 에러
  if (!navigator.onLine || error.code === "NETWORK_ERROR") {
    return {
      code: LME_ERROR_CODES.NETWORK_ERROR,
      message: ERROR_MESSAGES.NETWORK_ERROR,
      details: error,
    };
  }

  // 타임아웃 에러
  if (error.name === "TimeoutError" || error.code === "TIMEOUT") {
    return {
      code: LME_ERROR_CODES.TIMEOUT_ERROR,
      message: ERROR_MESSAGES.TIMEOUT_ERROR,
      details: error,
    };
  }

  // HTTP 상태 코드 기반 분류
  if (error.status) {
    switch (error.status) {
      case 401:
      case 403:
        return {
          code: LME_ERROR_CODES.UNAUTHORIZED,
          message: ERROR_MESSAGES.UNAUTHORIZED,
          details: error,
        };
      case 404:
        return {
          code: LME_ERROR_CODES.API_ERROR,
          message: "요청한 데이터를 찾을 수 없습니다",
          details: error,
        };
      case 500:
      case 502:
      case 503:
        return {
          code: LME_ERROR_CODES.API_ERROR,
          message: ERROR_MESSAGES.API_ERROR,
          details: error,
        };
    }
  }

  // PostgreSQL 에러 코드 처리
  if (error.code?.startsWith("P")) {
    return {
      code: LME_ERROR_CODES.API_ERROR,
      message: "데이터베이스 처리 중 오류가 발생했습니다",
      details: error,
    };
  }

  // 기본 에러
  return {
    code: LME_ERROR_CODES.API_ERROR,
    message: error.message || ERROR_MESSAGES.API_ERROR,
    details: error,
  };
}

// 재시도 로직 설정
export const retryConfig = {
  retry: (failureCount: number, error: any) => {
    const lmeError = classifyError(error);

    // 네트워크 에러나 서버 에러는 최대 3회 재시도
    if (
      lmeError.code === LME_ERROR_CODES.NETWORK_ERROR ||
      lmeError.code === LME_ERROR_CODES.API_ERROR ||
      lmeError.code === LME_ERROR_CODES.TIMEOUT_ERROR
    ) {
      return failureCount < 3;
    }

    // 인증 에러나 검증 에러는 재시도하지 않음
    return false;
  },

  retryDelay: (attemptIndex: number) => {
    // 지수 백오프: 1초, 2초, 4초
    return Math.min(1000 * 2 ** attemptIndex, 30000);
  },
};

// 쿼리 클라이언트 기본 설정
export const createLmeQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...retryConfig,
        staleTime: 2 * 60 * 1000, // 2분
        gcTime: 10 * 60 * 1000, // 10분 (구 cacheTime)
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false, // mutation은 기본적으로 재시도하지 않음
      },
    },
  });
};

// 에러 로깅 함수
export function logError(context: string, error: LmeError): void {
  const logData = {
    timestamp: new Date().toISOString(),
    context,
    errorCode: error.code,
    message: error.message,
    details: error.details,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // 개발 환경에서는 콘솔에 로그
  if (__DEV__) {
    console.error(`[LME Error] ${context}:`, logData);
  }

  // 프로덕션에서는 에러 트래킹 서비스로 전송
  // TODO: Sentry, LogRocket 등의 서비스 연동
}

// 데이터 검증 함수
export function validateLmePrice(data: any): boolean {
  return (
    typeof data === "object" &&
    typeof data.metal_code === "string" &&
    typeof data.price_krw_per_kg === "number" &&
    data.price_krw_per_kg > 0 &&
    typeof data.price_date === "string" &&
    ["positive", "negative", "unchanged"].includes(data.change_type)
  );
}

// 캐시 복구 전략
export const cacheRecoveryUtils = {
  // 스테일 데이터 제공
  getStaleData: (queryClient: QueryClient, queryKey: any[]) => {
    return queryClient.getQueryData(queryKey);
  },

  // 로컬 스토리지에서 백업 데이터 조회
  getBackupData: (key: string) => {
    try {
      const backup = localStorage.getItem(`lme_backup_${key}`);
      return backup ? JSON.parse(backup) : null;
    } catch {
      return null;
    }
  },

  // 백업 데이터 저장
  saveBackupData: (key: string, data: any) => {
    try {
      localStorage.setItem(
        `lme_backup_${key}`,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch {
      // 로컬 스토리지 실패 시 무시
    }
  },
};
