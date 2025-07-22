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
  roadAddress: string;
  lotAddress: string;
  detailAddress: string;
  city?: string; // 추가: 시/도
  district?: string; // 추가: 구/군
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

// ===== 고철 경매 타입 =====

// 제품 종류 타입 (고철)
export interface ScrapProductType {
  id: string;
  name: string;
  category: string;
  description?: string;
  auctionCategory: "scrap";
}

// 수량 정보 타입 (고철)
export interface ScrapQuantityInfo {
  knowsWeight: boolean;
  weightRange?: string;
  estimatedWeight?: number;
  unit?: string; // kg
}

// 판매 환경 타입 (고철)
export interface ScrapSalesEnvironment {
  delivery: "seller" | "buyer" | "both";
  shippingCost: "seller" | "buyer";
  truckAccess: boolean;
  loading: "seller" | "buyer" | "both";
  sacksNeeded: boolean;
}

// ===== 중고 기계 타입 =====

// 기계 종류 타입
export interface MachineryProductType {
  id: string;
  name: string;
  category: string;
  description?: string;
  auctionCategory: "machinery";
}

// 기계 상세 정보 타입
export interface MachineryInfo {
  brand?: string;
  model?: string;
  year?: number;
  condition: "excellent" | "good" | "fair" | "poor";
  workingHours?: number;
  maintenanceHistory?: string;
  specifications?: Record<string, any>;
  manufacturingDate?: Date; // 제조 연월
}

// 수량 정보 타입 (기계)
export interface MachineryQuantityInfo {
  quantity: number;
  unit: "대" | "세트" | "개";
}

// 판매 환경 타입 (기계)
export interface MachinerySalesEnvironment {
  delivery: "seller" | "buyer" | "both";
  shippingCost: "seller" | "buyer";
  truckAccess: boolean;
  loading: "seller" | "buyer" | "both";
  sacksNeeded: boolean;
  craneAccess?: boolean;
  forkliftAccess?: boolean;
  drumNeeded?: boolean; // 드럼통 필요
  forkliftAvailable?: boolean; // 지게차 보유
}

// ===== 중고 자재 타입 =====

// 자재 종류 타입
export interface MaterialProductType {
  id: string;
  name: string;
  category: string;
  description?: string;
  auctionCategory: "materials";
}

// 자재 상세 정보 타입
export interface MaterialInfo {
  materialType: string;
  dimensions?: string;
  quantity: number;
  condition: "new" | "like-new" | "used" | "damaged";
  packaging?: string;
  specifications?: Record<string, any>;
}

// 수량 정보 타입 (자재)
export interface MaterialQuantityInfo {
  knowsWeight: boolean;
  estimatedWeight?: number;
  quantity?: number;
  unit: "kg" | "개" | "세트";
}

// 판매 환경 타입 (자재)
export interface MaterialSalesEnvironment {
  delivery: "seller" | "buyer" | "both";
  shippingCost: "seller" | "buyer";
  truckAccess: boolean;
  loading: "seller" | "buyer" | "both";
  sacksNeeded: boolean;
  craneAccess?: boolean;
  forkliftAccess?: boolean;
}

// ===== 철거 타입 =====

// 철거 종류 타입
export interface DemolitionProductType {
  id: string;
  name: string;
  category: string;
  description?: string;
  auctionCategory: "demolition";
}

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

// 수량 정보 타입 (철거)
export interface DemolitionQuantityInfo {
  quantity: number;
  unit: "건물" | "평" | "㎡";
}

// 철거 경매 판매 환경
export interface DemolitionSalesEnvironment {
  delivery: "seller" | "buyer" | "both";
  shippingCost: "seller" | "buyer";
  truckAccess: boolean;
  loading: "seller" | "buyer" | "both";
  sacksNeeded: boolean;
  craneAccess: boolean;
  forkliftAccess: boolean;
  dismantlingRequired: boolean; // 철거 필요 여부
  siteAccess?: string; // 현장 접근 시간 (예: "24시간")
}

