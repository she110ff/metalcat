import {
  ScrapAuctionItem,
  MachineryAuctionItem,
  MaterialAuctionItem,
  DemolitionAuctionItem,
  BidInfo,
  AuctionCategory,
  QuantityInfo,
  SalesEnvironment,
  AddressInfo,
  PhotoInfo,
} from "@/data/types/auction";
import {
  scrapProductTypes,
  machineryProductTypes,
  materialsProductTypes,
  demolitionProductTypes,
} from "./product-types";

// 수량 범위 옵션 (고철용)
export const weightRanges = [
  "100 - 200",
  "200 - 300",
  "300 - 400",
  "400 - 500",
  "500 - 600",
  "600 - 700",
  "700 - 800",
  "800 - 900",
  "900 - 1000",
  "1000+",
];

// 공통 판매 환경 옵션 (고철, 중고기계, 중고자재 공통 사용)
export const salesEnvironmentOptions = {
  // 배송 방식
  delivery: [
    {
      id: "buyer",
      label: "구매자 직접",
      description: "구매자가 직접 수령",
      color: "blue",
    },
    {
      id: "both",
      label: "협의 가능",
      description: "상호 협의 후 결정",
      color: "purple",
    },
    {
      id: "seller",
      label: "판매자 지원",
      description: "판매자가 배송 지원",
      color: "green",
    },
  ],

  // 운송비 부담
  shippingCost: [
    {
      id: "buyer",
      label: "구매자 부담",
      description: "구매자가 운송비 부담",
      color: "blue",
    },
    {
      id: "seller",
      label: "판매자 부담",
      description: "판매자가 운송비 부담",
      color: "green",
    },
  ],

  // 현장 접근성
  accessibility: [
    {
      id: "easy",
      label: "접근 용이",
      description: "5톤 집게차 진입 가능",
      color: "green",
    },
    {
      id: "normal",
      label: "보통",
      description: "일반 트럭 접근 가능",
      color: "yellow",
    },
    {
      id: "difficult",
      label: "제한적",
      description: "접근성 제한적",
      color: "red",
    },
  ],

  // 적재 조건
  loading: [
    {
      id: "buyer",
      label: "구매자 직접",
      description: "구매자가 직접 적재",
      color: "blue",
    },
    {
      id: "both",
      label: "협의 가능",
      description: "상호 협의 후 결정",
      color: "purple",
    },
    {
      id: "seller",
      label: "판매자 지원",
      description: "판매자가 적재 지원",
      color: "green",
    },
  ],

  // 추가 조건 (체크박스 형태)
  additional: [
    {
      id: "sacksNeeded",
      label: "마대 필요",
      description: "포장용 마대 필요",
    },
    {
      id: "craneAccess",
      label: "크레인 접근",
      description: "크레인 접근 가능",
    },
    {
      id: "forkliftAccess",
      label: "지게차 접근",
      description: "지게차 접근 가능",
    },
    {
      id: "forkliftAvailable",
      label: "지게차 보유",
      description: "현장에 지게차 보유",
    },
  ],
};

// 기존 호환성을 위한 별칭들 (점진적 제거 예정)
export const scrapSalesEnvironmentOptions = salesEnvironmentOptions;
export const machinerySalesEnvironmentOptions = salesEnvironmentOptions;
export const materialSalesEnvironmentOptions = salesEnvironmentOptions;

