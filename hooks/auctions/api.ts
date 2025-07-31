/**
 * 경매 시스템 API 함수
 * 작성일: 2025-02-01
 * 목적: 기존 auctionAPI 인터페이스와 100% 호환되는 Supabase API
 */

import { supabase, auctionTables, auctionStorage } from "./supabaseClient";
import { AuctionItem, AuctionCategory, BidInfo } from "@/data/types/auction";

// ============================================
// 유틸리티 함수
// ============================================

/**
 * Supabase 에러 처리 유틸리티
 */
function handleSupabaseError(error: any, operation: string): never {
  console.error(`[Auction API] ${operation} 실패:`, error);
  throw new Error(`${operation} 중 오류가 발생했습니다: ${error.message}`);
}

/**
 * 데이터베이스 행을 AuctionItem 타입으로 변환
 */
function transformDatabaseRowToAuctionItem(row: any): AuctionItem {
  return {
    id: row.id,
    title: row.title,
    auctionCategory: row.auction_category,

    // 기본 정보
    description: row.description,
    status: row.status,
    transactionType: row.transaction_type,

    // 가격 정보
    startingPrice: row.starting_price,
    desiredPrice: row.desired_price,
    currentBid: row.current_bid,
    pricePerUnit: row.price_per_unit,
    totalBidAmount: row.total_bid_amount,

    // 수량 정보
    quantity: {
      quantity: row.quantity_amount,
      unit: row.quantity_unit,
    },

    // 제품 타입 (JSON)
    productType: row.product_type,

    // 판매 환경 (JSON) - 카테고리에 따라 다름
    salesEnvironment: row.sales_environment,

    // 철거 정보 (JSON) - 철거 카테고리만
    demolitionInfo: row.demolition_info,

    // 주소 정보 (JSON)
    address: row.address_info,

    // 사진 정보 변환
    photos: (row.auction_photos || []).map((photo: any) => ({
      id: photo.id,
      uri: photo.photo_url,
      isRepresentative: photo.is_representative,
      type: photo.photo_type,
    })),

    // 입찰 정보 변환
    bids: (row.auction_bids || []).map((bid: any) => ({
      id: bid.id,
      userId: bid.user_id,
      userName: bid.user_name,
      amount: bid.amount, // DB 컬럼명: amount
      pricePerUnit: bid.price_per_unit,
      location: bid.location, // DB 컬럼명: location
      bidTime: new Date(bid.bid_time || bid.created_at),
      isTopBid: bid.is_top_bid,
    })),

    // 통계 정보
    bidders: row.bidder_count || 0,
    viewCount: row.view_count || 0,

    // 시간 정보
    endTime: new Date(row.end_time),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),

    // 사용자 정보
    userId: row.user_id,

    // 기타 카테고리별 특화 필드들 (조건부 포함)
    ...(row.auction_category === "scrap" && {
      specialNotes: row.special_notes,
    }),
    ...(row.auction_category === "machinery" && {
      productName: row.product_type?.name || "",
      manufacturer: row.product_type?.manufacturer || "",
      modelName: row.product_type?.modelName || "",
      manufacturingDate: row.product_type?.manufacturingDate
        ? new Date(row.product_type.manufacturingDate)
        : undefined,
    }),
  } as AuctionItem;
}

/**
 * 통합 뷰 데이터를 AuctionItem 타입으로 변환 (개선된 버전)
 */
