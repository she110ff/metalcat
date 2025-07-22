import {
  ScrapAuctionItem,
  MachineryAuctionItem,
  MaterialAuctionItem,
  DemolitionAuctionItem,
  BidInfo,
  AuctionCategory,
  ScrapQuantityInfo,
  MachineryQuantityInfo,
  MaterialQuantityInfo,
  DemolitionQuantityInfo,
  ScrapSalesEnvironment,
  MachinerySalesEnvironment,
  MaterialSalesEnvironment,
  DemolitionSalesEnvironment,
  AddressInfo,
  PhotoInfo,
  MachineryInfo,
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

// 판매 환경 옵션 (고철용)
export const scrapSalesEnvironmentOptions = {
  delivery: [
    { id: "seller", label: "갔다드림", description: "판매자가 배송" },
    { id: "buyer", label: "실어드림", description: "구매자가 수령" },
  ],
  shippingCost: [
    {
      id: "seller",
      label: "운송비 판매자 부담",
      description: "판매자가 운송비 부담",
    },
    {
      id: "buyer",
      label: "운송비 구매자 부담",
      description: "구매자가 운송비 부담",
    },
  ],
  additional: [
    {
      id: "truckAccess",
      label: "5톤 집게차 진입 가능",
      description: "5톤 집게차 진입 가능",
    },
    { id: "sacksNeeded", label: "마대 필요", description: "마대 필요" },
    { id: "drumNeeded", label: "드럼통 필요", description: "드럼통 필요" },
    {
      id: "forkliftAvailable",
      label: "지게차 보유",
      description: "지게차 보유",
    },
  ],
};

// 판매 환경 옵션 (중고 기계용)
export const machinerySalesEnvironmentOptions = {
  delivery: [
    { id: "seller", label: "갔다드림", description: "판매자가 배송" },
    { id: "buyer", label: "실어드림", description: "구매자가 수령" },
    { id: "both", label: "상호 협의", description: "협의 후 결정" },
  ],
  shippingCost: [
    {
      id: "seller",
      label: "운송비 판매자 부담",
      description: "판매자가 운송비 부담",
    },
    {
      id: "buyer",
      label: "운송비 구매자 부담",
      description: "구매자가 운송비 부담",
    },
  ],
  loading: [
    { id: "seller", label: "실어드림", description: "판매자가 적재" },
    { id: "buyer", label: "직접 적재", description: "구매자가 직접 적재" },
  ],
  additional: [
    {
      id: "truckAccess",
      label: "5톤 집게차 진입 가능",
      description: "5톤 집게차 진입 가능",
    },
    { id: "drumNeeded", label: "드럼통 필요", description: "드럼통 필요" },
    { id: "sacksNeeded", label: "마대 필요", description: "마대 필요" },
    {
      id: "forkliftAvailable",
      label: "지게차 보유",
      description: "지게차 보유",
    },
  ],
};

// 판매 환경 옵션 (중고 자재용)
export const materialSalesEnvironmentOptions = {
  delivery: [
    { id: "seller", label: "갔다드림", description: "판매자가 배송" },
    { id: "buyer", label: "실어드림", description: "구매자가 수령" },
    { id: "both", label: "상호 협의", description: "협의 후 결정" },
  ],
  shippingCost: [
    {
      id: "seller",
      label: "운송비 판매자 부담",
      description: "판매자가 운송비 부담",
    },
    {
      id: "buyer",
      label: "운송비 구매자 부담",
      description: "구매자가 운송비 부담",
    },
  ],
  loading: [
    { id: "seller", label: "실어드림", description: "판매자가 적재" },
    { id: "buyer", label: "직접 적재", description: "구매자가 직접 적재" },
  ],
  additional: [
    {
      id: "truckAccess",
      label: "5톤 집게차 진입 가능",
      description: "5톤 집게차 진입 가능",
    },
    { id: "drumNeeded", label: "드럼통 필요", description: "드럼통 필요" },
    { id: "sacksNeeded", label: "마대 필요", description: "마대 필요" },
    {
      id: "forkliftAvailable",
      label: "지게차 보유",
      description: "지게차 보유",
    },
  ],
};

// 판매 환경 옵션 (철거 경매용)
export const demolitionSalesEnvironmentOptions = {
  delivery: [
    { id: "seller", label: "갔다드림", description: "판매자가 배송" },
    { id: "buyer", label: "실어드림", description: "구매자가 수령" },
    { id: "both", label: "상호 협의", description: "협의 후 결정" },
  ],
  shippingCost: [
    {
      id: "seller",
      label: "운송비 판매자 부담",
      description: "판매자가 운송비 부담",
    },
    {
      id: "buyer",
      label: "운송비 구매자 부담",
      description: "구매자가 운송비 부담",
    },
  ],
  loading: [
    { id: "seller", label: "실어드림", description: "판매자가 적재" },
    { id: "buyer", label: "직접 적재", description: "구매자가 직접 적재" },
  ],
  additional: [
    {
      id: "truckAccess",
      label: "5톤 집게차 진입 가능",
      description: "5톤 집게차 진입 가능",
    },
    { id: "drumNeeded", label: "드럼통 필요", description: "드럼통 필요" },
    { id: "sacksNeeded", label: "마대 필요", description: "마대 필요" },
    {
      id: "forkliftAvailable",
      label: "지게차 보유",
      description: "지게차 보유",
    },
  ],
};

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
    roadAddress: "서울 강남구 강남대로 238",
    lotAddress: "서울 강남구 도곡동 953-11",
    detailAddress: "강남빌딩 3층",
    city: "서울",
    district: "강남구",
  },
  {
    postalCode: "13529",
    roadAddress: "경기 성남시 분당구 판교역로 166",
    lotAddress: "경기 성남시 분당구 백현동 532",
    detailAddress: "판교테크노밸리 A동",
    city: "경기",
    district: "성남시 분당구",
  },
  {
    postalCode: "06142",
    roadAddress: "서울 강남구 테헤란로 501",
    lotAddress: "서울 강남구 삼성동 159",
    detailAddress: "삼성동 빌딩 지하 1층",
    city: "서울",
    district: "강남구",
  },
  {
    postalCode: "50823",
    roadAddress: "경남 김해시 김해대로 1234",
    lotAddress: "경남 김해시 내동 567-8",
    detailAddress: "김해공단 2동",
    city: "경남",
    district: "김해시",
  },
  {
    postalCode: "53324",
    roadAddress: "경남 거제시 거제해안로 789",
    lotAddress: "경남 거제시 옥포동 123-4",
    detailAddress: "거제조선소",
    city: "경남",
    district: "거제시",
  },
  {
    postalCode: "50612",
    roadAddress: "경남 양산시 물금읍 양산로 456",
    lotAddress: "경남 양산시 물금읍 가촌리 78-9",
    detailAddress: "양산공단 3동",
    city: "경남",
    district: "양산시",
  },
];

