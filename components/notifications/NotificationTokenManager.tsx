import React from "react";
import { Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { useNotificationToken } from "@/hooks/notifications/useNotificationToken";
import { tokenService } from "@/hooks/notifications/tokenService";

export const NotificationTokenManager: React.FC = () => {
  const {
    token,
    isLoading,
    isError,
    error,
    source,
    lastUpdated,
    refreshToken,
    forceRegister,
    syncToken,
    isRefreshing,
    isForceRegistering,
    isSyncing,
  } = useNotificationToken();

  // 토큰 상태에 따른 표시 텍스트
  const getTokenStatusText = () => {
    if (isLoading) return "확인 중...";
    if (isError) return "등록 실패";
    if (token) {
      switch (source) {
        case "cache":
          return "등록됨 (캐시)";
        case "server":
          return "등록됨 (서버)";
        case "new":
          return "등록됨 (신규)";
        default:
          return "등록됨";
      }
    }
    return "등록되지 않음";
  };

  // 토큰 상태에 따른 색상
  const getTokenStatusColor = () => {
    if (isLoading) return "text-gray-500";
    if (isError) return "text-red-600";
    if (token) return "text-green-600";
    return "text-orange-600";
  };

  // 토큰 미리보기
  const getTokenPreview = () => {
    if (!token) return "토큰 없음";
    return `${token.substring(0, 20)}...`;
  };

  // 토큰 새로고침 처리
  const handleRefreshToken = async () => {
    try {
      refreshToken();
    } catch (error) {
      Alert.alert("오류", "토큰 새로고침에 실패했습니다.");
    }
  };

  // 토큰 재등록 처리
  const handleForceRegister = async () => {
    Alert.alert("토큰 재등록", "기존 토큰을 삭제하고 새로 등록하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "재등록",
        style: "destructive",
        onPress: () => {
          try {
            forceRegister();
          } catch (error) {
            Alert.alert("오류", "토큰 재등록에 실패했습니다.");
          }
        },
      },
    ]);
  };

  // 단순 토큰 생성 처리 (시세 화면과 동일한 방식)
  const handleSimpleRegister = async () => {
    try {
      const result = await tokenService.simpleCreateToken();

      if (result.success && result.token) {
        Alert.alert(
          "성공",
          `토큰이 생성되었습니다!\n${result.token.substring(0, 50)}...`
        );
        // 백그라운드에서 서버 저장 시도
        setTimeout(() => forceRegister(), 1000);
      } else {
        Alert.alert("오류", result.error || "토큰 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("단순 토큰 생성 실패:", error);
      Alert.alert(
        "오류",
        "토큰 생성에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
    }
  };

  // 토큰 동기화 처리
  const handleSyncToken = async () => {
    try {
      syncToken();
    } catch (error) {
      Alert.alert("오류", "토큰 동기화에 실패했습니다.");
    }
  };

  return (
    <VStack space="md">
      {/* 토큰 상태 표시 - 숨김 처리 */}
      {/* 
      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <VStack space="sm">
          <HStack className="justify-between items-center">
            <Text className="text-sm font-medium text-gray-700">
              Push Token 상태
            </Text>
            <Text className={`text-xs font-medium ${getTokenStatusColor()}`}>
              {getTokenStatusText()}
            </Text>
          </HStack>

          {token && (
            <VStack space="xs">
              <Text className="text-xs text-gray-500">토큰 미리보기</Text>
              <Text className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded">
                {getTokenPreview()}
              </Text>
            </VStack>
          )}

          {source && (
            <Text className="text-xs text-gray-500">
              출처:{" "}
              {source === "cache"
                ? "캐시"
                : source === "server"
                ? "서버"
                : "신규 생성"}
            </Text>
          )}
        </VStack>
      </Box>
      */}

      {/* 에러 상태 */}
      {isError && error && (
        <Box className="bg-red-50 rounded-xl p-4 border border-red-200">
          <VStack space="sm">
            <Text className="text-sm font-medium text-red-800">
              ⚠️ 토큰 등록 오류
            </Text>
            <Text className="text-xs text-red-700">{error}</Text>

            {/* 단순 토큰 생성 버튼 (권장) */}
            <Button
              size="sm"
              variant="solid"
              onPress={handleSimpleRegister}
              isDisabled={isLoading}
              className="mt-2 bg-blue-600"
            >
              <ButtonText>
                {isLoading ? "토큰 생성 중..." : "🔧 단순 토큰 생성 (권장)"}
              </ButtonText>
            </Button>

            <Divider />

            {/* 고급 옵션 */}
            <Text className="text-xs text-gray-600">고급 옵션:</Text>
            <HStack space="sm">
              <Button
                size="sm"
                variant="outline"
                onPress={handleForceRegister}
                isDisabled={isLoading || isForceRegistering}
                className="flex-1"
              >
                <ButtonText>
                  {isForceRegistering ? "재등록 중..." : "토큰 재등록"}
                </ButtonText>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onPress={handleSyncToken}
                isDisabled={isLoading || isSyncing}
                className="flex-1"
              >
                <ButtonText>{isSyncing ? "동기화 중..." : "동기화"}</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* 성공 상태에서도 액션 버튼 제공 */}
      {!isError && token && (
        <Box className="bg-green-50 rounded-xl p-4 border border-green-200">
          <VStack space="sm">
            <Text className="text-sm font-medium text-green-800">
              ✅ 토큰이 정상적으로 등록되었습니다
            </Text>
            <Text className="text-xs text-green-700">
              알림을 받을 수 있는 상태입니다.
            </Text>

            <HStack space="sm">
              <Button
                size="sm"
                variant="outline"
                onPress={handleRefreshToken}
                isDisabled={isRefreshing}
                className="flex-1 border-green-300"
              >
                <ButtonText>
                  {isRefreshing ? "새로고침 중..." : "새로고침"}
                </ButtonText>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onPress={handleSyncToken}
                isDisabled={isSyncing}
                className="flex-1 border-green-300"
              >
                <ButtonText>{isSyncing ? "동기화 중..." : "동기화"}</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* 로딩 상태 */}
      {isLoading && !isError && !token && (
        <Box className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <VStack space="sm">
            <Text className="text-sm font-medium text-blue-800">
              🔄 토큰을 확인하고 있습니다...
            </Text>
            <Text className="text-xs text-blue-700">잠시만 기다려주세요.</Text>
          </VStack>
        </Box>
      )}
    </VStack>
  );
};
