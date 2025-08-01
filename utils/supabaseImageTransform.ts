/**
 * Supabase Storage 이미지 변환 유틸리티
 * 서버 사이드에서 on-demand 이미지 최적화 제공
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 20-100
  resize?: "cover" | "contain" | "fill";
  format?: "origin";
}

export interface ImageSize {
  name: string;
  width: number;
  height?: number;
  quality: number;
  resize: "cover" | "contain" | "fill";
}

// 프리셋 이미지 크기 정의
export const IMAGE_PRESETS = {
  avatar: {
    thumbnail: {
      name: "thumbnail",
      width: 80,
      height: 80,
      quality: 70,
      resize: "cover" as const,
    },
    small: {
      name: "small",
      width: 150,
      height: 150,
      quality: 80,
      resize: "cover" as const,
    },
    medium: {
      name: "medium",
      width: 300,
      height: 300,
      quality: 85,
      resize: "cover" as const,
    },
    large: {
      name: "large",
      width: 600,
      height: 600,
      quality: 90,
      resize: "cover" as const,
    },
  },
  servicePhoto: {
    thumbnail: {
      name: "thumbnail",
      width: 200,
      height: 150,
      quality: 70,
      resize: "cover" as const,
    },
    medium: {
      name: "medium",
      width: 600,
      height: 400,
      quality: 80,
      resize: "cover" as const,
    },
    large: {
      name: "large",
      width: 1200,
      height: 800,
      quality: 85,
      resize: "cover" as const,
    },
    original: {
      name: "original",
      width: 0,
      height: 0,
      quality: 95,
      resize: "contain" as const,
    }, // 원본 품질만 조정
  },
  auctionPhoto: {
    thumbnail: {
      name: "thumbnail",
      width: 250,
      height: 200,
      quality: 70,
      resize: "cover" as const,
    },
    card: {
      name: "card",
      width: 400,
      height: 300,
      quality: 75,
      resize: "cover" as const,
    },
    detail: {
      name: "detail",
      width: 800,
      height: 600,
      quality: 85,
      resize: "contain" as const,
    },
    fullsize: {
      name: "fullsize",
      width: 1600,
      height: 1200,
      quality: 90,
      resize: "contain" as const,
    },
  },
} as const;

/**
 * Storage URL에서 버킷명과 파일경로 추출
 * @param storageUrl - 전체 Supabase Storage URL
 * @returns { bucket, filePath } 또는 null
 */
export function parseStorageUrl(
  storageUrl: string
): { bucket: string; filePath: string } | null {
  try {
    // URL 패턴: https://project.supabase.co/storage/v1/object/public/bucket/path/to/file.jpg
    const match = storageUrl.match(
      /\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/
    );
    if (!match) return null;

    return {
      bucket: match[1],
      filePath: match[2],
    };
  } catch {
    return null;
  }
}

/**
 * 이미지 변환 URL 생성
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param bucket - 버킷명
 * @param filePath - 파일 경로
 * @param options - 변환 옵션
 * @returns 변환된 이미지 URL
 */
export function getTransformedImageUrl(
  supabaseClient: SupabaseClient,
  bucket: string,
  filePath: string,
  options: ImageTransformOptions = {}
): string {
  try {
    // 🔧 transform 옵션 구성 (undefined 값 제외)
    const transformOptions: any = {
      width: options.width,
      height: options.height,
      quality: options.quality || 80,
      resize: options.resize || "cover",
    };

    // format은 명시적으로 지정된 경우에만 추가 (로컬 환경에서는 지원 안됨)
    if (options.format && options.format !== "origin") {
      transformOptions.format = options.format;
    }

    const { data } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(filePath, {
        transform: transformOptions,
      });

    return data.publicUrl;
  } catch (error) {
    console.error("🖼️ 이미지 변환 URL 생성 실패:", error);
    return "";
  }
}

/**
 * 전체 Storage URL을 변환된 URL로 변환
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param storageUrl - 원본 Storage URL
 * @param options - 변환 옵션
 * @returns 변환된 이미지 URL
 */
