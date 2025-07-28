export interface MetalPriceCardProps {
  metalName: string;
  price: string | number;
  unit: string;
  changePercent: string;
  changeType: "positive" | "negative";
  onPress?: () => void;
}

export interface MetalPriceData {
  metalName: string;
  price: number;
  unit: string;
  changePercent: string;
  changeType: "positive" | "negative";
}

// 니켈 일별 가격 데이터를 위한 새로운 인터페이스
export interface DailyPriceData {
  date: string;
  cashPrice: number;
  threeMonthPrice: number;
  changePercent: number;
  changeType: "positive" | "negative";
  spread: number;
}

export interface MetalDetailData {
  metalName: string;
  currentPrice: number;
  unit: string;
  changePercent: number;
  changeType: "positive" | "negative";
  dailyData: DailyPriceData[];
  statistics: {
    highestPrice: number;
    lowestPrice: number;
    averagePrice: number;
    volatility: number;
    totalChange: number;
  };
}
