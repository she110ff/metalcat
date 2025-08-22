import React, { useState, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonText } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { materialsProductTypes } from "@/data";
import { MaterialProductType } from "@/data/types";
import { PhotoPicker, PhotoInfo } from "@/components/PhotoPicker";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function MaterialsAuctionCreate() {
  const router = useRouter();
  const { slaveUserId, slaveName } = useLocalSearchParams();

  console.log("📥 [자재 1단계] URL 파라미터 확인:", {
    slaveUserId,
    slaveName,
  });

  // 빈 상태로 시작 - 사용자가 직접 사진을 선택해야 함
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);

  const handleBack = () => {
    router.back();
  };

  // 다음 단계로 이동 가능한지 체크
  const isNextButtonEnabled = () => photos.length >= 3;

  // 진행 상태 텍스트
  const getProgressText = () => {
    if (photos.length < 3) return `사진 ${photos.length}/3 (최소 3장 필요)`;
    return "다음 단계로 진행하세요";
  };

  const handleNext = () => {
    console.log("handleNext 호출됨");
    console.log("photos.length:", photos.length);

    if (photos.length < 3) {
      Alert.alert("알림", "사진을 최소 3장 이상 등록해주세요.");
      return;
    }

    console.log("다음 화면으로 이동 시도");

    // 첫 번째 단계 데이터를 쿼리 파라미터로 전달
    const firstStepData = {
      productType: materialsProductTypes[0], // 기본값: H빔
      photos: photos,
    };

    try {
      // URL params를 통해 데이터 전달
      const params = new URLSearchParams({
        firstStepData: JSON.stringify(firstStepData),
      });

      // 슬레이브 유저 파라미터가 있으면 추가
      if (slaveUserId) {
        params.append("slaveUserId", slaveUserId as string);
      }
      if (slaveName) {
        params.append("slaveName", slaveName as string);
      }

      console.log("🔗 [자재 1단계] 다음 단계로 이동:", {
        slaveUserId,
        slaveName,
        finalUrl: `/auction-create/materials/additional-info?${params.toString()}`,
      });

      // 다음 화면으로 이동 (추가 정보 입력) - 절대 경로 사용
      router.push(
        `/auction-create/materials/additional-info?${params.toString()}`
      );
      console.log("✅ 라우팅 성공");
    } catch (error) {
      console.error("❌ 라우팅 오류:", error);
      Alert.alert("오류", "다음 단계로 이동할 수 없습니다. 다시 시도해주세요.");
    }
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        {/* 헤더 */}
        <VStack space="md">
          <HStack className="items-center justify-between px-4 py-3">
            {/* 모바일 표준 뒤로가기 버튼 */}
            <Pressable
              onPress={handleBack}
              className="active:opacity-60"
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: -8,
              }}
            >
              <HStack className="items-center" space="xs">
                <ChevronLeft
                  size={Platform.OS === "ios" ? 28 : 24}
                  color="#FFFFFF"
                  style={{
                    fontWeight: Platform.OS === "ios" ? "600" : "normal",
                  }}
                />
                {Platform.OS === "ios" && (
                  <Text className="text-white text-base font-medium">뒤로</Text>
                )}
              </HStack>
            </Pressable>

            <Text
              className="text-white text-xl font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              중고자재 경매 등록
            </Text>

            {/* 오른쪽 여백 (대칭을 위해) */}
            <Box style={{ width: Platform.OS === "ios" ? 60 : 44 }} />
          </HStack>
        </VStack>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
        >
          <VStack space="xl" className="pb-8">
            {/* 사진 등록 */}
            <PhotoPicker
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={5}
              minPhotos={3}
              hasRepresentative={true}
              title="사진 등록"
              showCounter={false}
              size="medium"
              maxFileSizeMB={8}
            />
          </VStack>
        </ScrollView>

        {/* 하단 다음 버튼 */}
        <Box className="px-6 py-4 bg-black/20 border-t border-white/10">
          <Button
            variant="solid"
            onPress={handleNext}
            disabled={!isNextButtonEnabled()}
            className="w-full"
            style={{
              backgroundColor: isNextButtonEnabled()
                ? "rgba(147, 51, 234, 0.9)"
                : "rgba(107, 114, 128, 0.5)",
            }}
          >
            <ButtonText
              className="text-white font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              {isNextButtonEnabled()
                ? `진행하기 ✓`
                : `진행하기 (${photos.length}/3장)`}
            </ButtonText>
          </Button>
        </Box>
      </SafeAreaView>
    </LinearGradient>
  );
}
