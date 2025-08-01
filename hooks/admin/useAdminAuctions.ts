import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/auctions/supabaseClient";

export interface AuctionStats {
  total: number;
  active: number;
  ending: number;
  ended: number;
  cancelled: number;
  totalValue: number; // 총 거래액
  todayNew: number; // 오늘 신규 등록
  thisMonthValue: number; // 이번달 거래액
}

export interface CategoryStats {
  scrap: number;
  machinery: number;
  materials: number;
  demolition: number;
}

export interface AdminAuctionItem {
  id: string;
  title: string;
  auctionCategory: string;
  status: string;
  currentBid: number;
  startingPrice: number;
  bidderCount: number;
  endTime: string;
  createdAt: string;
  userName?: string;
}

/**
 * 경매 통계 조회
 */
export async function getAuctionStats(): Promise<AuctionStats> {
  try {
    const { data, error } = await supabase
      .from("auctions")
      .select("status, current_bid, created_at, end_time");

    if (error) {
      console.error("경매 통계 조회 실패:", error);
      return {
        total: 0,
        active: 0,
        ending: 0,
        ended: 0,
        cancelled: 0,
        totalValue: 0,
        todayNew: 0,
        thisMonthValue: 0,
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const twentyFourHoursFromNow = new Date(
      now.getTime() + 24 * 60 * 60 * 1000
    );

    const stats = (data || []).reduce(
      (acc, auction) => {
        acc.total++;

        // 상태별 통계
        if (auction.status === "active") {
          const endTime = new Date(auction.end_time);
          if (endTime <= twentyFourHoursFromNow) {
            acc.ending++;
          } else {
            acc.active++;
          }
        } else if (auction.status === "ended") {
          acc.ended++;
          // 종료된 경매의 거래액 누적
          if (auction.current_bid) {
            acc.totalValue += auction.current_bid;

            // 이번달 거래액
            const endTime = new Date(auction.end_time);
            if (endTime >= thisMonth) {
              acc.thisMonthValue += auction.current_bid;
            }
          }
        } else if (auction.status === "cancelled") {
          acc.cancelled++;
        }

        // 오늘 신규 등록
        const createdAt = new Date(auction.created_at);
        if (createdAt >= today) {
          acc.todayNew++;
        }

        return acc;
      },
      {
        total: 0,
        active: 0,
        ending: 0,
        ended: 0,
        cancelled: 0,
        totalValue: 0,
        todayNew: 0,
        thisMonthValue: 0,
      }
    );

    return stats;
  } catch (error) {
    console.error("경매 통계 조회 중 오류:", error);
    return {
      total: 0,
      active: 0,
      ending: 0,
      ended: 0,
      cancelled: 0,
      totalValue: 0,
      todayNew: 0,
      thisMonthValue: 0,
    };
  }
}

/**
 * 카테고리별 통계 조회
 */
export async function getCategoryStats(): Promise<CategoryStats> {
  try {
    const { data, error } = await supabase
      .from("auctions")
      .select("auction_category");

    if (error) {
      console.error("카테고리 통계 조회 실패:", error);
      return {
        scrap: 0,
        machinery: 0,
        materials: 0,
        demolition: 0,
      };
    }

    const stats = (data || []).reduce(
      (acc, auction) => {
        switch (auction.auction_category) {
          case "scrap":
            acc.scrap++;
            break;
          case "machinery":
            acc.machinery++;
            break;
          case "materials":
            acc.materials++;
            break;
          case "demolition":
            acc.demolition++;
            break;
        }
        return acc;
      },
      {
        scrap: 0,
        machinery: 0,
        materials: 0,
        demolition: 0,
      }
    );

    return stats;
  } catch (error) {
    console.error("카테고리 통계 조회 중 오류:", error);
    return {
      scrap: 0,
      machinery: 0,
      materials: 0,
      demolition: 0,
    };
  }
}

/**
 * 최근 경매 목록 조회 (관리자용)
 */
export async function getRecentAuctions(
  limit = 10
): Promise<AdminAuctionItem[]> {
  try {
    const { data, error } = await supabase
      .from("auction_list_view")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("최근 경매 목록 조회 실패:", error);
      return [];
    }

    return (data || []).map((auction: any) => ({
      id: auction.id,
      title: auction.title,
      auctionCategory: auction.auction_category,
      status: auction.status,
      currentBid: auction.current_bid || 0,
      startingPrice: auction.starting_price || 0,
      bidderCount: auction.bidder_count || 0,
      endTime: auction.end_time,
      createdAt: auction.created_at,
      userName: "사용자", // 조인 정보가 있다면 사용
    }));
  } catch (error) {
    console.error("최근 경매 목록 조회 중 오류:", error);
    return [];
  }
}

/**
 * 경매 통계 훅
 */
export const useAuctionStats = () => {
  return useQuery({
    queryKey: ["admin", "auction-stats"],
    queryFn: getAuctionStats,
    refetchInterval: 60 * 1000, // 1분마다 갱신
    staleTime: 30 * 1000, // 30초
  });
};

/**
 * 카테고리 통계 훅
 */
export const useCategoryStats = () => {
  return useQuery({
    queryKey: ["admin", "category-stats"],
    queryFn: getCategoryStats,
    refetchInterval: 60 * 1000, // 1분마다 갱신
    staleTime: 30 * 1000, // 30초
  });
};

/**
 * 최근 경매 목록 훅
 */
export const useRecentAuctions = (limit = 10) => {
  return useQuery({
    queryKey: ["admin", "recent-auctions", limit],
    queryFn: () => getRecentAuctions(limit),
    refetchInterval: 60 * 1000, // 1분마다 갱신
    staleTime: 30 * 1000, // 30초
  });
};
