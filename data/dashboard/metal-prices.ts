import { Ionicons } from "@expo/vector-icons";
import { MetalPriceData } from "./types";

export const lmePricesData: MetalPriceData[] = [
  {
    metalName: "구리",
    price: 13365,
    unit: "원/KG",
    changePercent: "+2.3%",
    changeType: "positive",
    iconName: "flash",
    iconColor: "#FFFFFF",
    bgColor: "rgba(66, 66, 66, 0.9)",
  },
  {
    metalName: "알루미늄",
    price: 3583,
    unit: "원/KG",
    changePercent: "-1.1%",
    changeType: "negative",
    iconName: "airplane",
    iconColor: "#FFFFFF",
    bgColor: "rgba(66, 66, 66, 0.9)",
  },
  {
    metalName: "니켈",
    price: 20599,
    unit: "원/KG",
    changePercent: "+0.8%",
    changeType: "positive",
    iconName: "battery-charging",
    iconColor: "#1A1A1A",
    bgColor: "rgba(158, 158, 158, 0.9)",
  },
  {
    metalName: "아연",
    price: 3844,
    unit: "원/KG",
    changePercent: "-0.5%",
    changeType: "negative",
    iconName: "shield",
    iconColor: "#1A1A1A",
    bgColor: "rgba(117, 117, 117, 0.9)",
  },
];

export const domesticScrapData: MetalPriceData[] = [
  {
    metalName: "중량고철",
    price: 3100,
    unit: "원/KG",
    changePercent: "+1.5%",
    changeType: "positive",
    iconName: "car",
    iconColor: "#FFFFFF",
    bgColor: "rgba(34, 197, 94, 0.9)",
  },
  {
    metalName: "경량고철",
    price: 2850,
    unit: "원/KG",
    changePercent: "+0.9%",
    changeType: "positive",
    iconName: "bicycle",
    iconColor: "#FFFFFF",
    bgColor: "rgba(34, 197, 94, 0.9)",
  },
  {
    metalName: "특수고철",
    price: 4200,
    unit: "원/KG",
    changePercent: "+2.1%",
    changeType: "positive",
    iconName: "rocket",
    iconColor: "#FFFFFF",
    bgColor: "rgba(34, 197, 94, 0.9)",
  },
];
