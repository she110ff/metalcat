import { MetalPriceData } from "../types/metal-price";

export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

export const groupMetalData = (data: MetalPriceData[]): MetalPriceData[][] => {
  return chunkArray(data, 2);
};

// 니켈 가격 데이터 포맷팅 유틸리티
export const formatNickelPrice = (price: number): string => {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatNickelDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const calculateNickelChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const getNickelChangeType = (
  change: number
): "positive" | "negative" => {
  return change >= 0 ? "positive" : "negative";
};