// 철거 경매 특화 옵션
export const demolitionSpecificOptions = {
  buildingPurpose: [
    {
      id: "residential",
      label: "주거용 건축물",
      description: "주택, 아파트 등",
    },
    {
      id: "commercial",
      label: "상업용 건축물",
      description: "상가, 사무실 등",
    },
    { id: "industrial", label: "산업용 건축물", description: "공장, 창고 등" },
    { id: "public", label: "공공시설 철거", description: "학교, 병원 등" },
  ],
  demolitionMethod: [
    { id: "full", label: "전면 철거", description: "건물 전체 철거" },
    { id: "partial", label: "부분 철거", description: "일부만 철거" },
    { id: "interior", label: "내부 철거", description: "내부 구조물만 철거" },
  ],
  structureType: [
    { id: "masonry", label: "조적조", description: "벽돌, 블록 구조" },
    {
      id: "reinforced-concrete",
      label: "철근콘크리트",
      description: "RC 구조",
    },
    { id: "steel-frame", label: "철골조", description: "강재 구조" },
    { id: "composite", label: "복합구조", description: "혼합 구조" },
  ],
  demolitionScale: [
    { id: "small", label: "소규모", description: "100m² 미만" },
    { id: "medium", label: "중규모", description: "100-500m²" },
    { id: "large", label: "대규모", description: "500m² 이상" },
  ],
  wasteDisposal: [
    {
      id: "self",
      label: "제가 직접 처리할게요",
      description: "직접 폐기물 처리",
    },
    {
      id: "company",
      label: "업체가 처리해주세요",
      description: "전문 업체 처리",
    },
  ],
  areaUnit: [
    { id: "sqm", label: "m²로 입력", description: "제곱미터 단위" },
    { id: "pyeong", label: "평으로 입력", description: "평 단위" },
  ],
};

// 샘플 주소 데이터
export const sampleAddresses: AddressInfo[] = [
  {
    postalCode: "06267",
    addressType: "road",
    address: "서울 강남구 강남대로 238",
    detailAddress: "강남빌딩 3층",
  },
  {
    postalCode: "13529",
    addressType: "road",
    address: "경기 성남시 분당구 판교역로 166",
    detailAddress: "판교테크노밸리 A동",
  },
  {
    postalCode: "06142",
    addressType: "road",
    address: "서울 강남구 테헤란로 501",
    detailAddress: "삼성동 빌딩 지하 1층",
  },
  {
    postalCode: "50823",
    addressType: "road",
    address: "경남 김해시 김해대로 1234",
    detailAddress: "김해공단 2동",
  },
  {
    postalCode: "53324",
    addressType: "road",
    address: "경남 거제시 거제해안로 789",
    detailAddress: "거제조선소",
  },
  {
    postalCode: "50612",
    addressType: "road",
    address: "경남 양산시 물금읍 양산로 456",
    detailAddress: "양산공단 3동",
  },
];

// 샘플 사진 데이터
export const samplePhotos: PhotoInfo[] = [
  {
    id: "1",
    uri: "https://picsum.photos/800/600?random=1",
    isRepresentative: true,
    type: "full",
  },
  {
    id: "2",
    uri: "https://picsum.photos/800/600?random=2",
    isRepresentative: false,
    type: "closeup",
  },
  {
    id: "3",
    uri: "https://picsum.photos/800/600?random=3",
    isRepresentative: false,
    type: "detail",
  },
];

// 구리 스크랩용 이미지
export const copperPhotos: PhotoInfo[] = [
  {
    id: "copper_1",
    uri: "https://picsum.photos/800/600?random=4",
    isRepresentative: true,
    type: "full",
  },
  {
    id: "copper_2",
    uri: "https://picsum.photos/800/600?random=5",
    isRepresentative: false,
    type: "closeup",
  },
  {
    id: "copper_3",
    uri: "https://picsum.photos/800/600?random=6",
    isRepresentative: false,
    type: "detail",
  },
  {
    id: "copper_4",
    uri: "https://picsum.photos/800/600?random=7",
    isRepresentative: false,
    type: "detail",
  },
];

// 스테인리스 스크랩용 이미지
export const stainlessPhotos: PhotoInfo[] = [
  {
    id: "stainless_1",
    uri: "https://picsum.photos/800/600?random=8",
    isRepresentative: true,
    type: "full",
  },
  {
    id: "stainless_2",
    uri: "https://picsum.photos/800/600?random=9",
    isRepresentative: false,
    type: "closeup",
  },
];

// 황동 스크랩용 이미지
export const brassPhotos: PhotoInfo[] = [
  {
    id: "brass_1",
    uri: "https://picsum.photos/800/600?random=10",
    isRepresentative: true,
    type: "full",
  },
  {
    id: "brass_2",
    uri: "https://picsum.photos/800/600?random=11",
    isRepresentative: false,
    type: "closeup",
  },
  {
    id: "brass_3",
    uri: "https://picsum.photos/800/600?random=12",
    isRepresentative: false,
    type: "detail",
  },
];

