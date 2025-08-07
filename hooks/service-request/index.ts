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
import { useEffect, useState } from "react";
import { AppState } from "react-native";
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
  // My 화면용 쿼리 키 (필터 포함)
  myRequests: (userId?: string, filter?: any) =>
    [...serviceRequestKeys.all, "my", userId, filter] as const,
  myRequestsSummary: (userId?: string) =>
    [...serviceRequestKeys.all, "my-summary", userId] as const,
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
      console.log("✅ [캐시 무효화] 서비스 요청 생성 성공:", newRequest.id);

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

      // ✅ My 화면용 쿼리들 무효화 (새로 추가)
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.myRequests(),
      });
      queryClient.invalidateQueries({
        queryKey: serviceRequestKeys.myRequestsSummary(),
      });

      console.log("✅ [캐시 무효화] 모든 관련 쿼리 무효화 완료");
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
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active"
  );

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

  useEffect(() => {
    if (!requestId || !isAppActive) return; // 앱이 활성화된 경우에만 구독

    let subscription: any = null;

    const startSubscription = () => {
      if (subscription) return;

      subscription = subscribeToServiceRequest(
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
    };

    const stopSubscription = () => {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    };

    // 앱이 활성화된 경우에만 구독 시작
    if (isAppActive) {
      startSubscription();
    }

    return () => {
      stopSubscription();
    };
  }, [requestId, queryClient, isAppActive]); // isAppActive 의존성 추가
}

/**
 * 사용자 서비스 요청 목록 실시간 구독
 */
export function useUserServiceRequestsRealtime(userId?: string) {
  const queryClient = useQueryClient();
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === "active"
  );

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

  useEffect(() => {
    if (!userId || !isAppActive) return; // 앱이 활성화된 경우에만 구독

    let subscription: any = null;

    const startSubscription = () => {
      if (subscription) return;

      subscription = subscribeToUserServiceRequests(
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
    };

    const stopSubscription = () => {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    };

    // 앱이 활성화된 경우에만 구독 시작
    if (isAppActive) {
      startSubscription();
    }

    return () => {
      stopSubscription();
    };
  }, [userId, queryClient, isAppActive]); // isAppActive 의존성 추가
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
 * 서비스 요청 폼 처리 (생성 + 사진 업로드) with Optimistic Update
 */
export function useServiceRequestForm() {
  const createRequest = useCreateServiceRequest();
  const uploadPhoto = useUploadServiceRequestPhoto();
  const queryClient = useQueryClient();

  const submitRequest = async (formData: ServiceRequestFormData) => {
    const tempId = `temp-${Date.now()}`;
    let optimisticRequest: ServiceRequest | null = null;

    try {
      // 🚀 Optimistic Update: 임시 요청 객체 생성
      if (formData.user_id) {
        optimisticRequest = {
          id: tempId,
          service_type: formData.service_type,
          contact_phone: formData.contact_phone,
          address: formData.address,
          address_detail: formData.address_detail,
          description: formData.description,
          user_id: formData.user_id,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // 임시 사진 데이터
          photos:
            formData.photos?.map((photo, index) => ({
              id: `temp-photo-${index}`,
              service_request_id: tempId,
              photo_url: photo.uri || "",
              is_representative: index === 0,
              photo_order: index,
              created_at: new Date().toISOString(),
            })) || [],
        } as ServiceRequest;

        console.log(
          "🚀 [Optimistic Update] 임시 요청 캐시에 추가:",
          optimisticRequest
        );

        // 현재 캐시 데이터 가져오기
        const currentData = queryClient.getQueryData(
          serviceRequestKeys.myRequests(formData.user_id)
        ) as ServiceRequest[] | undefined;

        // 임시 요청을 맨 앞에 추가
        queryClient.setQueryData(
          serviceRequestKeys.myRequests(formData.user_id),
          [optimisticRequest, ...(currentData || [])]
        );
      }

      // 1. 실제 서비스 요청 생성
      const requestData: CreateServiceRequestData = {
        service_type: formData.service_type,
        contact_phone: formData.contact_phone,
        address: formData.address,
        address_detail: formData.address_detail,
        description: formData.description,
        user_id: formData.user_id, // 사용자 ID 전달
      };

      const newRequest = await createRequest.mutateAsync(requestData);

      console.log("✅ [Optimistic Update] 실제 요청 생성 완료:", newRequest.id);

      // 🔄 Optimistic Update 롤백 및 실제 데이터로 교체
      if (formData.user_id && optimisticRequest) {
        const currentData = queryClient.getQueryData(
          serviceRequestKeys.myRequests(formData.user_id)
        ) as ServiceRequest[] | undefined;

        if (currentData) {
          // 임시 요청 제거하고 실제 요청으로 교체
          const updatedData = currentData
            .filter((req) => req.id !== tempId)
            .filter((req) => req.id !== newRequest.id); // 중복 방지

          queryClient.setQueryData(
            serviceRequestKeys.myRequests(formData.user_id),
            [newRequest, ...updatedData]
          );
        }
      }

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

        console.log("✅ [Optimistic Update] 사진 업로드 완료");
      }

      return newRequest;
    } catch (error) {
      console.error("❌ [Optimistic Update] 서비스 요청 폼 제출 실패:", error);

      // 🔄 Optimistic Update 롤백 - 에러 발생 시 임시 데이터 제거
      if (formData.user_id && optimisticRequest) {
        const currentData = queryClient.getQueryData(
          serviceRequestKeys.myRequests(formData.user_id)
        ) as ServiceRequest[] | undefined;

        if (currentData) {
          const rollbackData = currentData.filter((req) => req.id !== tempId);
          queryClient.setQueryData(
            serviceRequestKeys.myRequests(formData.user_id),
            rollbackData
          );
          console.log("🔄 [Optimistic Update] 에러로 인한 롤백 완료");
        }
      }

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

// API 함수들도 다시 내보내기 (직접 사용이 필요한 경우)
export * from "./api";
