import { useQuery } from "@tanstack/react-query";
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
    const { data, error } = await supabase
      .from("service_requests")
      .select(
        `
        *,
        users!inner(name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("서비스 요청 목록 조회 실패:", error);
      return [];
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
      userName: item.users?.name || "알 수 없음",
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
