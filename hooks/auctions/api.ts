/**
 * 경매 시스템 API 함수
 * 작성일: 2025-02-01
 * 목적: 기존 auctionAPI 인터페이스와 100% 호환되는 Supabase API
 */

import { supabase, auctionTables, auctionStorage } from "./supabaseClient";
import { AuctionItem, AuctionCategory, BidInfo } from "@/data/types/auction";
import * as FileSystem from "expo-file-system";

// ============================================
// 이미지 업로드 유틸리티 함수
// ============================================

/**
 * 로컬 이미지를 Supabase Storage에 업로드하고 공개 URL 반환
 * 프리미엄 서비스의 안정적인 업로드 방식 사용
 */
async function uploadImageToStorage(
  imageUri: string,
  auctionId: string,
  photoIndex: number
): Promise<string | null> {
  try {
    // 로컬 URI가 아닌 경우 (이미 외부 URL인 경우) 그대로 반환
    if (imageUri.startsWith("http://") || imageUri.startsWith("https://")) {
      console.log(
        "📤 외부 URL이므로 업로드 스킵:",
        imageUri.substring(0, 50) + "..."
      );
      return imageUri;
    }

    console.log("📸 경매 사진 업로드 시작:", {
      auctionId,
      photoIndex,
      fileUri: imageUri.substring(0, 50) + "...",
    });

    // 파일 확장자 추출 (기본값: jpg)
    const ext = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${auctionId}/photo_${photoIndex}_${Date.now()}.${ext}`;

    // 확장자에 따른 MIME 타입 매핑
    const getMimeType = (extension: string): string => {
      switch (extension) {
        case "png":
          return "image/png";
        case "jpg":
        case "jpeg":
          return "image/jpeg";
        case "webp":
          return "image/webp";
        case "gif":
          return "image/gif";
        default:
          return "image/jpeg";
      }
    };

    const mimeType = getMimeType(ext);
    console.log("📸 파일 정보:", { ext, fileName, mimeType });

    let fileData;

    try {
      console.log("📸 expo-file-system으로 파일 읽기 시도...");

      // 파일을 base64로 읽기 (프리미엄 서비스와 동일한 방식)
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // base64를 decode해서 ArrayBuffer로 변환 (프리미엄 서비스와 동일)
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 프리미엄 서비스와 동일: ArrayBuffer 사용
      fileData = bytes.buffer;

      console.log("📸 파일 데이터 읽기 성공:", {
        originalSize: base64.length,
        bufferSize: fileData.byteLength,
        type: "ArrayBuffer from base64",
      });
    } catch (fileSystemError) {
      console.error(
        "📸 FileSystem 읽기 실패, Blob 방식으로 시도:",
        fileSystemError
      );

      try {
        // fetch로 Blob 생성 시도 (두 번째 fallback)
        const response = await fetch(imageUri);
        if (response.ok) {
          fileData = await response.blob();
          console.log("📸 Blob 생성 성공:", {
            size: fileData.size,
            type: fileData.type || "blob",
          });
        } else {
          throw new Error(`Fetch 실패: ${response.status}`);
        }
      } catch (fetchError) {
        console.error(
          "📸 Blob 생성도 실패, FormData 방식으로 최종 시도:",
          fetchError
        );

        // 최후의 수단: FormData 방식 (세 번째 fallback)
        fileData = {
          uri: imageUri,
          type: mimeType,
          name: fileName,
        } as any;
      }
    }

    // Supabase Storage에 업로드 (옵션 단순화)
    console.log("📸 Storage 업로드 시작:", {
      fileName,
      mimeType,
      dataType: typeof fileData,
    });

    const { data, error: uploadError } = await auctionStorage
      .photos()
      .upload(fileName, fileData, {
        cacheControl: "3600",
        upsert: false,
        contentType: mimeType,
      });

    if (uploadError) {
      console.error("❌ 경매 사진 업로드 실패:", uploadError);
      throw uploadError;
    }

    console.log("📸 Storage 업로드 성공:", data);

    // 공개 URL 생성
    const { data: urlData } = auctionStorage.photos().getPublicUrl(fileName);

    console.log("📸 공개 URL 생성:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("❌ 경매 사진 업로드 중 오류:", error);
    console.log("⚠️ 업로드 실패, 원본 URI 반환 (로컬에서만 표시됨)");
    // 업로드 실패 시 원본 URI 반환 (로컬에서는 표시됨)
    return imageUri;
  }
}

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
 * 경매 생성 (카테고리별 테이블 구조 지원 - 기존 인터페이스 완전 호환)
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

    // 1. 공통 경매 데이터 구성
    // userId 검증 및 기본값 설정
    let validUserId = auctionData.userId;
    if (!validUserId || validUserId === "user_1") {
      validUserId = "550e8400-e29b-41d4-a716-446655440001"; // 기본 사용자 ID
      console.log("⚠️ [Auction API] 기본 사용자 ID 사용:", validUserId);
    }

    const commonAuctionData = {
      user_id: validUserId,
      title: auctionData.title || "",
      description: auctionData.description || "",
      auction_category: auctionData.auctionCategory || "scrap",
      transaction_type: (auctionData as any).transactionType || "normal",
      current_bid: auctionData.currentBid || 0,
      starting_price: (auctionData as any).startingPrice || 0,
      total_bid_amount: auctionData.totalBidAmount || 0,
      status: "active",
      end_time: endTime.toISOString(),
      bidder_count: auctionData.bidders || 0,
      view_count: auctionData.viewCount || 0,
      address_info: (auctionData as any).address || {},
    };

    // 2. 공통 경매 테이블에 먼저 저장
    const { data: auction, error: auctionError } = await supabase
      .from("auctions")
      .insert(commonAuctionData)
      .select("id")
      .single();

    if (auctionError) {
      handleSupabaseError(auctionError, "공통 경매 데이터 생성");
    }

    const auctionId = auction.id;

    // 3. 카테고리별 특화 데이터 저장
    await saveCategory();

    // 4. 사진 업로드 및 데이터 저장
    if (auctionData.photos && auctionData.photos.length > 0) {
      console.log("📸 사진 업로드 시작:", auctionData.photos.length + "장");

      const uploadedPhotos = [];

      // 각 사진을 순차적으로 업로드
      for (let index = 0; index < auctionData.photos.length; index++) {
        const photo = auctionData.photos[index];

        try {
          // 이미지를 Supabase Storage에 업로드하고 공개 URL 받기
          const uploadedUrl = await uploadImageToStorage(
            photo.uri,
            auctionId,
            index
          );

          if (uploadedUrl) {
            uploadedPhotos.push({
              auction_id: auctionId,
              photo_url: uploadedUrl, // 업로드된 공개 URL 사용
              photo_type: photo.type || "full",
              photo_order: index,
              is_representative: photo.isRepresentative || false,
            });

            console.log(
              `✅ 사진 ${index + 1}/${auctionData.photos.length} 업로드 완료`
            );
          } else {
            console.warn(
              `⚠️ 사진 ${index + 1} 업로드 실패, 원본 URI 사용:`,
              photo.uri
            );
            // 업로드 실패 시 원본 URI 사용 (로컬에서는 표시됨)
            uploadedPhotos.push({
              auction_id: auctionId,
              photo_url: photo.uri,
              photo_type: photo.type || "full",
              photo_order: index,
              is_representative: photo.isRepresentative || false,
            });
          }
        } catch (uploadError) {
          console.error(`❌ 사진 ${index + 1} 업로드 중 오류:`, uploadError);
          // 오류 발생 시에도 원본 URI로 저장
          uploadedPhotos.push({
            auction_id: auctionId,
            photo_url: photo.uri,
            photo_type: photo.type || "full",
            photo_order: index,
            is_representative: photo.isRepresentative || false,
          });
        }
      }

      // 업로드된 사진 정보를 데이터베이스에 저장
      if (uploadedPhotos.length > 0) {
        const { error: photoError } = await supabase
          .from("auction_photos")
          .insert(uploadedPhotos);

        if (photoError) {
          console.warn("사진 메타데이터 저장 중 오류:", photoError);
        } else {
          console.log("✅ 모든 사진 메타데이터 저장 완료");
        }
      }
    }

    // 5. 생성된 경매 조회 (통합 뷰 사용)
    const { data: createdAuction, error: fetchError } = await supabase
      .from("auction_list_view")
      .select("*")
      .eq("id", auctionId)
      .single();

    if (fetchError) {
      handleSupabaseError(fetchError, "생성된 경매 조회");
    }

    const transformedAuction = transformViewRowToAuctionItem(createdAuction);

    console.log("✅ [Auction API] 경매 생성 성공:", {
      id: transformedAuction.id,
      title: transformedAuction.title,
      category: transformedAuction.auctionCategory,
    });

    return transformedAuction;

    // 카테고리별 특화 데이터 저장 함수
    async function saveCategory() {
      const category = auctionData.auctionCategory;

      switch (category) {
        case "scrap":
          await saveScrapSpecificData();
          break;
        case "machinery":
          await saveMachinerySpecificData();
          break;
        case "materials":
          await saveMaterialsSpecificData();
          break;
        case "demolition":
          await saveDemolitionSpecificData();
          break;
        default:
          throw new Error(`지원하지 않는 카테고리: ${category}`);
      }
    }

    // 고철 특화 데이터 저장
    async function saveScrapSpecificData() {
      const scrapData = {
        auction_id: auctionId,
        product_type: auctionData.productType || {},
        weight_kg: (auctionData as any).quantity?.quantity || 0,
        weight_unit: (auctionData as any).quantity?.unit || "kg",
        price_per_unit: (auctionData as any).pricePerUnit || 0,
        sales_environment: (auctionData as any).salesEnvironment || {},
        special_notes: (auctionData as any).specialNotes || "",
      };

      const { error } = await supabase.from("scrap_auctions").insert(scrapData);

      if (error) {
        handleSupabaseError(error, "고철 특화 데이터 저장");
      }
    }

    // 중고기계 특화 데이터 저장
    async function saveMachinerySpecificData() {
      const machineryData = {
        auction_id: auctionId,
        product_type: auctionData.productType || {},
        product_name: (auctionData as any).productName || "",
        manufacturer: (auctionData as any).manufacturer || "",
        model_name: (auctionData as any).modelName || "",
        manufacturing_date: (auctionData as any).manufacturingDate || null,
        quantity: (auctionData as any).quantity?.quantity || 1,
        quantity_unit: (auctionData as any).quantity?.unit || "대",
        desired_price: (auctionData as any).desiredPrice || 0,
        sales_environment: (auctionData as any).salesEnvironment || {},
      };

      const { error } = await supabase
        .from("machinery_auctions")
        .insert(machineryData);

      if (error) {
        handleSupabaseError(error, "중고기계 특화 데이터 저장");
      }
    }

    // 중고자재 특화 데이터 저장
    async function saveMaterialsSpecificData() {
      const materialsData = {
        auction_id: auctionId,
        product_type: auctionData.productType || {},
        quantity: (auctionData as any).quantity?.quantity || 1,
        quantity_unit: (auctionData as any).quantity?.unit || "개",
        desired_price: (auctionData as any).desiredPrice || 0,
        sales_environment: (auctionData as any).salesEnvironment || {},
      };

      const { error } = await supabase
        .from("materials_auctions")
        .insert(materialsData);

      if (error) {
        handleSupabaseError(error, "중고자재 특화 데이터 저장");
      }
    }

    // 철거 특화 데이터 저장
    async function saveDemolitionSpecificData() {
      const demolitionInfo = (auctionData as any).demolitionInfo || {};

      const demolitionData = {
        auction_id: auctionId,
        product_type: auctionData.productType || {},
        demolition_area: (auctionData as any).demolitionArea || 0,
        area_unit: (auctionData as any).areaUnit || "sqm",
        price_per_unit: (auctionData as any).pricePerUnit || 0,
        building_purpose: demolitionInfo.buildingPurpose || "residential",
        demolition_method: demolitionInfo.demolitionMethod || "full",
        structure_type: demolitionInfo.structureType || "masonry",
        waste_disposal: demolitionInfo.wasteDisposal || "self",
        floor_count: demolitionInfo.floorCount || 1,
      };

      const { error } = await supabase
        .from("demolition_auctions")
        .insert(demolitionData);

      if (error) {
        handleSupabaseError(error, "철거 특화 데이터 저장");
      }
    }
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
