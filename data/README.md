# Data Structure

이 폴더는 앱의 모든 데이터, 타입, 유틸리티 함수를 관리합니다.

## 폴더 구조

```
data/
├── index.ts              # 메인 export 파일
├── types/                # TypeScript 타입 정의
│   ├── index.ts
│   └── metal-price.ts
├── dashboard/            # 대시보드 관련 데이터
│   ├── index.ts
│   └── metal-prices.ts
└── utils/               # 유틸리티 함수
    ├── index.ts
    └── metal-price-utils.ts
```

## 사용법

### 모든 데이터 import

```typescript
import { MetalPriceCardProps, lmePricesData, groupMetalData } from "@/data";
```

### 특정 모듈만 import

```typescript
import { MetalPriceCardProps } from "@/data/types";
import { lmePricesData } from "@/data/dashboard";
import { groupMetalData } from "@/data/utils";
```

## 새로운 데이터 추가

1. **타입 추가**: `data/types/` 폴더에 새로운 타입 파일 생성
2. **데이터 추가**: `data/dashboard/` 또는 새로운 도메인 폴더 생성
3. **유틸리티 추가**: `data/utils/` 폴더에 새로운 유틸리티 파일 생성
4. **index.ts 업데이트**: 해당 폴더의 index.ts에 export 추가

## 예시

### 새로운 타입 추가

```typescript
// data/types/auction.ts
export interface AuctionItem {
  id: string;
  title: string;
  // ...
}
```

### 새로운 데이터 추가

```typescript
// data/auction/auction-list.ts
import { AuctionItem } from "@/data/types";

export const auctionItems: AuctionItem[] = [
  // ...
];
```

### 새로운 유틸리티 추가

```typescript
// data/utils/auction-utils.ts
export const formatAuctionPrice = (price: number): string => {
  // ...
};
```
