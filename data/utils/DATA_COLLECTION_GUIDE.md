# 데이터 수집 가이드

## 📅 날짜 검증 규칙

### 1. 기본 원칙

- **미래 날짜 데이터는 절대 수집하지 않음**
- 최신 데이터는 오늘 날짜까지만 허용
- 과거 데이터는 실제 거래일 기준으로만 수집

### 2. 날짜 검증 함수 사용법

```typescript
import { validateDate, filterValidDates } from "./metal-price-utils";

// 개별 날짜 검증
const isValid = validateDate("2025-07-21"); // true
const isInvalid = validateDate("2025-07-25"); // false (미래 날짜)

// 일별 데이터 필터링
const filteredData = filterValidDates(dailyData);
```

### 3. 데이터 수집 시 체크리스트

#### ✅ 수집 전 확인사항

- [ ] 수집하려는 날짜가 오늘 이전인지 확인
- [ ] 주말/공휴일 데이터는 실제 거래일인지 확인
- [ ] 데이터 소스의 최신 업데이트 날짜 확인

#### ✅ 수집 후 확인사항

- [ ] `validateDate()` 함수로 모든 날짜 검증
- [ ] `filterValidDates()` 함수로 전체 데이터 필터링
- [ ] 통계 데이터 재계산 (최고가, 최저가, 평균가 등)

### 4. 문제가 발생한 경우

#### 🚨 미래 날짜 데이터 발견 시

1. 해당 데이터 즉시 삭제
2. 통계 데이터 재계산
3. 데이터 소스 재확인
4. 수집 로직 점검

#### 🔍 데이터 소스 확인 방법

- 조달청: https://pps.go.kr/bichuk/bbs/view.do
- LME: https://www.lme.com/
- 실제 거래일과 데이터 업데이트 일자 비교

### 5. 예시 코드

```typescript
// 올바른 데이터 수집 예시
const collectMetalData = async () => {
  const today = new Date();
  const maxDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // 데이터 수집
  const rawData = await fetchMetalPrices();

  // 날짜 검증 및 필터링
  const validData = filterValidDates(rawData, maxDate);

  // 통계 재계산
  const statistics = calculateStatistics(validData);

  return {
    dailyData: validData,
    statistics,
  };
};
```

### 6. 주의사항

- **절대 미래 날짜 데이터를 수집하지 마세요**
- 데이터 소스의 시간대 차이 고려
- 한국 시간 기준으로 날짜 판단
- 공휴일, 주말 등 비거래일 데이터 주의

---

**마지막 업데이트**: 2025-07-21
**담당자**: 개발팀