export function transformStorageImageUrl(
  supabaseClient: SupabaseClient,
  storageUrl: string,
  options: ImageTransformOptions = {}
): string {
  if (!storageUrl) return "";

  const parsed = parseStorageUrl(storageUrl);
  if (!parsed) {
    console.warn("🖼️ Storage URL 파싱 실패:", storageUrl);
    return storageUrl; // 원본 URL 반환
  }

  return getTransformedImageUrl(
    supabaseClient,
    parsed.bucket,
    parsed.filePath,
    options
  );
}

/**
 * 아바타 이미지 URL 생성 (여러 크기)
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param avatarUrl - 원본 아바타 URL
 * @param size - 크기 프리셋
 * @returns 변환된 아바타 URL
 */
export function getAvatarImageUrl(
  supabaseClient: SupabaseClient,
  avatarUrl: string,
  size: keyof typeof IMAGE_PRESETS.avatar = "medium"
): string {
  if (!avatarUrl) return "";

  const preset = IMAGE_PRESETS.avatar[size];
  return transformStorageImageUrl(supabaseClient, avatarUrl, {
    width: preset.width,
    height: preset.height,
    quality: preset.quality,
    resize: preset.resize,
  });
}

/**
 * 서비스 요청 사진 URL 생성 (여러 크기)
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param photoUrl - 원본 사진 URL
 * @param size - 크기 프리셋
 * @returns 변환된 사진 URL
 */
export function getServicePhotoUrl(
  supabaseClient: SupabaseClient,
  photoUrl: string,
  size: keyof typeof IMAGE_PRESETS.servicePhoto = "medium"
): string {
  if (!photoUrl) return "";

  const preset = IMAGE_PRESETS.servicePhoto[size];

  // 원본 크기는 품질만 조정
  if (size === "original") {
    return transformStorageImageUrl(supabaseClient, photoUrl, {
      quality: preset.quality,
    });
  }

  return transformStorageImageUrl(supabaseClient, photoUrl, {
    width: preset.width,
    height: preset.height,
    quality: preset.quality,
    resize: preset.resize,
  });
}

/**
 * 경매 사진 URL 생성 (여러 크기)
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param photoUrl - 원본 사진 URL
 * @param size - 크기 프리셋
 * @returns 변환된 사진 URL
 */
export function getAuctionPhotoUrl(
  supabaseClient: SupabaseClient,
  photoUrl: string,
  size: keyof typeof IMAGE_PRESETS.auctionPhoto = "detail"
): string {
  if (!photoUrl) return "";

  const preset = IMAGE_PRESETS.auctionPhoto[size];
  return transformStorageImageUrl(supabaseClient, photoUrl, {
    width: preset.width,
    height: preset.height,
    quality: preset.quality,
    resize: preset.resize,
  });
}

/**
 * 여러 크기의 이미지 URL을 한번에 생성
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param originalUrl - 원본 이미지 URL
 * @param presetType - 프리셋 타입
 * @returns 크기별 이미지 URL 객체
 */
export function getMultiSizeImageUrls<T extends keyof typeof IMAGE_PRESETS>(
  supabaseClient: SupabaseClient,
  originalUrl: string,
  presetType: T
): Record<keyof (typeof IMAGE_PRESETS)[T], string> {
  if (!originalUrl) {
    // 빈 객체 반환
    const presets = IMAGE_PRESETS[presetType];
    const result = {} as Record<keyof (typeof IMAGE_PRESETS)[T], string>;

    Object.keys(presets).forEach((key) => {
      result[key as keyof (typeof IMAGE_PRESETS)[T]] = "";
    });

    return result;
  }

  const presets = IMAGE_PRESETS[presetType];
  const result = {} as Record<keyof (typeof IMAGE_PRESETS)[T], string>;

  Object.entries(presets).forEach(([sizeName, preset]) => {
    const size = preset as ImageSize;

    // 원본 크기는 품질만 조정
    if (sizeName === "original") {
      result[sizeName as keyof (typeof IMAGE_PRESETS)[T]] =
        transformStorageImageUrl(supabaseClient, originalUrl, {
          quality: size.quality,
        });
    } else {
      result[sizeName as keyof (typeof IMAGE_PRESETS)[T]] =
        transformStorageImageUrl(supabaseClient, originalUrl, {
          width: size.width,
          height: size.height,
          quality: size.quality,
          resize: size.resize,
        });
    }
  });

  return result;
}

