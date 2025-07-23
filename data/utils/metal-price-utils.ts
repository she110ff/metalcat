import { MetalPriceData } from "../types/metal-price";

/**
 * 메탈 가격 데이터를 2개씩 그룹화
 */
export const groupMetalData = (data: MetalPriceData[]): MetalPriceData[][] => {
  const grouped: MetalPriceData[][] = [];
  for (let i = 0; i < data.length; i += 2) {
    grouped.push(data.slice(i, i + 2));
  }
  return grouped;
};

/**
 * 현재 USD/KRW 환율 (실제 운영시에는 실시간 API 사용 권장)
 * 2024년 1월 기준 대략 1,300원
 */
const USD_TO_KRW_RATE = 1300;

/**
 * 톤을 킬로그램으로 변환하는 상수
 * 1톤 = 1,000kg
 */
const TON_TO_KG = 1000;

/**
 * USD/톤을 KRW/kg로 변환
 * @param usdPerTon USD/톤 가격
 * @param exchangeRate USD/KRW 환율 (기본값: 1300)
 * @returns KRW/kg 가격
 */
export const convertUsdPerTonToKrwPerKg = (
  usdPerTon: number,
  exchangeRate: number = USD_TO_KRW_RATE
): number => {
  return Math.round((usdPerTon * exchangeRate) / TON_TO_KG);
};

/**
 * 가격 변화율 계산
 * @param currentPrice 현재 가격
 * @param previousPrice 이전 가격
 * @returns 변화율 (소수점 2자리)
 */
export const calculatePriceChange = (
  currentPrice: number,
  previousPrice: number
): number => {
  if (previousPrice === 0) return 0;
  return Number(
    (((currentPrice - previousPrice) / previousPrice) * 100).toFixed(2)
  );
};

/**
 * 가격 변화 타입 결정
 * @param changePercent 변화율
 * @returns "positive" | "negative"
 */
export const getPriceChangeType = (
  changePercent: number
): "positive" | "negative" => {
  return changePercent >= 0 ? "positive" : "negative";
};

/**
 * 메탈 가격을 천단위 콤마로 포매팅
 * @param price 가격
 * @returns 콤마가 포함된 가격 문자열
 */
export const formatMetalPrice = (price: number): string => {
  return new Intl.NumberFormat("ko-KR").format(price);
};

/**
 * 메탈 가격 데이터를 USD/톤에서 KRW/kg로 변환
 * @param metalData 원본 메탈 데이터 (USD/톤)
 * @param exchangeRate USD/KRW 환율
 * @returns 변환된 메탈 데이터 (KRW/kg)
 */
export const convertMetalPriceData = (
  metalData: Omit<MetalPriceData, "price" | "unit"> & {
    priceUsdPerTon: number;
  },
  exchangeRate: number = USD_TO_KRW_RATE
): MetalPriceData => {
  const convertedPrice = convertUsdPerTonToKrwPerKg(
    metalData.priceUsdPerTon,
    exchangeRate
  );

  return {
    ...metalData,
    price: convertedPrice,
    unit: "원/KG",
  };
};

/**
 * 날짜 유효성 검증
 * @param dateString 검증할 날짜 문자열 (YYYY-MM-DD 형식)
 * @param maxDate 최대 허용 날짜 (기본값: 오늘)
 * @returns 유효한 날짜인지 여부
 */
export const validateDate = (
  dateString: string,
  maxDate: Date = new Date()
): boolean => {
  try {
    const date = new Date(dateString);
    const today = new Date();

    // 날짜 형식이 올바른지 확인
    if (isNaN(date.getTime())) {
      return false;
    }

    // 미래 날짜인지 확인 (오늘 이후)
    if (date > today) {
      return false;
    }

    // 최대 허용 날짜를 초과하는지 확인
    if (date > maxDate) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 일별 가격 데이터에서 유효하지 않은 날짜 필터링
 * @param dailyData 일별 가격 데이터 배열
 * @param maxDate 최대 허용 날짜 (기본값: 오늘)
 * @returns 필터링된 일별 가격 데이터
 */
export const filterValidDates = <T extends { date: string }>(
  dailyData: T[],
  maxDate: Date = new Date()
): T[] => {
  return dailyData.filter((item) => validateDate(item.date, maxDate));
};

/**
 * 환율 정보를 포함한 가격 변환 (실시간 환율 API 연동 시 확장 가능)
 */
export const priceConverter = {
  usdToKrw: USD_TO_KRW_RATE,
  tonToKg: TON_TO_KG,

  /**
   * USD/톤 → KRW/kg 변환
   */
  convertPrice: (usdPerTon: number, customRate?: number) =>
    convertUsdPerTonToKrwPerKg(usdPerTon, customRate),

  /**
   * 환율 업데이트 (향후 실시간 환율 API 연동 시 사용)
   */
  updateExchangeRate: (newRate: number) => {
    // 실제 구현 시 상태 관리 또는 설정 업데이트
    console.log(`환율 업데이트: ${newRate} KRW/USD`);
  },
};