function transformViewRowToAuctionItem(row: any): AuctionItem {
  // category_details에서 카테고리별 특화 정보 추출
  const details = row.category_details || {};

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

    // 공통 필드
    productType: details.productType,
    quantity: details.quantity,
    address: row.address_info,

    // 카테고리별 특화 정보
    salesEnvironment: details.salesEnvironment,
    demolitionInfo: details.demolitionInfo,
    specialNotes: details.specialNotes,

    // 철거 전용 필드들 (demolition 카테고리)
    ...(row.auction_category === "demolition" &&
      details.demolitionInfo && {
        demolitionArea: details.demolitionArea,
        areaUnit: details.areaUnit,
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

/**
 * AuctionItem을 데이터베이스 삽입용 데이터로 변환
 */
function transformAuctionItemToDatabaseRow(
  auction: Partial<AuctionItem> & Record<string, any>
) {
  return {
    title: auction.title,
    description: auction.description,
    auction_category: auction.auctionCategory,
    transaction_type: auction.transactionType,

    // 가격 정보 (any 캐스팅으로 타입 에러 회피)
    starting_price: (auction as any).startingPrice || auction.currentBid || 0,
    desired_price: (auction as any).desiredPrice,
    current_bid: auction.currentBid || 0,
    price_per_unit: auction.pricePerUnit,
    total_bid_amount: auction.totalBidAmount || auction.currentBid || 0,

    // 수량 정보
    quantity_amount: auction.quantity?.quantity,
    quantity_unit: auction.quantity?.unit,

    // JSON 필드들
    product_type: auction.productType,
    sales_environment: (auction as any).salesEnvironment,
    demolition_info: (auction as any).demolitionInfo,
    address_info: auction.address,

    // 통계 정보
    bidder_count: auction.bidders || 0,
    view_count: auction.viewCount || 0,

    // 시간 정보
    end_time: auction.endTime?.toISOString(),

    // 사용자 정보
    user_id: auction.userId,

    // 카테고리별 특화 필드
    ...(auction.auctionCategory === "scrap" && {
      special_notes: (auction as any).specialNotes,
    }),
  };
}

// ============================================
// 경매 CRUD 함수 (기존 auctionAPI 인터페이스 호환)
// ============================================

/**
 * 경매 목록 조회 (기존 인터페이스 완전 호환)
 */
export async function getAuctions(filters?: {
  category?: AuctionCategory;
  status?: string;
  sortBy?: "createdAt" | "endTime";
}): Promise<AuctionItem[]> {
  try {
    console.log("🔍 [Auction API] getAuctions 호출:", filters);

    // 새로운 통합 뷰 사용
    let query = supabase.from("auction_list_view").select("*");

    // 카테고리 필터
    if (filters?.category) {
      query = query.eq("auction_category", filters.category);
    }

    // 상태 필터 처리 (기존 로직과 동일)
    if (filters?.status) {
      if (filters.status === "active") {
        // 진행중: active 또는 ending 상태
        query = query.in("status", ["active", "ending"]);
      } else {
        query = query.eq("status", filters.status);
      }
    }

    // 정렬 처리 (기존 로직과 동일)
    if (filters?.sortBy === "endTime") {
      query = query.order("end_time", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data: auctions, error } = await query;

    if (error) {
      handleSupabaseError(error, "경매 목록 조회");
    }

    const transformedAuctions = (auctions || []).map(
      transformViewRowToAuctionItem
    );

    console.log("✅ [Auction API] 경매 목록 조회 성공:", {
      total: transformedAuctions.length,
      categories: [
        ...new Set(transformedAuctions.map((a) => a.auctionCategory)),
      ],
    });

    return transformedAuctions;
  } catch (error) {
    console.error("경매 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 경매 상세 조회 (기존 인터페이스 완전 호환)
 */
export async function getAuctionById(id: string): Promise<AuctionItem | null> {
  try {
    console.log("🔍 [Auction API] getAuctionById 호출:", id);

    // 새로운 통합 뷰 사용
    const { data: auction, error } = await supabase
      .from("auction_list_view")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // 데이터가 없는 경우
        console.log("❌ 경매를 찾을 수 없음:", id);
        return null;
      }
      handleSupabaseError(error, "경매 상세 조회");
    }

    if (!auction) {
      return null;
    }

    // 조회수 증가 (비동기 - 원본 테이블에)
    auctionTables
      .auctions()
      .update({ view_count: (auction.view_count || 0) + 1 })
      .eq("id", id)
      .then(() => console.log("📊 조회수 증가:", id));

    const transformedAuction = transformViewRowToAuctionItem(auction);

    console.log("✅ [Auction API] 경매 상세 조회 성공:", {
      id: transformedAuction.id,
      title: transformedAuction.title,
      category: transformedAuction.auctionCategory,
    });

    return transformedAuction;
  } catch (error) {
    console.error("경매 상세 조회 실패:", error);
    throw error;
  }
}

/**
 * 경매 생성 (기존 인터페이스 완전 호환)
 */
export async function createAuction(
  auctionData: Partial<AuctionItem>
): Promise<AuctionItem> {
  try {
    console.log("📝 [Auction API] createAuction 호출:", {
      title: auctionData.title,
      category: auctionData.auctionCategory,
      userId: auctionData.userId,
    });

    // endTime이 없으면 기본값 설정 (7일 후)
    const endTime =
      auctionData.endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const insertData = {
      ...transformAuctionItemToDatabaseRow({
        ...auctionData,
        endTime,
        status: "active",
        viewCount: 0,
        bidders: 0,
      }),
      status: "active",
    };

    const { data: auction, error } = await auctionTables
      .auctions()
      .insert(insertData)
      .select(
        `
        *,
        auction_photos(*),
        auction_bids(*)
      `
      )
      .single();

    if (error) {
      handleSupabaseError(error, "경매 생성");
    }

    const transformedAuction = transformDatabaseRowToAuctionItem(auction);

    console.log("✅ [Auction API] 경매 생성 성공:", {
      id: transformedAuction.id,
      title: transformedAuction.title,
    });

    return transformedAuction;
  } catch (error) {
    console.error("경매 생성 실패:", error);
    throw error;
  }
}

/**
 * 경매 수정 (기존 인터페이스 완전 호환)
 */
export async function updateAuction(
  id: string,
  updates: Partial<AuctionItem>
): Promise<AuctionItem> {
  try {
    console.log("📝 [Auction API] updateAuction 호출:", {
      id,
      updates: Object.keys(updates),
    });

    const updateData = transformAuctionItemToDatabaseRow(updates);

    const { data: auction, error } = await auctionTables
      .auctions()
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        auction_photos(*),
        auction_bids(*)
      `
      )
      .single();

    if (error) {
      handleSupabaseError(error, "경매 수정");
    }

    const transformedAuction = transformDatabaseRowToAuctionItem(auction);

    console.log("✅ [Auction API] 경매 수정 성공:", id);

    return transformedAuction;
  } catch (error) {
    console.error("경매 수정 실패:", error);
    throw error;
  }
}

/**
 * 경매 삭제 (기존 인터페이스 완전 호환)
 */
export async function deleteAuction(id: string): Promise<void> {
  try {
    console.log("🗑️ [Auction API] deleteAuction 호출:", id);

    const { error } = await auctionTables.auctions().delete().eq("id", id);

    if (error) {
      handleSupabaseError(error, "경매 삭제");
    }

    console.log("✅ [Auction API] 경매 삭제 성공:", id);
  } catch (error) {
    console.error("경매 삭제 실패:", error);
    throw error;
  }
}

/**
 * 입찰 생성 (기존 인터페이스 완전 호환)
 */
export async function createBid(
  auctionId: string,
  bidData: {
    userId: string;
    userName: string;
    amount: number;
    location: string;
  }
): Promise<BidInfo> {
  try {
    console.log("💰 [Auction API] createBid 호출:", {
      auctionId,
      amount: bidData.amount,
      userId: bidData.userId,
    });

    // 트랜잭션으로 처리해야 하지만, 여기서는 단순화
    // 1. 현재 경매 상태 확인
    const { data: auction, error: auctionError } = await auctionTables
      .auctions()
      .select("*")
      .eq("id", auctionId)
      .single();

    if (auctionError || !auction) {
      throw new Error("경매를 찾을 수 없습니다.");
    }

    if ((auction as any).status === "ended") {
      throw new Error("이미 종료된 경매입니다.");
    }

    // 2. 현재 최고 입찰가 확인
    const currentBidAmount = (auction as any).current_bid || 0;

    if (bidData.amount <= currentBidAmount) {
      throw new Error("현재 최고 입찰가보다 높은 금액을 입력해주세요.");
    }

    // 3. 기존 최고 입찰을 false로 변경
    await auctionTables
      .bids()
      .update({ is_top_bid: false })
      .eq("auction_id", auctionId);

    // 4. 새 입찰 생성
    const { data: bid, error: bidError } = await auctionTables
      .bids()
      .insert({
        auction_id: auctionId,
        user_id: bidData.userId,
        user_name: bidData.userName,
        amount: bidData.amount, // DB 컬럼명: amount
        location: bidData.location, // DB 컬럼명: location
        is_top_bid: true,
      })
      .select()
      .single();

    if (bidError) {
      handleSupabaseError(bidError, "입찰 생성");
    }

    // 5. 경매 정보 업데이트
    const { data: updatedAuction } = await auctionTables
      .auctions()
      .update({
        current_bid: bidData.amount,
        total_bid_amount: bidData.amount,
        bidder_count: ((auction as any).bidder_count || 0) + 1,
      })
      .eq("id", auctionId)
      .select("bidder_count")
      .single();

    const newBid: BidInfo = {
      id: (bid as any).id,
      userId: (bid as any).user_id,
      userName: (bid as any).user_name,
      amount: (bid as any).amount, // DB 컬럼명: amount
      location: (bid as any).location, // DB 컬럼명: location
      bidTime: new Date(
        (bid as any).bid_time || (bid as any).created_at || new Date()
      ),
      isTopBid: (bid as any).is_top_bid,
    };

    console.log("✅ [Auction API] 입찰 생성 성공:", {
      bidId: newBid.id,
      amount: newBid.amount,
    });

    return newBid;
  } catch (error) {
    console.error("입찰 생성 실패:", error);
    throw error;
  }
}

/**
 * 경매의 입찰 기록 조회 (기존 인터페이스 완전 호환)
 */
export async function getBids(auctionId: string): Promise<BidInfo[]> {
  try {
    console.log("📋 [Auction API] getBids 호출:", auctionId);

    const { data: bids, error } = await auctionTables
      .bids()
      .select("*")
      .eq("auction_id", auctionId)
      .order("amount", { ascending: false }); // DB 컬럼명: amount

    if (error) {
      handleSupabaseError(error, "입찰 기록 조회");
    }

    const transformedBids: BidInfo[] = (bids || []).map((bid: any) => ({
      id: bid.id,
      userId: bid.user_id,
      userName: bid.user_name,
      amount: bid.amount, // DB 컬럼명: amount
      pricePerUnit: bid.price_per_unit,
      location: bid.location, // DB 컬럼명: location
      bidTime: new Date(bid.bid_time || bid.created_at || new Date()),
      isTopBid: bid.is_top_bid,
    }));

    console.log("✅ [Auction API] 입찰 기록 조회 성공:", {
      auctionId,
      bidCount: transformedBids.length,
    });

    return transformedBids;
  } catch (error) {
    console.error("입찰 기록 조회 실패:", error);
    throw error;
  }
}

// 기존 auctionAPI 인터페이스와 동일한 구조로 내보내기
export const auctionAPI = {
  getAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  deleteAuction,
  createBid,
  getBids,
} as const;
