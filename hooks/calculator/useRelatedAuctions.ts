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

      // metal_type을 포함하는 경매 제목으로 검색
      // 예: "구리" -> "구리", "동" 등을 포함하는 제목
      const searchTerms = getMetalSearchTerms(metalType);

      console.log("🔎 경매 검색 시작");
      console.log("📝 검색할 metal_type:", metalType);
      console.log("🏷️ 생성된 검색어들:", searchTerms);

      // 특정 경매 ID로 직접 조회해서 데이터 확인
      if (metalType.includes("알루미늄")) {
        const specificAuction = await supabase
          .from("auction_list_view")
          .select("*")
          .eq("id", "auction_1757924067914_ffd72424")
          .single();

        console.log("🔍 특정 알루미늄 경매 조회 결과:", specificAuction);

        // 모든 알루미늄 관련 경매 조회 (제목에 알루미늄이 포함된)
        const allAluminumAuctions = await supabase
          .from("auction_list_view")
          .select("id, title, approval_status, status")
          .or("title.ilike.%알루미늄%,title.ilike.%알미늄%")
          .limit(10);

        console.log("📋 모든 알루미늄 관련 경매:", allAluminumAuctions);
      }

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

      // metal_type에 따른 필터링 (제목 + category_details)
      if (searchTerms.length > 0) {
        const titleFilter = searchTerms
          .map((term) => `title.ilike.%${term}%`)
          .join(",");

        const categoryFilter = searchTerms
          .map((term) => `category_details->productType->>name.ilike.%${term}%`)
          .join(",");

        const productCategoryFilter = searchTerms
          .map(
            (term) => `category_details->productType->>category.ilike.%${term}%`
          )
          .join(",");

        // 제목, 상품명, 상품 카테고리 중 하나라도 매칭되면 검색
        const combinedFilter = `${titleFilter},${categoryFilter},${productCategoryFilter}`;

        console.log("🔍 생성된 필터 쿼리 (제목):", titleFilter);
        console.log("🔍 생성된 필터 쿼리 (상품명):", categoryFilter);
        console.log(
          "🔍 생성된 필터 쿼리 (상품카테고리):",
          productCategoryFilter
        );
        console.log("🔍 최종 결합 필터:", combinedFilter);

        query = query.or(combinedFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ 관련 경매 조회 실패:", error);
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
 * metal_type에 따른 검색어 매핑
 * 예: "A동" -> ["구리", "동", "A동"]
 */
function getMetalSearchTerms(metalType: string): string[] {
  const terms: string[] = [metalType]; // 기본적으로 metal_type 자체 포함

  // 구리 관련 (A동, B동, 1급동, 2급동 등)
  if (metalType.includes("구리") || metalType.includes("동")) {
    terms.push(
      "구리",
      "동",
      "Cu",
      "copper",
      "A동",
      "B동",
      "1급동",
      "2급동",
      "전선",
      "케이블"
    );
  }

  // 알루미늄 관련 (1급, 2급, 캔, 호일 등)
  if (metalType.includes("알루미늄") || metalType.includes("알미늄")) {
    terms.push(
      "알루미늄",
      "알미늄",
      "Al",
      "aluminum",
      "1급",
      "2급",
      "캔",
      "호일",
      "압연"
    );
  }

  // 아연 관련
  if (metalType.includes("아연")) {
    terms.push("아연", "Zn", "zinc", "도금", "합금");
  }

  // 납 관련
  if (metalType.includes("납")) {
    terms.push("납", "Pb", "lead", "배터리", "축전지");
  }

  // 주석 관련
  if (metalType.includes("주석")) {
    terms.push("주석", "Sn", "tin", "솔더", "땜납");
  }

  // 니켈 관련
  if (metalType.includes("니켈")) {
    terms.push("니켈", "Ni", "nickel", "합금", "도금");
  }

  // 스테인레스 관련
  if (metalType.includes("스테인레스") || metalType.includes("스텐")) {
    terms.push("스테인레스", "스텐", "STS", "stainless", "304", "316", "430");
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
      "코발트",
      "희토류"
    );
  }

  // 구체적인 등급이나 종류가 포함된 경우 추가 검색어
  if (metalType.includes("1급")) {
    terms.push("1급", "특급", "고급");
  }
  if (metalType.includes("2급")) {
    terms.push("2급", "중급");
  }
  if (metalType.includes("스크랩")) {
    terms.push("스크랩", "고철", "폐금속");
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
