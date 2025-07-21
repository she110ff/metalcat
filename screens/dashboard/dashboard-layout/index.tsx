import React from "react";
import { ScrollView } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

export const Dashboard = () => {
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          <VStack className="flex-1 p-6" space="xl">
            {/* LME MARKET DATA Header */}
            <VStack space="lg">
              <Box
                className="rounded-3xl p-8"
                style={{
                  backgroundColor: "rgba(100, 200, 255, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(100, 200, 255, 0.15)",
                  shadowColor: "#64C8FF",
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.3,
                  shadowRadius: 40,
                  elevation: 20,
                }}
              >
                <VStack space="md">
                  <Text className="text-cyan-300 text-sm font-medium tracking-[3px] uppercase">
                    LME Market Data
                  </Text>
                  <Text className="text-white text-4xl font-black tracking-wide">
                    2025.07.21
                  </Text>
                  <Text className="text-cyan-200/80 text-sm font-medium tracking-wider uppercase">
                    Exchange Rate: ₩1,382.5
                  </Text>
                </VStack>
              </Box>
            </VStack>

            {/* LME PRICES Section */}
            <VStack space="lg">
              <Text className="text-yellow-300 text-xl font-black tracking-[2px] uppercase">
                LME Prices
              </Text>

              <VStack space="md">
                {/* Copper */}
                <Pressable>
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
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(66, 66, 66, 0.9)",
                          shadowColor: "#424242",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons name="flash" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5 tracking-wide">
                          구리
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          LME Standard
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-white font-black text-lg tracking-wide">
                          13,365
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          원/KG
                        </Text>
                        <Text className="text-green-400 text-xs font-bold uppercase tracking-[1px]">
                          +2.3%
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>

                {/* Aluminum */}
                <Pressable>
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
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(66, 66, 66, 0.9)",
                          shadowColor: "#424242",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons name="airplane" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5 tracking-wide">
                          알루미늄
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          LME Standard
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-white font-black text-lg tracking-wide">
                          3,583
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          원/KG
                        </Text>
                        <Text className="text-red-400 text-xs font-bold uppercase tracking-[1px]">
                          -1.1%
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>

                {/* Nickel */}
                <Pressable>
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
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(158, 158, 158, 0.9)",
                          shadowColor: "#9E9E9E",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons
                          name="battery-charging"
                          size={20}
                          color="#1A1A1A"
                        />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5 tracking-wide">
                          니켈
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          LME Standard
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-white font-black text-lg tracking-wide">
                          20,599
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          원/KG
                        </Text>
                        <Text className="text-green-400 text-xs font-bold uppercase tracking-[1px]">
                          +0.8%
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>

                {/* Zinc */}
                <Pressable>
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
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(117, 117, 117, 0.9)",
                          shadowColor: "#757575",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons name="shield" size={20} color="#1A1A1A" />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5 tracking-wide">
                          아연
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          LME Standard
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-white font-black text-lg tracking-wide">
                          3,844
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          원/KG
                        </Text>
                        <Text className="text-red-400 text-xs font-bold uppercase tracking-[1px]">
                          -0.5%
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>

                {/* Tin */}
                <Pressable>
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
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(97, 97, 97, 0.9)",
                          shadowColor: "#616161",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons
                          name="hardware-chip"
                          size={20}
                          color="#1A1A1A"
                        />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5 tracking-wide">
                          주석
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          LME Standard
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-white font-black text-lg tracking-wide">
                          45,844
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          원/KG
                        </Text>
                        <Text className="text-green-400 text-xs font-bold uppercase tracking-[1px]">
                          +1.2%
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>
              </VStack>
            </VStack>

            {/* DOMESTIC SCRAP Section */}
            <VStack space="lg">
              <Text className="text-white text-xl font-black tracking-[2px] uppercase">
                Domestic Scrap
              </Text>

              <VStack space="md">
                {/* Heavy Scrap */}
                <Pressable>
                  <Box
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(34, 197, 94, 0.15)",
                      shadowColor: "#22C55E",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(34, 197, 94, 0.9)",
                          shadowColor: "#22C55E",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons name="car" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5 tracking-wide">
                          중량고철
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          Domestic Standard
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-white font-black text-lg tracking-wide">
                          3,100
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          원/KG
                        </Text>
                        <Text className="text-green-400 text-xs font-bold uppercase tracking-[1px]">
                          +1.5%
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>

                {/* Light Scrap */}
                <Pressable>
                  <Box
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(34, 197, 94, 0.15)",
                      shadowColor: "#22C55E",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(34, 197, 94, 0.9)",
                          shadowColor: "#22C55E",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons name="bicycle" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5 tracking-wide">
                          경량고철
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          Domestic Standard
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-white font-black text-lg tracking-wide">
                          2,850
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          원/KG
                        </Text>
                        <Text className="text-green-400 text-xs font-bold uppercase tracking-[1px]">
                          +0.9%
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>

                {/* Special Scrap */}
                <Pressable>
                  <Box
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(34, 197, 94, 0.15)",
                      shadowColor: "#22C55E",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(34, 197, 94, 0.9)",
                          shadowColor: "#22C55E",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons name="rocket" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5 tracking-wide">
                          특수고철
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          Domestic Standard
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-white font-black text-lg tracking-wide">
                          4,200
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          원/KG
                        </Text>
                        <Text className="text-green-400 text-xs font-bold uppercase tracking-[1px]">
                          +2.1%
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>
              </VStack>
            </VStack>

            {/* TRENDING AUCTIONS Section */}
            <VStack space="lg">
              <Text className="text-white text-xl font-black tracking-[2px] uppercase">
                Trending Auctions
              </Text>

              <VStack space="md">
                <Pressable>
                  <Box
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: "rgba(147, 51, 234, 0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(147, 51, 234, 0.15)",
                      shadowColor: "#9333EA",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(147, 51, 234, 0.9)",
                          shadowColor: "#9333EA",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons name="hammer" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5 tracking-wide">
                          Aluminum Profiles
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          Gyeonggi • 1,600kg
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-white font-black text-lg tracking-wide">
                          4,960,000
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          KRW
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          2 Days Left
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>

                <Pressable>
                  <Box
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: "rgba(147, 51, 234, 0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(147, 51, 234, 0.15)",
                      shadowColor: "#9333EA",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <HStack className="items-center">
                      <Box
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: "rgba(147, 51, 234, 0.9)",
                          shadowColor: "#9333EA",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.6,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons name="settings" size={20} color="#FFFFFF" />
                      </Box>
                      <VStack className="flex-1">
                        <Text className="text-white font-bold text-base mb-0.5 tracking-wide">
                          Used Motors
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          Chungbuk • 300kg
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="text-white font-black text-lg tracking-wide">
                          405,000
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          KRW
                        </Text>
                        <Text className="text-white/50 text-xs uppercase tracking-[1px]">
                          15 Hours Left
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Pressable>
              </VStack>
            </VStack>
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