// ===== 통합 타입 =====

// 제품 종류 통합 타입
export type ProductType =
  | ScrapProductType
  | MachineryProductType
  | MaterialProductType
  | DemolitionProductType;

// 수량 정보 통합 타입
export type QuantityInfo =
  | ScrapQuantityInfo
  | MachineryQuantityInfo
  | MaterialQuantityInfo
  | DemolitionQuantityInfo;

// 판매 환경 통합 타입
export type SalesEnvironment =
  | ScrapSalesEnvironment
  | MachinerySalesEnvironment
  | MaterialSalesEnvironment
  | DemolitionSalesEnvironment;

// ===== 경매 등록 폼 타입 =====

// 고철 경매 등록 폼
export interface ScrapAuctionFormData {
  title: string;
  productType: ScrapProductType;
  transactionType: TransactionType;
  auctionCategory: "scrap";
  quantity: ScrapQuantityInfo;
  salesEnvironment: ScrapSalesEnvironment;
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
  productType: MachineryProductType;
  machineryInfo: MachineryInfo;
  transactionType: TransactionType;
  auctionCategory: "machinery";
  quantity: MachineryQuantityInfo;
  salesEnvironment: MachinerySalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  desiredPrice: number; // 희망 가격
  phoneNumberDisclosure: boolean; // 전화번호 노출 동의
  createdAt: Date;
  status: "draft" | "submitted" | "reviewing" | "approved" | "rejected";
}

// 중고 자재 경매 등록 폼
export interface MaterialAuctionFormData {
  title: string;
  productType: MaterialProductType;
  materialInfo: MaterialInfo;
  transactionType: TransactionType;
  auctionCategory: "materials";
  quantity: MaterialQuantityInfo;
  salesEnvironment: MaterialSalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  desiredPrice: number; // 희망 가격 (중고 자재도 필요)
  phoneNumberDisclosure: boolean; // 전화번호 노출 동의 (중고 자재도 필요)
  createdAt: Date;
  status: "draft" | "submitted" | "reviewing" | "approved" | "rejected";
}

// 철거 경매 등록 폼
export interface DemolitionAuctionFormData {
  demolitionTitle: string; // 경매 타이틀
  specialNotes?: string; // 특이 사항
  productType: DemolitionProductType;
  demolitionInfo: DemolitionInfo;
  auctionCategory: "demolition";
  quantity: DemolitionQuantityInfo;
  salesEnvironment: DemolitionSalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  desiredPrice: number; // 희망 가격
  phoneNumberDisclosure: boolean; // 전화번호 노출 동의
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
  quantity: ScrapQuantityInfo;
  salesEnvironment: ScrapSalesEnvironment;
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
  manufacturer?: string;
  modelName?: string;
  productType: MachineryProductType;
  machineryInfo: MachineryInfo;
  transactionType: TransactionType;
  auctionCategory: "machinery";
  quantity: MachineryQuantityInfo;
  salesEnvironment: MachinerySalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  desiredPrice: number;
  phoneNumberDisclosure: boolean;
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
  materialInfo: MaterialInfo;
  transactionType: TransactionType;
  auctionCategory: "materials";
  quantity: MaterialQuantityInfo;
  salesEnvironment: MaterialSalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  desiredPrice: number; // 희망 가격
  phoneNumberDisclosure: boolean; // 전화번호 노출 동의
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
  demolitionTitle: string; // 경매 타이틀
  specialNotes?: string; // 특이 사항
  productType: DemolitionProductType;
  demolitionInfo: DemolitionInfo;
  auctionCategory: "demolition";
  quantity: DemolitionQuantityInfo;
  salesEnvironment: DemolitionSalesEnvironment;
  photos: PhotoInfo[];
  address: AddressInfo;
  description: string;
  desiredPrice: number; // 희망 가격
  phoneNumberDisclosure: boolean; // 전화번호 노출 동의
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
