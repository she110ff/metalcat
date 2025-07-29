import { Ionicons } from "@expo/vector-icons";

// 경매 카테고리 타입
export type AuctionCategory =
  | "scrap"
  | "machinery"
  | "materials"
  | "demolition";

// 거래 종류 타입
export type TransactionType = "normal" | "urgent";

// ===== 공통 타입 =====

// 주소 정보 타입
export interface AddressInfo {
  postalCode: string;
  addressType: "road" | "lot"; // 도로명주소 또는 지번주소 구분
  address: string; // 도로명주소 또는 지번주소
  detailAddress: string;
}

// 사진 정보 타입
export interface PhotoInfo {
  id: string;
  uri: string;
  isRepresentative: boolean;
  type: "full" | "closeup" | "detail";
}

// 입찰 정보 타입
export interface BidInfo {
  id: string;
  userId: string;
  userName?: string;
  amount: number;
  pricePerUnit?: number; // 원/kg 등
  location: string;
  bidTime: Date;
  isTopBid: boolean;
}

// 공통 수량 정보 타입
export interface QuantityInfo {
  quantity: number;
  unit: string;
}

// 공통 판매 환경 타입 (고철, 중고기계, 중고자재에서만 사용)
export interface SalesEnvironment {
  delivery: "seller" | "buyer" | "both";
  shippingCost: "seller" | "buyer";
  truckAccess: boolean;
  loading: "seller" | "buyer" | "both";
  sacksNeeded: boolean;
}

// ===== 카테고리별 제품 타입 =====

// 제품 종류 타입 (고철)
export interface ScrapProductType {
  id: string;
  name: string;
  category: string;
  description?: string;
  auctionCategory: "scrap";
}

// 기계 종류 타입
export interface MachineryProductType {
  id: string;
  name: string;
  category: string;
  description?: string;
  auctionCategory: "machinery";
}

// 자재 종류 타입
export interface MaterialProductType {
  id: string;
  name: string;
  category: string;
  description?: string;
  auctionCategory: "materials";
}

// 철거 종류 타입
export interface DemolitionProductType {
  id: string;
  name: string;
  category: string;
  description?: string;
  auctionCategory: "demolition";
}

// ===== 철거 특화 타입 =====

// 철거 경매 특화 정보
export interface DemolitionInfo {
  buildingPurpose: "residential" | "commercial" | "industrial" | "public"; // 건축물 용도
  demolitionMethod: "full" | "partial" | "interior"; // 철거 방식
  structureType:
    | "masonry"
    | "reinforced-concrete"
    | "steel-frame"
    | "composite"; // 구조 타입
  demolitionScale: "small" | "medium" | "large"; // 철거 규모
  transactionType: "normal" | "urgent"; // 거래 종류 (긴급 경매는 12시간)
  wasteDisposal: "self" | "company"; // 폐기물 처리
  demolitionArea: number; // 철거 면적
  areaUnit: "sqm" | "pyeong"; // 면적 단위
  floorCount: number; // 현장 층수
  specialNotes?: string; // 특이 사항
  demolitionTitle: string; // 경매 타이틀
}

// ===== 통합 타입 =====

// 제품 종류 통합 타입
export type ProductType =
  | ScrapProductType
  | MachineryProductType
  | MaterialProductType
  | DemolitionProductType;

// ===== 경매 등록 폼 타입 =====

// 고철 경매 등록 폼
export interface ScrapAuctionFormData {
  title: string;
  productType: ScrapProductType;
  transactionType: TransactionType;
  auctionCategory: "scrap";
  quantity: QuantityInfo;
  salesEnvironment: SalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  specialNotes?: string;
  createdAt: Date;
  status: "draft" | "submitted" | "reviewing" | "approved" | "rejected";
}

// 중고 기계 경매 등록 폼
export interface MachineryAuctionFormData {
  title: string;
  productName: string; // 제품명
  manufacturer?: string; // 제조사
  modelName?: string; // 모델명
  manufacturingDate?: Date; // 제조일
  productType: MachineryProductType;
  transactionType: TransactionType;
  auctionCategory: "machinery";
  quantity: QuantityInfo;
  salesEnvironment: SalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  desiredPrice: number; // 희망 가격
  createdAt: Date;
  status: "draft" | "submitted" | "reviewing" | "approved" | "rejected";
}

// 중고 자재 경매 등록 폼
export interface MaterialAuctionFormData {
  title: string;
  productType: MaterialProductType;
  transactionType: TransactionType;
  auctionCategory: "materials";
  quantity: QuantityInfo;
  salesEnvironment: SalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  desiredPrice: number; // 희망 가격
  createdAt: Date;
  status: "draft" | "submitted" | "reviewing" | "approved" | "rejected";
}

// 철거 경매 등록 폼
export interface DemolitionAuctionFormData {
  title: string;
  productType: DemolitionProductType;
  demolitionInfo: DemolitionInfo;
  auctionCategory: "demolition";
  quantity: QuantityInfo;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  createdAt: Date;
  status: "draft" | "submitted" | "reviewing" | "approved" | "rejected";
}

// 경매 등록 폼 통합 타입
export type AuctionFormData =
  | ScrapAuctionFormData
  | MachineryAuctionFormData
  | MaterialAuctionFormData
  | DemolitionAuctionFormData;

// ===== 경매 아이템 타입 =====

// 고철 경매 아이템
export interface ScrapAuctionItem {
  id: string;
  title: string;
  productType: ScrapProductType;
  transactionType: TransactionType;
  auctionCategory: "scrap";
  quantity: QuantityInfo;
  salesEnvironment: SalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  specialNotes?: string;
  currentBid?: number;
  pricePerUnit?: number;
  totalBidAmount?: number;
  endTime: Date;
  status: "active" | "ending" | "ended";
  bidders: number;
  viewCount: number;
  bids: BidInfo[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// 중고 기계 경매 아이템
export interface MachineryAuctionItem {
  id: string;
  title: string;
  productName: string;
  manufacturer: string;
  modelName: string;
  manufacturingDate?: Date;
  productType: MachineryProductType;
  transactionType: TransactionType;
  auctionCategory: "machinery";
  quantity: QuantityInfo;
  salesEnvironment: SalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  desiredPrice: number;
  currentBid?: number;
  pricePerUnit?: number;
  totalBidAmount?: number;
  endTime: Date;
  status: "active" | "ending" | "ended";
  bidders: number;
  viewCount: number;
  bids: BidInfo[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// 중고 자재 경매 아이템
export interface MaterialAuctionItem {
  id: string;
  title: string;
  productType: MaterialProductType;
  transactionType: TransactionType;
  auctionCategory: "materials";
  quantity: QuantityInfo;
  salesEnvironment: SalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  desiredPrice: number; // 희망 가격
  currentBid?: number;
  pricePerUnit?: number;
  totalBidAmount?: number;
  endTime: Date;
  status: "active" | "ending" | "ended";
  bidders: number;
  viewCount: number;
  bids: BidInfo[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// 철거 경매 아이템
export interface DemolitionAuctionItem {
  id: string;
  title: string;
  productType: DemolitionProductType;
  demolitionInfo: DemolitionInfo;
  auctionCategory: "demolition";
  quantity: QuantityInfo;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  currentBid?: number;
  pricePerUnit?: number;
  totalBidAmount?: number;
  endTime: Date;
  status: "active" | "ending" | "ended";
  bidders: number;
  viewCount: number;
  bids: BidInfo[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// 경매 아이템 통합 타입
export type AuctionItem =
  | ScrapAuctionItem
  | MachineryAuctionItem
  | MaterialAuctionItem
  | DemolitionAuctionItem;
