import React from "react";
import { Modal, View, StyleSheet } from "react-native";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Progress } from "@/components/ui/progress";
import { Download, CheckCircle, AlertCircle } from "lucide-react-native";
import { UpdateState } from "@/hooks/useAppUpdates";
import Constants from "expo-constants";

interface UpdateProgressModalProps {
  visible: boolean;
  updateState: UpdateState;
  onApplyUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateProgressModal({
  visible,
  updateState,
  onApplyUpdate,
  onDismiss,
}: UpdateProgressModalProps) {
  const getProgressText = () => {
    if (updateState.error) return "다운로드 실패";
    if (updateState.isDownloaded) return "다운로드 완료";
    if (updateState.isDownloading) return "다운로드 중...";
    return "준비 중...";
  };

  const getProgressIcon = () => {
    if (updateState.error) return AlertCircle;
    if (updateState.isDownloaded) return CheckCircle;
    return Download;
  };

  const getProgressColor = () => {
    if (updateState.error) return "#ef4444";
    if (updateState.isDownloaded) return "#22c55e";
    return "#3b82f6";
  };

  const getProgressValue = () => {
    if (updateState.downloadProgress !== null) {
      return updateState.downloadProgress * 100;
    }
    if (updateState.isDownloaded) return 100;
    if (updateState.isDownloading) return 50;
    return 0;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={updateState.error ? onDismiss : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Box className="bg-white rounded-lg p-6 shadow-lg max-w-[400px] w-full">
            {/* 헤더 */}
            <VStack className="items-center space-y-4">
              {React.createElement(getProgressIcon(), {
                size: 24,
                color: getProgressColor(),
              })}

              <Heading size="md" className="text-gray-900 text-center">
                {updateState.error ? "업데이트 실패" : "업데이트 다운로드"}
              </Heading>

              <Text size="sm" className="text-gray-700 text-center">
                {getProgressText()}
              </Text>
            </VStack>

            {/* 현재 버전 정보 */}
            <Box className="bg-blue-50 p-3 rounded-md border border-blue-200 mt-4">
              <VStack className="space-y-2">
                <HStack className="justify-between">
                  <Text size="sm" className="text-gray-600">
                    현재 버전
                  </Text>
                  <Text size="sm" className="text-blue-900 font-semibold">
                    {Constants.expoConfig?.version || "알 수 없음"}
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text size="sm" className="text-gray-600">
                    빌드 번호
                  </Text>
                  <Text size="sm" className="text-blue-900">
                    {Constants.expoConfig?.ios?.buildNumber ||
                      Constants.expoConfig?.android?.versionCode ||
                      "알 수 없음"}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* 진행률 바 */}
            {(updateState.isDownloading || updateState.isDownloaded) && (
              <VStack className="space-y-3 mt-6">
                <HStack className="justify-between items-center">
                  <Text size="sm" className="text-gray-600">
                    진행률
                  </Text>
                  <Text size="sm" className="text-gray-900 font-semibold">
                    {Math.round(getProgressValue())}%
                  </Text>
                </HStack>

                <Progress
                  value={getProgressValue()}
                  size="md"
                  className="bg-gray-200"
                />
              </VStack>
            )}

            {/* 에러 메시지 */}
            {updateState.error && (
              <Box className="bg-red-50 p-3 rounded-md border border-red-200 mt-4">
                <Text size="sm" className="text-red-700">
                  {updateState.error}
                </Text>
              </Box>
            )}

            {/* 액션 버튼들 */}
            <VStack className="space-y-3 mt-6">
              {updateState.isDownloaded && (
                <Button
                  onPress={onApplyUpdate}
                  className="bg-green-500 active:bg-green-600"
                >
                  <HStack className="items-center space-x-2">
                    <CheckCircle size={16} color="#ffffff" />
                    <Text className="text-white font-semibold">
                      업데이트 적용
                    </Text>
                  </HStack>
                </Button>
              )}

              {updateState.error && (
                <Button
                  onPress={onDismiss}
                  className="bg-blue-500 active:bg-blue-600"
                >
                  <Text className="text-white font-semibold">확인</Text>
                </Button>
              )}

              {!updateState.error && !updateState.isDownloaded && (
                <Button onPress={onDismiss} className="border border-gray-300">
                  <Text className="text-gray-700">취소</Text>
                </Button>
              )}
            </VStack>
          </Box>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
  },
});
