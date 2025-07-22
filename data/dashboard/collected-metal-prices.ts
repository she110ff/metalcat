import { Ionicons } from "@expo/vector-icons";
import { MetalPriceData, MetalDetailData } from "../types/metal-price";
import { convertUsdPerTonToKrwPerKg } from "../utils/metal-price-utils";

// 자동 수집된 금속 데이터 (2025-07-23 15:30:00)
// 데이터 소스: 조달청 비철금속 국제가격 + 한국철강협회
// 수집 시간: 2025-07-23 15:30:00
// 참조: https://pps.go.kr/bichuk/bbs/view.do?bbsSn=2507220006&key=00823

// 원본 USD/톤 가격 데이터 (조달청에서 수집)
const rawUsdPerTonPrices = {
  알루미늄: 2750.0, // USD/톤
  납: 2064.5, // USD/톤
  아연: 2945.0, // USD/톤
  구리: 10169.0, // USD/톤
  주석: 35166.0, // USD/톤
  니켈: 15906.0, // USD/톤
};

export const lmePricesData: MetalPriceData[] = [
  {
    metalName: "알루미늄",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.알루미늄), // 3,575원/KG
    unit: "원/KG",
    changePercent: "+0.76%",
    changeType: "positive" as const,
    iconName: "airplane" as keyof typeof Ionicons.glyphMap,
    iconColor: "#FFFFFF",
    bgColor: "rgba(66, 66, 66, 0.9)",
  },
  {
    metalName: "납",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.납), // 2,684원/KG
    unit: "원/KG",
    changePercent: "+0.14%",
    changeType: "positive" as const,
    iconName: "battery-charging" as keyof typeof Ionicons.glyphMap,
    iconColor: "#FFFFFF",
    bgColor: "rgba(66, 66, 66, 0.9)",
  },
  {
    metalName: "아연",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.아연), // 3,829원/KG
    unit: "원/KG",
    changePercent: "+0.48%",
    changeType: "positive" as const,
    iconName: "shield" as keyof typeof Ionicons.glyphMap,
    iconColor: "#FFFFFF",
    bgColor: "rgba(66, 66, 66, 0.9)",
  },
  {
    metalName: "구리",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.구리), // 13,220원/KG
    unit: "원/KG",
    changePercent: "+0.70%",
    changeType: "positive" as const,
    iconName: "flash" as keyof typeof Ionicons.glyphMap,
    iconColor: "#FFFFFF",
    bgColor: "rgba(66, 66, 66, 0.9)",
  },
  {
    metalName: "주석",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.주석), // 45,716원/KG
    unit: "원/KG",
    changePercent: "+1.12%",
    changeType: "positive" as const,
    iconName: "construct" as keyof typeof Ionicons.glyphMap,
    iconColor: "#FFFFFF",
    bgColor: "rgba(66, 66, 66, 0.9)",
  },
  {
    metalName: "니켈",
    price: convertUsdPerTonToKrwPerKg(rawUsdPerTonPrices.니켈), // 20,678원/KG
    unit: "원/KG",
    changePercent: "+1.96%",
    changeType: "positive" as const,
    iconName: "magnet" as keyof typeof Ionicons.glyphMap,
    iconColor: "#FFFFFF",
    bgColor: "rgba(66, 66, 66, 0.9)",
  },
];

// 국내 고철 시세 데이터 (2025-07-23 기준)
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
    iconName: "car" as keyof typeof Ionicons.glyphMap,
    iconColor: "#FFFFFF",
    bgColor: "rgba(34, 197, 94, 0.9)",
  },
  {
    metalName: "경량고철",
    price: domesticScrapPrices.경량고철,
    unit: "원/KG",
    changePercent: "+1.8%",
    changeType: "positive" as const,
    iconName: "bicycle" as keyof typeof Ionicons.glyphMap,
    iconColor: "#FFFFFF",
    bgColor: "rgba(34, 197, 94, 0.9)",
  },
  {
    metalName: "특수고철",
    price: domesticScrapPrices.특수고철,
    unit: "원/KG",
    changePercent: "+3.6%",
    changeType: "positive" as const,
    iconName: "rocket" as keyof typeof Ionicons.glyphMap,
    iconColor: "#FFFFFF",
    bgColor: "rgba(34, 197, 94, 0.9)",
  },
];

// 알루미늄 상세 데이터
export const aluminumDetailData: MetalDetailData = {
  metalName: "알루미늄",
  currentPrice: 2648.68,
  unit: "USD/톤",
  changePercent: 0.76,
  changeType: "positive",
  iconName: "airplane",
  iconColor: "#FFFFFF",
  bgColor: "rgba(66, 66, 66, 0.9)",
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
    {
      date: "2025-07-22",
      cashPrice: 2691.24,
      threeMonthPrice: 2741.24,
      changePercent: 1.6,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-23",
      cashPrice: 2669.67,
      threeMonthPrice: 2719.67,
      changePercent: 0.79,
      changeType: "positive",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 2691.24,
    lowestPrice: 2601.31,
    averagePrice: 2648.68,
    volatility: 52.93,
    totalChange: 0.76,
  },
};