// 샘플 입찰 데이터
export const sampleBids: BidInfo[] = [
  {
    id: "bid1",
    userId: "user1",
    userName: "거제철강",
    amount: 5500000,
    pricePerUnit: 2200,
    location: "경남 거제시",
    bidTime: new Date("2025-07-22T21:21:00"),
    isTopBid: true,
  },
  {
    id: "bid2",
    userId: "user2",
    userName: "양산메탈",
    amount: 5400000,
    pricePerUnit: 2160,
    location: "경남 양산시",
    bidTime: new Date("2025-07-22T20:45:00"),
    isTopBid: false,
  },
  {
    id: "bid3",
    userId: "user3",
    userName: "부산스크랩",
    amount: 5300000,
    pricePerUnit: 2120,
    location: "부산 해운대구",
    bidTime: new Date("2025-07-22T19:30:00"),
    isTopBid: false,
  },
];

// 구리 경매용 입찰 데이터
export const sampleCopperBids: BidInfo[] = [
  {
    id: "copper_bid1",
    userId: "user4",
    userName: "서울메탈",
    amount: 12500000,
    pricePerUnit: 5000,
    location: "서울특별시 강남구",
    bidTime: new Date(Date.now() - 2 * 60 * 1000), // 2분 전
    isTopBid: true,
  },
  {
    id: "copper_bid2",
    userId: "user5",
    userName: "인천철강",
    amount: 12300000,
    pricePerUnit: 4920,
    location: "인천광역시",
    bidTime: new Date(Date.now() - 5 * 60 * 1000), // 5분 전
    isTopBid: false,
  },
  {
    id: "copper_bid3",
    userId: "user6",
    userName: "대구스크랩",
    amount: 12100000,
    pricePerUnit: 4840,
    location: "대구광역시",
    bidTime: new Date(Date.now() - 8 * 60 * 1000), // 8분 전
    isTopBid: false,
  },
  {
    id: "copper_bid4",
    userId: "user4",
    userName: "서울메탈",
    amount: 12000000,
    pricePerUnit: 4800,
    location: "서울특별시 강남구",
    bidTime: new Date(Date.now() - 12 * 60 * 1000), // 12분 전
    isTopBid: false,
  },
];

// 스테인리스 경매용 입찰 데이터
export const sampleStainlessBids: BidInfo[] = [
  {
    id: "stainless_bid1",
    userId: "user7",
    userName: "부산철강",
    amount: 8960000,
    pricePerUnit: 2800,
    location: "부산광역시",
    bidTime: new Date(Date.now() - 1 * 60 * 1000), // 1분 전
    isTopBid: true,
  },
  {
    id: "stainless_bid2",
    userId: "user8",
    userName: "울산메탈",
    amount: 8800000,
    pricePerUnit: 2750,
    location: "울산광역시",
    bidTime: new Date(Date.now() - 3 * 60 * 1000), // 3분 전
    isTopBid: false,
  },
  {
    id: "stainless_bid3",
    userId: "user9",
    userName: "창원스크랩",
    amount: 8640000,
    pricePerUnit: 2700,
    location: "경남 창원시",
    bidTime: new Date(Date.now() - 6 * 60 * 1000), // 6분 전
    isTopBid: false,
  },
];

// 황동 경매용 입찰 데이터 (종료된 경매)
export const sampleBrassBids: BidInfo[] = [
  {
    id: "brass_bid1",
    userId: "user10",
    userName: "광주철강",
    amount: 4750000,
    pricePerUnit: 5000,
    location: "광주광역시",
    bidTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1일 전
    isTopBid: true,
  },
  {
    id: "brass_bid2",
    userId: "user11",
    userName: "전주메탈",
    amount: 4700000,
    pricePerUnit: 4947,
    location: "전북 전주시",
    bidTime: new Date(Date.now() - 25 * 60 * 60 * 1000), // 1일 1시간 전
    isTopBid: false,
  },
  {
    id: "brass_bid3",
    userId: "user12",
    userName: "청주스크랩",
    amount: 4650000,
    pricePerUnit: 4895,
    location: "충북 청주시",
    bidTime: new Date(Date.now() - 26 * 60 * 60 * 1000), // 1일 2시간 전
    isTopBid: false,
  },
];

