import {
  AuctionItem,
  ScrapAuctionItem,
  MachineryAuctionItem,
  MaterialAuctionItem,
  DemolitionAuctionItem,
  TransactionType,
  AuctionCategory,
  BidInfo,
} from "@/data/types/auction";

// 경매 상태에 따른 색상 반환
export const getAuctionStatusColor = (status: string): string => {
  switch (status) {
    case "active":
      return "rgba(34, 197, 94, 0.9)"; // 초록색
    case "ending":
      return "rgba(245, 158, 11, 0.9)"; // 주황색
    case "ended":
      return "rgba(239, 68, 68, 0.9)"; // 빨간색
    default:
      return "rgba(107, 114, 128, 0.9)"; // 회색
  }
};

// 경매 상태 텍스트 반환
export const getAuctionStatusText = (status: string): string => {
  switch (status) {
    case "active":
      return "진행중";
    case "ending":
      return "마감임박";
    case "ended":
      return "종료됨";
    default:
      return "알 수 없음";
  }
};

// 거래 종류 텍스트 반환
export const getTransactionTypeText = (type: TransactionType): string => {
  switch (type) {
    case "normal":
      return "일반 경매";
    case "urgent":
      return "긴급 경매";
    default:
      return "알 수 없음";
  }
};

// 경매 카테고리 텍스트 반환
export const getAuctionCategoryText = (category: AuctionCategory): string => {
  switch (category) {
    case "scrap":
      return "고철 경매";
    case "machinery":
      return "중고 기계";
    case "materials":
      return "중고 자재";
    case "demolition":
      return "철거 경매";
    default:
      return "알 수 없음";
  }
};

// 경매 아이템이 중고 기계인지 확인
export const isMachineryAuction = (
  item: AuctionItem
): item is MachineryAuctionItem => {
  return item.auctionCategory === "machinery";
};

// 경매 아이템이 고철인지 확인
export const isScrapAuction = (item: AuctionItem): item is ScrapAuctionItem => {
  return item.auctionCategory === "scrap";
};

// 경매 아이템이 자재인지 확인
export const isMaterialAuction = (
  item: AuctionItem
): item is MaterialAuctionItem => {
  return item.auctionCategory === "materials";
};

// 경매 아이템이 철거인지 확인
export const isDemolitionAuction = (
  item: AuctionItem
): item is DemolitionAuctionItem => {
  return item.auctionCategory === "demolition";
};

