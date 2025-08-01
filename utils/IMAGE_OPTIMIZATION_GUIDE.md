# 🖼️ 이미지 최적화 사용 가이드

## 개요

이 프로젝트는 **Supabase Storage의 이미지 변환 기능**을 활용한 서버 사이드 이미지 최적화를 제공합니다.

### 📋 지원 기능

- ✅ **서버 사이드 변환**: Supabase Storage 이미지 변환 (권장)
- ✅ **자동 WebP 최적화**: 브라우저별 자동 포맷 최적화
- ✅ **다양한 크기 제공**: 썸네일, 미디엄, 라지 등
- ✅ **클라이언트 사이드 전처리**: 업로드 전 대용량 이미지 압축
- ✅ **타입별 프리셋**: 아바타, 서비스 사진, 경매 사진

---

## 🚀 기본 사용법

### 1. 통합 이미지 최적화 (권장)

```typescript
import {
  getOptimizedImageUrl,
  getOptimizedAvatarUrl,
  getOptimizedServicePhotoUrl,
  getOptimizedAuctionPhotoUrl,
} from "@/utils/imageOptimizer";
import { supabase } from "@/hooks/lme/supabaseClient"; // 적절한 클라이언트 임포트

// 일반 이미지 최적화
const optimizedUrl = getOptimizedImageUrl(supabase, imageUrl, {
  width: 400,
  height: 300,
  quality: 80,
  resize: "cover",
});

// 아바타 최적화 (프리셋 사용)
const avatarUrl = getOptimizedAvatarUrl(supabase, user.avatar_url, "medium");

// 서비스 요청 사진 최적화
const servicePhotoUrl = getOptimizedServicePhotoUrl(
  supabase,
  photo.photo_url,
  "thumbnail"
);

// 경매 사진 최적화
const auctionPhotoUrl = getOptimizedAuctionPhotoUrl(
  supabase,
  auction.photo_url,
  "detail"
);
```

### 2. 업로드 (전처리 제거됨)

```typescript
// ⚠️ 클라이언트 사이드 압축 기능 제거됨 (ExpoImageManipulator 의존성 제거)
// 이제 원본 이미지를 직접 업로드하고, 표시할 때만 Supabase Storage 변환 사용

// 이미지를 Supabase Storage에 직접 업로드
const { data, error } = await supabase.storage
  .from("bucket")
  .upload("path/image.jpg", imageUri); // 원본 그대로 업로드
```

---

## 📏 이미지 크기 프리셋

### 👤 아바타 이미지

| 크기        | 해상도  | 품질 | 용도               |
| ----------- | ------- | ---- | ------------------ |
| `thumbnail` | 80×80   | 70%  | 작은 프로필 이미지 |
| `small`     | 150×150 | 80%  | 일반 아바타        |
| `medium`    | 300×300 | 85%  | 프로필 상세        |
| `large`     | 600×600 | 90%  | 고해상도 아바타    |

### 📋 서비스 요청 사진

| 크기        | 해상도   | 품질 | 용도           |
| ----------- | -------- | ---- | -------------- |
| `thumbnail` | 200×150  | 70%  | 목록용 썸네일  |
| `medium`    | 600×400  | 80%  | 일반 보기      |
| `large`     | 1200×800 | 85%  | 상세 보기      |
| `original`  | 원본     | 95%  | 원본 품질 유지 |

### 🏷️ 경매 사진

| 크기        | 해상도    | 품질 | 용도          |
| ----------- | --------- | ---- | ------------- |
| `thumbnail` | 250×200   | 70%  | 목록용 썸네일 |
| `card`      | 400×300   | 75%  | 카드형 표시   |
| `detail`    | 800×600   | 85%  | 상세 페이지   |
| `fullsize`  | 1600×1200 | 90%  | 확대 보기     |

---

## 🎯 실전 사용 예시

### React Native 컴포넌트에서 사용

```tsx
import React from "react";
import { Image } from "react-native";
import { getOptimizedAvatarUrl } from "@/utils/imageOptimizer";
import { supabase } from "@/hooks/lme/supabaseClient"; // 적절한 클라이언트 임포트

interface UserAvatarProps {
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  size: "thumbnail" | "small" | "medium" | "large";
}

export function UserAvatar({ user, size }: UserAvatarProps) {
  // Supabase Storage URL이면 자동 최적화, 아니면 원본 사용
  const optimizedAvatarUrl = getOptimizedAvatarUrl(
    supabase,
    user.avatar_url,
    size
  );

  return (
    <Image source={{ uri: optimizedAvatarUrl }} style={getAvatarStyle(size)} />
  );
}

function getAvatarStyle(size: string) {
  const sizes = {
    thumbnail: { width: 40, height: 40 },
    small: { width: 60, height: 60 },
    medium: { width: 80, height: 80 },
    large: { width: 120, height: 120 },
  };
  return sizes[size] || sizes.medium;
}
```

### 서비스 요청 사진 갤러리

```tsx
import React from "react";
import { FlatList, Image, TouchableOpacity } from "react-native";
import { getOptimizedServicePhotoUrl } from "@/utils/imageOptimizer";
import { supabase } from "@/hooks/lme/supabaseClient"; // 적절한 클라이언트 임포트

interface PhotoGalleryProps {
  photos: Array<{
    id: string;
    photo_url: string;
  }>;
  onPhotoPress: (photoUrl: string) => void;
}

export function PhotoGallery({ photos, onPhotoPress }: PhotoGalleryProps) {
  return (
    <FlatList
      data={photos}
      horizontal
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => {
            // 상세 보기에서는 large 크기 사용
            const largeUrl = getOptimizedServicePhotoUrl(
              supabase,
              item.photo_url,
              "large"
            );
            onPhotoPress(largeUrl);
          }}
        >
          <Image
            source={{
              // 목록에서는 thumbnail 사용 (빠른 로딩)
              uri: getOptimizedServicePhotoUrl(
                supabase,
                item.photo_url,
                "thumbnail"
              ),
            }}
            style={{ width: 100, height: 75, marginRight: 8 }}
          />
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id}
    />
  );
}
```

