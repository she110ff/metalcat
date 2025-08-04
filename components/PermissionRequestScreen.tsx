import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Button, ButtonText } from "@/components/ui/button";
import { Text as GluestackText } from "@/components/ui/text";
import { Progress, ProgressFilledTrack } from "@/components/ui/progress";
import { usePermissions, PermissionType } from "@/hooks/usePermissions";

const { width, height } = Dimensions.get("window");

interface PermissionStep {
  type: PermissionType;
  title: string;
  description: string;
  icon: string;
  examples: string[];
}

const PERMISSION_STEPS: PermissionStep[] = [
  {
    type: "camera",
    title: "카메라 접근 권한",
    description:
      "경매 물품의 사진을 촬영하여 더 정확한 정보를 제공할 수 있습니다",
    icon: "📸",
    examples: ["스크랩 메탈 사진 촬영", "기계류 상태 확인", "재료 품질 검증"],
  },
  {
    type: "photo",
    title: "사진 접근 권한",
    description: "기존 사진을 업로드하여 빠르게 경매를 등록할 수 있습니다",
    icon: "🖼️",
    examples: ["갤러리에서 사진 선택", "기존 물품 사진 업로드", "문서 스캔"],
  },
  {
    type: "notification",
    title: "알림 권한",
    description: "중요한 경매 정보와 입찰 결과를 놓치지 않도록 도와드립니다",
    icon: "🔔",
    examples: [
      "입찰 성공/실패 알림",
      "경매 마감 알림",
      "새로운 경매 등록 알림",
    ],
  },
];

export const PermissionRequestScreen: React.FC = () => {
  const router = useRouter();
  const {
    permissions,
    requestPermission,
    openSettings,
    markOnboardingComplete,
  } = usePermissions();

  const [currentStep, setCurrentStep] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const currentPermission = PERMISSION_STEPS[currentStep];
  const progress = (currentStep / PERMISSION_STEPS.length) * 100;

  // 권한 요청 처리
  const handlePermissionRequest = async () => {
    setIsRequesting(true);

    try {
      const granted = await requestPermission(currentPermission.type);

      if (granted) {
        setCompletedSteps((prev) => new Set([...prev, currentStep]));

        // 다음 단계로 이동
        if (currentStep < PERMISSION_STEPS.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          // 모든 단계 완료
          await handleComplete();
        }
      } else {
        // 권한 거부 시 설정 화면으로 이동 옵션 제공
        Alert.alert(
          "권한 필요",
          `${currentPermission.title}이 필요합니다. 설정에서 권한을 허용해주세요.`,
          [
            { text: "나중에", style: "cancel" },
            { text: "설정으로 이동", onPress: openSettings },
          ]
        );
      }
    } catch (error) {
      console.error("권한 요청 실패:", error);
      Alert.alert("오류", "권한 요청 중 문제가 발생했습니다.");
    } finally {
      setIsRequesting(false);
    }
  };

  // 건너뛰기 처리
  const handleSkip = () => {
    if (currentStep < PERMISSION_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  // 완료 처리
  const handleComplete = async () => {
    await markOnboardingComplete();
    router.replace("/(tabs)");
  };

  // 설정에서 복귀 시 권한 상태 확인
  useEffect(() => {
    const checkPermissionsOnReturn = () => {
      // 앱이 포커스를 받았을 때 권한 상태 재확인
      const checkPermissions = async () => {
        // 권한 상태가 변경되었는지 확인하고 UI 업데이트
        const currentPermissionStatus = permissions[currentPermission.type];
        if (currentPermissionStatus === "granted") {
          setCompletedSteps((prev) => new Set([...prev, currentStep]));
        }
      };

      checkPermissions();
    };

    // 앱 포커스 이벤트 리스너 (실제 구현에서는 AppState 사용)
    return () => {
      // 클린업
    };
  }, [currentStep, permissions, currentPermission.type]);

  if (!currentPermission) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Box className="flex-1 bg-white">
        {/* 진행률 표시 */}
        <Box className="px-6 pt-4">
          <VStack space="sm">
            <HStack className="justify-between items-center">
              <GluestackText className="text-sm text-gray-600">
                {currentStep + 1} / {PERMISSION_STEPS.length}
              </GluestackText>
              <GluestackText className="text-sm text-gray-600">
                {Math.round(progress)}%
              </GluestackText>
            </HStack>
            <Progress value={progress} className="h-2">
              <ProgressFilledTrack className="bg-blue-500" />
            </Progress>
          </VStack>
        </Box>

        {/* 메인 콘텐츠 */}
        <Box className="flex-1 px-6 justify-center">
          <VStack space="xl" className="items-center">
            {/* 아이콘 */}
            <Box className="w-24 h-24 bg-blue-50 rounded-full items-center justify-center">
              <GluestackText className="text-4xl">
                {currentPermission.icon}
              </GluestackText>
            </Box>

            {/* 제목 */}
            <VStack space="sm" className="items-center">
              <GluestackText className="text-2xl font-bold text-gray-900 text-center">
                {currentPermission.title}
              </GluestackText>
              <GluestackText className="text-base text-gray-600 text-center leading-6">
                {currentPermission.description}
              </GluestackText>
            </VStack>

            {/* 사용 예시 */}
            <Box className="w-full bg-gray-50 rounded-xl p-4">
              <GluestackText className="text-sm font-semibold text-gray-700 mb-3">
                사용 예시:
              </GluestackText>
              <VStack space="sm">
                {currentPermission.examples.map((example, index) => (
                  <HStack key={index} className="items-center space-x-2">
                    <GluestackText className="text-blue-500">•</GluestackText>
                    <GluestackText className="text-sm text-gray-600 flex-1">
                      {example}
                    </GluestackText>
                  </HStack>
                ))}
              </VStack>
            </Box>

            {/* 개인정보 보호 안내 */}
            <Box className="w-full bg-blue-50 rounded-xl p-4 border border-blue-200">
              <GluestackText className="text-sm text-blue-800 text-center">
                💡 개인정보는 안전하게 보호되며, 서비스 목적으로만 사용됩니다.
              </GluestackText>
            </Box>
          </VStack>
        </Box>

        {/* 하단 버튼 */}
        <Box className="px-6 pb-8">
          <VStack space="md">
            <Button
              size="lg"
              onPress={handlePermissionRequest}
              disabled={isRequesting}
              className="bg-blue-500"
            >
              <ButtonText className="text-white font-semibold">
                {isRequesting ? "권한 요청 중..." : "허용하고 계속"}
              </ButtonText>
            </Button>

            <Button
              size="lg"
              variant="outline"
              onPress={handleSkip}
              className="border-gray-300"
            >
              <ButtonText className="text-gray-700">
                {currentStep < PERMISSION_STEPS.length - 1
                  ? "나중에"
                  : "건너뛰고 시작"}
              </ButtonText>
            </Button>

            {currentStep < PERMISSION_STEPS.length - 1 && (
              <Button
                size="sm"
                variant="link"
                onPress={openSettings}
                className="mt-2"
              >
                <ButtonText className="text-gray-500 text-sm">
                  설정에서 권한 변경
                </ButtonText>
              </Button>
            )}
          </VStack>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});
