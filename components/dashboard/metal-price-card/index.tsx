import React from "react";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import { MetalPriceCardProps } from "@/data";

export const MetalPriceCard: React.FC<MetalPriceCardProps> = ({
  metalName,
  price,
  unit,
  changePercent,
  changeType,
  iconName,
  iconColor,
  bgColor,
  onPress,
}) => {
  const changeColor =
    changeType === "positive" ? "text-green-400" : "text-red-400";

  return (
    <Pressable className="flex-1" onPress={onPress}>
      <Box
        className="rounded-2xl p-4"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
          height: 80,
        }}
      >
        <HStack className="items-center justify-between">
          <HStack className="items-center">
            <Box
              className="w-12 h-12 rounded-xl items-center justify-center mr-3"
              style={{
                backgroundColor: bgColor,
                shadowColor: bgColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons name={iconName} size={20} color={iconColor} />
            </Box>
            <VStack className="items-start" space="xs">
              <Text
                className="text-white font-bold text-base tracking-wide"
                style={{ fontFamily: "NanumGothic" }}
              >
                {metalName}
              </Text>
              <HStack className="items-baseline">
                <Text
                  className="text-white font-black text-xs tracking-wide"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {typeof price === "number" ? price.toLocaleString() : price}
                </Text>
                <Text
                  className="text-white/50 text-xs uppercase tracking-[1px] ml-1"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {unit}
                </Text>
              </HStack>
              <Text
                className={`${changeColor} text-xs font-bold uppercase tracking-[1px]`}
                style={{ fontFamily: "NanumGothic" }}
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
