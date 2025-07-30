/**
 * 프리미엄 서비스 요청 TanStack Query 훅
 * 작성일: 2025-01-30
 * 목적: React Query 패턴을 사용한 서비스 요청 상태 관리
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useEffect } from "react";
import {
  createServiceRequest,
  getServiceRequest,
  getServiceRequests,
  getUserServiceRequests,
  updateServiceRequest,
  deleteServiceRequest,
  uploadServiceRequestPhoto,
  deleteServiceRequestPhoto,
  getServiceRequestStats,
  getRecentServiceRequests,
  subscribeToServiceRequest,
  subscribeToUserServiceRequests,
} from "./api";
import {
  ServiceRequest,
  ServiceRequestPhoto,
  CreateServiceRequestData,
  UpdateServiceRequestData,
  ServiceRequestListParams,
  ServiceRequestFilters,
  ServiceRequestFormData,
} from "@/types/service-request";

// ============================================
// 쿼리 키 정의
// ============================================

export const serviceRequestKeys = {
  all: ["service-requests"] as const,
  lists: () => [...serviceRequestKeys.all, "list"] as const,
  list: (filters: ServiceRequestFilters) =>
    [...serviceRequestKeys.lists(), filters] as const,
  details: () => [...serviceRequestKeys.all, "detail"] as const,
  detail: (id: string) => [...serviceRequestKeys.details(), id] as const,
  userRequests: (userId?: string) =>
    [...serviceRequestKeys.all, "user", userId] as const,
  recentRequests: (userId?: string, limit?: number) =>
    [...serviceRequestKeys.all, "recent", userId, limit] as const,
  statistics: () => [...serviceRequestKeys.all, "statistics"] as const,
  stats: (startDate?: string, endDate?: string) =>
    [...serviceRequestKeys.statistics(), startDate, endDate] as const,
} as const;

// ============================================
// 기본 CRUD 훅
// ============================================

/**
 * 서비스 요청 생성
 */
export function useCreateServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createServiceRequest,
    onSuccess: (newRequest) => {
      // 새로운 요청을 캐시에 추가
      queryClient.setQueryData(
        serviceRequestKeys.detail(newRequest.id),
        newRequest
      );

      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.userRequests(),
      });
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.statistics(),
      });
    },
    onError: (error) => {
      console.error("서비스 요청 생성 실패:", error);
    },
  });
}

/**
 * 서비스 요청 상세 조회
 */
export function useServiceRequest(id: string) {
  return useQuery({
    queryKey: serviceRequestKeys.detail(id),
    queryFn: () => getServiceRequest(id),
    enabled: !!id,
    staleTime: 30000, // 30초
    gcTime: 5 * 60 * 1000, // 5분
  });
}

/**
 * 서비스 요청 목록 조회
 */
export function useServiceRequests(params: ServiceRequestListParams = {}) {
  return useQuery({
    queryKey: serviceRequestKeys.list(params),
    queryFn: () => getServiceRequests(params),
    staleTime: 60000, // 1분
    gcTime: 5 * 60 * 1000, // 5분
  });
}

/**
 * 무한 스크롤 서비스 요청 목록
 */
export function useInfiniteServiceRequests(
  filters: ServiceRequestFilters = {}
) {
  return useInfiniteQuery({
    queryKey: serviceRequestKeys.list(filters),
    queryFn: ({ pageParam = 1 }) =>
      getServiceRequests({ ...filters, page: pageParam, limit: 10 }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.page < pagination.total_pages
        ? pagination.page + 1
        : undefined;
    },
    initialPageParam: 1,
    staleTime: 30000,
  });
}

/**
 * 사용자 서비스 요청 목록 조회
 */
export function useUserServiceRequests(userId?: string) {
  return useQuery({
    queryKey: serviceRequestKeys.userRequests(userId),
    queryFn: () => getUserServiceRequests(userId),
    enabled: true, // userId가 없어도 현재 사용자 정보로 조회
    staleTime: 60000, // 1분
    gcTime: 5 * 60 * 1000, // 5분
  });
}

/**
 * 최근 서비스 요청 조회
 */
export function useRecentServiceRequests(userId?: string, limit: number = 5) {
  return useQuery({
    queryKey: serviceRequestKeys.recentRequests(userId, limit),
    queryFn: () => getRecentServiceRequests(userId, limit),
    staleTime: 60000, // 1분
    gcTime: 5 * 60 * 1000, // 5분
  });
}

/**
 * 서비스 요청 업데이트
 */
export function useUpdateServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateServiceRequest,
    onSuccess: (updatedRequest, { id }) => {
      // 상세 정보 캐시 업데이트
      queryClient.setQueryData(serviceRequestKeys.detail(id), updatedRequest);

      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.userRequests(),
      });
    },
    onError: (error) => {
      console.error("서비스 요청 업데이트 실패:", error);
    },
  });
}

/**
 * 서비스 요청 삭제
 */
export function useDeleteServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteServiceRequest,
    onSuccess: (_, requestId) => {
      // 상세 정보 캐시에서 제거
      queryClient.removeQueries({
        queryKey: serviceRequestKeys.detail(requestId),
      });

      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.userRequests(),
      });
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.statistics(),
      });
    },
    onError: (error) => {
      console.error("서비스 요청 삭제 실패:", error);
    },
  });
}

// ============================================
// 사진 관련 훅
// ============================================

/**
 * 서비스 요청 사진 업로드
 */
