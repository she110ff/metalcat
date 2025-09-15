import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/auth/api";

export interface RelatedAuction {
  id: string;
  title: string;
  current_bid: number;
  starting_price: number;
  end_time: string;
  status: string;
  seller_name: string;
  address_info: string;
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

      // metal_type을 포함하는 경매 제목으로 검색
      // 예: "구리" -> "구리", "동" 등을 포함하는 제목
      const searchTerms = getMetalSearchTerms(metalType);

      let query = supabase
        .from("auction_list_view")
        .select(
          `
          id,
          title,
          current_bid,
          starting_price,
          end_time,
          status,
          seller_name,
          address_info
        `
        )
        .eq("approval_status", "approved") // 승인된 경매만
        .in("status", ["active", "ending", "ended"]) // 진행중이거나 종료된 경매
        .order("current_bid", { ascending: false }) // 최고가 순
        .limit(3); // 최대 3개

      // metal_type에 따른 제목 필터링
      if (searchTerms.length > 0) {
        const titleFilter = searchTerms
          .map((term) => `title.ilike.%${term}%`)
          .join(",");
        query = query.or(titleFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("관련 경매 조회 실패:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!metalType,
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
};

/**
 * metal_type에 따른 검색어 매핑
 * 예: "A동" -> ["구리", "동", "A동"]
 */
function getMetalSearchTerms(metalType: string): string[] {
  const terms: string[] = [metalType]; // 기본적으로 metal_type 자체 포함

  // 구리 관련
  if (metalType.includes("구리") || metalType.includes("동")) {
    terms.push("구리", "동", "Cu", "copper");
  }

  // 알루미늄 관련
  if (metalType.includes("알루미늄") || metalType.includes("알미늄")) {
    terms.push("알루미늄", "알미늄", "Al", "aluminum");
  }

  // 아연 관련
  if (metalType.includes("아연")) {
    terms.push("아연", "Zn", "zinc");
  }

  // 납 관련
  if (metalType.includes("납")) {
    terms.push("납", "Pb", "lead");
  }

  // 주석 관련
  if (metalType.includes("주석")) {
    terms.push("주석", "Sn", "tin");
  }

  // 니켈 관련
  if (metalType.includes("니켈")) {
    terms.push("니켈", "Ni", "nickel");
  }

  // 스테인레스 관련
  if (metalType.includes("스테인레스") || metalType.includes("스텐")) {
    terms.push("스테인레스", "스텐", "STS", "stainless");
  }

  // 특수금속 관련
  if (metalType.includes("특수금속") || metalType.includes("특수")) {
    terms.push(
      "특수금속",
      "특수",
      "합금",
      "티타늄",
      "텅스텐",
      "몰리브덴",
      "코발트"
    );
  }

  return [...new Set(terms)]; // 중복 제거
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