// 샘플 사진 데이터
export const samplePhotos: PhotoInfo[] = [
  {
    id: "1",
    uri: "https://example.com/photo1.jpg",
    isRepresentative: true,
    type: "full",
  },
  {
    id: "2",
    uri: "https://example.com/photo2.jpg",
    isRepresentative: false,
    type: "closeup",
  },
  {
    id: "3",
    uri: "https://example.com/photo3.jpg",
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
      knowsWeight: true,
      estimatedWeight: 2500,
      unit: "kg",
    } as ScrapQuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "buyer",
      truckAccess: true,
      loading: "seller",
      sacksNeeded: false,
    } as ScrapSalesEnvironment,
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
      knowsWeight: true,
      estimatedWeight: 2500,
      unit: "kg",
    } as ScrapQuantityInfo,
    salesEnvironment: {
      delivery: "buyer",
      shippingCost: "buyer",
      truckAccess: false,
      loading: "buyer",
      sacksNeeded: true,
    } as ScrapSalesEnvironment,
    photos: samplePhotos,
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
      knowsWeight: true,
      estimatedWeight: 3200,
      unit: "kg",
    } as ScrapQuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "seller",
      truckAccess: true,
      loading: "seller",
      sacksNeeded: false,
    } as ScrapSalesEnvironment,
    photos: samplePhotos,
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
      knowsWeight: true,
      estimatedWeight: 950,
      unit: "kg",
    } as ScrapQuantityInfo,
    salesEnvironment: {
      delivery: "buyer",
      shippingCost: "buyer",
      truckAccess: false,
      loading: "buyer",
      sacksNeeded: true,
    } as ScrapSalesEnvironment,
    photos: samplePhotos,
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
];

