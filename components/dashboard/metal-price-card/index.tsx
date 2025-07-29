import React from "react";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import {
  Plane,
  Battery,
  Shield,
  Cable,
  Package,
  Coins,
  Car,
  Bike,
  Rocket,
} from "lucide-react-native";
import { MetalPriceCardProps } from "@/data";
import { formatMetalPrice } from "@/data/utils/metal-price-utils";

// 금속별 아이콘 매핑
const getMetalIcon = (metalName: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    알루미늄: Plane, // 항공기용 알루미늄
    납: Battery, // 배터리용 납
    아연: Shield, // 아연 도금/보호막
    구리: Cable, // 구리 전선/케이블
    주석: Package, // 주석 캔/포장재
    니켈: Coins, // 니켈 동전
    중량고철: Car, // 자동차 고철
    경량고철: Bike, // 자전거 등 경량 고철
    특수고철: Rocket, // 특수 합금 고철
  };

  return iconMap[metalName] || Package;
};

// 금속별 색상 클래스 매핑
const getMetalColorClass = (metalName: string) => {
  const colorClassMap: { [key: string]: string } = {
    알루미늄: "bg-indigo-600 shadow-indigo-500/60", // 인디고 - 항공기용 알루미늄
    납: "bg-green-500 shadow-green-500/60", // 그린 - 배터리용 납
    아연: "bg-blue-500 shadow-blue-500/60", // 블루 - 아연 도금/보호막
    구리: "bg-orange-400 shadow-orange-500/60", // 오렌지 - 구리 전선색상
    주석: "bg-gray-400 shadow-gray-500/60", // 그레이 - 주석 캔 색상
    니켈: "bg-purple-500 shadow-purple-500/60", // 퍼플 - 니켈 동전 색상
    중량고철: "bg-red-500 shadow-red-500/60", // 레드 - 자동차 고철
    경량고철: "bg-green-500 shadow-green-500/60", // 그린 - 자전거 등 경량
    특수고철: "bg-purple-600 shadow-purple-500/60", // 퍼플 - 특수 합금
  };

  return colorClassMap[metalName] || "bg-gray-500 shadow-gray-500/60";
};

export const MetalPriceCard: React.FC<MetalPriceCardProps> = ({
  metalName,
  price,
  unit,
  changePercent,
  changeType,
  onPress,
}) => {
  const changeColor =
    changeType === "positive" ? "text-green-400" : "text-red-400";

  const IconComponent = getMetalIcon(metalName);
  const metalColorClass = getMetalColorClass(metalName);

  return (
    <Pressable
      className="flex-1 active:scale-[0.98] transform transition-transform duration-150"
      onPress={onPress}
      accessible={true}
      accessibilityLabel={`${metalName} 가격 정보, ${
        typeof price === "number" ? formatMetalPrice(price) : price
      }${unit}, 변동률 ${changePercent}`}
      accessibilityRole="button"
      accessibilityHint="금속 상세 정보를 보려면 탭하세요"
    >
      <Box className="rounded-2xl p-4 bg-white/10 border border-white/15 shadow-lg hover:bg-white/12 transition-colors duration-200 animate-slide-up backdrop-blur-sm">
        <HStack className="items-center justify-between">
          <HStack className="items-center">
            <Box
              className={`w-12 h-12 rounded-xl items-center justify-center mr-3 shadow-lg ${metalColorClass}`}
            >
              <IconComponent size={20} color="#FFFFFF" strokeWidth={2.5} />
            </Box>
            <VStack className="items-start" space="xs">
              <Text className="text-slate-50 font-bold text-base tracking-wide font-nanum-bold">
                {metalName}
              </Text>
              <HStack className="items-baseline">
                <Text className="text-slate-50 font-black text-xs tracking-wide font-mono">
                  {typeof price === "number" ? formatMetalPrice(price) : price}
                </Text>
                <Text className="text-slate-400 text-3xs uppercase tracking-[1px] ml-1 font-nanum">
                  {unit}
                </Text>
              </HStack>
              <Text
                className={`${changeColor} text-xs font-bold uppercase tracking-[1px] font-nanum animate-pulse-slow`}
              >
                {changePercent}
              </Text>
            </VStack>
          </HStack>
        </HStack>
      </Box>
    </Pressable>
  );
};