// 남은 시간 계산 (상세화면용)
export const getRemainingTime = (endTime: Date | undefined): string => {
  if (!endTime) {
    return "종료됨";
  }

  const now = new Date();
  const diff = endTime.getTime() - now.getTime();

  if (diff <= 0) {
    return "종료됨";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}일 ${hours}시간 남음`;
  } else if (hours > 0) {
    return `${hours}시간 ${minutes}분 남음`;
  } else {
    return `${minutes}분 남음`;
  }
};

// 경매 가격 포맷팅
export const formatAuctionPrice = (price: number): string => {
  return `₩${price.toLocaleString()}`;
};

// 단위별 가격 포맷팅
export const formatPricePerUnit = (
  price: number,
  unit: string = "kg"
): string => {
  return `₩${price.toLocaleString()}/${unit}`;
};

// 경매 기간 계산 (거래 종류에 따라)
export const getAuctionDuration = (type: TransactionType): number => {
  switch (type) {
    case "normal":
      return 3; // 3일
    case "urgent":
      return 1; // 1일
    default:
      return 3;
  }
};

// 경매 종료 시간 계산
export const calculateEndTime = (type: TransactionType): Date => {
  const duration = getAuctionDuration(type);
  const endTime = new Date();
  endTime.setDate(endTime.getDate() + duration);
  return endTime;
};

// 입찰 정보 정렬 (최고 입찰순)
export const sortBidsByAmount = (bids: BidInfo[]): BidInfo[] => {
  return [...bids].sort((a, b) => b.amount - a.amount);
};

// 최고 입찰 정보 가져오기
export const getTopBid = (bids: BidInfo[]): BidInfo | null => {
  if (bids.length === 0) return null;
  return sortBidsByAmount(bids)[0];
};

// 총 입찰 금액 계산
export const calculateTotalBidAmount = (bids: BidInfo[]): number => {
  return bids.reduce((total, bid) => total + bid.amount, 0);
};

// 경매 아이템 필터링
export const filterAuctionItems = (
  items: AuctionItem[],
  filters: {
    status?: string;
    productType?: string;
    transactionType?: TransactionType;
    auctionCategory?: AuctionCategory;
    location?: string;
  }
): AuctionItem[] => {
  return items.filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.productType && item.productType.id !== filters.productType)
      return false;
    if (filters.transactionType) {
      if (isDemolitionAuction(item)) {
        if (item.demolitionInfo.transactionType !== filters.transactionType)
          return false;
      } else {
        if (item.transactionType !== filters.transactionType) return false;
      }
    }
    if (
      filters.auctionCategory &&
      item.auctionCategory !== filters.auctionCategory
    )
      return false;
    if (
      filters.location &&
      !item.address.city?.includes(filters.location) &&
      !item.address.district?.includes(filters.location)
    )
      return false;
    return true;
  });
};

// 경매 아이템 정렬
export const sortAuctionItems = (
  items: AuctionItem[],
  sortBy:
    | "endTime"
    | "currentBid"
    | "bidders"
    | "createdAt"
    | "viewCount"
    | "pricePerUnit",
  order: "asc" | "desc" = "desc"
): AuctionItem[] => {
  return [...items].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortBy) {
      case "endTime":
        aValue = a.endTime.getTime();
        bValue = b.endTime.getTime();
        break;
      case "currentBid":
        aValue = a.currentBid || 0;
        bValue = b.currentBid || 0;
        break;
      case "bidders":
        aValue = a.bidders;
        bValue = b.bidders;
        break;
      case "createdAt":
        aValue = a.createdAt.getTime();
        bValue = b.createdAt.getTime();
        break;
      case "viewCount":
        aValue = a.viewCount;
        bValue = b.viewCount;
        break;
      case "pricePerUnit":
        aValue = a.pricePerUnit || 0;
        bValue = b.pricePerUnit || 0;
        break;
      default:
        return 0;
    }

    if (order === "asc") {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });
};

// 경매 카테고리별 아이템 가져오기
export const getAuctionsByCategory = (
  items: AuctionItem[],
  category: AuctionCategory
): AuctionItem[] => {
  return items.filter((item) => item.auctionCategory === category);
};

// 조회수 포맷팅
export const formatViewCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

// 입찰자 수 포맷팅
export const formatBiddersCount = (count: number): string => {
  return `${count}명`;
};

// 등록일 포맷팅
export const formatRegistrationDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `등록 ${year}/${month}/${day}`;
};

// 중고 기계 제품명 가져오기
export const getMachineryProductName = (item: MachineryAuctionItem): string => {
  return item.productName || item.title;
};

// 중고 기계 제조사 정보 가져오기
export const getMachineryManufacturer = (
  item: MachineryAuctionItem
): string => {
  return item.manufacturer || "미상";
};

// 중고 기계 모델명 정보 가져오기
export const getMachineryModelName = (item: MachineryAuctionItem): string => {
  return item.modelName || "미상";
};

// 중고 기계 제조일 정보 가져오기
export const getMachineryManufacturingDate = (
  item: MachineryAuctionItem
): string => {
  if (!item.manufacturingDate) return "미상";

  const year = item.manufacturingDate.getFullYear();
  const month = String(item.manufacturingDate.getMonth() + 1).padStart(2, "0");
  return `${year}년 ${month}월`;
};

// 고철 특이 사항 가져오기
export const getScrapSpecialNotes = (item: ScrapAuctionItem): string => {
  return item.specialNotes || "";
};

// 철거 경매 건축물 용도 정보 가져오기
export const getDemolitionBuildingPurpose = (
  item: DemolitionAuctionItem
): string => {
  const purposeMap = {
    residential: "주거용 건축물",
    commercial: "상업용 건축물",
    industrial: "산업용 건축물",
    public: "공공시설 철거",
  };
  return purposeMap[item.demolitionInfo.buildingPurpose] || "미상";
};

// 철거 경매 철거 방식 정보 가져오기
export const getDemolitionMethod = (item: DemolitionAuctionItem): string => {
  const methodMap = {
    full: "전면 철거",
    partial: "부분 철거",
    interior: "내부 철거",
  };
  return methodMap[item.demolitionInfo.demolitionMethod] || "미상";
};

// 철거 경매 구조 타입 정보 가져오기
export const getDemolitionStructureType = (
  item: DemolitionAuctionItem
): string => {
  const structureMap = {
    masonry: "조적조",
    "reinforced-concrete": "철근콘크리트",
    "steel-frame": "철골조",
  };
  return structureMap[item.demolitionInfo.structureType] || "미상";
};

// 철거 경매 폐기물 처리 정보 가져오기
export const getDemolitionWasteDisposal = (
  item: DemolitionAuctionItem
): string => {
  const disposalMap = {
    self: "직접 처리",
    company: "업체 처리",
  };
  return disposalMap[item.demolitionInfo.wasteDisposal] || "미상";
};

// 철거 경매 면적 정보 가져오기 (단위 변환 포함)
export const getDemolitionArea = (item: DemolitionAuctionItem): string => {
  const area = item.demolitionInfo.demolitionArea;
  const unit = item.demolitionInfo.areaUnit;

  if (unit === "sqm") {
    const pyeong = (area * 0.3025).toFixed(2);
    return `${area}m² (${pyeong}평)`;
  } else {
    const sqm = (area / 0.3025).toFixed(2);
    return `${area}평 (${sqm}m²)`;
  }
};

// 철거 경매 특이 사항 정보 가져오기
export const getDemolitionSpecialNotes = (
  item: DemolitionAuctionItem
): string => {
  return item.demolitionInfo.specialNotes || "없음";
};

// 철거 경매 타이틀 정보 가져오기
export const getDemolitionTitle = (item: DemolitionAuctionItem): string => {
  return item.demolitionInfo.demolitionTitle || item.title || "철거";
};

// ===== 경매 진행 방식 관리 유틸리티 =====

// 경매 종료 시간 계산 (오후 6시 고정)
export const calculateAuctionEndTime = (
  transactionType: "normal" | "urgent",
  startDate?: Date
): Date => {
  const start = startDate || new Date();
  const daysToAdd = transactionType === "urgent" ? 2 : 7; // 긴급: 2일, 일반: 7일

  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + daysToAdd);

  // 오후 6시로 설정 (18:00:00)
  endDate.setHours(18, 0, 0, 0);

  return endDate;
};

// 경매 진행 방식 정보 가져오기
export const getAuctionDurationInfo = (
  transactionType: "normal" | "urgent"
) => {
  return {
    duration: transactionType === "urgent" ? "2일" : "7일",
    description:
      transactionType === "urgent"
        ? "긴급 경매 (2일간 진행)"
        : "일반 경매 (7일간 진행)",
    endTime: "오후 6시 종료",
    fullDescription:
      transactionType === "urgent"
        ? "긴급 경매는 2일간 진행되며, 등록 승인에 최대 1시간 소요됩니다."
        : "일반 경매는 7일간 진행되며, 등록 승인에 최대 1시간 소요됩니다.",
  };
};

// 경매 종료까지 남은 시간 계산 (시/분 단위)
export const getTimeUntilAuctionEnd = (endTime: Date): string => {
  const now = new Date();
  const diffInMs = endTime.getTime() - now.getTime();

  if (diffInMs <= 0) {
    return "종료됨";
  }

  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffInHours >= 24) {
    const days = Math.floor(diffInHours / 24);
    const hours = diffInHours % 24;
    return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`;
  } else if (diffInHours > 0) {
    return diffInMinutes > 0
      ? `${diffInHours}시간 ${diffInMinutes}분`
      : `${diffInHours}시간`;
  } else {
    return `${diffInMinutes}분`;
  }
};