export function useUploadServiceRequestPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      requestId,
      order,
    }: {
      file: any;
      requestId: string;
      order: number;
    }) => uploadServiceRequestPhoto(file, requestId, order),
    onSuccess: (newPhoto, { requestId }) => {
      // 서비스 요청 상세 정보 무효화 (사진 포함)
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.detail(requestId),
      });
    },
    onError: (error) => {
      console.error("사진 업로드 실패:", error);
    },
  });
}

/**
 * 서비스 요청 사진 삭제
 */
export function useDeleteServiceRequestPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteServiceRequestPhoto,
    onSuccess: () => {
      // 모든 서비스 요청 관련 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.all,
      });
    },
    onError: (error) => {
      console.error("사진 삭제 실패:", error);
    },
  });
}

// ============================================
// 통계 및 분석 훅
// ============================================

/**
 * 서비스 요청 통계 조회
 */
export function useServiceRequestStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: serviceRequestKeys.stats(startDate, endDate),
    queryFn: () => getServiceRequestStats(startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  });
}

// ============================================
// 실시간 구독 훅
// ============================================

/**
 * 서비스 요청 실시간 업데이트 구독
 */
export function useServiceRequestRealtime(requestId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!requestId) return;

    const subscription = subscribeToServiceRequest(
      requestId,
      (updatedRequest) => {
        // 실시간으로 받은 데이터로 캐시 업데이트
        queryClient.setQueryData(
          serviceRequestKeys.detail(requestId),
          updatedRequest
        );

        // 목록 쿼리도 무효화하여 최신 상태 반영
        queryClient.invalidateQueries({
          queryKey: serviceRequestKeys.lists(),
        });
      },
      (error) => {
        console.error("실시간 구독 오류:", error);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [requestId, queryClient]);
}

/**
 * 사용자 서비스 요청 목록 실시간 구독
 */
export function useUserServiceRequestsRealtime(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const subscription = subscribeToUserServiceRequests(
      userId,
      (updatedRequests) => {
        // 실시간으로 받은 데이터로 캐시 업데이트
        queryClient.setQueryData(
          serviceRequestKeys.userRequests(userId),
          updatedRequests
        );

        // 통계도 무효화
        queryClient.invalidateQueries({
          queryKey: serviceRequestKeys.statistics(),
        });
      },
      (error) => {
        console.error("사용자 요청 목록 실시간 구독 오류:", error);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, queryClient]);
}

// ============================================
// 복합 훅 (여러 데이터를 조합)
// ============================================

/**
 * 프리미엄 대시보드용 데이터 (진행 중인 요청 + 최근 요청 + 통계)
 */
export function usePremiumDashboardData(userId?: string) {
  const userRequests = useUserServiceRequests(userId);
  const recentRequests = useRecentServiceRequests(userId, 3);
  const stats = useServiceRequestStats();

  // 진행 중인 요청 필터링
  const activeRequests =
    userRequests.data?.filter(
      (request) => !["completed", "cancelled"].includes(request.status)
    ) || [];

  return {
    activeRequests,
    recentRequests: recentRequests.data || [],
    stats: stats.data,
    isLoading:
      userRequests.isLoading || recentRequests.isLoading || stats.isLoading,
    error: userRequests.error || recentRequests.error || stats.error,
  };
}

/**
 * 서비스 요청 상세 정보 + 실시간 업데이트
 */
export function useServiceRequestDetail(id: string) {
  const request = useServiceRequest(id);
  useServiceRequestRealtime(id); // 실시간 업데이트 자동 구독

  return request;
}

// ============================================
// 유틸리티 훅
// ============================================

/**
 * 서비스 요청 폼 처리 (생성 + 사진 업로드)
 */
export function useServiceRequestForm() {
  const createRequest = useCreateServiceRequest();
  const uploadPhoto = useUploadServiceRequestPhoto();

  const submitRequest = async (formData: ServiceRequestFormData) => {
    try {
      // 1. 서비스 요청 생성
      const requestData: CreateServiceRequestData = {
        service_type: formData.service_type,
        contact_phone: formData.contact_phone,
        address: formData.address,
        address_detail: formData.address_detail,
        description: formData.description,
        user_id: formData.user_id, // 사용자 ID 전달
      };

      const newRequest = await createRequest.mutateAsync(requestData);

      // 2. 사진들 업로드
      if (formData.photos && formData.photos.length > 0) {
        const uploadPromises = formData.photos.map((photo, index) =>
          uploadPhoto.mutateAsync({
            file: photo,
            requestId: newRequest.id,
            order: index,
          })
        );

        await Promise.all(uploadPromises);
      }

      return newRequest;
    } catch (error) {
      console.error("서비스 요청 폼 제출 실패:", error);
      throw error;
    }
  };

  return {
    submitRequest,
    isLoading: createRequest.isPending || uploadPhoto.isPending,
    error: createRequest.error || uploadPhoto.error,
  };
}

// ============================================
// 내보내기
// ============================================

// 개별 훅들
export {
  useCreateServiceRequest,
  useServiceRequest,
  useServiceRequests,
  useInfiniteServiceRequests,
  useUserServiceRequests,
  useRecentServiceRequests,
  useUpdateServiceRequest,
  useDeleteServiceRequest,
  useUploadServiceRequestPhoto,
  useDeleteServiceRequestPhoto,
  useServiceRequestStats,
  useServiceRequestRealtime,
  useUserServiceRequestsRealtime,
  usePremiumDashboardData,
  useServiceRequestDetail,
  useServiceRequestForm,
};

// 쿼리 키 내보내기
export { serviceRequestKeys };

// API 함수들도 다시 내보내기 (직접 사용이 필요한 경우)
export * from "./api";
