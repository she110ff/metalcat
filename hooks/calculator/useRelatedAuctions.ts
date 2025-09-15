import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/auth/api";

export interface RelatedAuction {
  id: string;
  title: string;
  description: string;
  current_bid: number;
  starting_price: number;
  end_time: string;
  status: string;
  seller_name: string;
  address_info:
    | string
    | {
        address: string;
        postalCode: string;
        addressType: string;
        detailAddress: string;
      };
}

/**
 * metal_type을 기준으로 관련 경매 최고가 3개 조회
 * 계산기에서 선택한 계산 기준의 metal_type과 일치하는 경매들 중 최고가 순으로 조회
 */
export const useRelatedAuctionsByMetalType = (metalType: string) => {
  return useQuery({
    queryKey: ["related-auctions", metalType],
    queryFn: async (): Promise<RelatedAuction[]> => {
      if (!metalType) return [];

      console.log("🔎 경매 검색 시작");
      console.log("📝 검색할 lme_type:", metalType);

      // LME 타입에서 영어 카테고리 매핑
      const productCategories = getLmeTypeToProductCategory(metalType);
      console.log("🏷️ 매핑된 영어 카테고리들:", productCategories);

      let query = supabase
        .from("auction_list_view")
        .select(
          `
          id,
          title,
          description,
          current_bid,
          starting_price,
          end_time,
          status,
          seller_name,
          address_info
        `
        )
        .eq("approval_status", "approved") // 승인된 경매만
        .eq("status", "ended") // 종료된 경매만
        .order("current_bid", { ascending: false }) // 최고가 순
        .limit(3); // 최대 3개

      // 영어 카테고리로 정확 매칭 (가장 확실한 검색 방법)
      if (productCategories.length > 0) {
        const exactCategoryFilter = productCategories
          .map(
            (category) =>
              `category_details->productType->>category.eq.${category}`
          )
          .join(",");

        console.log("🔍 영어 카테고리 필터:", exactCategoryFilter);

        query = query.or(exactCategoryFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ 관련 경매 조회 실패:", error);
        console.error("❌ 오류 상세:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("✅ 경매 검색 완료");
      console.log("📊 검색된 경매 개수:", data?.length || 0);
      if (data && data.length > 0) {
        console.log(
          "🏆 검색된 경매 목록 (최고가 순):",
          data.map((auction, index) => ({
            순번: index + 1,
            제목: auction.title,
            현재가: `${auction.current_bid.toLocaleString()}원`,
            상태: auction.status,
          }))
        );
      } else {
        console.log("⚠️ 검색 조건에 맞는 경매가 없습니다");
      }

      return data || [];
    },
    enabled: !!metalType,
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
};

/**
 * LME 타입에서 product_category 영어 값으로 매핑
 */
function getLmeTypeToProductCategory(lmeType: string): string[] {
  const categories: string[] = [];

  switch (lmeType) {
    case "구리":
      categories.push("copper");
      break;
    case "알루미늄":
      categories.push("aluminum");
      break;
    case "아연":
      categories.push("zinc");
      break;
    case "납":
      categories.push("lead");
      break;
    case "주석":
      categories.push("tin");
      break;
    case "니켈":
      categories.push("nickel");
      break;
    case "특수금속":
      categories.push("special");
      break;
    default:
      // 기본적으로 소문자 영어로 변환 시도
      categories.push(lmeType.toLowerCase());
      break;
  }

  return categories;
}

/**
 * 경매 가격 포맷팅 (원 단위)
 */
export const formatAuctionPrice = (price: number): string => {
  if (price >= 100000000) {
    return `${(price / 100000000).toFixed(1)}억원`;
  } else if (price >= 10000) {
    return `${(price / 10000).toFixed(0)}만원`;
  } else {
    return `${price.toLocaleString()}원`;
  }
};

/**
 * 경매 상태 한글 변환
 */
export const getAuctionStatusText = (status: string): string => {
  switch (status) {
    case "active":
      return "진행중";
    case "ending":
      return "마감임박";
    case "ended":
      return "종료";
    default:
      return status;
  }
};
