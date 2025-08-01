import React, { useEffect, useState } from "react";
import { View, Animated } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { AuctionItem } from "@/data/types/auction";

interface ProcessingResultCardProps {
  auction: AuctionItem;
  estimatedProcessingTime?: number; // 예상 처리 시간 (분)
}

export const ProcessingResultCard: React.FC<ProcessingResultCardProps> = ({
  auction,
  estimatedProcessingTime = 2,
}) => {
  const [dots, setDots] = useState("");
  const [spinValue] = useState(new Animated.Value(0));

  // 로딩 애니메이션
  useEffect(() => {
    // 점 애니메이션
    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 500);

    // 회전 애니메이션
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    return () => {
      clearInterval(dotsInterval);
      spinAnimation.stop();
    };
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const getProcessingTimeText = () => {
    const now = new Date();
    const endTime = auction.endTime;
    const timeSinceEnd = Math.floor(
      (now.getTime() - endTime.getTime()) / (1000 * 60)
    ); // 분 단위

    if (timeSinceEnd < 1) {
      return "곧 처리될 예정입니다";
    } else if (timeSinceEnd < estimatedProcessingTime) {
      return `약 ${estimatedProcessingTime - timeSinceEnd}분 후 완료 예정`;
    } else {
      return "잠시만 기다려주세요";
    }
  };

  return (
    <VStack space="lg" className="px-6">
      {/* 처리 중 헤더 */}
      <LinearGradient
        colors={["#3B82F6", "#1D4ED8", "#1E40AF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-2xl p-6"
      >
        <VStack space="md" className="items-center">
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={48} color="#FFFFFF" />
          </Animated.View>
          <Text className="text-white text-2xl font-black text-center">
            ⏳ 처리 중{dots}
          </Text>
          <Text className="text-white/90 text-lg font-bold text-center">
            경매 결과를 분석하고 있어요
          </Text>
        </VStack>
      </LinearGradient>

      {/* 처리 상태 정보 */}
      <Box className="rounded-2xl p-6 bg-blue-500/5 border border-blue-500/20">
        <VStack space="lg">
          <VStack space="sm" className="items-center">
            <Text className="text-blue-300 text-lg font-bold">
              🔍 무엇을 하고 있나요?
            </Text>
            <Text className="text-white/70 text-sm text-center">
              시스템이 입찰 내역을 분석하고{"\n"}
              낙찰자를 결정하고 있습니다
            </Text>
          </VStack>

          <HStack className="justify-between items-center">
            <Text className="text-gray-300 text-lg font-bold">
              🏁 경매 종료 시간
            </Text>
            <Text className="text-white/80 text-sm">
              {auction.endTime.toLocaleDateString()}{" "}
              {auction.endTime.toLocaleTimeString()}
            </Text>
          </HStack>

          <HStack className="justify-between items-center">
            <Text className="text-blue-300 text-lg font-bold">
              👥 참여 입찰자
            </Text>
            <Text className="text-white text-lg font-bold">
              {auction.bidders || 0}명
            </Text>
          </HStack>

          {auction.currentBid && auction.currentBid > 0 && (
            <HStack className="justify-between items-center">
              <Text className="text-green-300 text-lg font-bold">
                💰 최고 입찰가
              </Text>
              <Text className="text-white text-lg font-bold">
                ₩{auction.currentBid.toLocaleString()}
              </Text>
            </HStack>
          )}

          <HStack className="justify-between items-center">
            <Text className="text-yellow-300 text-lg font-bold">
              ⏰ 예상 완료 시간
            </Text>
            <Text className="text-white/80 text-sm">
              {getProcessingTimeText()}
            </Text>
          </HStack>
        </VStack>
      </Box>

      {/* 처리 단계 안내 */}
      <Box className="rounded-2xl p-6 bg-purple-500/5 border border-purple-500/20">
        <VStack space="md">
          <Text className="text-purple-300 text-lg font-bold text-center">
            📋 처리 단계
          </Text>

          <VStack space="sm">
            <HStack className="items-center">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text className="text-white/80 text-sm ml-2">
                1. ✅ 경매 시간 종료 확인
              </Text>
            </HStack>
            <HStack className="items-center">
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="sync" size={20} color="#3B82F6" />
              </Animated.View>
              <Text className="text-blue-300 text-sm ml-2 font-bold">
                2. 🔄 입찰 내역 분석 중...
              </Text>
            </HStack>
            <HStack className="items-center">
              <Ionicons name="ellipse-outline" size={20} color="#6B7280" />
              <Text className="text-white/60 text-sm ml-2">
                3. ⏳ 낙찰자 결정 및 알림 발송
              </Text>
            </HStack>
            <HStack className="items-center">
              <Ionicons name="ellipse-outline" size={20} color="#6B7280" />
              <Text className="text-white/60 text-sm ml-2">
                4. ⏳ 결과 화면 업데이트
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>

      {/* 대기 중 안내 */}
      <Box className="rounded-2xl p-6 bg-green-500/5 border border-green-500/20">
        <VStack space="md" className="items-center">
          <Ionicons name="hourglass" size={32} color="#10B981" />
          <Text className="text-green-300 text-lg font-bold text-center">
            ☕ 잠시만 기다려주세요
          </Text>
          <Text className="text-white/70 text-sm text-center">
            자동으로 결과가 업데이트됩니다.{"\n"}
            화면을 새로고침하지 마세요!
          </Text>
        </VStack>
      </Box>

      {/* 예상 시나리오 */}
      <Box className="rounded-xl p-4 bg-yellow-500/5 border border-yellow-500/20">
        <VStack space="sm">
          <HStack className="items-center">
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
            <Text className="text-yellow-300 font-bold ml-2">💡 예상 결과</Text>
          </HStack>
          <Text className="text-white/70 text-sm">
            {auction.bidders === 0
              ? "• 입찰자가 없어 유찰될 가능성이 높습니다"
              : auction.currentBid &&
                auction.startingPrice &&
                auction.currentBid >= auction.startingPrice
              ? "• 시작가를 넘어 낙찰될 가능성이 높습니다"
              : "• 시작가 미달로 유찰될 수 있습니다"}
            {"\n"}• 결과는 입찰 내역과 시작가를 기준으로 결정됩니다
            {"\n"}• 처리 완료 후 자동으로 알림이 발송됩니다
          </Text>
        </VStack>
      </Box>

      {/* 새로고침 버튼 */}
      <Box className="rounded-xl p-4 bg-gray-500/5 border border-gray-500/20">
        <VStack space="sm" className="items-center">
          <Text className="text-gray-300 text-sm text-center">
            결과가 업데이트되지 않나요?
          </Text>
          <Text className="text-white/60 text-xs text-center">
            일반적으로 1-3분 내에 처리됩니다.{"\n"}
            5분 이상 걸린다면 고객센터에 문의해주세요.
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
};
