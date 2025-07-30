/**
 * My 화면용 서비스 요청 관련 API 및 hooks
 * 작성일: 2025-01-30
 * 목적: My 화면의 Premium 탭에서 사용할 API 함수들과 TanStack Query hooks
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import { ServiceRequest, ServiceRequestStatus } from "@/types/service-request";
import { useAuth } from "@/hooks/useAuth";

// 로컬 에러 처리 함수
function handleError(error: any, operation: string): never {
  console.error(`[${operation}] 실패:`, error);
  throw new Error(`${operation} 중 오류가 발생했습니다: ${error.message}`);
}

// ============================================
// API 함수들
// ============================================

/**
 * 나의 서비스 요청 목록 조회 (My 화면용)
 */
export async function getMyServiceRequests(
  userId: string | null,
  filter?: {
    status?: ServiceRequestStatus[];
    limit?: number;
  }
) {
  try {
    console.log("📋 나의 서비스 요청 목록 조회 시작:", filter);

    let query = supabase
      .from("service_requests")
      .select(
        `
        *,
        service_request_photos(
          id,
          photo_url,
          is_representative,
          photo_order
        )
      `
      )
      .order("created_at", { ascending: false });

    // 실제 사용자 ID로 필터링
    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      // 로그인하지 않은 경우 빈 결과 반환
      return [];
    }

    // 상태 필터
    if (filter?.status && filter.status.length > 0) {
      query = query.in("status", filter.status);
    }

    // 개수 제한
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;

    if (error) {
      handleError(error, "나의 요청 목록 조회");
    }

    console.log("📋 목록 조회 성공:", data?.length, "건");
    return data || [];
  } catch (error) {
    console.error("나의 요청 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 나의 서비스 요청 요약 통계
 */
export async function getMyServiceRequestSummary(userId: string | null) {
  try {
    console.log("📊 나의 서비스 요청 요약 조회 시작");

    // 실제 사용자 ID로 필터링
    if (!userId) {
      return {
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };
    }

    const { data, error } = await supabase
      .from("service_requests")
      .select("status")
      .eq("user_id", userId);

    if (error) {
      handleError(error, "나의 요청 요약 조회");
    }

    // 상태별 집계
    const summary = {
      total: data?.length || 0,
      pending: data?.filter((r) => r.status === "pending").length || 0,
      in_progress:
        data?.filter((r) => ["assigned", "in_progress"].includes(r.status))
          .length || 0,
      completed: data?.filter((r) => r.status === "completed").length || 0,
      cancelled: data?.filter((r) => r.status === "cancelled").length || 0,
    };

    console.log("📊 요약 조회 성공:", summary);
    return summary;
  } catch (error) {
    console.error("나의 요청 요약 조회 실패:", error);
    throw error;
  }
}

// ============================================
// TanStack Query Hooks
// ============================================

/**
 * 나의 서비스 요청 목록 조회 hook
 */
export function useMyServiceRequests(filter?: {
  status?: ServiceRequestStatus[];
  limit?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-service-requests", user?.id, filter],
    queryFn: () => getMyServiceRequests(user?.id || null, filter),
    staleTime: 1000 * 60 * 2, // 2분 캐시
    refetchOnWindowFocus: true,
    enabled: !!user, // 사용자가 로그인한 경우에만 실행
  });
}

/**
 * 나의 서비스 요청 요약 통계 hook
 */
export function useMyServiceRequestSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-service-request-summary", user?.id],
    queryFn: () => getMyServiceRequestSummary(user?.id || null),
    staleTime: 1000 * 60 * 5, // 5분 캐시
    refetchOnWindowFocus: true,
    enabled: !!user, // 사용자가 로그인한 경우에만 실행
  });
}

// ============================================
// 필터 타입 및 유틸리티
// ============================================

export interface MyRequestsFilter {
  status?: ServiceRequestStatus[];
  limit?: number;
}

export const REQUEST_FILTER_OPTIONS = {
  all: { label: "전체", status: undefined },
  pending: { label: "접수 대기", status: ["pending"] },
  in_progress: { label: "진행 중", status: ["assigned", "in_progress"] },
  completed: { label: "완료", status: ["completed"] },
  cancelled: { label: "취소", status: ["cancelled"] },
} as const;
