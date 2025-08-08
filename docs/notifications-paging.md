# 알림 목록 페이징 기능

마이페이지 알림 목록에 페이징 기능을 구현하여 한 페이지당 10개씩 표시하고 더보기 버튼을 제공합니다.

## 기능 개요

- **한 페이지당 10개씩 표시**: 성능 최적화를 위해 한 번에 10개의 알림만 로드
- **더보기 버튼**: 추가 알림을 로드할 수 있는 버튼 제공
- **로딩 상태 표시**: 데이터 로딩 중 상태 표시
- **무한 스크롤 지원**: 선택적으로 무한 스크롤 기능 제공

## 컴포넌트

### MyPageNotificationHistory

마이페이지용 알림 목록 컴포넌트입니다.

```tsx
import { MyPageNotificationHistory } from "@/components/notifications/MyPageNotificationHistory";

// 기본 사용법 (10개씩 표시)
<MyPageNotificationHistory />

// 최대 개수 제한
<MyPageNotificationHistory maxItems={5} />

// 액션 버튼 숨기기
<MyPageNotificationHistory showActions={false} />
```

#### Props

- `maxItems?: number` - 최대 표시할 알림 개수 (기본값: 10)
- `showActions?: boolean` - 액션 버튼 표시 여부 (기본값: true)

### OptimizedNotificationHistory

고급 기능이 포함된 알림 목록 컴포넌트입니다.

```tsx
import { OptimizedNotificationHistory } from "@/components/notifications/OptimizedNotificationHistory";

// 기본 사용법
<OptimizedNotificationHistory />

// 고급 설정
<OptimizedNotificationHistory
  maxItems={10}
  showActions={true}
  showStats={true}
  enableInfiniteScroll={false}
  showCategoryFilter={true}
/>
```

#### Props

- `maxItems?: number` - 최대 표시할 알림 개수
- `showActions?: boolean` - 액션 버튼 표시 여부
- `showStats?: boolean` - 통계 섹션 표시 여부
- `enableInfiniteScroll?: boolean` - 무한 스크롤 활성화 여부
- `showCategoryFilter?: boolean` - 카테고리 필터 표시 여부

## 훅

### useOptimizedNotifications

알림 데이터를 관리하는 훅입니다.

```tsx
import { useOptimizedNotifications } from "@/hooks/notifications/useOptimizedNotifications";

const {
  history,
  unreadCount,
  stats,
  isLoadingHistory,
  hasMore,
  loadNotificationHistory,
  loadMoreNotifications,
  markAsRead,
  markAllAsRead,
} = useOptimizedNotifications();
```

#### 반환값

- `history` - 알림 목록
- `unreadCount` - 읽지 않은 알림 개수
- `stats` - 알림 통계 정보
- `isLoadingHistory` - 로딩 상태
- `hasMore` - 더 불러올 데이터가 있는지 여부
- `loadNotificationHistory` - 알림 히스토리 로드 함수
- `loadMoreNotifications` - 더 많은 알림 로드 함수
- `markAsRead` - 알림 읽음 처리 함수
- `markAllAsRead` - 모든 알림 읽음 처리 함수

## 사용 예시

### 마이페이지에서 사용

```tsx
// screens/profile-screens/profile/simple.tsx
if (activeTab === "notifications") {
  return (
    <VStack space="lg">
      <NotificationTokenManager />
      <NotificationSettings />
      <MyPageNotificationHistory maxItems={10} showActions={true} />
    </VStack>
  );
}
```

### 독립적인 알림 화면에서 사용

```tsx
// app/notifications.tsx
import { OptimizedNotificationHistory } from "@/components/notifications/OptimizedNotificationHistory";

export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4">
        <OptimizedNotificationHistory
          showStats={true}
          showCategoryFilter={true}
          enableInfiniteScroll={true}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
```

## 데이터베이스 최적화

페이징 기능을 위해 데이터베이스 함수를 사용합니다:

```sql
-- 사용자 알림 조회 (페이징 지원)
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  body TEXT,
  notification_type TEXT,
  data JSONB,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nh.id,
    nh.user_id,
    nh.title,
    nh.body,
    nh.notification_type,
    nh.data,
    nh.is_read,
    nh.created_at
  FROM notification_history nh
  WHERE nh.user_id = p_user_id
    AND (NOT p_unread_only OR nh.is_read = FALSE)
  ORDER BY nh.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
```

## 성능 최적화

1. **페이지 크기 제한**: 한 페이지당 10개씩 로드하여 메모리 사용량 최적화
2. **가상화**: FlatList의 `removeClippedSubviews` 옵션으로 렌더링 성능 향상
3. **배치 처리**: `maxToRenderPerBatch`와 `windowSize` 옵션으로 렌더링 배치 크기 제한
4. **캐싱**: React Query를 사용한 데이터 캐싱으로 불필요한 API 호출 방지

## 알림 타입별 아이콘

- 🏷️ `auction_created` - 새로운 경매 등록
- ⏰ `auction_ended` - 경매 종료
- ✅ `auction_won` - 경매 낙찰
- ❌ `auction_lost` - 경매 유찰
- 🔔 기본 알림

## 상태 관리

- **읽음/읽지 않음**: 알림 클릭 시 자동으로 읽음 처리
- **모두 읽음**: 헤더의 "모두 읽음" 버튼으로 일괄 처리
- **실시간 업데이트**: 새 알림 수신 시 자동으로 목록 업데이트
