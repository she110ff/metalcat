/**
 * 이미지 최적화 유틸리티
 * Supabase Storage 서버 사이드 변환 전용
 */
import {
  transformStorageImageUrl,
  getAvatarImageUrl,
  getServicePhotoUrl,
  getAuctionPhotoUrl,
  isSupabaseStorageUrl,
  type ImageTransformOptions,
} from "./supabaseImageTransform";

// re-export for convenience
export { isSupabaseStorageUrl };
import type { SupabaseClient } from "@supabase/supabase-js";

// *** 클라이언트 사이드 이미지 압축 기능 제거됨 ***
// Supabase Storage 서버 사이드 변환만 사용합니다.

/**
 * 🔥 새로운 통합 이미지 최적화 함수들 (Supabase Storage 변환 우선)
 */

/**
 * 통합 이미지 URL 생성 (Supabase Storage 변환 우선 사용)
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param imageUrl - 이미지 URL (Storage URL 또는 일반 URL)
 * @param options - 변환 옵션
 * @returns 최적화된 이미지 URL
 */
export function getOptimizedImageUrl(
  supabaseClient: SupabaseClient,
  imageUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number; // 1-100 (Supabase 기준)
    resize?: "cover" | "contain" | "fill";
  } = {}
): string {
  if (!imageUrl) return "";

  // Supabase Storage URL인 경우 서버 사이드 변환 사용 (권장)
  if (isSupabaseStorageUrl(imageUrl)) {
    const transformOptions: ImageTransformOptions = {
      width: options.width,
      height: options.height,
      quality: options.quality || 80,
      resize: options.resize || "cover",
    };

    return transformStorageImageUrl(supabaseClient, imageUrl, transformOptions);
  }

  // 일반 URL인 경우 원본 반환
  console.log("⚠️ Supabase Storage가 아닌 URL입니다. 원본 반환:", imageUrl);
  return imageUrl;
}

/**
 * 아바타 이미지 최적화 (통합)
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param avatarUrl - 아바타 URL
 * @param size - 크기 ('thumbnail' | 'small' | 'medium' | 'large')
 * @returns 최적화된 아바타 URL
 */
export function getOptimizedAvatarUrl(
  supabaseClient: SupabaseClient,
  avatarUrl: string,
  size: "thumbnail" | "small" | "medium" | "large" = "medium"
): string {
  if (!avatarUrl) return "";

  if (isSupabaseStorageUrl(avatarUrl)) {
    return getAvatarImageUrl(supabaseClient, avatarUrl, size);
  }

  // 일반 URL (UI Avatars 등)은 원본 반환
  return avatarUrl;
}

/**
 * 서비스 요청 사진 최적화 (통합)
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param photoUrl - 사진 URL
 * @param size - 크기 ('thumbnail' | 'medium' | 'large' | 'original')
 * @returns 최적화된 사진 URL
 */
export function getOptimizedServicePhotoUrl(
  supabaseClient: SupabaseClient,
  photoUrl: string,
  size: "thumbnail" | "medium" | "large" | "original" = "medium"
): string {
  if (!photoUrl) return "";

  if (isSupabaseStorageUrl(photoUrl)) {
    return getServicePhotoUrl(supabaseClient, photoUrl, size);
  }

  console.log("⚠️ Supabase Storage가 아닌 URL입니다. 원본 반환:", photoUrl);
  return photoUrl;
}

/**
 * 경매 사진 최적화 (통합)
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param photoUrl - 사진 URL
 * @param size - 크기 ('thumbnail' | 'card' | 'detail' | 'fullsize')
 * @returns 최적화된 사진 URL
 */
export function getOptimizedAuctionPhotoUrl(
  supabaseClient: SupabaseClient,
  photoUrl: string,
  size: "thumbnail" | "card" | "detail" | "fullsize" = "detail"
): string {
  if (!photoUrl) return "";

  if (isSupabaseStorageUrl(photoUrl)) {
    return getAuctionPhotoUrl(supabaseClient, photoUrl, size);
  }

  console.log("⚠️ Supabase Storage가 아닌 URL입니다. 원본 반환:", photoUrl);
  return photoUrl;
}

/**
 * ⚠️ 업로드 전 전처리 기능 제거됨
 * ExpoImageManipulator 의존성 제거로 인해 클라이언트 사이드 압축 비활성화
 * 대신 Supabase Storage 서버 사이드 변환을 사용하세요.
 */

/**
 * 개발용: Supabase Storage 이미지 변환 테스트
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param testStorageUrls - 테스트할 Supabase Storage URL 배열
 */
export function testSupabaseImageOptimization(
  supabaseClient: SupabaseClient,
  testStorageUrls: string[] = []
): void {
  if (__DEV__) {
    console.log("🧪 === Supabase Storage 이미지 변환 테스트 시작 ===");

    if (testStorageUrls.length === 0) {
      console.log("⚠️ 테스트할 URL이 제공되지 않았습니다.");
      return;
    }

    testStorageUrls.forEach((url, index) => {
      console.log(`\n📸 테스트 URL ${index + 1}: ${url}`);

      if (!isSupabaseStorageUrl(url)) {
        console.log("❌ Supabase Storage URL이 아닙니다.");
        return;
      }

      // 아바타 변환 테스트
      console.log("👤 아바타 변환:");
      console.log(
        `  - 썸네일: ${getOptimizedAvatarUrl(supabaseClient, url, "thumbnail")}`
      );
      console.log(
        `  - 미디엄: ${getOptimizedAvatarUrl(supabaseClient, url, "medium")}`
      );

      // 경매 사진 변환 테스트
      console.log("🏷️ 경매 사진 변환:");
      console.log(
        `  - 카드: ${getOptimizedAuctionPhotoUrl(supabaseClient, url, "card")}`
      );
      console.log(
        `  - 상세: ${getOptimizedAuctionPhotoUrl(
          supabaseClient,
          url,
          "detail"
        )}`
      );

      // 일반 변환 테스트
      console.log("🖼️ 일반 변환:");
      console.log(
        `  - 400x300: ${getOptimizedImageUrl(supabaseClient, url, {
          width: 400,
          height: 300,
          quality: 75,
        })}`
      );
    });

    console.log("\n🧪 === 테스트 완료 ===");
  }
}