// 목록용 간결한 남은 시간 표시 (일/시간/분 단위로 단순하게)
export const getCompactRemainingTime = (
  endTime: Date | string | undefined
): string => {
  if (!endTime) {
    return "종료됨";
  }

  // Date 객체로 변환 시도
  let dateObj: Date;
  try {
    dateObj = endTime instanceof Date ? endTime : new Date(endTime);

    // 유효한 Date인지 확인
    if (isNaN(dateObj.getTime())) {
      return "종료됨";
    }
  } catch (error) {
    return "종료됨";
  }

  const now = new Date();
  const diff = dateObj.getTime() - now.getTime();

  if (diff <= 0) {
    return "종료됨";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  // 24시간 이상일 때: "X일"
  if (days > 0) {
    return `${days}일`;
  }
  // 60분 이상일 때: "X시간"
  else if (hours > 0) {
    return `${hours}시간`;
  }
  // 그 이하: "X분"
  else {
    return `${minutes}분`;
  }
};

// 경매 상태에 따른 마감 정보 텍스트
export const getAuctionDeadlineText = (
  transactionType: "normal" | "urgent",
  endTime: Date
): string => {
  const timeRemaining = getTimeUntilAuctionEnd(endTime);
  const durationType = transactionType === "urgent" ? "긴급" : "일반";

  if (timeRemaining === "종료됨") {
    return "경매 종료";
  }

  return `${durationType} • ${timeRemaining} 남음`;
};

// 경매 생성 시 기본 종료 시간 설정
export const getDefaultAuctionEndTime = (
  transactionType: "normal" | "urgent"
): Date => {
  return calculateAuctionEndTime(transactionType);
};
