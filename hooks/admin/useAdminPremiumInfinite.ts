import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/service-request/supabaseClient";
import { AdminServiceRequest } from "./useAdminPremium";

// 페이지네이션 응답 타입
interface AdminServiceRequestPageResponse {
  data: AdminServiceRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * 관리자용 서비스 요청 목록 조회 (페이지네이션 지원)
 */
export async function getAdminServiceRequestsWithPagination(
  page: number = 1,
  limit: number = 10
): Promise<AdminServiceRequestPageResponse> {
  try {
    console.log("🔍 [Admin Premium] 페이지네이션 조회:", { page, limit });

    // 전체 개수 조회
    const { count, error: countError } = await supabase
      .from("service_requests")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("전체 서비스 요청 개수 조회 실패:", countError);
      throw countError;
    }

    const total = count || 0;

    // 페이지네이션된 데이터 조회
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }) // 추가 정렬 기준으로 일관성 보장
      .range(from, to);

    if (error) {
      console.error("관리자 서비스 요청 목록 조회 실패:", error);
      throw error;
    }

    // 사용자 정보를 별도로 조회하여 매핑
    const userIds = [
      ...new Set((data || []).map((item) => item.user_id).filter(Boolean)),
    ];
    const userMap = new Map<string, string>();

    if (userIds.length > 0) {
      try {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);

        if (usersData) {
          usersData.forEach((user) => {
            userMap.set(user.id, user.name || "이름 없음");
          });
        }
      } catch (userError) {
        console.warn("사용자 정보 조회 실패, 기본값 사용:", userError);
      }
    }

    // 사진 정보를 별도로 조회하여 매핑
    const requestIds = (data || []).map((item) => item.id);
    const photoMap = new Map<string, any[]>();

    if (requestIds.length > 0) {
      try {
        const { data: photosData } = await supabase
          .from("service_request_photos")
          .select("*")
          .in("service_request_id", requestIds)
          .order("photo_order", { ascending: true });

        if (photosData) {
          photosData.forEach((photo) => {
            const requestId = photo.service_request_id;
            if (!photoMap.has(requestId)) {
              photoMap.set(requestId, []);
            }
            photoMap.get(requestId)!.push(photo);
          });
        }
      } catch (photoError) {
        console.warn("사진 정보 조회 실패:", photoError);
      }
    }

    const transformedData: AdminServiceRequest[] = (data || []).map(
      (item: any) => ({
        id: item.id,
        serviceType: item.service_type,
        status: item.status,
        contactPhone: item.contact_phone,
        use_safe_number: item.use_safe_number || false,
        address: item.address,
        addressDetail: item.address_detail,
        description: item.description,
        item_type: item.item_type,
        quantity: item.quantity,
        scheduledDate: item.scheduled_date,
        estimatedValue: item.estimated_value,
        finalOffer: item.final_offer,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        completedAt: item.completed_at,
        userName: item.user_id
          ? userMap.get(item.user_id) ||
            `회원 (${item.user_id.substring(0, 8)}...)`
          : "비회원",
        photos: photoMap.get(item.id) || [],
      })
    );

    const hasMore = from + limit < total;

    console.log("✅ [Admin Premium] 페이지네이션 조회 성공:", {
      page,
      limit,
      total,
      dataLength: transformedData.length,
      hasMore,
    });

    return {
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    };
  } catch (error) {
    console.error("관리자 서비스 요청 목록 조회 중 오류:", error);
    throw error;
  }
}

/**
 * 관리자용 서비스 요청 무한 스크롤 훅
 */
export const useAdminServiceRequestsInfinite = (limit: number = 10) => {
  return useInfiniteQuery({
    queryKey: ["admin", "service-requests-infinite", limit],
    queryFn: ({ pageParam = 1 }) =>
      getAdminServiceRequestsWithPagination(pageParam, limit),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.hasMore ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    refetchInterval: false, // 자동 갱신 비활성화 (배터리 최적화)
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true, // 화면 포커스 시에만 갱신
    // 중복 방지를 위한 추가 설정
    structuralSharing: false, // 구조적 공유 비활성화로 중복 방지
  });
};