// 고철 경매 샘플 데이터
export const sampleScrapAuctions: ScrapAuctionItem[] = [
  {
    id: "scrap1",
    title: "알루미늄",
    productType: scrapProductTypes[4], // 알루미늄
    transactionType: "normal",
    auctionCategory: "scrap",
    quantity: {
      quantity: 2500,
      unit: "kg",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "seller",
      accessibility: "easy",
      loading: "seller",
      sacksNeeded: false,
    } as SalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[3], // 김해시
    description:
      "고품질 알루미늄 스크랩입니다. 깨끗하게 분리되어 있어 품질이 우수합니다.",
    specialNotes: "60까지 다 섞여 있습니다.",
    currentBid: 5500000,
    pricePerUnit: 2200,
    totalBidAmount: 5500000,
    endTime: new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000
    ), // 2일 14시간 후
    status: "active",
    bidders: 3,
    viewCount: 333,
    bids: sampleBids,
    createdAt: new Date("2025-07-22T10:00:00"),
    updatedAt: new Date(),
    userId: "seller1",
  },
  {
    id: "scrap2",
    title: "고순도 구리 스크랩",
    productType: scrapProductTypes[0], // A동(구리 99.98%)
    transactionType: "normal",
    auctionCategory: "scrap",
    quantity: {
      quantity: 2500,
      unit: "kg",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "both",
      shippingCost: "seller",
      accessibility: "normal",
      loading: "buyer",
      sacksNeeded: true,
    } as SalesEnvironment,
    photos: copperPhotos,
    address: sampleAddresses[1], // 판교
    description: "고순도 구리 스크랩입니다. 압축되어 있어 운반이 편리합니다.",
    currentBid: 12500000,
    pricePerUnit: 5000,
    totalBidAmount: 12500000,
    endTime: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5시간 후
    status: "active",
    bidders: 4,
    viewCount: 245,
    bids: sampleCopperBids,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller2",
  },
  {
    id: "scrap3",
    title: "스테인리스 스틸 스크랩",
    productType: scrapProductTypes[2], // 스테인리스
    transactionType: "urgent",
    auctionCategory: "scrap",
    quantity: {
      quantity: 3200,
      unit: "kg",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "seller",
      accessibility: "easy",
      loading: "seller",
      sacksNeeded: false,
    } as SalesEnvironment,
    photos: stainlessPhotos,
    address: sampleAddresses[2], // 부산
    description: "고품질 스테인리스 스틸 스크랩입니다. 긴급 처분합니다.",
    currentBid: 8960000,
    pricePerUnit: 2800,
    totalBidAmount: 8960000,
    endTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1시간 후
    status: "ending",
    bidders: 3,
    viewCount: 567,
    bids: sampleStainlessBids,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller3",
  },
  {
    id: "scrap4",
    title: "황동 스크랩",
    productType: scrapProductTypes[1], // 황동
    transactionType: "normal",
    auctionCategory: "scrap",
    quantity: {
      quantity: 950,
      unit: "kg",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "buyer",
      shippingCost: "buyer",
      accessibility: "difficult",
      loading: "buyer",
      sacksNeeded: true,
    } as SalesEnvironment,
    photos: brassPhotos,
    address: sampleAddresses[0], // 서울
    description: "고품질 황동 스크랩입니다. 깨끗하게 분리되어 있습니다.",
    currentBid: 4750000,
    pricePerUnit: 5000,
    totalBidAmount: 4750000,
    endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1시간 전 (종료됨)
    status: "ended",
    bidders: 3,
    viewCount: 234,
    bids: sampleBrassBids,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller4",
  },
  {
    id: "scrap5",
    title: "철 스크랩",
    productType: scrapProductTypes[3], // 철
    transactionType: "normal",
    auctionCategory: "scrap",
    quantity: {
      quantity: 1500,
      unit: "kg",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "seller",
      accessibility: "easy",
      loading: "seller",
      sacksNeeded: false,
    } as SalesEnvironment,
    photos: samplePhotos, // 기본 이미지 사용
    address: sampleAddresses[4], // 대구
    description:
      "고품질 철 스크랩입니다. 건축 자재에서 분리된 깨끗한 철입니다.",
    currentBid: 1800000,
    pricePerUnit: 1200,
    totalBidAmount: 1800000,
    endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3일 전 (종료됨)
    status: "ended",
    bidders: 2,
    viewCount: 156,
    bids: [
      {
        id: "iron_bid1",
        userId: "user13",
        userName: "대구철강",
        amount: 1800000,
        pricePerUnit: 1200,
        location: "대구광역시",
        bidTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4일 전
        isTopBid: true,
      },
      {
        id: "iron_bid2",
        userId: "user14",
        userName: "경북메탈",
        amount: 1750000,
        pricePerUnit: 1167,
        location: "경북 포항시",
        bidTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5일 전
        isTopBid: false,
      },
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller5",
  },
  {
    id: "scrap6",
    title: "아연 스크랩",
    productType: scrapProductTypes[5], // 아연
    transactionType: "urgent",
    auctionCategory: "scrap",
    quantity: {
      quantity: 800,
      unit: "kg",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "buyer",
      shippingCost: "buyer",
      accessibility: "difficult",
      loading: "buyer",
      sacksNeeded: true,
    } as SalesEnvironment,
    photos: [], // 이미지 없음 (무효 경매)
    address: sampleAddresses[5], // 인천
    description: "고품질 아연 스크랩입니다. 긴급 처분이 필요한 상품입니다.",
    currentBid: 0,
    pricePerUnit: 0,
    totalBidAmount: 0,
    endTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6시간 전 (종료됨, 입찰 없음)
    status: "ended",
    bidders: 0,
    viewCount: 89,
    bids: [],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller6",
  },
];