// 납 상세 데이터
export const leadDetailData: MetalDetailData = {
  metalName: "납",
  currentPrice: 1988.53,
  unit: "USD/톤",
  changePercent: 0.14,
  changeType: "positive",
  iconName: "battery-charging",
  iconColor: "#FFFFFF",
  bgColor: "rgba(66, 66, 66, 0.9)",
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
    {
      date: "2025-07-22",
      cashPrice: 1962.91,
      threeMonthPrice: 2012.91,
      changePercent: 1.29,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-23",
      cashPrice: 1970.63,
      threeMonthPrice: 2020.63,
      changePercent: 0.39,
      changeType: "positive",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 1988.53,
    lowestPrice: 1962.91,
    averagePrice: 1988.53,
    volatility: 39.77,
    totalChange: 0.14,
  },
};

// 아연 상세 데이터
export const zincDetailData: MetalDetailData = {
  metalName: "아연",
  currentPrice: 2836.78,
  unit: "USD/톤",
  changePercent: 0.48,
  changeType: "positive",
  iconName: "shield",
  iconColor: "#FFFFFF",
  bgColor: "rgba(66, 66, 66, 0.9)",
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
    {
      date: "2025-07-22",
      cashPrice: 2805.41,
      threeMonthPrice: 2855.41,
      changePercent: 0.17,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-23",
      cashPrice: 2807.81,
      threeMonthPrice: 2857.81,
      changePercent: 0.09,
      changeType: "positive",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 2865.24,
    lowestPrice: 2805.41,
    averagePrice: 2836.78,
    volatility: 56.74,
    totalChange: 0.48,
  },
};

// 구리 상세 데이터
export const copperDetailData: MetalDetailData = {
  metalName: "구리",
  currentPrice: 9793.04,
  unit: "USD/톤",
  changePercent: 0.7,
  changeType: "positive",
  iconName: "flash",
  iconColor: "#FFFFFF",
  bgColor: "rgba(66, 66, 66, 0.9)",
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
    {
      date: "2025-07-22",
      cashPrice: 9707.79,
      threeMonthPrice: 9757.79,
      changePercent: 0.87,
      changeType: "negative",
      spread: 50.0,
    },
    {
      date: "2025-07-23",
      cashPrice: 9813.18,
      threeMonthPrice: 9863.18,
      changePercent: 1.09,
      changeType: "positive",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 9900.63,
    lowestPrice: 9707.79,
    averagePrice: 9793.04,
    volatility: 195.86,
    totalChange: 0.7,
  },
};

// 주석 상세 데이터
export const tinDetailData: MetalDetailData = {
  metalName: "주석",
  currentPrice: 33864.0,
  unit: "USD/톤",
  changePercent: 1.12,
  changeType: "positive",
  iconName: "construct",
  iconColor: "#FFFFFF",
  bgColor: "rgba(66, 66, 66, 0.9)",
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
    {
      date: "2025-07-22",
      cashPrice: 34035.36,
      threeMonthPrice: 34085.36,
      changePercent: 0.51,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-23",
      cashPrice: 33728.64,
      threeMonthPrice: 33778.64,
      changePercent: 0.9,
      changeType: "negative",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 34035.36,
    lowestPrice: 33588.62,
    averagePrice: 33864.0,
    volatility: 677.28,
    totalChange: 1.12,
  },
};

// 니켈 상세 데이터
export const nickelDetailData: MetalDetailData = {
  metalName: "니켈",
  currentPrice: 15317.31,
  unit: "USD/톤",
  changePercent: 1.96,
  changeType: "positive",
  iconName: "magnet",
  iconColor: "#FFFFFF",
  bgColor: "rgba(66, 66, 66, 0.9)",
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
    {
      date: "2025-07-22",
      cashPrice: 15485.88,
      threeMonthPrice: 15535.88,
      changePercent: 1.1,
      changeType: "positive",
      spread: 50.0,
    },
    {
      date: "2025-07-23",
      cashPrice: 15378.76,
      threeMonthPrice: 15428.76,
      changePercent: 0.69,
      changeType: "negative",
      spread: 50.0,
    },
  ],
  statistics: {
    highestPrice: 15485.88,
    lowestPrice: 15164.08,
    averagePrice: 15317.31,
    volatility: 306.35,
    totalChange: 1.96,
  },
};
