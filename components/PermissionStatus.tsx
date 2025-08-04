import React from "react";
import { Alert } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Button, ButtonText } from "@/components/ui/button";
import { Text as GluestackText } from "@/components/ui/text";
import { Badge, BadgeText } from "@/components/ui/badge";
import {
  usePermissions,
  PermissionType,
  PermissionStatus,
} from "@/hooks/usePermissions";

interface PermissionStatusProps {
  type: PermissionType;
  showRequestButton?: boolean;
  showSettingsButton?: boolean;
  compact?: boolean;
}

export const PermissionStatusCard: React.FC<PermissionStatusProps> = ({
  type,
  showRequestButton = false,
  showSettingsButton = true,
  compact = false,
}) => {
  const { permissions, requestPermission, openSettings } = usePermissions();
  const status = permissions[type];

  const getPermissionInfo = (type: PermissionType) => {
    switch (type) {
      case "camera":
        return {
          name: "카메라",
          icon: "📸",
          description: "사진 촬영",
        };
      case "photo":
        return {
          name: "사진",
          icon: "🖼️",
          description: "갤러리 접근",
        };
      case "notification":
        return {
          name: "알림",
          icon: "🔔",
          description: "푸시 알림",
        };
      default:
        return {
          name: "",
          icon: "",
          description: "",
        };
    }
  };

  const getStatusInfo = (status: PermissionStatus) => {
    switch (status) {
      case "granted":
        return {
          color: "success",
          text: "허용됨",
          icon: "✅",
        };
      case "denied":
        return {
          color: "error",
          text: "거부됨",
          icon: "❌",
        };
      case "blocked":
        return {
          color: "error",
          text: "차단됨",
          icon: "🚫",
        };
      default:
        return {
          color: "muted",
          text: "확인 중",
          icon: "⏳",
        };
    }
  };

  const permissionInfo = getPermissionInfo(type);
  const statusInfo = getStatusInfo(status);

  const handleRequestPermission = async () => {
    try {
      await requestPermission(type);
    } catch (error) {
      console.error("권한 요청 실패:", error);
      Alert.alert("오류", "권한 요청 중 문제가 발생했습니다.");
    }
  };

  const handleOpenSettings = () => {
    Alert.alert(
      "설정으로 이동",
      `${permissionInfo.name} 권한을 변경하려면 설정으로 이동하세요.`,
      [
        { text: "취소", style: "cancel" },
        { text: "설정으로 이동", onPress: openSettings },
      ]
    );
  };

  if (compact) {
    return (
      <HStack className="items-center space-x-2">
        <GluestackText className="text-lg">{permissionInfo.icon}</GluestackText>
        <VStack className="flex-1">
          <GluestackText className="text-sm font-medium text-gray-900">
            {permissionInfo.name}
          </GluestackText>
          <GluestackText className="text-xs text-gray-500">
            {permissionInfo.description}
          </GluestackText>
        </VStack>
        <Badge
          variant="solid"
          action={statusInfo.color === "success" ? "success" : "error"}
          size="sm"
        >
          <BadgeText className="text-xs">
            {statusInfo.icon} {statusInfo.text}
          </BadgeText>
        </Badge>
      </HStack>
    );
  }

  return (
    <Box className="bg-white rounded-xl p-4 border border-gray-200">
      <VStack space="md">
        {/* 헤더 */}
        <HStack className="justify-between items-start">
          <HStack className="items-center space-x-3">
            <Box className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
              <GluestackText className="text-xl">
                {permissionInfo.icon}
              </GluestackText>
            </Box>
            <VStack>
              <GluestackText className="font-semibold text-gray-900">
                {permissionInfo.name}
              </GluestackText>
              <GluestackText className="text-sm text-gray-600">
                {permissionInfo.description}
              </GluestackText>
            </VStack>
          </HStack>
          <Badge
            variant="solid"
            action={statusInfo.color === "success" ? "success" : "error"}
          >
            <BadgeText className="text-xs">
              {statusInfo.icon} {statusInfo.text}
            </BadgeText>
          </Badge>
        </HStack>

        {/* 상태별 설명 */}
        {status === "granted" && (
          <Box className="bg-green-50 rounded-lg p-3 border border-green-200">
            <GluestackText className="text-sm text-green-800">
              ✅ {permissionInfo.name} 권한이 활성화되어 있습니다.
            </GluestackText>
          </Box>
        )}

        {status === "denied" && (
          <Box className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <VStack space="sm">
              <GluestackText className="text-sm text-yellow-800">
                ⚠️ {permissionInfo.name} 권한이 거부되었습니다.
              </GluestackText>
              <GluestackText className="text-xs text-yellow-700">
                일부 기능이 제한될 수 있습니다.
              </GluestackText>
            </VStack>
          </Box>
        )}

        {status === "blocked" && (
          <Box className="bg-red-50 rounded-lg p-3 border border-red-200">
            <VStack space="sm">
              <GluestackText className="text-sm text-red-800">
                🚫 {permissionInfo.name} 권한이 차단되었습니다.
              </GluestackText>
              <GluestackText className="text-xs text-red-700">
                설정에서 권한을 허용해야 합니다.
              </GluestackText>
            </VStack>
          </Box>
        )}

        {/* 액션 버튼 */}
        <HStack space="sm">
          {showRequestButton && status !== "granted" && (
            <Button
              size="sm"
              onPress={handleRequestPermission}
              className="flex-1 bg-blue-500"
            >
              <ButtonText className="text-white text-sm">권한 요청</ButtonText>
            </Button>
          )}

          {showSettingsButton && status !== "granted" && (
            <Button
              size="sm"
              variant="outline"
              onPress={handleOpenSettings}
              className="flex-1 border-gray-300"
            >
              <ButtonText className="text-gray-700 text-sm">
                설정으로 이동
              </ButtonText>
            </Button>
          )}

          {status === "granted" && (
            <Button
              size="sm"
              variant="outline"
              onPress={handleOpenSettings}
              className="flex-1 border-gray-300"
            >
              <ButtonText className="text-gray-700 text-sm">
                권한 관리
              </ButtonText>
            </Button>
          )}
        </HStack>
      </VStack>
    </Box>
  );
};

// 모든 권한 상태를 한 번에 표시하는 컴포넌트
export const AllPermissionsStatus: React.FC<{
  showRequestButtons?: boolean;
  showSettingsButtons?: boolean;
  compact?: boolean;
}> = ({
  showRequestButtons = false,
  showSettingsButtons = true,
  compact = false,
}) => {
  const { permissions } = usePermissions();

  const permissionTypes: PermissionType[] = ["camera", "photo", "notification"];

  return (
    <VStack space="md">
      {permissionTypes.map((type) => (
        <PermissionStatusCard
          key={type}
          type={type}
          showRequestButton={showRequestButtons}
          showSettingsButton={showSettingsButtons}
          compact={compact}
        />
      ))}
    </VStack>
  );
};