### 이미지 업로드 플로우

```tsx
import React from "react";
import { supabase } from "@/lib/supabase";

export async function uploadUserAvatar(userId: string, imageUri: string) {
  try {
    // 1. 파일명 생성
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}.jpg`;

    // 2. Supabase Storage에 직접 업로드 (전처리 없음)
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, {
        uri: imageUri, // 원본 이미지 직접 업로드
        type: "image/jpeg",
        name: fileName,
      });

    if (error) throw error;

    // 3. 전체 URL 생성 (데이터베이스 저장용)
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    // 4. 사용자 프로필 업데이트
    await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    console.log("✅ 아바타 업로드 완료:", publicUrl);
    console.log("🖼️ 최적화는 표시 시 자동 적용됩니다.");
    return publicUrl;
  } catch (error) {
    console.error("🚨 아바타 업로드 실패:", error);
    throw error;
  }
}
```

---

## ⚙️ 고급 설정

### 커스텀 변환 옵션

```typescript
import { getOptimizedImageUrl } from "@/utils/imageOptimizer";
import { supabase } from "@/hooks/lme/supabaseClient";

// 특별한 요구사항이 있는 경우
const customOptimizedUrl = getOptimizedImageUrl(supabase, imageUrl, {
  width: 500,
  height: 300,
  quality: 90, // 고품질
  resize: "contain", // 비율 유지
});
```

### 여러 크기 한번에 생성

```typescript
import { getMultiSizeImageUrls } from "@/utils/supabaseImageTransform";
import { supabase } from "@/hooks/lme/supabaseClient";

// 한번에 모든 크기 생성
const avatarUrls = getMultiSizeImageUrls(supabase, user.avatar_url, "avatar");
// 결과: { thumbnail: '...', small: '...', medium: '...', large: '...' }

const serviceUrls = getMultiSizeImageUrls(
  supabase,
  photo.photo_url,
  "servicePhoto"
);
// 결과: { thumbnail: '...', medium: '...', large: '...', original: '...' }
```

---

## 🔧 개발 및 테스트

### 개발 모드에서 테스트

```typescript
import {
  testIntegratedImageOptimization,
  testImageTransformation,
} from "@/utils/imageOptimizer";
import { supabase } from "@/hooks/lme/supabaseClient";

// 통합 테스트 (권장)
await testIntegratedImageOptimization(
  supabase,
  [
    "https://project.supabase.co/storage/v1/object/public/avatars/user1.jpg",
    "https://project.supabase.co/storage/v1/object/public/service-request-photos/photo1.jpg",
  ],
  ["file:///local/path/to/image.jpg"]
);

// Supabase 변환 테스트만
testImageTransformation(supabase, [
  "https://project.supabase.co/storage/v1/object/public/avatars/user1.jpg",
]);
```

---

## 📈 성능 최적화 팁

### 1. 적절한 크기 선택

- **목록 화면**: `thumbnail` 사용
- **일반 보기**: `medium` 사용
- **상세 보기**: `large` 또는 `detail` 사용

### 2. 프리로딩 전략

```typescript
import { getOptimizedAvatarUrl } from "@/utils/imageOptimizer";
import { supabase } from "@/hooks/lme/supabaseClient";

// 중요한 이미지는 미리 로드
const preloadUrls = [
  getOptimizedAvatarUrl(supabase, user.avatar_url, "medium"),
  getOptimizedAvatarUrl(supabase, user.avatar_url, "large"), // 상세 보기용
];

// React Native에서 이미지 프리로드
preloadUrls.forEach((url) => {
  Image.prefetch(url);
});
```

### 3. 조건부 로딩

```typescript
import { getOptimizedImageUrl } from "@/utils/imageOptimizer";
import { supabase } from "@/hooks/lme/supabaseClient";

// 네트워크 상태에 따른 품질 조정
const getAdaptiveImageUrl = (url: string, isSlowNetwork: boolean) => {
  const quality = isSlowNetwork ? 60 : 80;
  const width = isSlowNetwork ? 200 : 400;

  return getOptimizedImageUrl(supabase, url, { quality, width });
};
```

---

## ⚠️ 주의사항

1. **Supabase Pro Plan 필요**: 이미지 변환 기능은 Pro Plan 이상에서만 사용 가능
2. **URL 형식**: Supabase Storage URL만 서버 사이드 변환 가능
3. **캐싱**: 변환된 이미지는 Supabase CDN에 자동 캐싱됨
4. **비용**: 월 100개 이미지 무료, 초과 시 1,000개당 $5

---

## 🔗 관련 파일

- `utils/supabaseImageTransform.ts` - Supabase Storage 변환 로직
- `utils/imageOptimizer.ts` - 통합 이미지 최적화 함수
- `utils/avatar.ts` - 아바타 생성 유틸리티 (UI Avatars)

---

## 📚 추가 자료

- [Supabase Storage 이미지 변환 공식 문서](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [이미지 최적화 베스트 프랙티스](https://supabase.com/blog/storage-image-resizing-smart-cdn)
