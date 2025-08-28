import { useState, useEffect } from "react";
import { supabase } from "@/hooks/auth/api";

export interface HiddenAuction {
  auction_id: string;
  title: string;
  category: string;
  seller_name: string;
  approved_at: string;
  approved_by: string;
  hidden_reason: string | null;
  created_at: string;
  end_time: string;
  days_hidden: number;
}

export interface HiddenAuctionStats {
  total_hidden: number;
  hidden_today: number;
  hidden_this_week: number;
  hidden_this_month: number;
  avg_days_hidden: number;
}

export interface HiddenAuctionDetail {
  auction_id: string;
  title: string;
  description: string;
  category: string;
  seller_name: string;
  seller_phone: string;
  approved_at: string;
  approved_by: string;
  admin_name: string;
  hidden_reason: string | null;
  created_at: string;
  end_time: string;
  current_bid: number;
  bidder_count: number;
  view_count: number;
  photo_count: number;
}

export const useHiddenAuctions = () => {
  const [hiddenAuctions, setHiddenAuctions] = useState<HiddenAuction[]>([]);
  const [stats, setStats] = useState<HiddenAuctionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHiddenAuctions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🔍 히든 경매 조회 시작...");

      const { data, error: fetchError } = await supabase.rpc(
        "get_hidden_auctions"
      );

      console.log("📊 히든 경매 조회 결과:", { data, fetchError });
      console.log(
        "📊 데이터 타입:",
        typeof data,
        "배열인가?",
        Array.isArray(data)
      );
      console.log("📊 데이터 내용:", JSON.stringify(data, null, 2));

      if (fetchError) {
        console.error("❌ 히든 경매 조회 에러:", fetchError);
        throw fetchError;
      }

      const auctionData = data || [];
      console.log("✅ 히든 경매 데이터 설정:", auctionData.length, "개");
      console.log("✅ 설정할 데이터:", JSON.stringify(auctionData, null, 2));
      setHiddenAuctions(auctionData);
    } catch (err) {
      console.error("히든 경매 조회 오류:", err);
      const errorMessage =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";

      // 관리자 권한 오류인 경우 특별 처리
      if (errorMessage.includes("관리자 권한이 필요합니다")) {
        setError("관리자 권한이 필요합니다. 관리자로 로그인해주세요.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHiddenAuctionStats = async () => {
    try {
      console.log("📈 히든 경매 통계 조회 시작...");

      const { data, error: fetchError } = await supabase.rpc(
        "get_hidden_auction_stats"
      );

      console.log("📊 히든 경매 통계 결과:", { data, fetchError });

      if (fetchError) {
        console.error("❌ 히든 경매 통계 조회 에러:", fetchError);
        throw fetchError;
      }

      if (data && data.length > 0) {
        console.log("✅ 히든 경매 통계 설정:", data[0]);
        setStats(data[0]);
      }
    } catch (err) {
      console.error("히든 경매 통계 조회 오류:", err);
    }
  };

  const unhideAuction = async (
    auctionId: string,
    adminId: string,
    reason?: string
  ) => {
    try {
      const { data, error: unhideError } = await supabase.rpc(
        "unhide_auction",
        {
          p_auction_id: auctionId,
          p_admin_id: adminId,
          p_reason: reason || "관리자에 의한 히든 해제",
        }
      );

      if (unhideError) {
        throw unhideError;
      }

      // 성공 시 목록 새로고침
      await fetchHiddenAuctions();
      await fetchHiddenAuctionStats();
      return true;
    } catch (err) {
      console.error("히든 경매 해제 오류:", err);
      setError(
        err instanceof Error ? err.message : "히든 경매 해제에 실패했습니다."
      );
      return false;
    }
  };

  const getHiddenAuctionDetail = async (
    auctionId: string
  ): Promise<HiddenAuctionDetail | null> => {
    try {
      const { data, error: fetchError } = await supabase.rpc(
        "get_hidden_auction_detail",
        { p_auction_id: auctionId }
      );

      if (fetchError) {
        throw fetchError;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error("히든 경매 상세 조회 오류:", err);
      return null;
    }
  };

  useEffect(() => {
    fetchHiddenAuctions();
    fetchHiddenAuctionStats();
  }, []);

  return {
    hiddenAuctions,
    stats,
    isLoading,
    error,
    refetch: fetchHiddenAuctions,
    refetchStats: fetchHiddenAuctionStats,
    unhideAuction,
    getHiddenAuctionDetail,
  };
};

export default useHiddenAuctions;