// 중고 기계 샘플 데이터 (화면 분석 기반)
export const sampleMachineryAuctions: MachineryAuctionItem[] = [
  {
    id: "machinery1",
    title: "기계",
    productName: "어니",
    manufacturer: "모름",
    modelName: "모델",
    productType: machineryProductTypes[4], // 식품/제약기계
    machineryInfo: {
      brand: "어니",
      model: "모델",
      year: 2018,
      condition: "good",
      workingHours: 5000,
      maintenanceHistory: "정기 점검 완료",
      manufacturingDate: new Date("2018-03-15"),
    } as MachineryInfo,
    transactionType: "normal",
    auctionCategory: "machinery",
    quantity: {
      quantity: 1,
      unit: "대",
    } as MachineryQuantityInfo,
    salesEnvironment: {
      delivery: "both",
      shippingCost: "buyer",
      truckAccess: true,
      loading: "both",
      sacksNeeded: false,
      craneAccess: true,
      forkliftAccess: true,
      drumNeeded: false,
      forkliftAvailable: true,
    } as MachinerySalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[2], // 삼성동
    description: "설명",
    desiredPrice: 1000000,
    phoneNumberDisclosure: true,
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
    productType: machineryProductTypes[0], // 공작기계
    machineryInfo: {
      brand: "두산공작기계",
      model: "PUMA 2000",
      year: 2015,
      condition: "excellent",
      workingHours: 3000,
      maintenanceHistory: "최근 정비 완료",
      manufacturingDate: new Date("2015-06-20"),
    } as MachineryInfo,
    transactionType: "urgent",
    auctionCategory: "machinery",
    quantity: {
      quantity: 1,
      unit: "대",
    } as MachineryQuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "buyer",
      truckAccess: true,
      loading: "seller",
      sacksNeeded: false,
      craneAccess: true,
      forkliftAccess: true,
      drumNeeded: false,
      forkliftAvailable: false,
    } as MachinerySalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[0], // 강남
    description: "2015년식 CNC 선반입니다. 정밀도가 우수하고 상태가 좋습니다.",
    desiredPrice: 15000000,
    phoneNumberDisclosure: true,
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
    materialInfo: {
      materialType: "H빔",
      dimensions: "300x300x10x15",
      quantity: 5000,
      condition: "used",
      packaging: "적재",
    },
    transactionType: "urgent",
    auctionCategory: "materials",
    quantity: {
      knowsWeight: true,
      estimatedWeight: 5000,
      unit: "kg",
    } as MaterialQuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "buyer",
      truckAccess: true,
      loading: "seller",
      sacksNeeded: false,
      craneAccess: true,
      forkliftAccess: true,
    } as MaterialSalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[0], // 강남
    description: "건축용 H빔 자재입니다. 긴급 처분이 필요합니다.",
    desiredPrice: 15000000,
    phoneNumberDisclosure: true,
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
    materialInfo: {
      materialType: "철판",
      dimensions: "2000x1000x6mm",
      quantity: 100,
      condition: "like-new",
      packaging: "적재",
    },
    transactionType: "normal",
    auctionCategory: "materials",
    quantity: {
      knowsWeight: true,
      estimatedWeight: 2000,
      unit: "kg",
    } as MaterialQuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "buyer",
      truckAccess: true,
      loading: "seller",
      sacksNeeded: false,
      craneAccess: false,
      forkliftAccess: true,
    } as MaterialSalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[1], // 판교
    description: "신품 철판입니다. 건축용으로 적합합니다.",
    desiredPrice: 8000000,
    phoneNumberDisclosure: true,
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
    materialInfo: {
      materialType: "강관",
      dimensions: "Φ50mm x 6m",
      quantity: 200,
      condition: "used",
      packaging: "적재",
    },
    transactionType: "normal",
    auctionCategory: "materials",
    quantity: {
      knowsWeight: true,
      estimatedWeight: 3000,
      unit: "kg",
    } as MaterialQuantityInfo,
    salesEnvironment: {
      delivery: "both",
      shippingCost: "seller",
      truckAccess: true,
      loading: "both",
      sacksNeeded: false,
      craneAccess: true,
      forkliftAccess: true,
    } as MaterialSalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[3], // 김해시
    description: "중고 강관 자재입니다. 파이프라인 공사용으로 적합합니다.",
    desiredPrice: 12000000,
    phoneNumberDisclosure: true,
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
    demolitionTitle: "철거",
    specialNotes: "어디",
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
    } as DemolitionQuantityInfo,
    salesEnvironment: {
      delivery: "seller",
      shippingCost: "buyer",
      truckAccess: true,
      loading: "seller",
      sacksNeeded: false,
      craneAccess: true,
      forkliftAccess: true,
      dismantlingRequired: true,
      siteAccess: "24시간",
    } as DemolitionSalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[0], // 강남
    description: "주거용 건축물 철거입니다. 긴급 처분이 필요합니다.",
    desiredPrice: 5000000,
    phoneNumberDisclosure: true,
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
    demolitionTitle: "상가 철거",
    specialNotes: "24시간 현장 접근 가능",
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
    } as DemolitionQuantityInfo,
    salesEnvironment: {
      delivery: "both",
      shippingCost: "seller",
      truckAccess: true,
      loading: "both",
      sacksNeeded: true,
      craneAccess: true,
      forkliftAccess: true,
      dismantlingRequired: true,
      siteAccess: "24시간",
    } as DemolitionSalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[2], // 삼성동
    description: "상업용 건축물 부분 철거입니다. 전문 업체만 신청 가능합니다.",
    desiredPrice: 15000000,
    phoneNumberDisclosure: true,
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
    demolitionTitle: "공장 철거",
    specialNotes: "유해물질 처리 필요",
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
    } as DemolitionQuantityInfo,
    salesEnvironment: {
      delivery: "buyer",
      shippingCost: "buyer",
      truckAccess: true,
      loading: "buyer",
      sacksNeeded: true,
      craneAccess: true,
      forkliftAccess: true,
      dismantlingRequired: true,
      siteAccess: "24시간",
    } as DemolitionSalesEnvironment,
    photos: samplePhotos,
    address: sampleAddresses[4], // 부산
    description: "산업용 건축물 전면 철거입니다. 유해물질 처리가 포함됩니다.",
    desiredPrice: 30000000,
    phoneNumberDisclosure: true,
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
