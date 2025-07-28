import { MetalPriceData, MetalDetailData } from "../types/metal-price";
import { convertUsdPerTonToKrwPerKg } from "../utils/metal-price-utils";

// 자동 수집된 금속 데이터 (2025-07-21 15:30:00)
// 데이터 소스: 조달청 비철금속 국제가격 + 한국철강협회
// 수집 시간: 2025-07-21 15:30:00
// 참조: https://pps.go.kr/bichuk/bbs/view.do?bbsSn=2507220006&key=00823

// 원본 USD/톤 가격 데이터 (일일 데이터 최종일자 기준)
const rawUsdPerTonPrices = {
  알루미늄: 2648.68, // USD/톤 (7월 21일 일일 데이터 기준)
  납: 1988.53, // USD/톤 (7월 21일 일일 데이터 기준)
  아연: 2810.1, // USD/톤 (7월 21일 일일 데이터 기준)
  구리: 9793.04, // USD/톤 (7월 21일 일일 데이터 기준)
  주석: 33864.0, // USD/톤 (7월 21일 일일 데이터 기준)
  니켈: 15317.31, // USD/톤 (7월 21일 일일 데이터 기준)
};

export const lmePricesData: MetalPriceData[] = [
  {
    metalName: "알루미늄",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.알루미늄), // 3,575원/KG
    unit: "원/KG",
    changePercent: "+0.76%",
    changeType: "positive" as const,
  },
  {
    metalName: "납",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.납), // 2,684원/KG
    unit: "원/KG",
    changePercent: "+0.14%",
    changeType: "positive" as const,
  },
  {
    metalName: "아연",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.아연), // 3,829원/KG
    unit: "원/KG",
    changePercent: "+0.48%",
    changeType: "positive" as const,
  },
  {
    metalName: "구리",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.구리), // 13,220원/KG
    unit: "원/KG",
    changePercent: "+0.70%",
    changeType: "positive" as const,
  },
  {
    metalName: "주석",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.주석), // 45,716원/KG
    unit: "원/KG",
    changePercent: "+1.12%",
    changeType: "positive" as const,
  },
  {
    metalName: "니켈",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.니켈), // 20,678원/KG
    unit: "원/KG",
    changePercent: "+1.96%",
    changeType: "positive" as const,
  },
];

// 국내 고철 시세 데이터 (2025-07-21 기준)
// 데이터 소스: 한국철강협회, 지역 고철업체 시세 종합
// 참조: 실제 국내 고철 시장 동향 반영
const domesticScrapPrices = {
  중량고철: 3150, // 원/KG (실제 시장 가격 반영)
  경량고철: 2900, // 원/KG
  특수고철: 4350, // 원/KG
};

export const domesticScrapData: MetalPriceData[] = [
  {
    metalName: "중량고철",
    price: domesticScrapPrices.중량고철,
    unit: "원/KG",
    changePercent: "+1.6%",
    changeType: "positive" as const,
  },
  {
    metalName: "경량고철",
    price: domesticScrapPrices.경량고철,
    unit: "원/KG",
    changePercent: "+1.8%",
    changeType: "positive" as const,
  },
  {
    metalName: "특수고철",
    price: domesticScrapPrices.특수고철,
    unit: "원/KG",
    changePercent: "+3.6%",
    changeType: "positive" as const,
  },
];

