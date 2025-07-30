/**
 * 이미지 최적화 유틸리티
 * expo-image-manipulator를 사용하여 이미지 크기 조정, 압축, 포맷 변환
 */

import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

export interface ImageOptimizeOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0.0 ~ 1.0
  format: "jpeg" | "png" | "webp";
}

export interface OptimizedImageResult {
  uri: string;
  width: number;
  height: number;
  fileSize: number; // bytes
}

/**
 * 이미지 최적화 (크기 조정, 압축, 포맷 변환)
 * @param imageUri - 원본 이미지 URI
 * @param options - 최적화 옵션
 * @returns 최적화된 이미지 정보
 */
export async function optimizeImage(
  imageUri: string,
  options: ImageOptimizeOptions
): Promise<OptimizedImageResult> {
  try {
    console.log("🖼️ 이미지 최적화 시작:", { imageUri, options });

    // 1. 원본 이미지 정보 가져오기
    const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });

    console.log("🖼️ 원본 이미지 정보:", {
      width: imageInfo.width,
      height: imageInfo.height,
      uri: imageInfo.uri,
    });

    // 2. 리사이즈 비율 계산
    const { maxWidth, maxHeight } = options;
    let { width, height } = imageInfo;

    // 최대 크기를 초과하는 경우 비율에 맞게 리사이즈
    if (width > maxWidth || height > maxHeight) {
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const ratio = Math.min(widthRatio, heightRatio);

      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // 3. 포맷 변환 매핑
    const formatMap = {
      jpeg: ImageManipulator.SaveFormat.JPEG,
      png: ImageManipulator.SaveFormat.PNG,
      webp: ImageManipulator.SaveFormat.WEBP,
    };

    // 4. 이미지 최적화 실행
    const actions: ImageManipulator.Action[] = [];

    // 크기 조정이 필요한 경우
    if (width !== imageInfo.width || height !== imageInfo.height) {
      actions.push({
        resize: { width, height },
      });
    }

    const optimizedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      actions,
      {
        compress: options.quality,
        format: formatMap[options.format],
        base64: false,
      }
    );

    // 5. 파일 크기 정보 가져오기
    const fileInfo = await FileSystem.getInfoAsync(optimizedImage.uri);
    const fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;

    const result: OptimizedImageResult = {
      uri: optimizedImage.uri,
      width: optimizedImage.width || width,
      height: optimizedImage.height || height,
      fileSize,
    };

    console.log("🖼️ 이미지 최적화 완료:", {
      originalSize: `${imageInfo.width}x${imageInfo.height}`,
      optimizedSize: `${result.width}x${result.height}`,
      fileSize: `${Math.round(fileSize / 1024)}KB`,
      compression: options.quality,
    });

    return result;
  } catch (error) {
    console.error("🖼️ 이미지 최적화 실패:", error);
    throw new Error(
      `이미지 최적화 실패: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`
    );
  }
}

/**
 * 아바타용 이미지 최적화 (정사각형, JPEG, 고품질)
 * @param imageUri - 원본 이미지 URI
 * @param size - 출력 크기 (기본: 400px)
 * @returns 최적화된 아바타 이미지
 */
export async function optimizeAvatarImage(
  imageUri: string,
  size: number = 400
): Promise<OptimizedImageResult> {
  return optimizeImage(imageUri, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.85, // 고품질 유지
    format: "jpeg",
  });
}

/**
 * 썸네일용 이미지 최적화 (작은 크기, 높은 압축)
 * @param imageUri - 원본 이미지 URI
 * @param size - 출력 크기 (기본: 150px)
 * @returns 최적화된 썸네일 이미지
 */
export async function optimizeThumbnailImage(
  imageUri: string,
  size: number = 150
): Promise<OptimizedImageResult> {
  return optimizeImage(imageUri, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7, // 압축률 높임
    format: "jpeg",
  });
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환
 * @param bytes - 바이트 크기
 * @returns 포맷된 크기 문자열
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * 이미지 파일인지 확인
 * @param uri - 파일 URI
 * @returns 이미지 파일 여부
 */
export function isImageFile(uri: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
  const lowerUri = uri.toLowerCase();

  return imageExtensions.some((ext) => lowerUri.includes(ext));
}

/**
 * 이미지 크기가 제한을 초과하는지 확인
 * @param fileSize - 파일 크기 (bytes)
 * @param maxSizeMB - 최대 크기 (MB)
 * @returns 크기 초과 여부
 */
export function isFileSizeExceeded(
  fileSize: number,
  maxSizeMB: number = 5
): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize > maxSizeBytes;
}

/**
 * 이미지 MIME 타입 감지
 * @param uri - 이미지 URI
 * @returns MIME 타입
 */
export function detectImageMimeType(uri: string): string {
  const lowerUri = uri.toLowerCase();

  if (lowerUri.includes(".png")) return "image/png";
  if (lowerUri.includes(".gif")) return "image/gif";
  if (lowerUri.includes(".webp")) return "image/webp";
  if (lowerUri.includes(".bmp")) return "image/bmp";

  // 기본값: JPEG
  return "image/jpeg";
}

/**
 * 개발용: 이미지 최적화 테스트
 * @param testImageUri - 테스트할 이미지 URI
 */
export async function testImageOptimization(
  testImageUri: string
): Promise<void> {
  if (__DEV__) {
    try {
      console.log("🧪 === 이미지 최적화 테스트 시작 ===");

      // 1. 원본 파일 정보
      const originalInfo = await FileSystem.getInfoAsync(testImageUri);
      console.log("📸 원본:", {
        uri: testImageUri,
        size: originalInfo.exists
          ? formatFileSize(originalInfo.size || 0)
          : "정보 없음",
      });

      // 2. 아바타 최적화 테스트
      const avatarResult = await optimizeAvatarImage(testImageUri, 400);
      console.log("👤 아바타 최적화:", {
        size: `${avatarResult.width}x${avatarResult.height}`,
        fileSize: formatFileSize(avatarResult.fileSize),
      });

      // 3. 썸네일 최적화 테스트
      const thumbnailResult = await optimizeThumbnailImage(testImageUri, 150);
      console.log("🖼️ 썸네일 최적화:", {
        size: `${thumbnailResult.width}x${thumbnailResult.height}`,
        fileSize: formatFileSize(thumbnailResult.fileSize),
      });

      console.log("🧪 === 테스트 완료 ===");
    } catch (error) {
      console.error("🧪 테스트 실패:", error);
    }
  }
}
