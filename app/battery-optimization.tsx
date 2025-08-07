import React, { useState } from "react";
import { View, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Battery,
  Zap,
  Settings,
  RefreshCw,
} from "lucide-react-native";
import { useBatteryOptimizationContext } from "@/contexts/BatteryOptimizationContext";

export default function BatteryOptimizationScreen() {
  const router = useRouter();
  const {
    settings,
    isLoading,
    saveSettings,
    resetSettings,
    toggleBatterySaverMode,
    togglePerformanceMode,
  } = useBatteryOptimizationContext();

  const [isSaving, setIsSaving] = useState(false);

  // 시간 포맷팅 헬퍼
  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}시간 ${minutes > 0 ? `${minutes}분` : ""}`;
    }
    return `${minutes}분`;
  };

  // 설정 저장 핸들러
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const success = await saveSettings(settings);
      if (success) {
        Alert.alert("성공", "배터리 최적화 설정이 저장되었습니다.");
      } else {
        Alert.alert("오류", "설정 저장에 실패했습니다.");
      }
    } catch (error) {
      Alert.alert("오류", "설정 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 설정 초기화 핸들러
  const handleResetSettings = async () => {
    Alert.alert(
      "설정 초기화",
      "모든 배터리 최적화 설정을 기본값으로 되돌리시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "초기화",
          style: "destructive",
          onPress: async () => {
            const success = await resetSettings();
            if (success) {
              Alert.alert("성공", "설정이 초기화되었습니다.");
            } else {
              Alert.alert("오류", "설정 초기화에 실패했습니다.");
            }
          },
        },
      ]
    );
  };

  // 배터리 절약 모드 토글
  const handleBatterySaverMode = async () => {
    const success = await toggleBatterySaverMode();
    if (success) {
      Alert.alert("배터리 절약 모드", "배터리 절약 모드가 활성화되었습니다.");
    } else {
      Alert.alert("오류", "모드 변경에 실패했습니다.");
    }
  };

  // 성능 모드 토글
  const handlePerformanceMode = async () => {
    const success = await togglePerformanceMode();
    if (success) {
      Alert.alert("성능 모드", "성능 모드가 활성화되었습니다.");
    } else {
      Alert.alert("오류", "모드 변경에 실패했습니다.");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Box className="flex-1 items-center justify-center">
          <Text>설정을 불러오는 중...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* 헤더 */}
      <HStack className="items-center justify-between p-4 bg-white border-b border-gray-200">
        <HStack className="items-center space-x-3">
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">배터리 최적화</Text>
        </HStack>
        <Battery size={24} color="#10B981" />
      </HStack>

      <ScrollView className="flex-1 p-4">
        {/* 빠른 모드 선택 */}
        <VStack className="mb-6 space-y-4">
          <Text className="text-lg font-semibold text-gray-900">빠른 모드</Text>

          <HStack className="space-x-3">
            <Button
              className="flex-1 bg-green-500"
              onPress={handleBatterySaverMode}
            >
              <HStack className="items-center space-x-2">
                <Battery size={20} color="white" />
                <Text className="text-white font-medium">배터리 절약</Text>
              </HStack>
            </Button>

            <Button
              className="flex-1 bg-blue-500"
              onPress={handlePerformanceMode}
            >
              <HStack className="items-center space-x-2">
                <Zap size={20} color="white" />
                <Text className="text-white font-medium">성능</Text>
              </HStack>
            </Button>
          </HStack>
        </VStack>

        {/* LME 데이터 설정 */}
        <VStack className="mb-6 space-y-4">
          <Text className="text-lg font-semibold text-gray-900">
            LME 데이터
          </Text>

          <Box className="bg-white p-4 rounded-lg border border-gray-200">
            <VStack className="space-y-4">
              <HStack className="justify-between items-center">
                <Text className="text-gray-700">크롤링 상태 갱신</Text>
                <Text className="text-gray-500 font-medium">
                  {formatTime(settings.lmeCrawlingInterval)}
                </Text>
              </HStack>

              <Slider
                value={[settings.lmeCrawlingInterval / (1000 * 60)]}
                onValueChange={([value]) => {
                  saveSettings({
                    lmeCrawlingInterval: value * 1000 * 60,
                  });
                }}
                min={5}
                max={120}
                step={5}
              />

              <HStack className="justify-between items-center">
                <Text className="text-gray-700">가격 데이터 갱신</Text>
                <Text className="text-gray-500 font-medium">
                  {formatTime(settings.lmePriceInterval)}
                </Text>
              </HStack>

              <Slider
                value={[settings.lmePriceInterval / (1000 * 60)]}
                onValueChange={([value]) => {
                  saveSettings({
                    lmePriceInterval: value * 1000 * 60,
                  });
                }}
                min={15}
                max={480}
                step={15}
              />
            </VStack>
          </Box>
        </VStack>

        {/* 경매 데이터 설정 */}
        <VStack className="mb-6 space-y-4">
          <Text className="text-lg font-semibold text-gray-900">
            경매 데이터
          </Text>

          <Box className="bg-white p-4 rounded-lg border border-gray-200">
            <VStack className="space-y-4">
              <HStack className="justify-between items-center">
                <Text className="text-gray-700">경매 목록 갱신</Text>
                <Text className="text-gray-500 font-medium">
                  {formatTime(settings.auctionRefreshInterval)}
                </Text>
              </HStack>

              <Slider
                value={[settings.auctionRefreshInterval / (1000 * 60)]}
                onValueChange={([value]) => {
                  saveSettings({
                    auctionRefreshInterval: value * 1000 * 60,
                  });
                }}
                min={1}
                max={60}
                step={1}
              />
            </VStack>
          </Box>
        </VStack>

        {/* 알림 설정 */}
        <VStack className="mb-6 space-y-4">
          <Text className="text-lg font-semibold text-gray-900">알림</Text>

          <Box className="bg-white p-4 rounded-lg border border-gray-200">
            <VStack className="space-y-4">
              <HStack className="justify-between items-center">
                <Text className="text-gray-700">알림 갱신</Text>
                <Text className="text-gray-500 font-medium">
                  {formatTime(settings.notificationRefreshInterval)}
                </Text>
              </HStack>

              <Slider
                value={[settings.notificationRefreshInterval / (1000 * 60)]}
                onValueChange={([value]) => {
                  saveSettings({
                    notificationRefreshInterval: value * 1000 * 60,
                  });
                }}
                min={1}
                max={60}
                step={1}
              />
            </VStack>
          </Box>
        </VStack>

        {/* 이미지 최적화 설정 */}
        <VStack className="mb-6 space-y-4">
          <Text className="text-lg font-semibold text-gray-900">
            이미지 최적화
          </Text>

          <Box className="bg-white p-4 rounded-lg border border-gray-200">
            <VStack className="space-y-4">
              <HStack className="justify-between items-center">
                <Text className="text-gray-700">이미지 품질</Text>
                <Text className="text-gray-500 font-medium">
                  {settings.imageQuality}%
                </Text>
              </HStack>

              <Slider
                value={[settings.imageQuality]}
                onValueChange={([value]) => {
                  saveSettings({
                    imageQuality: value,
                  });
                }}
                min={50}
                max={95}
                step={5}
              />
            </VStack>
          </Box>
        </VStack>

        {/* 기타 설정 */}
        <VStack className="mb-6 space-y-4">
          <Text className="text-lg font-semibold text-gray-900">기타</Text>

          <Box className="bg-white p-4 rounded-lg border border-gray-200">
            <VStack className="space-y-4">
              <HStack className="justify-between items-center">
                <Text className="text-gray-700">애니메이션 비활성화</Text>
                <Switch
                  value={settings.disableAnimations}
                  onValueChange={(value) => {
                    saveSettings({
                      disableAnimations: value,
                    });
                  }}
                />
              </HStack>

              <HStack className="justify-between items-center">
                <Text className="text-gray-700">백그라운드 폴링 비활성화</Text>
                <Switch
                  value={settings.disableBackgroundPolling}
                  onValueChange={(value) => {
                    saveSettings({
                      disableBackgroundPolling: value,
                    });
                  }}
                />
              </HStack>

              <HStack className="justify-between items-center">
                <Text className="text-gray-700">공격적인 캐싱</Text>
                <Switch
                  value={settings.enableAggressiveCaching}
                  onValueChange={(value) => {
                    saveSettings({
                      enableAggressiveCaching: value,
                    });
                  }}
                />
              </HStack>
            </VStack>
          </Box>
        </VStack>

        {/* 캐시 최적화 설정 */}
        <VStack className="mb-6 space-y-4">
          <Text className="text-lg font-semibold text-gray-900">
            캐시 최적화
          </Text>

          <Box className="bg-white p-4 rounded-lg border border-gray-200">
            <VStack className="space-y-4">
              <HStack className="justify-between items-center">
                <Text className="text-gray-700">StaleTime 배수</Text>
                <Text className="text-gray-500 font-medium">
                  {settings.cacheStaleTimeMultiplier.toFixed(1)}x
                </Text>
              </HStack>

              <Slider
                value={[settings.cacheStaleTimeMultiplier]}
                onValueChange={([value]) => {
                  saveSettings({
                    cacheStaleTimeMultiplier: value,
                  });
                }}
                min={0.1}
                max={1.0}
                step={0.1}
              />

              <HStack className="justify-between items-center">
                <Text className="text-gray-700">GcTime 배수</Text>
                <Text className="text-gray-500 font-medium">
                  {settings.cacheGcTimeMultiplier.toFixed(1)}x
                </Text>
              </HStack>

              <Slider
                value={[settings.cacheGcTimeMultiplier]}
                onValueChange={([value]) => {
                  saveSettings({
                    cacheGcTimeMultiplier: value,
                  });
                }}
                min={1.0}
                max={5.0}
                step={0.1}
              />

              <HStack className="justify-between items-center">
                <Text className="text-gray-700">캐시 최대 보관 시간</Text>
                <Text className="text-gray-500 font-medium">
                  {Math.floor(settings.cacheMaxAge / (1000 * 60 * 60))}시간
                </Text>
              </HStack>

              <Slider
                value={[settings.cacheMaxAge / (1000 * 60 * 60)]}
                onValueChange={([value]) => {
                  saveSettings({
                    cacheMaxAge: value * 1000 * 60 * 60,
                  });
                }}
                min={1}
                max={72}
                step={1}
              />
            </VStack>
          </Box>
        </VStack>

        {/* 액션 버튼들 */}
        <VStack className="space-y-3 mb-8">
          <Button
            className="bg-blue-500"
            onPress={handleSaveSettings}
            disabled={isSaving}
          >
            <HStack className="items-center space-x-2">
              <Settings size={20} color="white" />
              <Text className="text-white font-medium">
                {isSaving ? "저장 중..." : "설정 저장"}
              </Text>
            </HStack>
          </Button>

          <Button className="bg-gray-500" onPress={handleResetSettings}>
            <HStack className="items-center space-x-2">
              <RefreshCw size={20} color="white" />
              <Text className="text-white font-medium">설정 초기화</Text>
            </HStack>
          </Button>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