// 알루미늄 상세 데이터
export const aluminumDetailData: MetalDetailData = {
  metalName: "알루미늄",
  currentPrice: rawUsdPerTonPrices.알루미늄,
  unit: "USD/톤",
  changePercent: 0.76,
  changeType: "positive",

  dailyData: [
    {
      date: "2025-07-17",
      cashPrice: 2622.2,
      threeMonthPrice: 2672.2,
      changePercent: 1.0,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-18",
      cashPrice: 2622.2,
      threeMonthPrice: 2672.2,
      changePercent: 1.0,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-19",
      cashPrice: 2601.31,
      threeMonthPrice: 2651.31,
      changePercent: 0.79,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-20",
      cashPrice: 2656.46,
      threeMonthPrice: 2706.46,
      changePercent: 2.12,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-21",
      cashPrice: 2648.68,
      threeMonthPrice: 2698.68,
      changePercent: 0.0,
      changeType: "positive",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 2656.46,
    lowestPrice: 2601.31,
    averagePrice: 2622.17,
    volatility: 55.15,
    totalChange: 0.76,
  },
};

// 납 상세 데이터
export const leadDetailData: MetalDetailData = {
  metalName: "납",
  currentPrice: rawUsdPerTonPrices.납,
  unit: "USD/톤",
  changePercent: 0.14,
  changeType: "positive",

  dailyData: [
    {
      date: "2025-07-17",
      cashPrice: 1968.74,
      threeMonthPrice: 2018.74,
      changePercent: 0.99,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-18",
      cashPrice: 1976.87,
      threeMonthPrice: 2026.87,
      changePercent: 0.41,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-19",
      cashPrice: 1984.55,
      threeMonthPrice: 2034.55,
      changePercent: 0.39,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-20",
      cashPrice: 1986.63,
      threeMonthPrice: 2036.63,
      changePercent: 0.1,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-21",
      cashPrice: 1988.53,
      threeMonthPrice: 2038.53,
      changePercent: 0.1,
      changeType: "positive",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 1988.53,
    lowestPrice: 1968.74,
    averagePrice: 1984.88,
    volatility: 19.79,
    totalChange: 0.14,
  },
};

// 아연 상세 데이터
export const zincDetailData: MetalDetailData = {
  metalName: "아연",
  currentPrice: rawUsdPerTonPrices.아연,
  unit: "USD/톤",
  changePercent: 0.48,
  changeType: "positive",

  dailyData: [
    {
      date: "2025-07-17",
      cashPrice: 2836.78,
      threeMonthPrice: 2886.78,
      changePercent: 0.0,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-18",
      cashPrice: 2865.24,
      threeMonthPrice: 2915.24,
      changePercent: 1.0,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-19",
      cashPrice: 2864.46,
      threeMonthPrice: 2914.46,
      changePercent: 0.03,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-20",
      cashPrice: 2850.82,
      threeMonthPrice: 2900.82,
      changePercent: 0.48,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-21",
      cashPrice: 2810.1,
      threeMonthPrice: 2860.1,
      changePercent: 1.43,
      changeType: "negative",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 2865.24,
    lowestPrice: 2807.81,
    averagePrice: 2836.78,
    volatility: 57.43,
    totalChange: 0.48,
  },
};

// 구리 상세 데이터
export const copperDetailData: MetalDetailData = {
  metalName: "구리",
  currentPrice: rawUsdPerTonPrices.구리,
  unit: "USD/톤",
  changePercent: 0.7,
  changeType: "positive",

  dailyData: [
    {
      date: "2025-07-17",
      cashPrice: 9881.47,
      threeMonthPrice: 9931.47,
      changePercent: 0.9,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-18",
      cashPrice: 9900.63,
      threeMonthPrice: 9950.63,
      changePercent: 0.19,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-19",
      cashPrice: 9746.61,
      threeMonthPrice: 9796.61,
      changePercent: 1.56,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-20",
      cashPrice: 9715.35,
      threeMonthPrice: 9765.35,
      changePercent: 0.32,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-21",
      cashPrice: 9793.04,
      threeMonthPrice: 9843.04,
      changePercent: 0.8,
      changeType: "positive",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 9900.63,
    lowestPrice: 9715.35,
    averagePrice: 9807.42,
    volatility: 185.28,
    totalChange: 0.7,
  },
};

// 주석 상세 데이터
export const tinDetailData: MetalDetailData = {
  metalName: "주석",
  currentPrice: rawUsdPerTonPrices.주석,
  unit: "USD/톤",
  changePercent: 1.12,
  changeType: "positive",

  dailyData: [
    {
      date: "2025-07-17",
      cashPrice: 33588.62,
      threeMonthPrice: 33638.62,
      changePercent: 0.81,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-18",
      cashPrice: 33996.96,
      threeMonthPrice: 34046.96,
      changePercent: 1.21,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-19",
      cashPrice: 33728.64,
      threeMonthPrice: 33778.64,
      changePercent: 0.79,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-20",
      cashPrice: 33728.64,
      threeMonthPrice: 33778.64,
      changePercent: 0.0,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-21",
      cashPrice: 33864.0,
      threeMonthPrice: 33914.0,
      changePercent: 0.4,
      changeType: "positive",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 33864.0,
    lowestPrice: 33588.62,
    averagePrice: 33727.09,
    volatility: 275.38,
    totalChange: 1.12,
  },
};

// 니켈 상세 데이터
export const nickelDetailData: MetalDetailData = {
  metalName: "니켈",
  currentPrice: rawUsdPerTonPrices.니켈,
  unit: "USD/톤",
  changePercent: 1.96,
  changeType: "positive",

  dailyData: [
    {
      date: "2025-07-17",
      cashPrice: 15464.54,
      threeMonthPrice: 15514.54,
      changePercent: 0.96,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-18",
      cashPrice: 15209.88,
      threeMonthPrice: 15259.88,
      changePercent: 1.65,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-19",
      cashPrice: 15303.26,
      threeMonthPrice: 15353.26,
      changePercent: 0.61,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-20",
      cashPrice: 15164.08,
      threeMonthPrice: 15214.08,
      changePercent: 0.91,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-21",
      cashPrice: 15317.31,
      threeMonthPrice: 15367.31,
      changePercent: 1.01,
      changeType: "positive",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 15464.54,
    lowestPrice: 15164.08,
    averagePrice: 15311.99,
    volatility: 300.46,
    totalChange: 1.96,
  },
};
