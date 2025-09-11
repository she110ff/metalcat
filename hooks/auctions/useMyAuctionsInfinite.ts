import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/auth/api";
import { AuctionItem } from "@/data/types/auction";
import { useAuth } from "@/hooks/useAuth";

/**
 * 통합 뷰 데이터를 AuctionItem 타입으로 변환 (복사본)
 */
function transformViewRowToAuctionItem(row: any): AuctionItem {
  // category_details에서 카테고리별 특화 정보 추출
  const details = row.category_details || {};

  // address_info 검증 및 기본값 설정
  const addressInfo = row.address_info || {};
  const safeAddress = {
    postalCode: addressInfo.postalCode || "",
    addressType: addressInfo.addressType || "road",
    address: addressInfo.address || "",
    detailAddress: addressInfo.detailAddress || "",
  };

  // quantity 검증 및 기본값 설정
  const quantity = details.quantity || {};
  const safeQuantity = {
    quantity: quantity.quantity || 0,
    unit: quantity.unit || "개",
  };

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    auctionCategory: row.auction_category,
    transactionType: row.transaction_type,

    // 공통 가격 정보
    currentBid: row.current_bid,
    startingPrice: row.starting_price,
    totalBidAmount: row.total_bid_amount,
    pricePerUnit: details.pricePerUnit,

    // 가격 관련 (카테고리별)
    desiredPrice: details.desiredPrice,

    // 상태 정보
    status: row.status,
    endTime: new Date(row.end_time),
    bidders: row.bidder_count,
    viewCount: row.view_count,
    approvalStatus: row.approval_status,

    // 공통 필드 (안전하게 변환)
    productType: details.productType,
    quantity: safeQuantity,
    address: safeAddress,

    // 카테고리별 특화 정보
    salesEnvironment: details.salesEnvironment,
    demolitionInfo: details.demolitionInfo,
    specialNotes: details.specialNotes,

    // 철거 전용 필드들 (demolition 카테고리)
    ...(row.auction_category === "demolition" && {
      demolitionArea: details.demolitionArea || 0,
      areaUnit: details.areaUnit || "sqm",
    }),

    // 고철 전용 필드들 (scrap 카테고리)
    ...(row.auction_category === "scrap" && {
      pricePerUnit: details.pricePerUnit,
      weightKg: details.weightKg,
      weightUnit: details.weightUnit,
    }),

    // 중고자재 전용 필드들 (materials 카테고리)
    ...(row.auction_category === "materials" && {
      desiredPrice: details.desiredPrice,
    }),

    // 기계 전용 필드 (machinery 카테고리)
    ...(row.auction_category === "machinery" && {
      productName: details.productName,
      manufacturer: details.manufacturer,
      modelName: details.modelName,
      manufacturingDate: details.manufacturingDate
        ? new Date(details.manufacturingDate)
        : undefined,
      desiredPrice: details.desiredPrice,
    }),

    // 시간 정보
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at || row.created_at),
    userId: row.user_id,
    sellerName: row.seller_name,
    sellerPhone: row.seller_phone,

    // 입찰 정보 변환
    bids: (row.auction_bids || []).map((bid: any) => ({
      id: bid.id,
      userId: bid.user_id,
      userName: bid.user_name,
      amount: bid.amount,
      pricePerUnit: bid.price_per_unit,
      location: bid.location,
      bidTime: new Date(bid.bid_time || bid.created_at),
      isTopBid: bid.is_top_bid,
    })),

    // 사진 정보 변환
    photos: (row.auction_photos || []).map((photo: any) => ({
      id: photo.id,
      uri: photo.photo_url,
      isRepresentative: photo.is_representative,
      type: photo.photo_type,
    })),
  } as AuctionItem;
}

// 페이지네이션 응답 타입
interface MyAuctionPageResponse {
  data: AuctionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * 내 경매 목록 조회 (페이지네이션 지원)
 */
export async function getMyAuctionsWithPagination(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<MyAuctionPageResponse> {
  try {
    console.log("🔍 [My Auctions] 페이지네이션 조회:", { userId, page, limit });

    // 전체 개수 조회
    const { count, error: countError } = await supabase
      .from("auction_list_view")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("전체 내 경매 개수 조회 실패:", countError);
      throw countError;
    }

    const total = count || 0;

    // 페이지네이션된 데이터 조회
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from("auction_list_view")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }) // 추가 정렬 기준으로 일관성 보장
      .range(from, to);

