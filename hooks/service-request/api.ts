/**
 * 프리미엄 서비스 요청 API 함수
 * 작성일: 2025-01-30
 * 목적: Supabase를 통한 서비스 요청 CRUD 작업
 */

import { supabase } from "./supabaseClient";
import * as FileSystem from "expo-file-system";
import {
  ServiceRequest,
  ServiceRequestPhoto,
  ServiceRequestStatusLog,
  CreateServiceRequestData,
  UpdateServiceRequestData,
  ServiceRequestFilters,
  ServiceRequestListParams,
  ServiceRequestListResponse,
  ServiceRequestStatsResponse,
  ServiceRequestValidationResult,
} from "@/types/service-request";

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 서비스 요청 데이터 검증
 */
export function validateServiceRequest(
  data: CreateServiceRequestData
): ServiceRequestValidationResult {
  const errors: string[] = [];

  // 전화번호 검증
  if (!data.contact_phone || !/^[0-9-+().\s]+$/.test(data.contact_phone)) {
    errors.push("올바른 전화번호를 입력해주세요.");
  }

  // 주소 검증
  if (!data.address || data.address.length < 10) {
    errors.push("상세한 주소를 입력해주세요.");
  }

  // 설명 검증
  if (!data.description || data.description.length < 20) {
    errors.push("상세한 설명을 20자 이상 입력해주세요.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 에러 처리 유틸리티
 */
function handleSupabaseError(error: any, operation: string): never {
  console.error(`[ServiceRequest API] ${operation} 실패:`, error);
  throw new Error(`${operation} 중 오류가 발생했습니다: ${error.message}`);
}

// ============================================
// 서비스 요청 CRUD 함수
// ============================================

/**
 * 새 서비스 요청 생성
 */
export async function createServiceRequest(
  data: CreateServiceRequestData
): Promise<ServiceRequest> {
  try {
    // 데이터 검증
    const validation = validateServiceRequest(data);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    // 전달받은 user_id 사용 (React Native useAuth에서 전달됨)
    const requestData = {
      service_type: data.service_type,
      contact_phone: data.contact_phone,
      address: data.address,
      address_detail: data.address_detail,
      description: data.description,
      user_id: data.user_id ?? null, // 폼에서 전달받은 사용자 ID (undefined → null)
    };

    console.log("📝 [API] createServiceRequest 호출:");
    console.log("  - 전달받은 data.user_id:", data.user_id);
    console.log("  - 최종 requestData.user_id:", requestData.user_id);
    console.log("  - 요청 타입:", data.service_type);

    const { data: request, error } = await supabase
      .from("service_requests")
      .insert(requestData)
      .select()
      .single();

    if (error) {
      console.error("❌ [API] 서비스 요청 생성 실패:", error);
      handleSupabaseError(error, "서비스 요청 생성");
    }

    console.log("✅ [API] 서비스 요청 생성 성공:");
    console.log("  - 생성된 ID:", request.id);
    console.log("  - 저장된 user_id:", request.user_id);
    console.log("  - 요청 타입:", request.service_type);

    return request;
  } catch (error) {
    console.error("서비스 요청 생성 실패:", error);
    throw error;
  }
}

/**
 * 서비스 요청 상세 조회
 */
export async function getServiceRequest(id: string): Promise<ServiceRequest> {
  try {
    const { data: request, error } = await supabase
      .from("service_requests")
      .select(
        `
        *,
        photos:service_request_photos(*),
        status_logs:service_request_status_logs(*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      handleSupabaseError(error, "서비스 요청 조회");
    }

    if (!request) {
      throw new Error("서비스 요청을 찾을 수 없습니다.");
    }

    return request;
  } catch (error) {
    console.error("서비스 요청 조회 실패:", error);
    throw error;
  }
}

/**
 * 서비스 요청 목록 조회 (페이지네이션 포함)
 */
export async function getServiceRequests(
  params: ServiceRequestListParams = {}
): Promise<ServiceRequestListResponse> {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      service_type,
      date_from,
      date_to,
      user_id,
      search,
      sort_by = "created_at",
      sort_order = "desc",
    } = params;

    let query = supabase.from("service_requests").select(
      `
        *,
        photos:service_request_photos(*)
      `,
      { count: "exact" }
    );

    // 필터 적용
    if (status && status.length > 0) {
      query = query.in("status", status);
    }

    if (service_type && service_type.length > 0) {
      query = query.in("service_type", service_type);
    }

    if (date_from) {
      query = query.gte("created_at", date_from);
    }

    if (date_to) {
      query = query.lte("created_at", date_to);
    }

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    if (search) {
      query = query.or(
        `description.ilike.%${search}%,address.ilike.%${search}%,contact_phone.ilike.%${search}%`
      );
    }

    // 정렬 및 페이지네이션
    query = query.order(sort_by, { ascending: sort_order === "asc" });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: requests, error, count } = await query;

    if (error) {
      handleSupabaseError(error, "서비스 요청 목록 조회");
    }

    const total = count || 0;
    const total_pages = Math.ceil(total / limit);

    return {
      data: requests || [],
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
    };
  } catch (error) {
    console.error("서비스 요청 목록 조회 실패:", error);
    throw error;
  }
}

/**
 * 사용자의 서비스 요청 목록 조회
 */
export async function getUserServiceRequests(
  userId?: string
): Promise<ServiceRequest[]> {
  try {
    console.log("📋 [API] getUserServiceRequests 호출:");
    console.log("  - 전달받은 userId:", userId);

    // userId가 제공되지 않은 경우 빈 배열 반환
    if (!userId) {
      console.log("📋 [API] userId가 없어서 빈 배열 반환");
      return [];
    }

    const { data: requests, error } = await supabase
      .from("service_requests")
      .select(
        `
        *,
        photos:service_request_photos(*)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [API] 사용자 서비스 요청 조회 실패:", error);
      handleSupabaseError(error, "사용자 서비스 요청 조회");
    }

    console.log("✅ [API] 사용자 서비스 요청 조회 성공:");
    console.log("  - 조회된 요청 수:", requests?.length || 0);
    console.log(
      "  - 요청 목록:",
      requests?.map((r) => ({
        id: r.id,
        type: r.service_type,
        status: r.status,
      }))
    );

    return requests || [];
  } catch (error) {
    console.error("사용자 서비스 요청 조회 실패:", error);
    throw error;
  }
}

/**
 * 서비스 요청 수정
 */
export async function updateServiceRequest(
  data: UpdateServiceRequestData
): Promise<ServiceRequest> {
  try {
    const { id, ...updateData } = data;

    const { data: request, error } = await supabase
      .from("service_requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, "서비스 요청 수정");
    }

    return request;
  } catch (error) {
    console.error("서비스 요청 수정 실패:", error);
    throw error;
  }
}

/**
 * 서비스 요청 삭제
 */
export async function deleteServiceRequest(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("service_requests")
      .delete()
      .eq("id", id);

    if (error) {
      handleSupabaseError(error, "서비스 요청 삭제");
    }
  } catch (error) {
    console.error("서비스 요청 삭제 실패:", error);
    throw error;
  }
}

// ============================================
// 사진 관련 함수
// ============================================

/**
 * 서비스 요청 사진 업로드
 */
export async function uploadServiceRequestPhoto(
  file: any,
  requestId: string,
  order: number = 0
): Promise<ServiceRequestPhoto> {
  try {
    console.log("📸 사진 업로드 시작:", {
      requestId,
      order,
      fileType: typeof file,
      fileStructure: file,
    });

    if (!file) {
      throw new Error("업로드할 파일이 없습니다.");
    }

    // PhotoItem 객체에서 URI 추출
    let fileUri = file.uri || file;
    if (typeof file === "string") {
      fileUri = file;
    }

    if (!fileUri) {
      throw new Error("파일 URI가 없습니다.");
    }

    console.log("📸 파일 URI:", fileUri);

    // 파일 확장자 추출
    const ext = fileUri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${requestId}/photo_${order}_${Date.now()}.${ext}`;

    // expo-file-system을 사용해서 파일을 base64로 읽기
    let fileData;

    try {
      console.log("📸 expo-file-system으로 파일 읽기 시도...");

      // 파일을 base64로 읽기
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // base64를 decode해서 ArrayBuffer로 변환
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;

      console.log("📸 파일 데이터 읽기 성공:", {
        originalSize: base64.length,
        bufferSize: fileData.byteLength,
        type: "ArrayBuffer from base64",
      });
    } catch (fileSystemError) {
      console.error(
        "📸 FileSystem 읽기 실패, Blob 방식으로 시도:",
        fileSystemError
      );

      try {
        // fetch로 Blob 생성 시도
        const response = await fetch(fileUri);
        if (response.ok) {
          fileData = await response.blob();
          console.log("📸 Blob 생성 성공:", {
            size: fileData.size,
            type: fileData.type || "blob",
          });
        } else {
          throw new Error(`Fetch 실패: ${response.status}`);
        }
      } catch (fetchError) {
        console.error(
          "📸 Blob 생성도 실패, FormData 방식으로 최종 시도:",
          fetchError
        );

        // 최후의 수단: FormData 방식
        fileData = {
          uri: fileUri,
          type: "image/jpeg",
          name: fileName,
        } as any;
      }
    }

    // Supabase Storage에 업로드
    const { data, error: uploadError } = await supabase.storage
      .from("service-request-photos")
      .upload(fileName, fileData, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      console.error("📸 Storage 업로드 실패:", uploadError);
      handleSupabaseError(uploadError, "사진 업로드");
    }

    console.log("📸 Storage 업로드 성공:", data);

    // 공개 URL 생성
    const {
      data: { publicUrl },
    } = supabase.storage.from("service-request-photos").getPublicUrl(fileName);

    console.log("📸 공개 URL 생성:", publicUrl);

    // DB에 사진 정보 저장
    const { data: photo, error: dbError } = await supabase
      .from("service_request_photos")
      .insert({
        service_request_id: requestId,
        photo_url: publicUrl,
        photo_order: order,
        is_representative: order === 0,
      })
      .select()
      .single();

    if (dbError) {
      console.error("📸 DB 저장 실패:", dbError);
      handleSupabaseError(dbError, "사진 정보 저장");
    }

    console.log("📸 사진 업로드 완료:", photo);
    return photo;
  } catch (error) {
    console.error("사진 업로드 실패:", error);
    throw error;
  }
}

/**
 * 서비스 요청 사진 삭제
 */
export async function deleteServiceRequestPhoto(
  photoId: string
): Promise<void> {
  try {
    // 먼저 사진 정보를 가져와서 파일 경로 확인
    const { data: photo, error: fetchError } = await supabase
      .from("service_request_photos")
      .select("photo_url")
      .eq("id", photoId)
      .single();

    if (fetchError) {
      handleSupabaseError(fetchError, "사진 정보 조회");
    }

    // Storage에서 파일 삭제
    if (photo?.photo_url) {
      const filePath = photo.photo_url.split("/").pop();
      if (filePath) {
        await supabase.storage
          .from("service-request-photos")
          .remove([filePath]);
      }
    }

    // DB에서 사진 정보 삭제
    const { error } = await supabase
      .from("service_request_photos")
      .delete()
      .eq("id", photoId);

    if (error) {
      handleSupabaseError(error, "사진 정보 삭제");
    }
  } catch (error) {
    console.error("사진 삭제 실패:", error);
    throw error;
  }
}

// ============================================
// 통계 및 분석 함수
// ============================================

/**
 * 서비스 요청 통계 조회
 */
export async function getServiceRequestStats(
  startDate?: string,
  endDate?: string
): Promise<ServiceRequestStatsResponse> {
  try {
    const { data, error } = await supabase.rpc(
      "get_service_request_analytics",
      {
        start_date:
          startDate ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: endDate || new Date().toISOString(),
      }
    );

    if (error) {
      handleSupabaseError(error, "서비스 요청 통계 조회");
    }

    return (
      data?.[0] || {
        total_requests: 0,
        completion_rate: 0,
        average_processing_hours: 0,
        appraisal_requests: 0,
        purchase_requests: 0,
        status_distribution: {},
      }
    );
  } catch (error) {
    console.error("서비스 요청 통계 조회 실패:", error);
    throw error;
  }
}

/**
 * 최근 서비스 요청 조회
 */
export async function getRecentServiceRequests(
  userId?: string,
  limit: number = 5
): Promise<ServiceRequest[]> {
  try {
    console.log("📋 [API] getRecentServiceRequests 호출:");
    console.log("  - 전달받은 userId:", userId);
    console.log("  - limit:", limit);

    // userId가 없으면 빈 배열 반환
    if (!userId) {
      console.log("📋 [API] userId가 없어서 빈 배열 반환");
      return [];
    }

    // 직접 쿼리로 최근 요청 조회 (RPC 함수 대신)
    const { data: requests, error } = await supabase
      .from("service_requests")
      .select(
        `
        *,
        photos:service_request_photos(*)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ [API] 최근 서비스 요청 조회 실패:", error);
      handleSupabaseError(error, "최근 서비스 요청 조회");
    }

    console.log("✅ [API] 최근 서비스 요청 조회 성공:");
    console.log("  - 조회된 요청 수:", requests?.length || 0);

    return requests || [];
  } catch (error) {
    console.error("최근 서비스 요청 조회 실패:", error);
    throw error;
  }
}

// ============================================
// 실시간 구독 함수
// ============================================

/**
 * 서비스 요청 실시간 구독
 */
export function subscribeToServiceRequest(
  requestId: string,
  onUpdate: (request: ServiceRequest) => void,
  onError?: (error: Error) => void
) {
  const subscription = supabase
    .channel("service-request-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "service_requests",
        filter: `id=eq.${requestId}`,
      },
      (payload: any) => {
        console.log("실시간 업데이트:", payload);

        if (payload.eventType === "UPDATE") {
          onUpdate(payload.new as ServiceRequest);
        }
      }
    )
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        console.log("서비스 요청 실시간 구독 활성화");
      } else if (status === "CHANNEL_ERROR") {
        const error = new Error("실시간 구독 연결 실패");
        console.error(error);
        onError?.(error);
      }
    });

  return subscription;
}

/**
 * 사용자 서비스 요청 목록 실시간 구독
 */
export function subscribeToUserServiceRequests(
  userId: string,
  onUpdate: (requests: ServiceRequest[]) => void,
  onError?: (error: Error) => void
) {
  const subscription = supabase
    .channel("user-service-requests")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "service_requests",
        filter: `user_id=eq.${userId}`,
      },
      async (payload: any) => {
        console.log("사용자 요청 목록 업데이트:", payload);

        try {
          // 전체 목록을 다시 가져와서 업데이트
          const requests = await getUserServiceRequests(userId);
          onUpdate(requests);
        } catch (error) {
          console.error("실시간 업데이트 처리 실패:", error);
          onError?.(error as Error);
        }
      }
    )
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        console.log("사용자 서비스 요청 목록 실시간 구독 활성화");
      } else if (status === "CHANNEL_ERROR") {
        const error = new Error("실시간 구독 연결 실패");
        console.error(error);
        onError?.(error);
      }
    });

  return subscription;
}
