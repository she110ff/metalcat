import {
  ScrapProductType,
  MachineryProductType,
  MaterialProductType,
  DemolitionProductType,
  AuctionCategory,
} from "@/data/types/auction";

// 비철 제품 종류
export const nonferrousProductTypes: ScrapProductType[] = [
  // 구리류
  {
    id: "a-dong",
    name: "A동(구리 99.98%)",
    category: "copper",
    description: "순도 99.98% 이상의 고순도 구리",
    auctionCategory: "scrap",
    ferrousType: "nonferrous",
  },
  {
    id: "sang-dong",
    name: "상동(구리 96%)",
    category: "copper",
    description: "순도 96% 이상의 상급 구리",
    auctionCategory: "scrap",
    ferrousType: "nonferrous",
  },
  {
    id: "pa-dong",
    name: "파동(구리)",
    category: "copper",
    description: "일반 구리 스크랩",
    auctionCategory: "scrap",
    ferrousType: "nonferrous",
  },

  // 황동류
  {
    id: "hwang-dong",
    name: "황동(신주)",
    category: "brass",
    description: "새로운 황동 재료",
    auctionCategory: "scrap",
    ferrousType: "nonferrous",
  },

  // 알루미늄류
  {
    id: "aluminum",
    name: "알루미늄",
    category: "aluminum",
    description: "알루미늄 스크랩",
    auctionCategory: "scrap",
    ferrousType: "nonferrous",
  },

  // 기타 비철금속
  {
    id: "lead",
    name: "납",
    category: "lead",
    description: "납 스크랩",
    auctionCategory: "scrap",
    ferrousType: "nonferrous",
  },
  {
    id: "stainless",
    name: "스테인레스",
    category: "stainless",
    description: "스테인레스 스틸",
    auctionCategory: "scrap",
    ferrousType: "nonferrous",
  },
  {
    id: "electronic-scrap",
    name: "전자스크랩",
    category: "electronic",
    description: "전자제품 스크랩",
    auctionCategory: "scrap",
    ferrousType: "nonferrous",
  },
  {
    id: "special-metals",
    name: "특수금속",
    category: "special",
    description: "특수 금속류",
    auctionCategory: "scrap",
    ferrousType: "nonferrous",
  },
];

// 고철 제품 종류
export const ferrousProductTypes: ScrapProductType[] = [
  {
    id: "pig-iron",
    name: "생철",
    category: "iron",
    description: "생철 스크랩",
    auctionCategory: "scrap",
    ferrousType: "ferrous",
  },
  {
    id: "heavy-scrap",
    name: "중량고철",
    category: "iron",
    description: "중량 고철 스크랩",
    auctionCategory: "scrap",
    ferrousType: "ferrous",
  },
  {
    id: "light-scrap",
    name: "경량고철",
    category: "iron",
    description: "경량 고철 스크랩",
    auctionCategory: "scrap",
    ferrousType: "ferrous",
  },
  {
    id: "processed-scrap",
    name: "가공고철",
    category: "iron",
    description: "가공된 고철 스크랩",
    auctionCategory: "scrap",
    ferrousType: "ferrous",
  },
  {
    id: "lathe-iron",
    name: "선반철",
    category: "iron",
    description: "선반 작업 철 스크랩",
    auctionCategory: "scrap",
    ferrousType: "ferrous",
  },
  {
    id: "mold-scrap",
    name: "금형고철",
    category: "iron",
    description: "금형 고철 스크랩",
    auctionCategory: "scrap",
    ferrousType: "ferrous",
  },
  {
    id: "work-iron",
    name: "작업철",
    category: "iron",
    description: "작업 철 스크랩",
    auctionCategory: "scrap",
    ferrousType: "ferrous",
  },
];

// 통합 고철/비철 제품 종류 (하위 호환성)
export const scrapProductTypes: ScrapProductType[] = [
  ...nonferrousProductTypes,
  ...ferrousProductTypes,
];

