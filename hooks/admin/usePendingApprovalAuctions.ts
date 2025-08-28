import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/auctions/supabaseClient";

export interface PendingApprovalAuction {
  id: string;
  title: string;
  auction_category: string;
  seller_name: string;
  created_at: string;
  approval_status: string;
  waiting_minutes?: number;
}

/**
 * 승인 대기 경매 목록 조회
 */
export async function getPendingApprovalAuctions(): Promise<
  PendingApprovalAuction[]
> {
  try {
    const { data, error } = await supabase
      .from("auction_list_view")
      .select(
        "id, title, auction_category, seller_name, created_at, approval_status"
      )
      .eq("approval_status", "pending_approval")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("승인 대기 경매 목록 조회 실패:", error);
      return [];
    }

    return (data || []).map((auction: any) => ({
      id: auction.id,
      title: auction.title,
      auction_category: auction.auction_category,
      seller_name: auction.seller_name || "Unknown",
      created_at: auction.created_at,
      approval_status: auction.approval_status,
      waiting_minutes: Math.floor(
        (Date.now() - new Date(auction.created_at).getTime()) / (1000 * 60)
      ),
    }));
  } catch (error) {
    console.error("승인 대기 경매 목록 조회 중 오류:", error);
    return [];
  }
}

/**
 * 승인 대기 경매 목록 훅
 */
export const usePendingApprovalAuctions = () => {
  return useQuery({
    queryKey: ["admin", "pending-approval-auctions"],
    queryFn: getPendingApprovalAuctions,
    refetchInterval: 30000, // 30초마다 자동 갱신
    staleTime: 10 * 1000, // 10초
    refetchOnWindowFocus: true,
  });
};

/**
 * 승인 대기 통계 조회
 */
export async function getPendingApprovalStats() {
  try {
    const { data, error } = await supabase.rpc("get_approval_stats");

    if (error) {
      console.error("승인 대기 통계 조회 실패:", error);
      return {
        totalPending: 0,
        autoApprovalSoon: 0,
        todayApproved: 0,
        todayHidden: 0,
        todayRejected: 0,
      };
    }

    const stats = data && data.length > 0 ? data[0] : {};
    return {
      totalPending: stats.total_pending || 0,
      autoApprovalSoon: stats.auto_approval_soon || 0,
      todayApproved: stats.today_approved || 0,
      todayHidden: stats.today_hidden || 0,
      todayRejected: stats.today_rejected || 0,
    };
  } catch (error) {
    console.error("승인 대기 통계 조회 중 오류:", error);
    return {
      totalPending: 0,
      autoApprovalSoon: 0,
      todayApproved: 0,
      todayHidden: 0,
      todayRejected: 0,
    };
  }
}

/**
 * 승인 대기 통계 훅
 */
export const usePendingApprovalStats = () => {
  return useQuery({
    queryKey: ["admin", "pending-approval-stats"],
    queryFn: getPendingApprovalStats,
    refetchInterval: 30000, // 30초마다 자동 갱신
    staleTime: 10 * 1000, // 10초
    refetchOnWindowFocus: true,
  });
};
