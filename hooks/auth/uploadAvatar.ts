/**
 * 아바타 업로드 관련 API 함수들
 * Supabase Storage를 사용하여 아바타 이미지 업로드 및 관리
 */

import * as FileSystem from "expo-file-system";
import { supabase } from "./api";

// 임시: 이미지 최적화 모듈 사용 불가 시 대체 타입 정의
interface OptimizedImageResult {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

// 임시 유틸리티 함수들
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const isFileSizeExceeded = (
  fileSize: number,
  maxSizeMB: number = 5
): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize > maxSizeBytes;
};

// 커스텀 에러 클래스
export class AvatarUploadError extends Error {
  public code: string;
  public originalError?: Error;

  constructor(
    message: string,
    code: string = "UNKNOWN_ERROR",
    originalError?: Error
  ) {
    super(message);
    this.name = "AvatarUploadError";
    this.code = code;
    this.originalError = originalError;
  }
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AvatarUploadResult {
  publicUrl: string;
  filePath: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * 사용자 아바타 업로드
 * @param imageUri - 로컬 이미지 URI
 * @param userId - 사용자 ID
 * @param onProgress - 업로드 진행률 콜백
 * @returns 업로드된 아바타 정보
 */
export async function uploadUserAvatar(
  imageUri: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<AvatarUploadResult> {
  try {
    console.log("📸 아바타 업로드 시작:", { imageUri, userId });

    // 1. 사전 검증
    if (!imageUri || !userId) {
      throw new AvatarUploadError(
        "이미지 URI와 사용자 ID가 필요합니다",
        "INVALID_PARAMS"
      );
    }

    // 2. 파일 존재 여부 확인
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new AvatarUploadError(
        "이미지 파일을 찾을 수 없습니다",
        "FILE_NOT_FOUND"
      );
    }

    // 3. 파일 크기 검증 (5MB 제한)
    const fileSize = fileInfo.size || 0;
    if (isFileSizeExceeded(fileSize, 5)) {
      throw new AvatarUploadError(
        `파일 크기가 너무 큽니다. 최대 5MB까지 업로드 가능합니다. (현재: ${formatFileSize(
          fileSize
        )})`,
        "FILE_TOO_LARGE"
      );
    }

    console.log("📸 원본 파일 정보:", {
      size: formatFileSize(fileSize),
      exists: fileInfo.exists,
    });

    // 4. 임시: 이미지 최적화 건너뛰기 (네이티브 모듈 문제로 인해)
    onProgress?.({ loaded: 0, total: 100, percentage: 10 });

    // 원본 이미지를 그대로 사용 (최적화 없이)
    const optimizedImage: OptimizedImageResult = {
      uri: imageUri,
      width: 400, // 가정값
      height: 400, // 가정값
      fileSize: fileSize,
    };

    console.log("📸 이미지 최적화 건너뛰기 (원본 사용):", {
      originalSize: formatFileSize(fileSize),
      note: "네이티브 모듈 문제로 인해 최적화 없이 원본 업로드",
    });

    onProgress?.({ loaded: 30, total: 100, percentage: 30 });

    // 5. 파일명 생성 (고유성 보장)
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}.jpg`;

    console.log("📸 업로드 파일명:", fileName);

    // 6. 파일 데이터 준비
    onProgress?.({ loaded: 40, total: 100, percentage: 40 });

    let fileData: ArrayBuffer;
    try {
      // base64로 읽어서 ArrayBuffer로 변환
      const base64 = await FileSystem.readAsStringAsync(optimizedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // base64를 ArrayBuffer로 변환
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;

      console.log("📸 파일 데이터 준비 완료:", {
        bufferSize: fileData.byteLength,
        type: "ArrayBuffer",
      });
    } catch (error) {
      throw new AvatarUploadError(
        "파일 데이터 읽기에 실패했습니다",
        "FILE_READ_FAILED",
        error instanceof Error ? error : new Error(String(error))
      );
    }

    onProgress?.({ loaded: 60, total: 100, percentage: 60 });

    // 7. 기존 아바타 파일 삭제 (선택사항)
    try {
      await deleteOldAvatars(userId);
    } catch (error) {
      console.warn("📸 기존 아바타 삭제 실패 (계속 진행):", error);
    }

    onProgress?.({ loaded: 70, total: 100, percentage: 70 });

    // 8. Supabase Storage에 업로드
    let uploadResult;
    try {
      console.log("📸 Supabase 업로드 시작:", {
        fileName,
        dataType: typeof fileData,
        dataSize: fileData.byteLength,
        contentType: "image/jpeg",
      });

      uploadResult = await supabase.storage
        .from("avatars")
        .upload(fileName, fileData, {
          cacheControl: "3600",
          upsert: false, // 새 파일로 업로드 (기존 파일은 이전에 삭제됨)
          contentType: "image/jpeg",
        });

      console.log("📸 Supabase 업로드 응답:", {
        data: uploadResult.data,
        error: uploadResult.error,
      });

      if (uploadResult.error) {
        console.error("📸 Supabase 업로드 에러 상세:", uploadResult.error);
        throw uploadResult.error;
      }

      console.log("📸 Supabase 업로드 완료:", uploadResult.data);
    } catch (error) {
      console.error("📸 Supabase 업로드 예외 발생:", error);

      let errorMessage = "서버 업로드에 실패했습니다";
      if (error && typeof error === "object" && "message" in error) {
        errorMessage += `: ${error.message}`;
      }

      throw new AvatarUploadError(
        errorMessage,
        "UPLOAD_FAILED",
        error instanceof Error ? error : new Error(String(error))
      );
    }

    onProgress?.({ loaded: 90, total: 100, percentage: 90 });

    // 9. 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    console.log("📸 공개 URL 생성:", publicUrl);

    onProgress?.({ loaded: 100, total: 100, percentage: 100 });

    // 10. 결과 반환
    const result: AvatarUploadResult = {
      publicUrl,
      filePath: fileName,
      fileSize: optimizedImage.fileSize,
      dimensions: {
        width: optimizedImage.width,
        height: optimizedImage.height,
      },
    };

    console.log("📸 아바타 업로드 완전 완료:", result);

    return result;
  } catch (error) {
    console.error("📸 아바타 업로드 실패:", error);

    // AvatarUploadError가 아닌 경우 래핑
    if (!(error instanceof AvatarUploadError)) {
      throw new AvatarUploadError(
        "아바타 업로드 중 예상치 못한 오류가 발생했습니다",
        "UNEXPECTED_ERROR",
        error instanceof Error ? error : new Error(String(error))
      );
    }

    throw error;
  }
}

/**
 * 사용자의 기존 아바타 파일들 삭제
 * @param userId - 사용자 ID
 */
export async function deleteOldAvatars(userId: string): Promise<void> {
  try {
    console.log("🗑️ 기존 아바타 파일 삭제 시작:", userId);

    // 해당 사용자 폴더의 모든 파일 목록 조회
    const { data: files, error: listError } = await supabase.storage
      .from("avatars")
      .list(userId, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (listError) {
      console.warn("🗑️ 파일 목록 조회 실패:", listError);
      return;
    }

    if (!files || files.length === 0) {
      console.log("🗑️ 삭제할 기존 파일 없음");
      return;
    }

    // 파일 경로 배열 생성
    const filePaths = files.map((file) => `${userId}/${file.name}`);

    console.log("🗑️ 삭제 대상 파일들:", filePaths);

    // 파일들 삭제
    const { error: deleteError } = await supabase.storage
      .from("avatars")
      .remove(filePaths);

    if (deleteError) {
      console.warn("🗑️ 파일 삭제 실패:", deleteError);
    } else {
      console.log(`🗑️ ${filePaths.length}개 파일 삭제 완료`);
    }
  } catch (error) {
    console.warn("🗑️ 기존 아바타 삭제 중 오류:", error);
  }
}

/**
 * 사용자 아바타 URL 가져오기
 * @param userId - 사용자 ID
 * @returns 최신 아바타 URL 또는 null
 */
export async function getUserAvatarUrl(userId: string): Promise<string | null> {
  try {
    console.log("🔍 사용자 아바타 조회:", userId);

    // 해당 사용자 폴더의 파일 목록 조회 (최신순)
    const { data: files, error } = await supabase.storage
      .from("avatars")
      .list(userId, {
        limit: 1,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error || !files || files.length === 0) {
      console.log("🔍 아바타 파일 없음");
      return null;
    }

    // 최신 파일의 공개 URL 생성
    const latestFile = files[0];
    const filePath = `${userId}/${latestFile.name}`;

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    console.log("🔍 아바타 URL 조회 완료:", urlData.publicUrl);

    return urlData.publicUrl;
  } catch (error) {
    console.error("🔍 아바타 URL 조회 실패:", error);
    return null;
  }
}

/**
 * 아바타 파일 삭제
 * @param userId - 사용자 ID
 * @param fileName - 파일명 (선택사항, 없으면 모든 아바타 삭제)
 */
export async function deleteUserAvatar(
  userId: string,
  fileName?: string
): Promise<void> {
  try {
    console.log("🗑️ 아바타 삭제:", { userId, fileName });

    if (fileName) {
      // 특정 파일 삭제
      const filePath = `${userId}/${fileName}`;
      const { error } = await supabase.storage
        .from("avatars")
        .remove([filePath]);

      if (error) {
        throw error;
      }

      console.log("🗑️ 특정 아바타 파일 삭제 완료:", filePath);
    } else {
      // 모든 아바타 삭제
      await deleteOldAvatars(userId);
    }
  } catch (error) {
    console.error("🗑️ 아바타 삭제 실패:", error);
    throw new AvatarUploadError(
      "아바타 삭제에 실패했습니다",
      "DELETE_FAILED",
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * 개발용: 아바타 업로드 테스트
 * @param testImageUri - 테스트할 이미지 URI
 * @param testUserId - 테스트 사용자 ID
 */
export async function testAvatarUpload(
  testImageUri: string,
  testUserId: string = "test-user-123"
): Promise<void> {
  if (__DEV__) {
    try {
      console.log("🧪 === 아바타 업로드 테스트 시작 ===");

      const result = await uploadUserAvatar(
        testImageUri,
        testUserId,
        (progress) => {
          console.log(`📊 업로드 진행률: ${progress.percentage}%`);
        }
      );

      console.log("🧪 테스트 결과:", result);
      console.log("🧪 === 테스트 완료 ===");
    } catch (error) {
      console.error("🧪 테스트 실패:", error);
    }
  }
}