// 중고 기계 샘플 데이터 (화면 분석 기반)
export const sampleMachineryAuctions: MachineryAuctionItem[] = [
  {
    id: "machinery1",
    title: "식품 가공 장비",
    productName: "자동 포장 기계",
    manufacturer: "한국포장기계",
    modelName: "AP-2000",
    manufacturingDate: new Date("2018-03-15"),
    productType: machineryProductTypes[4], // 식품/제약기계
    transactionType: "normal",
    auctionCategory: "machinery",
    quantity: {
      quantity: 1,
      unit: "대",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "both",
      shippingCost: "buyer",
      accessibility: "easy",
      loading: "both",
      sacksNeeded: false,
    } as SalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[2], // 삼성동
    description:
      "2018년식 자동 포장 기계입니다. 식품 포장에 최적화되어 있으며 상태가 양호합니다. 정기 점검을 받아 즉시 사용 가능합니다.",
    desiredPrice: 28000000,
    currentBid: 25000000,
    pricePerUnit: 25000000,
    totalBidAmount: 25000000,
    endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1일 후
    status: "ending",
    bidders: 8,
    viewCount: 156,
    bids: [
      {
        id: "bid5",
        userId: "user5",
        userName: "삼성건설",
        amount: 25000000,
        location: "서울 강남구",
        bidTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isTopBid: true,
      },
    ],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller3",
  },
  {
    id: "machinery2",
    title: "중고 공작기계",
    productName: "CNC 선반",
    manufacturer: "두산공작기계",
    modelName: "PUMA 2000",
    manufacturingDate: new Date("2015-06-20"),
    productType: machineryProductTypes[0], // 공작기계
    transactionType: "urgent",
    auctionCategory: "machinery",
    quantity: {
      quantity: 1,
      unit: "대",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "buyer",
      accessibility: "easy",
      loading: "seller",
      sacksNeeded: false,
    } as SalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[0], // 강남
    description: "2015년식 CNC 선반입니다. 정밀도가 우수하고 상태가 좋습니다.",
    desiredPrice: 15000000,
    currentBid: 12000000,
    pricePerUnit: 12000000,
    totalBidAmount: 12000000,
    endTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12시간 후
    status: "ending",
    bidders: 5,
    viewCount: 89,
    bids: [
      {
        id: "bid6",
        userId: "user6",
        userName: "강남기계",
        amount: 12000000,
        location: "서울 강남구",
        bidTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        isTopBid: true,
      },
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller4",
  },
];

// 중고 자재 샘플 데이터
export const sampleMaterialsAuctions: MaterialAuctionItem[] = [
  {
    id: "materials1",
    title: "H빔 자재",
    productType: materialsProductTypes[0], // H빔
    transactionType: "urgent",
    auctionCategory: "materials",
    quantity: {
      quantity: 5000,
      unit: "kg",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "buyer",
      accessibility: "easy",
      loading: "seller",
      sacksNeeded: false,
    } as SalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[0], // 강남
    description: "건축용 H빔 자재입니다. 긴급 처분이 필요합니다.",
    desiredPrice: 15000000,
    currentBid: 15000000,
    pricePerUnit: 3000,
    totalBidAmount: 15000000,
    endTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1시간 후
    status: "ending",
    bidders: 15,
    viewCount: 89,
    bids: [
      {
        id: "bid7",
        userId: "user7",
        userName: "강남건설",
        amount: 15000000,
        pricePerUnit: 3000,
        location: "서울 강남구",
        bidTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        isTopBid: true,
      },
    ],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller5",
  },
  {
    id: "materials2",
    title: "엉",
    productType: materialsProductTypes[1], // 철판
    transactionType: "normal",
    auctionCategory: "materials",
    quantity: {
      quantity: 2000,
      unit: "kg",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "buyer",
      accessibility: "easy",
      loading: "seller",
      sacksNeeded: false,
    } as SalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[1], // 판교
    description: "신품 철판입니다. 건축용으로 적합합니다.",
    desiredPrice: 8000000,
    currentBid: 8000000,
    pricePerUnit: 4000,
    totalBidAmount: 8000000,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2일 후
    status: "active",
    bidders: 8,
    viewCount: 156,
    bids: [
      {
        id: "bid9",
        userId: "user9",
        userName: "판교건설",
        amount: 8000000,
        pricePerUnit: 4000,
        location: "경기 성남시",
        bidTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isTopBid: true,
      },
    ],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller7",
  },
  {
    id: "materials3",
    title: "강관 자재",
    productType: materialsProductTypes[2], // 강관
    transactionType: "normal",
    auctionCategory: "materials",
    quantity: {
      quantity: 3000,
      unit: "kg",
    } as QuantityInfo,
    salesEnvironment: {
      delivery: "both",
      shippingCost: "seller",
      accessibility: "easy",
      loading: "both",
      sacksNeeded: false,
    } as SalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[3], // 김해시
    description: "중고 강관 자재입니다. 파이프라인 공사용으로 적합합니다.",
    desiredPrice: 12000000,
    currentBid: 12000000,
    pricePerUnit: 4000,
    totalBidAmount: 12000000,
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3일 후
    status: "active",
    bidders: 12,
    viewCount: 234,
    bids: [
      {
        id: "bid10",
        userId: "user10",
        userName: "김해파이프",
        amount: 12000000,
        pricePerUnit: 4000,
        location: "경남 김해시",
        bidTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        isTopBid: true,
      },
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller8",
  },
];

// 철거 샘플 데이터
export const sampleDemolitionAuctions: DemolitionAuctionItem[] = [
  {
    id: "demolition1",
    title: "철거",
    productType: demolitionProductTypes[0], // 주거용 건축물
    demolitionInfo: {
      buildingPurpose: "residential",
      demolitionMethod: "full",
      structureType: "reinforced-concrete",
      demolitionScale: "small",
      transactionType: "urgent",
      wasteDisposal: "self",
      demolitionArea: 12,
      areaUnit: "sqm",
      floorCount: 2,
      specialNotes: "어디",
      demolitionTitle: "철거",
    },
    auctionCategory: "demolition",
    quantity: {
      quantity: 1,
      unit: "건물",
    } as QuantityInfo,
    photos: samplePhotos,
    address: sampleAddresses[0], // 강남
    description: "주거용 건축물 철거입니다. 긴급 처분이 필요합니다.",
    currentBid: 4500000,
    pricePerUnit: 4500000,
    totalBidAmount: 4500000,
    endTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12시간 후 (긴급 경매)
    status: "ending",
    bidders: 5,
    viewCount: 67,
    bids: [
      {
        id: "bid11",
        userId: "user11",
        userName: "강남철거",
        amount: 4500000,
        pricePerUnit: 4500000,
        location: "서울 강남구",
        bidTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isTopBid: true,
      },
    ],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller9",
  },
  {
    id: "demolition2",
    title: "상가 철거",
    productType: demolitionProductTypes[1], // 상업용 건축물
    demolitionInfo: {
      buildingPurpose: "commercial",
      demolitionMethod: "partial",
      structureType: "steel-frame",
      demolitionScale: "medium",
      transactionType: "normal",
      wasteDisposal: "company",
      demolitionArea: 250,
      areaUnit: "sqm",
      floorCount: 3,
      specialNotes: "24시간 현장 접근 가능",
      demolitionTitle: "상가 철거",
    },
    auctionCategory: "demolition",
    quantity: {
      quantity: 1,
      unit: "건물",
    } as QuantityInfo,
    photos: samplePhotos,
    address: sampleAddresses[2], // 삼성동
    description: "상업용 건축물 부분 철거입니다. 전문 업체만 신청 가능합니다.",
    currentBid: 12000000,
    pricePerUnit: 12000000,
    totalBidAmount: 12000000,
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3일 후
    status: "active",
    bidders: 8,
    viewCount: 123,
    bids: [
      {
        id: "bid12",
        userId: "user12",
        userName: "삼성철거",
        amount: 12000000,
        pricePerUnit: 12000000,
        location: "서울 강남구",
        bidTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
        isTopBid: true,
      },
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller10",
  },
  {
    id: "demolition3",
    title: "공장 철거",
    productType: demolitionProductTypes[2], // 산업용 건축물
    demolitionInfo: {
      buildingPurpose: "industrial",
      demolitionMethod: "full",
      structureType: "composite",
      demolitionScale: "large",
      transactionType: "normal",
      wasteDisposal: "company",
      demolitionArea: 800,
      areaUnit: "sqm",
      floorCount: 5,
      specialNotes: "유해물질 처리 필요",
      demolitionTitle: "공장 철거",
    },
    auctionCategory: "demolition",
    quantity: {
      quantity: 1,
      unit: "건물",
    } as QuantityInfo,
    photos: samplePhotos,
    address: sampleAddresses[4], // 부산
    description: "산업용 건축물 전면 철거입니다. 유해물질 처리가 포함됩니다.",
    currentBid: 25000000,
    pricePerUnit: 25000000,
    totalBidAmount: 25000000,
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5일 후
    status: "active",
    bidders: 12,
    viewCount: 234,
    bids: [
      {
        id: "bid13",
        userId: "user13",
        userName: "부산철거",
        amount: 25000000,
        pricePerUnit: 25000000,
        location: "부산 해운대구",
        bidTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
        isTopBid: true,
      },
    ],
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    updatedAt: new Date(),
    userId: "seller11",
  },
];

// 모든 경매 데이터 통합
export const allSampleAuctions = [
  ...sampleScrapAuctions,
  ...sampleMachineryAuctions,
  ...sampleMaterialsAuctions,
  ...sampleDemolitionAuctions,
];

// 경매 카테고리별 샘플 데이터
export const sampleAuctionsByCategory = {
  scrap: sampleScrapAuctions,
  machinery: sampleMachineryAuctions,
  materials: sampleMaterialsAuctions,
  demolition: sampleDemolitionAuctions,
};

// 기존 호환성을 위한 별칭
export const sampleAuctionItems = allSampleAuctions;

// 새로운 경매 데이터 추가 함수
export const addNewScrapAuction = (
  newAuction: Omit<
    ScrapAuctionItem,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "status"
    | "bidders"
    | "viewCount"
    | "bids"
    | "currentBid"
    | "pricePerUnit"
    | "totalBidAmount"
    | "endTime"
  >
) => {
  const auction: ScrapAuctionItem = {
    ...newAuction,
    id: `scrap_${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "active",
    bidders: 0,
    viewCount: 0,
    bids: [],
    currentBid: 0,
    pricePerUnit: 0,
    totalBidAmount: 0,
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
  };

  // 실제 앱에서는 여기서 서버에 저장하거나 로컬 스토리지에 저장
  console.log("새로운 고철 경매 등록:", auction);

  // 샘플 데이터에 추가 (실제로는 상태 관리 라이브러리 사용)
  sampleScrapAuctions.unshift(auction);

  return auction;
};
