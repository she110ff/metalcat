import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/auth/api";

// 입찰자 상세 정보 타입
export interface BidderDetail {
  id: string;
  name: string;
  phoneNumber: string;
  address: string;
  addressDetail?: string;
  // 입찰 정보
  bidAmount: number;
  bidTime: string;
  isTopBid: boolean;
}

// 경매 상세 정보 (등록자 + 입찰자들)
export interface AuctionDetailInfo {
  // 경매 기본 정보
  id: string;
  title: string;
  description?: string;
  auctionCategory: string;
  status: string;
  startingPrice: number;
  currentBid: number;
  bidderCount: number;
  endTime: string;
  createdAt: string;

  // 등록자 정보
  seller: {
    id: string;
    name: string;
    phoneNumber: string;
    address?: any;
  };

  // 입찰자 정보
  bidders: BidderDetail[];
}

/**
 * 입찰자들의 상세 정보 조회
 */
export async function getBiddersDetails(
  userIds: string[]
): Promise<BidderDetail[]> {
  try {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    console.log("🔍 [Bidder Details] 입찰자 상세 정보 조회:", userIds);

    const { data, error } = await supabase
      .from("users")
      .select("id, name, phone_number, address, address_detail")
      .in("id", userIds);

    if (error) {
      console.error("입찰자 상세 정보 조회 실패:", error);
      throw error;
    }

    const bidderDetails: BidderDetail[] = (data || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      phoneNumber: user.phone_number,
      address: user.address,
      addressDetail: user.address_detail,
      // 입찰 정보는 별도로 설정됨
      bidAmount: 0,
      bidTime: "",
      isTopBid: false,
    }));

    console.log(
      "✅ [Bidder Details] 입찰자 상세 정보 조회 성공:",
      bidderDetails.length
    );
    return bidderDetails;
  } catch (error) {
    console.error("입찰자 상세 정보 조회 중 오류:", error);
    throw error;
  }
}

/**
 * 경매 상세 정보 조회 (등록자 + 입찰자 정보 포함)
 */
export async function getAuctionDetailInfo(
  auctionId: string
): Promise<AuctionDetailInfo | null> {
  try {
    console.log("🔍 [Auction Detail] 경매 상세 정보 조회:", auctionId);

    // 경매 기본 정보 조회 (auction_list_view 사용)
    const { data: auction, error: auctionError } = await supabase
      .from("auction_list_view")
      .select("*")
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) {
      console.error("경매 정보 조회 실패:", auctionError);
      return null;
    }

    // 입찰자 정보 추출
    const auctionBids = auction.auction_bids || [];
    const bidderIds = auctionBids.map((bid: any) => bid.user_id);

    // 입찰자 상세 정보 조회
    let bidders: BidderDetail[] = [];
    if (bidderIds.length > 0) {
      const bidderDetails = await getBiddersDetails(bidderIds);

      // 입찰 정보와 사용자 정보 결합
      bidders = auctionBids.map((bid: any) => {
        const userDetail = bidderDetails.find(
          (detail) => detail.id === bid.user_id
        );
        return {
          id: bid.user_id,
          name: userDetail?.name || bid.user_name || "알 수 없음",
          phoneNumber: userDetail?.phoneNumber || "정보 없음",
          address: userDetail?.address || "정보 없음",
          addressDetail: userDetail?.addressDetail,
          bidAmount: bid.amount,
          bidTime: bid.bid_time || bid.created_at,
          isTopBid: bid.is_top_bid,
        };
      });
    }

    const auctionDetailInfo: AuctionDetailInfo = {
      id: auction.id,
      title: auction.title,
      description: auction.description,
      auctionCategory: auction.auction_category,
      status: auction.status,
      startingPrice: auction.starting_price || 0,
      currentBid: auction.current_bid || 0,
      bidderCount: auction.bidder_count || 0,
      endTime: auction.end_time,
      createdAt: auction.created_at,
      seller: {
        id: auction.user_id,
        name: auction.seller_name || "알 수 없음",
        phoneNumber: auction.seller_phone || "정보 없음",
        address: auction.address_info,
      },
      bidders: bidders.sort((a, b) => b.bidAmount - a.bidAmount), // 높은 입찰가 순으로 정렬
    };

    console.log("✅ [Auction Detail] 경매 상세 정보 조회 성공:", {
      auctionId,
      title: auctionDetailInfo.title,
      bidderCount: auctionDetailInfo.bidders.length,
    });

    return auctionDetailInfo;
  } catch (error) {
    console.error("경매 상세 정보 조회 중 오류:", error);
    throw error;
  }
}

/**
 * 경매 상세 정보 조회 훅
 */
export const useAuctionDetailInfo = (auctionId: string) => {
  return useQuery({
    queryKey: ["admin", "auction-detail", auctionId],
    queryFn: () => getAuctionDetailInfo(auctionId),
    enabled: !!auctionId,
    staleTime: 2 * 60 * 1000, // 2분
    refetchOnWindowFocus: false,
  });
};
