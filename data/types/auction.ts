import { Ionicons } from "@expo/vector-icons";

// 경매 카테고리 타입
export type AuctionCategory =
  | "scrap"
  | "machinery"
  | "materials"
  | "demolition";

// 금속 분류 타입 (scrap 카테고리 내에서 사용)
export type FerrousType = "ferrous" | "nonferrous";

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
  accessibility: "easy" | "normal" | "difficult";
  loading: "seller" | "buyer" | "both";
  sacksNeeded: boolean;
}

// ===== 카테고리별 제품 타입 =====

// 제품 종류 타입 (고철/비철)
export interface ScrapProductType {
  id: string;
  name: string;
  category: string;
  description?: string;
  auctionCategory: "scrap";
  ferrousType: FerrousType;
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
  buildingPurpose: "residential" | "commercial" | "public"; // 건축물 용도
  demolitionMethod: "full" | "partial" | "interior"; // 철거 방식
  structureType: "masonry" | "reinforced-concrete" | "steel-frame"; // 구조 타입

  transactionType: "normal" | "urgent"; // 거래 종류 (긴급 경매는 2일간)
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

// 고철/비철 경매 등록 폼
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

// 승인 상태 타입
export type ApprovalStatus =
  | "pending_approval" // 관리자 승인 대기
  | "approved" // 승인됨 (일반 공개)
  | "hidden" // 히든 경매
  | "rejected"; // 거부됨

// 고철/비철 경매 아이템
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
  sellerName?: string;
  sellerPhone?: string;
  approvalStatus: ApprovalStatus;
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
  sellerName?: string;
  sellerPhone?: string;
  approvalStatus: ApprovalStatus;
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
  sellerName?: string;
  sellerPhone?: string;
  approvalStatus: ApprovalStatus;
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
  sellerName?: string;
  sellerPhone?: string;
  approvalStatus: ApprovalStatus;
}

// 경매 아이템 통합 타입
export type AuctionItem =
  | ScrapAuctionItem
  | MachineryAuctionItem
  | MaterialAuctionItem
  | DemolitionAuctionItem;

// ===== 낙찰/유찰 시스템 타입 =====

// 경매 결과 타입
export type AuctionResult =
  | "successful" // 낙찰
  | "failed" // 유찰
  | "cancelled" // 취소
  | null; // 미결정 (진행중)

// 거래 상태 타입
export type TransactionStatus =
  | "pending" // 결제 대기
  | "paid" // 결제 완료
  | "delivered" // 배송 완료
  | "completed" // 거래 완료
  | "failed"; // 거래 실패

// 경매 결과 정보
export interface AuctionResultInfo {
  id: string;
  auctionId: string;
  result: AuctionResult;

  // 낙찰 정보 (successful인 경우)
  winningBidId?: string;
  winningUserId?: string;
  winningAmount?: number;
  winningUserName?: string;

  // 처리 정보
  processedAt: Date;

  // 메타데이터
  metadata?: {
    reason?: "no_bids" | "below_starting_price" | "unknown";
    sellerId?: string;
    processingTime?: Date;
    [key: string]: any;
  };

  createdAt: Date;
  updatedAt: Date;
}

// 거래/결제 정보
export interface TransactionInfo {
  id: string;
  auctionResultId: string;
  transactionStatus: TransactionStatus;

  // 결제 정보
  paymentMethod?: string;
  paymentConfirmedAt?: Date;
  paymentAmount?: number;

  // 배송/거래 정보
  deliveryStatus: string;
  deliveryScheduledAt?: Date;
  deliveryCompletedAt?: Date;

  // 연락처 정보
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: AddressInfo;
    [key: string]: any;
  };

  // 기타
  notes?: string;
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

// 내 경매 결과 (마이페이지용)
export interface MyAuctionResult {
  auction: AuctionItem;
  result: AuctionResultInfo;
  transaction?: TransactionInfo;
  isWinner: boolean;
  isSeller: boolean;
}

// 경매 통계 타입
export interface AuctionStats {
  todayProcessed: number;
  todaySuccessful: number;
  todayFailed: number;
  thisWeekProcessed: number;
  successRate: number;
}
