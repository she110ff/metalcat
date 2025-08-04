import React from "react";
import { Modal, View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text as GluestackText } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Download, X, RefreshCw } from "lucide-react-native";
import { UpdateState } from "@/hooks/useAppUpdates";
import Constants from "expo-constants";

interface UpdateAvailableModalProps {
  visible: boolean;
  updateState: UpdateState;
  onDownload: () => void;
  onDismiss: () => void;
  onCheckAgain: () => void;
}

export function UpdateAvailableModal({
  visible,
  updateState,
  onDownload,
  onDismiss,
  onCheckAgain,
}: UpdateAvailableModalProps) {
  const handleDownload = () => {
    Alert.alert("업데이트 다운로드", "업데이트를 다운로드하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "다운로드", onPress: onDownload },
    ]);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "알 수 없음";
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Box className="bg-white rounded-lg p-6 shadow-lg max-w-[400px] w-full">
            {/* 헤더 */}
            <HStack className="justify-between items-center mb-4">
              <HStack className="items-center space-x-2">
                <RefreshCw size={20} color="#3b82f6" />
                <Heading size="md" className="text-gray-900">
                  업데이트 사용 가능
                </Heading>
              </HStack>
              <TouchableOpacity onPress={onDismiss}>
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </HStack>

            {/* 내용 */}
            <VStack className="space-y-4">
              <GluestackText size="sm" className="text-gray-700">
                새로운 버전의 MetalCat이 사용 가능합니다.
              </GluestackText>

              <Box className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <VStack className="space-y-2">
                  <HStack className="justify-between">
                    <GluestackText size="sm" className="text-gray-600">
                      현재 버전
                    </GluestackText>
                    <GluestackText
                      size="sm"
                      className="text-gray-900 font-semibold"
                    >
                      {Constants.expoConfig?.version || "알 수 없음"}
                    </GluestackText>
                  </HStack>
                  <HStack className="justify-between">
                    <GluestackText size="sm" className="text-gray-600">
                      빌드 번호
                    </GluestackText>
                    <GluestackText size="sm" className="text-gray-900">
                      {Constants.expoConfig?.ios?.buildNumber ||
                        Constants.expoConfig?.android?.versionCode ||
                        "알 수 없음"}
                    </GluestackText>
                  </HStack>
                  <HStack className="justify-between">
                    <GluestackText size="sm" className="text-gray-600">
                      마지막 체크
                    </GluestackText>
                    <GluestackText size="sm" className="text-gray-900">
                      {formatDate(updateState.lastChecked)}
                    </GluestackText>
                  </HStack>
                </VStack>
              </Box>

              {updateState.error && (
                <Box className="bg-red-50 p-3 rounded-md border border-red-200">
                  <GluestackText size="sm" className="text-red-700">
                    오류: {updateState.error}
                  </GluestackText>
                </Box>
              )}

              {/* 액션 버튼들 */}
              <VStack className="space-y-4 mt-4">
                <Button
                  onPress={handleDownload}
                  disabled={updateState.isDownloading}
                  className="bg-blue-500 active:bg-blue-600 py-3"
                >
                  <HStack className="items-center space-x-2">
                    <Download size={16} color="#ffffff" />
                    <GluestackText className="text-white font-semibold">
                      {updateState.isDownloading
                        ? "다운로드 중..."
                        : "업데이트 다운로드"}
                    </GluestackText>
                  </HStack>
                </Button>

                <Button onPress={onDismiss} className="text-gray-500 py-3">
                  <GluestackText className="text-gray-500">
                    나중에
                  </GluestackText>
                </Button>
              </VStack>
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
