import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/auth/api";

// 관리자용 경매 아이템 타입 (기존 AdminAuctionItem 확장)
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
  userName: string;
  // 추가 정보
  sellerName?: string;
  sellerPhone?: string;
  addressInfo?: any;
  auctionBids?: any[];
}

// 페이지네이션 응답 타입
interface AdminAuctionPageResponse {
  data: AdminAuctionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * 관리자용 경매 목록 조회 (페이지네이션 지원)
 */
export async function getAdminAuctionsWithPagination(
  page: number = 1,
  limit: number = 10
): Promise<AdminAuctionPageResponse> {
  try {
    console.log("🔍 [Admin Auctions] 페이지네이션 조회:", { page, limit });

    // 전체 개수 조회
    const { count, error: countError } = await supabase
      .from("auction_list_view")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("전체 경매 개수 조회 실패:", countError);
      throw countError;
    }

    const total = count || 0;

    // 페이지네이션된 데이터 조회
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from("auction_list_view")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }) // 추가 정렬 기준으로 일관성 보장
      .range(from, to);

    if (error) {
      console.error("관리자 경매 목록 조회 실패:", error);
      throw error;
    }

    const transformedData: AdminAuctionItem[] = (data || []).map(
      (auction: any) => ({
        id: auction.id,
        title: auction.title,
        auctionCategory: auction.auction_category,
        status: auction.status,
        currentBid: auction.current_bid || 0,
        startingPrice: auction.starting_price || 0,
        bidderCount: auction.bidder_count || 0,
        endTime: auction.end_time,
        createdAt: auction.created_at,
        userName: auction.seller_name || "사용자",
        sellerName: auction.seller_name,
        sellerPhone: auction.seller_phone,
        addressInfo: auction.address_info,
        auctionBids: auction.auction_bids || [],
      })
    );

    const hasMore = from + limit < total;

    console.log("✅ [Admin Auctions] 페이지네이션 조회 성공:", {
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
    console.error("관리자 경매 목록 조회 중 오류:", error);
    throw error;
  }
}

/**
 * 관리자용 경매 무한 스크롤 훅
 */
export const useAdminAuctionsInfinite = (limit: number = 10) => {
  return useInfiniteQuery({
    queryKey: ["admin", "auctions-infinite", limit],
    queryFn: ({ pageParam = 1 }) =>
      getAdminAuctionsWithPagination(pageParam, limit),
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
