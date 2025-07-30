/**
 * 프리미엄 서비스 요청 시스템 TypeScript 타입 정의
 * 작성일: 2025-01-30
 * 목적: 타입 안전성과 코드 가독성 향상
 */

import { PhotoItem } from "@/components/PhotoPicker";

// ============================================
// 기본 타입 정의
// ============================================

export type ServiceRequestStatus =
  | "pending" // 접수 대기
  | "assigned" // 담당자 배정
  | "in_progress" // 진행 중
  | "completed" // 완료
  | "cancelled"; // 취소

export type ServiceType = "appraisal" | "purchase";

// ============================================
// 서비스 요청 핵심 타입
// ============================================

export interface ServiceRequest {
  id: string;
  user_id?: string;
  service_type: ServiceType;
  status: ServiceRequestStatus;

  // 기본 정보
  contact_phone: string;
  address: string;
  address_detail?: string;
  description: string;

  // 처리 정보
  scheduled_date?: string;
  assigned_expert_id?: string;
  expert_notes?: string;
  estimated_value?: number;
  final_offer?: number;

  // 메타데이터
  created_at: string;
  updated_at: string;
  completed_at?: string;

  // 관계 데이터
  photos?: ServiceRequestPhoto[];
  status_logs?: ServiceRequestStatusLog[];
}

export interface ServiceRequestPhoto {
  id: string;
  service_request_id: string;
  photo_url: string;
  photo_order: number;
  is_representative: boolean;
  created_at: string;
}

export interface ServiceRequestStatusLog {
  id: string;
  service_request_id: string;
  old_status?: string;
  new_status: string;
  note?: string;
  created_at: string;
  created_by?: string;
}

// ============================================
// 폼 및 요청 데이터 타입
// ============================================

export interface ServiceRequestFormData {
  service_type: ServiceType;
  contact_phone: string;
  address: string;
  address_detail?: string;
  description: string;
  photos: PhotoItem[];
}

export interface CreateServiceRequestData {
  service_type: ServiceType;
  contact_phone: string;
  address: string;
  address_detail?: string;
  description: string;
  user_id?: string;
}

export interface UpdateServiceRequestData {
  id: string;
  status?: ServiceRequestStatus;
  scheduled_date?: string;
  assigned_expert_id?: string;
  expert_notes?: string;
  estimated_value?: number;
  final_offer?: number;
}

// ============================================
// 필터 및 쿼리 타입
// ============================================

export interface ServiceRequestFilters {
  status?: ServiceRequestStatus[];
  service_type?: ServiceType[];
  date_from?: string;
  date_to?: string;
  user_id?: string;
  search?: string;
}

export interface ServiceRequestListParams extends ServiceRequestFilters {
  page?: number;
  limit?: number;
  sort_by?: "created_at" | "updated_at" | "status";
  sort_order?: "asc" | "desc";
}

// ============================================
// API 응답 타입
// ============================================

export interface ServiceRequestResponse {
  data: ServiceRequest;
  error?: string;
}

export interface ServiceRequestListResponse {
  data: ServiceRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  error?: string;
}

export interface ServiceRequestStatsResponse {
  total_requests: number;
  completion_rate: number;
  average_processing_hours: number;
  appraisal_requests: number;
  purchase_requests: number;
  status_distribution: Record<ServiceRequestStatus, number>;
}

// ============================================
// 상태 관리 타입
// ============================================

export interface ServiceRequestState {
  requests: Record<string, ServiceRequest>;
  currentRequest?: ServiceRequest;
  filters: ServiceRequestFilters;
  isLoading: boolean;
  error?: string;
}

// ============================================
// 유틸리티 타입
// ============================================

export interface StatusTransition {
  from: ServiceRequestStatus;
  to: ServiceRequestStatus;
  allowed: boolean;
  requiresNote?: boolean;
}

export interface ServiceRequestValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================
// 상수 및 매핑 타입
// ============================================

export const STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  pending: "접수 대기",
  assigned: "담당자 배정",
  in_progress: "진행 중",
  completed: "완료",
  cancelled: "취소",
};

export const STATUS_COLORS: Record<ServiceRequestStatus, string> = {
  pending: "#FCD34D", // 노란색
  assigned: "#60A5FA", // 파란색
  in_progress: "#34D399", // 초록색
  completed: "#10B981", // 진한 초록색
  cancelled: "#F87171", // 빨간색
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  appraisal: "현장 방문 감정",
  purchase: "즉시 매입 서비스",
};

export const STATUS_TRANSITIONS: Record<
  ServiceRequestStatus,
  ServiceRequestStatus[]
> = {
  pending: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// ============================================
// 타입 가드 함수
// ============================================

export function isServiceRequestStatus(
  value: string
): value is ServiceRequestStatus {
  return [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "cancelled",
  ].includes(value);
}

export function isServiceType(value: string): value is ServiceType {
  return ["appraisal", "purchase"].includes(value);
}

export function isValidStatusTransition(
  from: ServiceRequestStatus,
  to: ServiceRequestStatus
): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

// ============================================
// 헬퍼 함수 타입
// ============================================

export type ServiceRequestValidator = (
  data: ServiceRequestFormData
) => ServiceRequestValidationResult;

export type ServiceRequestProcessor = (
  request: ServiceRequest
) => Promise<ServiceRequest>;

export type StatusChangeHandler = (
  requestId: string,
  newStatus: ServiceRequestStatus,
  note?: string
) => Promise<void>;

// ============================================
// 이벤트 타입
// ============================================

export interface ServiceRequestEvent {
  type: "created" | "updated" | "status_changed" | "deleted";
  request: ServiceRequest;
  changes?: Partial<ServiceRequest>;
  timestamp: string;
}

export type ServiceRequestEventHandler = (event: ServiceRequestEvent) => void;

// ============================================
// 리얼타임 구독 타입
// ============================================

export interface ServiceRequestSubscription {
  requestId?: string;
  userId?: string;
  status?: ServiceRequestStatus[];
  onUpdate: ServiceRequestEventHandler;
  onError?: (error: Error) => void;
}

// ============================================
// 내보내기
// ============================================

export type {
  PhotoItem, // PhotoPicker에서 가져온 타입 재내보내기
};

// 기본 내보내기
export default ServiceRequest;