// 중고 기계 제품 종류 (화면 분석 기반)
export const machineryProductTypes: MachineryProductType[] = [
  {
    id: "machine-tools",
    name: "공작기계",
    category: "manufacturing",
    description: "금속 가공용 공작기계",
    auctionCategory: "machinery",
  },
  {
    id: "cutting-bending",
    name: "절단/절곡기계",
    category: "metalworking",
    description: "금속 절단 및 절곡 기계",
    auctionCategory: "machinery",
  },
  {
    id: "packaging-logistics",
    name: "포장/물류설비",
    category: "logistics",
    description: "포장 및 물류 자동화 설비",
    auctionCategory: "machinery",
  },
  {
    id: "injection-molding",
    name: "사출/성형기계",
    category: "plastic",
    description: "플라스틱 사출 및 성형 기계",
    auctionCategory: "machinery",
  },
  {
    id: "food-pharmaceutical",
    name: "식품/제약기계",
    category: "food-pharma",
    description: "식품 및 제약 산업용 기계",
    auctionCategory: "machinery",
  },
  {
    id: "construction-heavy",
    name: "건설/중장비",
    category: "construction",
    description: "건설 및 중장비 기계",
    auctionCategory: "machinery",
  },
  {
    id: "woodworking",
    name: "목공기계",
    category: "woodworking",
    description: "목재 가공용 기계",
    auctionCategory: "machinery",
  },
  {
    id: "welding-processing",
    name: "용접/가공기기",
    category: "welding",
    description: "용접 및 금속 가공 기기",
    auctionCategory: "machinery",
  },
  {
    id: "electrical-electronic",
    name: "전기/전자장비",
    category: "electrical",
    description: "전기 및 전자 장비",
    auctionCategory: "machinery",
  },
  {
    id: "other-industrial",
    name: "기타 산업기계",
    category: "other",
    description: "기타 산업용 기계",
    auctionCategory: "machinery",
  },
];

// 중고 자재 제품 종류
export const materialsProductTypes: MaterialProductType[] = [
  {
    id: "steel-beam",
    name: "H빔",
    category: "structural",
    description: "구조용 H빔",
    auctionCategory: "materials",
  },
  {
    id: "steel-plate",
    name: "철판",
    category: "structural",
    description: "구조용 철판",
    auctionCategory: "materials",
  },
  {
    id: "steel-pipe",
    name: "강관",
    category: "structural",
    description: "구조용 강관",
    auctionCategory: "materials",
  },
  {
    id: "rebar",
    name: "철근",
    category: "structural",
    description: "건축용 철근",
    auctionCategory: "materials",
  },
  {
    id: "wire-mesh",
    name: "철망",
    category: "structural",
    description: "건축용 철망",
    auctionCategory: "materials",
  },
  {
    id: "aluminum-profile",
    name: "알루미늄 프로파일",
    category: "aluminum",
    description: "건축용 알루미늄 프로파일",
    auctionCategory: "materials",
  },
  {
    id: "copper-wire",
    name: "동선",
    category: "electrical",
    description: "전기용 동선",
    auctionCategory: "materials",
  },
  {
    id: "cable",
    name: "케이블",
    category: "electrical",
    description: "전기용 케이블",
    auctionCategory: "materials",
  },
];

// 철거 제품 종류
export const demolitionProductTypes: DemolitionProductType[] = [
  {
    id: "building-demolition",
    name: "건축물",
    category: "building",
    description: "주택, 상가, 아파트, 교량 등 건축물 철거",
    auctionCategory: "demolition",
  },
  {
    id: "industrial-demolition",
    name: "산업 설비",
    category: "industrial",
    description: "공장, 창고, 탱크 등 산업시설 철거",
    auctionCategory: "demolition",
  },
];

// 모든 제품 종류 통합
export const allProductTypes = [
  ...scrapProductTypes,
  ...machineryProductTypes,
  ...materialsProductTypes,
  ...demolitionProductTypes,
];

// 경매 카테고리별 제품 종류
export const productTypesByCategory = {
  scrap: scrapProductTypes,
  machinery: machineryProductTypes,
  materials: materialsProductTypes,
  demolition: demolitionProductTypes,
};

// 기존 호환성을 위한 별칭
export const productTypes = allProductTypes;
