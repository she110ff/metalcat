import { Ionicons } from "@expo/vector-icons";

export interface MetalPriceCardProps {
  metalName: string;
  price: string | number;
  unit: string;
  changePercent: string;
  changeType: "positive" | "negative";
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  onPress?: () => void;
}

export interface MetalPriceData {
  metalName: string;
  price: number;
  unit: string;
  changePercent: string;
  changeType: "positive" | "negative";
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
}