/**
 * 이미지가 Supabase Storage URL인지 확인
 * @param url - 확인할 URL
 * @returns Supabase Storage URL 여부
 */
export function isSupabaseStorageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes("/storage/v1/object/public/");
}

/**
 * WebP 지원 여부에 따른 최적 포맷 반환
 * @param userAgent - User Agent 문자열 (선택사항)
 * @returns 최적 이미지 포맷
 */
export function getOptimalImageFormat(userAgent?: string): "webp" | "origin" {
  // 브라우저에서는 자동으로 WebP 감지되므로 기본값 사용
  if (typeof window !== "undefined") {
    return "webp";
  }

  // 서버 사이드에서는 User Agent 확인
  if (userAgent) {
    const supportsWebP = /Chrome|Firefox|Safari|Edge/.test(userAgent);
    return supportsWebP ? "webp" : "origin";
  }

  return "webp"; // 기본값
}

/**
 * 개발용: 이미지 변환 테스트
 * @param supabaseClient - Supabase 클라이언트 인스턴스
 * @param testUrls - 테스트할 이미지 URL 배열
 */
export function testImageTransformation(
  supabaseClient: SupabaseClient,
  testUrls: string[] = []
): void {
  if (__DEV__) {
    console.log("🖼️ === Supabase 이미지 변환 테스트 ===");

    testUrls.forEach((url, index) => {
      console.log(`\n📸 테스트 이미지 ${index + 1}: ${url}`);

      // 파싱 테스트
      const parsed = parseStorageUrl(url);
      if (parsed) {
        console.log(`📁 버킷: ${parsed.bucket}, 파일: ${parsed.filePath}`);

        // 아바타 변환 테스트
        if (parsed.bucket === "avatars") {
          const avatarUrls = getMultiSizeImageUrls(
            supabaseClient,
            url,
            "avatar"
          );
          console.log("👤 아바타 크기별 URL:", avatarUrls);
        }

        // 서비스 사진 변환 테스트
        if (parsed.bucket === "service-request-photos") {
          const serviceUrls = getMultiSizeImageUrls(
            supabaseClient,
            url,
            "servicePhoto"
          );
          console.log("📋 서비스 사진 크기별 URL:", serviceUrls);
        }

        // 경매 사진 변환 테스트
        if (parsed.bucket === "auction-photos") {
          const auctionUrls = getMultiSizeImageUrls(
            supabaseClient,
            url,
            "auctionPhoto"
          );
          console.log("🏷️ 경매 사진 크기별 URL:", auctionUrls);
        }
      } else {
        console.log("❌ URL 파싱 실패");
      }
    });

    console.log("\n🖼️ === 테스트 완료 ===");
  }
}

/**
 * 이미지 변환 옵션 검증
 * @param options - 변환 옵션
 * @returns 검증된 옵션
 */
export function validateTransformOptions(
  options: ImageTransformOptions
): ImageTransformOptions {
  const validated: ImageTransformOptions = { ...options };

  // 크기 제한 (Supabase 제한사항)
  if (validated.width && (validated.width < 1 || validated.width > 2500)) {
    console.warn("🖼️ width는 1-2500 범위여야 합니다. 기본값으로 설정합니다.");
    delete validated.width;
  }

  if (validated.height && (validated.height < 1 || validated.height > 2500)) {
    console.warn("🖼️ height는 1-2500 범위여야 합니다. 기본값으로 설정합니다.");
    delete validated.height;
  }

  // 품질 제한
  if (
    validated.quality &&
    (validated.quality < 20 || validated.quality > 100)
  ) {
    console.warn(
      "🖼️ quality는 20-100 범위여야 합니다. 기본값(80)으로 설정합니다."
    );
    validated.quality = 80;
  }

  return validated;
}
