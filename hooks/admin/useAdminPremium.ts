import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/hooks/service-request/supabaseClient";

export interface AdminServiceRequest {
  id: string;
  serviceType: "appraisal" | "purchase";
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  contactPhone: string;
  address: string;
  addressDetail?: string;
  description: string;
  scheduledDate?: string;
  estimatedValue?: number;
  finalOffer?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  userName?: string; // 사용자 이름 (조인해서 가져올 예정)
  photos?: Array<{
    id: string;
    photo_url: string;
    photo_order: number;
    is_representative: boolean;
    created_at: string;
  }>;
}

export interface PremiumStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalValue: number; // 총 거래액
}

/**
 * 관리자용 모든 서비스 요청 조회
 */
export async function getAllServiceRequests(): Promise<AdminServiceRequest[]> {
  try {
    // 먼저 조인 없이 서비스 요청만 조회
    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("서비스 요청 목록 조회 실패:", error);
      return [];
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

    return (data || []).map((item: any) => ({
      id: item.id,
      serviceType: item.service_type,
      status: item.status,
      contactPhone: item.contact_phone,
      address: item.address,
      addressDetail: item.address_detail,
      description: item.description,
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
    }));
  } catch (error) {
    console.error("서비스 요청 조회 중 오류:", error);
    return [];
  }
}

/**
 * 프리미엄 서비스 통계 조회
 */
export async function getPremiumStats(): Promise<PremiumStats> {
  try {
    const { data, error } = await supabase
      .from("service_requests")
      .select("status, final_offer");

    if (error) {
      console.error("프리미엄 통계 조회 실패:", error);
      return {
        total: 0,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        totalValue: 0,
      };
    }

    const stats = (data || []).reduce(
      (acc, item) => {
        acc.total++;
        switch (item.status) {
          case "pending":
            acc.pending++;
            break;
          case "assigned":
            acc.assigned++;
            break;
          case "in_progress":
            acc.inProgress++;
            break;
          case "completed":
            acc.completed++;
            if (item.final_offer) {
              acc.totalValue += item.final_offer;
            }
            break;
          case "cancelled":
            acc.cancelled++;
            break;
        }
        return acc;
      },
      {
        total: 0,
        pending: 0,
        assigned: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        totalValue: 0,
      }
    );

    return stats;
  } catch (error) {
    console.error("프리미엄 통계 조회 중 오류:", error);
    return {
      total: 0,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalValue: 0,
    };
  }
}

/**
 * 서비스 요청 상태 변경
 */
export async function updateServiceRequestStatus(
  requestId: string,
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled",
  finalOffer?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // 완료 상태일 때 final_offer와 completed_at 추가
    if (status === "completed") {
      if (finalOffer) {
        updateData.final_offer = finalOffer;
      }
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("service_requests")
      .update(updateData)
      .eq("id", requestId);

    if (error) {
      console.error("서비스 요청 상태 변경 실패:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("서비스 요청 상태 변경 중 오류:", error);
    return { success: false, error: "알 수 없는 오류가 발생했습니다." };
  }
}

/**
 * 관리자용 모든 서비스 요청 훅
 */
export const useAdminServiceRequests = () => {
  return useQuery({
    queryKey: ["admin", "service-requests"],
    queryFn: getAllServiceRequests,
    refetchInterval: false, // 자동 갱신 비활성화 (배터리 최적화)
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true, // 화면 포커스 시에만 갱신
  });
};

/**
 * 프리미엄 통계 훅
 */
export const usePremiumStats = () => {
  return useQuery({
    queryKey: ["admin", "premium-stats"],
    queryFn: getPremiumStats,
    refetchInterval: false, // 자동 갱신 비활성화 (배터리 최적화)
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true, // 화면 포커스 시에만 갱신
  });
};

/**
 * 서비스 요청 상태 변경 훅
 */
export const useUpdateServiceRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      status,
      finalOffer,
    }: {
      requestId: string;
      status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled";
      finalOffer?: number;
    }) => updateServiceRequestStatus(requestId, status, finalOffer),
    onSuccess: () => {
      // 관련 쿼리 무효화하여 데이터 갱신
      queryClient.invalidateQueries({
        queryKey: ["admin", "service-requests"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "premium-stats"] });
    },
  });
};