    if (error) {
      console.error("내 경매 목록 조회 실패:", error);
      throw error;
    }

    const transformedData: AuctionItem[] = (data || []).map(
      transformViewRowToAuctionItem
    );

    const hasMore = from + limit < total;

    console.log("✅ [My Auctions] 페이지네이션 조회 성공:", {
      userId,
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
    console.error("내 경매 목록 조회 중 오류:", error);
    throw error;
  }
}

/**
 * 내 입찰 목록 조회 (페이지네이션 지원)
 */
export async function getMyBiddingsWithPagination(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<MyAuctionPageResponse> {
  try {
    console.log("🔍 [My Biddings] 페이지네이션 조회:", { userId, page, limit });

    // 사용자가 입찰한 경매들의 ID를 먼저 조회 (중복 제거)
    const { data: bidAuctionIds, error: bidError } = await supabase
      .from("auction_bids")
      .select("auction_id")
      .eq("user_id", userId);

    if (bidError) {
      console.error("내 입찰 목록 조회 실패:", bidError);
      throw bidError;
    }

    if (!bidAuctionIds || bidAuctionIds.length === 0) {
      console.log("✅ [My Biddings] 입찰한 경매가 없습니다.");
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          hasMore: false,
        },
      };
    }

    // 중복 제거
    const uniqueAuctionIds = [
      ...new Set(bidAuctionIds.map((bid) => bid.auction_id)),
    ];

    const total = uniqueAuctionIds.length;

    // 페이지네이션 적용
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const paginatedAuctionIds = uniqueAuctionIds.slice(from, from + limit);

    if (paginatedAuctionIds.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total,
          hasMore: false,
        },
      };
    }

    // 해당 경매들의 상세 정보 조회
    const { data: auctions, error } = await supabase
      .from("auction_list_view")
      .select("*")
      .in("id", paginatedAuctionIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("입찰한 경매 목록 조회 실패:", error);
      throw error;
    }

    const transformedData: AuctionItem[] = (auctions || []).map(
      transformViewRowToAuctionItem
    );

    const hasMore = from + limit < total;

    console.log("✅ [My Biddings] 페이지네이션 조회 성공:", {
      userId,
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
    console.error("내 입찰 목록 조회 중 오류:", error);
    throw error;
  }
}

/**
 * 내 경매 무한 스크롤 훅
 */
export const useMyAuctionsInfinite = (limit: number = 10) => {
  const { user, isLoggedIn } = useAuth();

  return useInfiniteQuery({
    queryKey: ["auctions", "my-infinite", user?.id, limit],
    queryFn: ({ pageParam = 1 }) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return getMyAuctionsWithPagination(user.id, pageParam, limit);
    },
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.hasMore ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: isLoggedIn && !!user?.id,
    refetchInterval: false, // 자동 갱신 비활성화 (배터리 최적화)
    staleTime: 30 * 1000, // 30초
    refetchOnWindowFocus: true, // 화면 포커스 시에만 갱신
    // 중복 방지를 위한 추가 설정
    structuralSharing: false, // 구조적 공유 비활성화로 중복 방지
  });
};

/**
 * 내 입찰 무한 스크롤 훅
 */
export const useMyBiddingsInfinite = (limit: number = 10) => {
  const { user, isLoggedIn } = useAuth();

  return useInfiniteQuery({
    queryKey: ["auctions", "my-biddings-infinite", user?.id, limit],
    queryFn: ({ pageParam = 1 }) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return getMyBiddingsWithPagination(user.id, pageParam, limit);
    },
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.hasMore ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: isLoggedIn && !!user?.id,
    refetchInterval: false, // 자동 갱신 비활성화 (배터리 최적화)
    staleTime: 30 * 1000, // 30초
    refetchOnWindowFocus: true, // 화면 포커스 시에만 갱신
    // 중복 방지를 위한 추가 설정
    structuralSharing: false, // 구조적 공유 비활성화로 중복 방지
  });
};
