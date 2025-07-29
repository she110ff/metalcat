import React from "react";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Ionicons } from "@expo/vector-icons";

export default function DemolitionConfirmation() {
  const router = useRouter();

  const handleGoToList = () => {
    router.push("/(tabs)/auction" as any);
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <VStack className="flex-1 p-6 justify-center items-center" space="xl">
          {/* 성공 아이콘 */}
          <Box className="w-24 h-24 rounded-full bg-green-500 items-center justify-center">
            <Ionicons name="construct" size={48} color="#FFFFFF" />
          </Box>

          {/* 제목 */}
          <VStack space="md" className="items-center">
            <Text
              className="text-white text-2xl font-bold text-center"
              style={{ fontFamily: "NanumGothic" }}
            >
              철거 경매 등록 완료!
            </Text>
            <Text
              className="text-gray-300 text-base text-center"
              style={{ fontFamily: "NanumGothic" }}
            >
              철거 경매가 성공적으로 등록되었습니다.
              {"\n"}입찰자들의 관심을 기다려보세요!
            </Text>
          </VStack>

          {/* 경매 목록으로 이동 버튼 */}
          <Button
            variant="solid"
            onPress={handleGoToList}
            className="w-full rounded-2xl bg-purple-600/90 min-h-14"
          >
            <ButtonText
              className="text-white font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              경매 목록으로 이동
            </ButtonText>
          </Button>
        </VStack>
      </SafeAreaView>
    </LinearGradient>
  );
}
