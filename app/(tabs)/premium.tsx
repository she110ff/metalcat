import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { ScrollView } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";

export default function Premium() {
  return (
    <LinearGradient
      colors={["#1A1A1A", "#2D2D2D", "#404040"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1">
          <VStack className="flex-1 p-6" space="lg">
            {/* Header */}
            <VStack space="sm">
              <Text className="text-white text-3xl font-bold">특수금속</Text>
              <Text className="text-white/60">고급 금속 시세 정보</Text>
            </VStack>

            {/* Premium Metals */}
            <VStack space="md">
              <Text className="text-white text-xl font-semibold">
                귀금속 시세
              </Text>

              <Box className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <VStack space="sm">
                  <Text className="text-white/80 text-sm font-medium uppercase tracking-wider">
                    국제 귀금속 시세
                  </Text>

                  <VStack space="xs">
                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">금 (Gold)</Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">₩75,420/g</Text>
                        <Text className="text-green-400 text-xs">+1.8%</Text>
                      </VStack>
                    </HStack>

                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">
                        은 (Silver)
                      </Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">₩985/g</Text>
                        <Text className="text-red-400 text-xs">-0.7%</Text>
                      </VStack>
                    </HStack>

                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">
                        백금 (Platinum)
                      </Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">₩31,250/g</Text>
                        <Text className="text-green-400 text-xs">+0.5%</Text>
                      </VStack>
                    </HStack>

                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">
                        팔라듐 (Palladium)
                      </Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">₩35,680/g</Text>
                        <Text className="text-green-400 text-xs">+2.1%</Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </VStack>
              </Box>

              {/* Rare Earth Metals */}
              <Box className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <VStack space="sm">
                  <Text className="text-white/80 text-sm font-medium uppercase tracking-wider">
                    희토류 금속
                  </Text>

                  <VStack space="xs">
                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">
                        리튬 (Lithium)
                      </Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">₩18,500/kg</Text>
                        <Text className="text-green-400 text-xs">+3.2%</Text>
                      </VStack>
                    </HStack>

                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">
                        코발트 (Cobalt)
                      </Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">₩45,200/kg</Text>
                        <Text className="text-red-400 text-xs">-1.5%</Text>
                      </VStack>
                    </HStack>

                    <HStack className="justify-between items-center py-2 px-3 bg-white/5 rounded-lg">
                      <Text className="text-white font-medium">
                        몰리브덴 (Molybdenum)
                      </Text>
                      <VStack className="items-end">
                        <Text className="text-white font-bold">₩92,800/kg</Text>
                        <Text className="text-green-400 text-xs">+0.9%</Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </VStack>
              </Box>
            </VStack>
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
