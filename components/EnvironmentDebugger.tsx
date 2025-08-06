import React, { useState, useEffect } from "react";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

interface EnvironmentDebuggerProps {
  /** 컴포넌트 표시 여부 제어 */
  visible?: boolean;
  /** 접을 수 있는지 여부 */
  collapsible?: boolean;
  /** 기본 펼쳐진 상태 */
  defaultExpanded?: boolean;
}

export function EnvironmentDebugger({
  visible = true,
  collapsible = true,
  defaultExpanded = false,
}: EnvironmentDebuggerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [pushTokenInfo, setPushTokenInfo] = useState<{
    token?: string;
    projectId?: string;
    hasPermission?: boolean;
    isDevice?: boolean;
    platform?: string;
    error?: string;
  }>({});

  // Push Token 정보 가져오기
  useEffect(() => {
    const getPushTokenInfo = async () => {
      const PROJECT_ID = "19829544-dd83-47d5-8c48-ffcdc913c8b1";

      try {
        const isDevice = Device.isDevice;
        const platform = Platform.OS;

        if (!isDevice) {
          setPushTokenInfo({
            isDevice: false,
            platform,
            projectId: PROJECT_ID,
            error: "시뮬레이터에서는 Push Token을 가져올 수 없습니다",
          });
          return;
        }

        // 권한 확인
        const { status } = await Notifications.getPermissionsAsync();
        const hasPermission = status === "granted";

        if (!hasPermission) {
          setPushTokenInfo({
            isDevice: true,
            platform,
            projectId: PROJECT_ID,
            hasPermission: false,
            error: "알림 권한이 필요합니다",
          });
          return;
        }

        // Push Token 가져오기
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId: PROJECT_ID,
        });

        setPushTokenInfo({
          token: tokenResponse.data,
          projectId: PROJECT_ID,
          hasPermission: true,
          isDevice: true,
          platform,
        });
      } catch (error) {
        setPushTokenInfo({
          isDevice: Device.isDevice,
          platform: Platform.OS,
          projectId: PROJECT_ID,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    getPushTokenInfo();
  }, []);

  if (!visible) return null;

  // 🎯 핵심 발견: process.env[key] 동적 접근 불가, 직접 접근만 가능!
  const directEnvAccess = {
    // EAS에서 로드하는 변수들
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    EXPO_PUBLIC_EXPO_ACCESS_TOKEN: process.env.EXPO_PUBLIC_EXPO_ACCESS_TOKEN,

    // 기타 시스템 변수들
    NODE_ENV: process.env.NODE_ENV,
    APP_VARIANT: process.env.APP_VARIANT,

    // 추가 확인용
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    ENVIRONMENT: process.env.ENVIRONMENT,
  };

  // 동적 접근 시도 (실패할 것으로 예상)
  const dynamicAccessTest = (() => {
    try {
      const keys = ["EXPO_PUBLIC_SUPABASE_URL", "NODE_ENV"];
      const results = keys.map((key) => ({
        key,
        value: process.env[key as keyof typeof process.env],
        hasValue: !!process.env[key as keyof typeof process.env],
      }));
      return results;
    } catch (error) {
      return null;
    }
  })();

  // 통계 계산
  const stats = {
    directAccessCount: Object.values(directEnvAccess).filter(
      (v) => v !== undefined
    ).length,
    totalChecked: Object.keys(directEnvAccess).length,
    dynamicAccessWorks:
      dynamicAccessTest !== null && dynamicAccessTest.some((r) => r.hasValue),
  };

  // 민감한 정보 마스킹
  const maskValue = (key: string, value: string | undefined): string => {
    if (!value) return "(undefined)";

    const sensitivePatterns = ["KEY", "TOKEN", "SECRET", "PASSWORD"];
    const isSensitive = sensitivePatterns.some((pattern) =>
      key.toUpperCase().includes(pattern)
    );

    if (isSensitive && value.length > 8) {
      return `${value.slice(0, 4)}${"*".repeat(
        Math.min(value.length - 8, 20)
      )}${value.slice(-4)}`;
    }

    return value;
  };

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Box className="mb-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
      {/* 헤더 */}
      <Pressable onPress={toggleExpanded} disabled={!collapsible}>
        <HStack space="sm" className="px-4 py-3 items-center justify-between">
          <HStack space="sm" className="items-center flex-1">
            <Ionicons name="bug-outline" size={16} color="#fb923c" />
            <Text className="text-orange-400 text-sm font-semibold">
              React Native 환경변수 접근 분석
            </Text>
            <Box className="bg-orange-400/20 px-2 py-1 rounded-full">
              <Text className="text-orange-300 text-xs font-medium">
                {stats.directAccessCount}/{stats.totalChecked}개
              </Text>
            </Box>
          </HStack>

          {collapsible && (
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color="rgba(255, 255, 255, 0.5)"
            />
          )}
        </HStack>
      </Pressable>

      {/* 환경변수 목록 */}
      {(!collapsible || isExpanded) && (
        <VStack space="md" className="px-4 pb-3">
          {/* 🎯 핵심 발견 요약 */}
          <Box className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
            <HStack space="sm" className="items-center mb-2">
              <Text className="text-2xl">🔍</Text>
              <Text className="text-red-400 text-sm font-semibold">
                핵심 발견!
              </Text>
            </HStack>
            <VStack space="xs">
              <Text className="text-red-300 text-xs">
                • React Native에서는 process.env[key] 동적 접근이 불가능
              </Text>
              <Text className="text-red-300 text-xs">
                • process.env.VARIABLE_NAME 직접 접근만 가능
              </Text>
              <Text className="text-red-300 text-xs">
                • 이것이 Object.keys(process.env)가 작동하지 않는 이유!
              </Text>
            </VStack>
          </Box>

          {/* 직접 접근 결과 */}
          <Box className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
            <Text className="text-green-400 text-sm font-semibold mb-3">
              ✅ 직접 접근 결과 (process.env.VARIABLE_NAME)
            </Text>
            <VStack space="sm">
              {Object.entries(directEnvAccess).map(([key, value]) => (
                <Box
                  key={key}
                  className={`p-2 rounded-lg border ${
                    value !== undefined
                      ? "bg-green-600/10 border-green-500/30"
                      : "bg-gray-600/10 border-gray-500/30"
                  }`}
                >
                  <HStack className="justify-between items-center">
                    <Text className="text-green-300 text-xs font-mono flex-1">
                      {key}
                    </Text>
                    <Text className="text-lg ml-2">
                      {value !== undefined ? "✅" : "❌"}
                    </Text>
                  </HStack>
                  {value !== undefined && (
                    <Text
                      className="text-white/70 text-xs font-mono mt-1 break-all"
                      numberOfLines={2}
                    >
                      {maskValue(key, value)}
                    </Text>
                  )}
                </Box>
              ))}
            </VStack>
          </Box>

          {/* 동적 접근 테스트 결과 */}
          <Box className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <Text className="text-blue-400 text-sm font-semibold mb-3">
              🧪 동적 접근 테스트 (process.env[key])
            </Text>
            {dynamicAccessTest ? (
              <VStack space="sm">
                {dynamicAccessTest.map(({ key, value, hasValue }) => (
                  <HStack key={key} className="justify-between items-center">
                    <Text className="text-blue-300 text-xs font-mono flex-1">
                      process.env["{key}"]
                    </Text>
                    <Text className="text-lg ml-2">
                      {hasValue ? "✅" : "❌"}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            ) : (
              <Text className="text-blue-300 text-xs">
                동적 접근 테스트 실패 또는 지원되지 않음
              </Text>
            )}
          </Box>

          {/* Push Token 정보 */}
          <Box className="bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20">
            <Text className="text-indigo-400 text-sm font-semibold mb-3">
              📱 Expo Push Token 정보
            </Text>
            <VStack space="sm">
              <HStack className="justify-between items-center">
                <Text className="text-indigo-300 text-xs">Project ID:</Text>
                <Text
                  className="text-white/80 text-xs font-mono flex-1 ml-2"
                  numberOfLines={1}
                >
                  {pushTokenInfo.projectId || "로딩 중..."}
                </Text>
              </HStack>

              <HStack className="justify-between items-center">
                <Text className="text-indigo-300 text-xs">Platform:</Text>
                <Text className="text-white text-xs">
                  {pushTokenInfo.platform || "Unknown"}
                </Text>
              </HStack>

              <HStack className="justify-between items-center">
                <Text className="text-indigo-300 text-xs">Is Device:</Text>
                <Text className="text-lg">
                  {pushTokenInfo.isDevice ? "✅" : "❌"}
                </Text>
              </HStack>

              <HStack className="justify-between items-center">
                <Text className="text-indigo-300 text-xs">Permission:</Text>
                <Text className="text-lg">
                  {pushTokenInfo.hasPermission ? "✅" : "❌"}
                </Text>
              </HStack>

              {pushTokenInfo.token && (
                <Box className="mt-2 p-2 bg-green-600/10 border border-green-500/20 rounded-lg">
                  <Text className="text-green-400 text-xs font-semibold mb-1">
                    Push Token:
                  </Text>
                  <Text className="text-green-300 text-xs font-mono break-all">
                    {pushTokenInfo.token}
                  </Text>
                </Box>
              )}

              {pushTokenInfo.error && (
                <Box className="mt-2 p-2 bg-red-600/10 border border-red-500/20 rounded-lg">
                  <Text className="text-red-400 text-xs font-semibold mb-1">
                    Error:
                  </Text>
                  <Text className="text-red-300 text-xs">
                    {pushTokenInfo.error}
                  </Text>
                </Box>
              )}
            </VStack>
          </Box>

          {/* EAS vs 런타임 비교 */}
          <Box className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
            <Text className="text-purple-400 text-sm font-semibold mb-3">
              📊 EAS vs React Native 런타임 비교
            </Text>
            <VStack space="xs">
              <HStack className="justify-between">
                <Text className="text-purple-300 text-xs">
                  EAS 빌드에서 로드됨:
                </Text>
                <Text className="text-white text-xs">5개 변수</Text>
              </HStack>
              <HStack className="justify-between">
                <Text className="text-purple-300 text-xs">
                  런타임에서 직접 접근 가능:
                </Text>
                <Text className="text-white text-xs">
                  {stats.directAccessCount}개
                </Text>
              </HStack>
              <HStack className="justify-between">
                <Text className="text-purple-300 text-xs">
                  동적 접근 (process.env[key]):
                </Text>
                <Text className="text-white text-xs">
                  {stats.dynamicAccessWorks ? "가능" : "불가능"}
                </Text>
              </HStack>
              <HStack className="justify-between">
                <Text className="text-purple-300 text-xs">
                  Push Token 상태:
                </Text>
                <Text className="text-white text-xs">
                  {pushTokenInfo.token
                    ? "✅ 가져옴"
                    : pushTokenInfo.error
                    ? "❌ 실패"
                    : "⏳ 로딩"}
                </Text>
              </HStack>
            </VStack>
          </Box>

          {/* 결론 */}
          <Box className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
            <Text className="text-yellow-400 text-sm font-semibold mb-2">
              💡 결론
            </Text>
            <VStack space="xs">
              <Text className="text-yellow-300 text-xs">
                • EAS가 환경변수를 "로드"해도 React Native 런타임에서는 컴파일
                시점에 정적으로 대체된 값만 접근 가능
              </Text>
              <Text className="text-yellow-300 text-xs">
                • Metro bundler가 빌드 시점에 process.env.VARIABLE_NAME을 실제
                값으로 치환
              </Text>
              <Text className="text-yellow-300 text-xs">
                • 동적 환경변수 접근이 불가능한 것은 React Native의 정상적인
                동작
              </Text>
            </VStack>
          </Box>

          {/* 시스템 정보 */}
          <Box className="mt-2 pt-2 border-t border-white/10">
            <Text className="text-white/40 text-xs text-center">
              개발 환경에서만 표시 • 업데이트:{" "}
              {new Date().toLocaleTimeString("ko-KR")}
            </Text>
          </Box>
        </VStack>
      )}
    </Box>
  );
}

export default EnvironmentDebugger;
