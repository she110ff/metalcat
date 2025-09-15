import React, { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  useBatchStatus,
  useExecutionLogs,
  useSystemHealth,
} from "@/hooks/admin/useBatchStatus";
import {
  useAdminServiceRequests,
  usePremiumStats,
  useUpdateServiceRequestStatus,
  AdminServiceRequest,
} from "@/hooks/admin/useAdminPremium";
import {
  useAuctionStats,
  useCategoryStats,
  useRecentAuctions,
} from "@/hooks/admin/useAdminAuctions";
import {
  usePendingApprovalAuctions,
  usePendingApprovalStats,
} from "@/hooks/admin/usePendingApprovalAuctions";
import { useAdminAuctionsInfinite } from "@/hooks/admin/useAdminAuctionsInfinite";
import { useAdminServiceRequestsInfinite } from "@/hooks/admin/useAdminPremiumInfinite";
import AuctionDetailModal from "@/components/admin/AuctionDetailModal";
import {
  getAllAdminUsers,
  grantAdminRole,
  revokeAdminRole,
  searchUserByPhone,
  AdminUser,
} from "@/hooks/admin/useAdminAuth";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { ScrollView } from "@/components/ui/scroll-view";
import { Button, ButtonText } from "@/components/ui/button";
import { useRouter } from "expo-router";
import { ChevronLeft, RefreshCw, Edit3 } from "lucide-react-native";
import { Alert, TextInput } from "react-native";
import { useSlaveUsers, SlaveUser } from "@/hooks/admin/useSlaveUsers";
import SlaveUserCard from "@/components/admin/SlaveUserCard";
import {
  useHiddenAuctions,
  HiddenAuction,
} from "@/hooks/admin/useHiddenAuctions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/hooks/auth/api";
import {
  useCalculationStandards,
  useCreateCalculationStandard,
  useUpdateCalculationStandard,
  useDeleteCalculationStandard,
  CalculationStandard,
  CreateCalculationStandardData,
  UpdateCalculationStandardData,
} from "@/hooks/admin/useCalculationStandards";

// 탭 컴포넌트 import (아직 생성하지 않았으므로 임시)
// import { BatchTab } from "./tabs/BatchTab";
// import { PremiumTab } from "./tabs/PremiumTab";
// import { AuctionTab } from "./tabs/AuctionTab";

type AdminTab =
  | "batch"
  | "premium"
  | "auction"
  | "auction-create"
  | "admin"
  | "hidden"
  | "pending"
  | "calculation-standards";

export default function AdminScreen() {
  const { isAdmin } = useAdminAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("batch");
  const [hasShownAlert, setHasShownAlert] = React.useState(false);

  // 관리자 권한이 없을 때 알림 표시 (hooks 규칙 준수 + 중복 방지)
  React.useEffect(() => {
    // isAdmin이 명시적으로 false이고 아직 알림을 보여주지 않았을 때만 실행
    if (isAdmin === false && !hasShownAlert) {
      setHasShownAlert(true);
      Alert.alert("접근 권한 없음", "관리자 권한이 필요한 화면입니다.", [
        {
          text: "확인",
          onPress: () => router.back(),
        },
      ]);
    }
  }, [isAdmin, hasShownAlert, router]);

  // 관리자 권한이 명시적으로 false일 때만 접근 거부 화면 표시
  if (isAdmin === false) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Box className="flex-1 items-center justify-center">
          <Text className="text-red-500 text-lg">접근 권한이 없습니다</Text>
        </Box>
      </SafeAreaView>
    );
  }

  // 권한 확인 중일 때 로딩 화면
  if (isAdmin === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Box className="flex-1 items-center justify-center">
          <Text className="text-gray-500 text-lg">권한 확인 중...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "batch":
        return <BatchTabContent />;
      case "premium":
        return <PremiumTabContent />;
      case "auction":
        return <AuctionTabContent />;
      case "auction-create":
        return <AuctionCreateTabContent />;
      case "admin":
        return <AdminTabContent />;
      case "hidden":
        return <HiddenAuctionTabContent />;
      case "pending":
        return <PendingApprovalTabContent />;
      case "calculation-standards":
        return <CalculationStandardsTabContent />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      {/* 헤더 */}
      <Box className="py-4 px-4 border-b border-border-300 bg-background-0">
        <HStack className="items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={24} />
          </Pressable>
          <Heading size="lg">🛠️ 관리자 대시보드</Heading>
          <Box style={{ width: 24 }} />
        </HStack>
      </Box>

      {/* 탭 네비게이션 */}
      <Box className="px-4 pt-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <HStack className="bg-gray-100 rounded-xl p-1" space="xs">
            <Pressable
              className={`flex-1 py-3 px-4 rounded-lg ${
                activeTab === "batch" ? "bg-white shadow-sm" : "bg-transparent"
              }`}
              onPress={() => setActiveTab("batch")}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === "batch" ? "text-gray-900" : "text-gray-600"
                }`}
              >
                배치
              </Text>
            </Pressable>

            <Pressable
              className={`flex-1 py-3 px-4 rounded-lg ${
                activeTab === "premium"
                  ? "bg-white shadow-sm"
                  : "bg-transparent"
              }`}
              onPress={() => setActiveTab("premium")}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === "premium" ? "text-gray-900" : "text-gray-600"
                }`}
              >
                프리미엄
              </Text>
            </Pressable>

            <Pressable
              className={`flex-1 py-3 px-4 rounded-lg ${
                activeTab === "auction"
                  ? "bg-white shadow-sm"
                  : "bg-transparent"
              }`}
              onPress={() => setActiveTab("auction")}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === "auction" ? "text-gray-900" : "text-gray-600"
                }`}
              >
                경매
              </Text>
            </Pressable>

            <Pressable
              className={`flex-1 py-3 px-4 rounded-lg ${
                activeTab === "auction-create"
                  ? "bg-white shadow-sm"
                  : "bg-transparent"
              }`}
              onPress={() => setActiveTab("auction-create")}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === "auction-create"
                    ? "text-gray-900"
                    : "text-gray-600"
                }`}
              >
                경매 등록
              </Text>
            </Pressable>

            <Pressable
              className={`flex-1 py-3 px-4 rounded-lg ${
                activeTab === "admin" ? "bg-white shadow-sm" : "bg-transparent"
              }`}
              onPress={() => setActiveTab("admin")}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === "admin" ? "text-gray-900" : "text-gray-600"
                }`}
              >
                관리자
              </Text>
            </Pressable>

            <Pressable
              className={`py-3 px-4 rounded-lg ${
                activeTab === "hidden" ? "bg-white shadow-sm" : "bg-transparent"
              }`}
              onPress={() => setActiveTab("hidden")}
            >
              <Text
                className={`text-center font-medium whitespace-nowrap ${
                  activeTab === "hidden" ? "text-gray-900" : "text-gray-600"
                }`}
              >
                🔒 히든 경매
              </Text>
            </Pressable>

            <Pressable
              className={`py-3 px-4 rounded-lg ${
                activeTab === "pending"
                  ? "bg-white shadow-sm"
                  : "bg-transparent"
              }`}
              onPress={() => setActiveTab("pending")}
            >
              <Text
                className={`text-center font-medium whitespace-nowrap ${
                  activeTab === "pending" ? "text-gray-900" : "text-gray-600"
                }`}
              >
                ⏳ 승인대기
              </Text>
            </Pressable>

            <Pressable
              className={`py-3 px-4 rounded-lg ${
                activeTab === "calculation-standards"
                  ? "bg-white shadow-sm"
                  : "bg-transparent"
              }`}
              onPress={() => setActiveTab("calculation-standards")}
            >
              <Text
                className={`text-center font-medium whitespace-nowrap ${
                  activeTab === "calculation-standards"
                    ? "text-gray-900"
                    : "text-gray-600"
                }`}
              >
                📊 계산 기준
              </Text>
            </Pressable>
          </HStack>
        </ScrollView>
      </Box>

      {/* 탭 컨텐츠 */}
      <Box className="flex-1 px-4 pt-4">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 20,
          }}
        >
          {renderTabContent()}
        </ScrollView>
      </Box>
    </SafeAreaView>
  );
}

// 임시 탭 컴포넌트들 (나중에 별도 파일로 분리)
const BatchTabContent = () => {
  const {
    data: batchJobs,
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchBatchJobs,
  } = useBatchStatus();
  const {
    data: executionLogs,
    isLoading: logsLoading,
    refetch: refetchExecutionLogs,
  } = useExecutionLogs(10);
  const {
    data: systemHealth,
    isLoading: healthLoading,
    refetch: refetchSystemHealth,
  } = useSystemHealth();

  // 모든 데이터 새로고침 함수
  const handleRefreshAll = async () => {
    await Promise.all([
      refetchBatchJobs(),
      refetchExecutionLogs(),
      refetchSystemHealth(),
    ]);
  };

  console.log("executionLogs :", executionLogs);
  // 시간 포맷 헬퍼
  const formatLastRun = (lastRun?: string) => {
    if (!lastRun) return "실행 기록 없음";

    const now = new Date();
    const runTime = new Date(lastRun);
    const diffMinutes = Math.floor(
      (now.getTime() - runTime.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) return "방금 전";
    if (diffMinutes < 60) return `${diffMinutes}분 전`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}일 전`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-800";
      case "paused":
        return "bg-gray-50 text-gray-800";
      case "failed":
        return "bg-red-50 text-red-800";
      default:
        return "bg-gray-50 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "활성";
      case "paused":
        return "일시정지";
      case "failed":
        return "실패";
      default:
        return status;
    }
  };

  if (jobsLoading) {
    return (
      <Box className="flex-1 items-center justify-center py-8">
        <Text className="text-gray-500">배치 정보를 불러오는 중...</Text>
      </Box>
    );
  }

  if (jobsError) {
    return (
      <Box className="flex-1 items-center justify-center py-8">
        <Text className="text-red-500">
          배치 정보를 불러오는데 실패했습니다.
        </Text>
      </Box>
    );
  }

  const isRefreshing = jobsLoading || logsLoading || healthLoading;

  return (
    <VStack space="lg">
      {/* 새로고침 버튼 */}
      <Box className="flex-row justify-end">
        <Pressable
          onPress={handleRefreshAll}
          disabled={isRefreshing}
          className={`flex-row items-center px-4 py-2 rounded-lg ${
            isRefreshing ? "bg-gray-100" : "bg-blue-50 active:bg-blue-100"
          }`}
        >
          <RefreshCw
            size={16}
            color={isRefreshing ? "#9CA3AF" : "#3B82F6"}
            style={{
              transform: [{ rotate: isRefreshing ? "360deg" : "0deg" }],
            }}
          />
          <Text
            className={`ml-2 text-sm font-medium ${
              isRefreshing ? "text-gray-500" : "text-blue-600"
            }`}
          >
            {isRefreshing ? "새로고침 중..." : "새로고침"}
          </Text>
        </Pressable>
      </Box>

      {/* 시스템 상태 정보 */}
      {systemHealth && (
        <Box className="bg-white rounded-xl p-4 border border-gray-200">
          <Heading size="md" className="mb-3">
            🏥 시스템 상태
          </Heading>
          <VStack space="md">
            <HStack className="justify-between items-center py-2 border-b border-gray-100">
              <Text className="font-medium">환경</Text>
              <Text className="text-gray-800 font-bold">
                {systemHealth.environment}
              </Text>
            </HStack>
            <HStack className="justify-between items-center py-2 border-b border-gray-100">
              <Text className="font-medium">전체 Cron Jobs</Text>
              <Text className="text-blue-600 font-bold">
                {`${systemHealth.cron_jobs.total}개`}
              </Text>
            </HStack>
            <HStack className="justify-between items-center py-2 border-b border-gray-100">
              <Text className="font-medium">활성 Jobs</Text>
              <Text className="text-green-600 font-bold">
                {`${systemHealth.cron_jobs.active}개`}
              </Text>
            </HStack>
            <HStack className="justify-between items-center py-2 border-b border-gray-100">
              <Text className="font-medium">최근 1시간 실패</Text>
              <Text className="text-red-600 font-bold">
                {`${systemHealth.recent_failures_1h}건`}
              </Text>
            </HStack>
            <HStack className="justify-between items-center py-2">
              <Text className="font-medium">상태</Text>
              <Box
                className={`px-2 py-1 rounded ${
                  systemHealth.health_status === "healthy"
                    ? "bg-green-100"
                    : systemHealth.health_status === "warning"
                    ? "bg-yellow-100"
                    : "bg-red-100"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    systemHealth.health_status === "healthy"
                      ? "text-green-700"
                      : systemHealth.health_status === "warning"
                      ? "text-yellow-700"
                      : "text-red-700"
                  }`}
                >
                  {systemHealth.health_status === "healthy"
                    ? "정상"
                    : systemHealth.health_status === "warning"
                    ? "주의"
                    : "위험"}
                </Text>
              </Box>
            </HStack>
          </VStack>
        </Box>
      )}

      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <Heading size="md" className="mb-3">
          ⚙️ 배치 시스템 상태
        </Heading>
        <VStack space="md">
          {batchJobs && batchJobs.length > 0 ? (
            batchJobs.map((job, index) => (
              <Box
                key={index}
                className={`p-3 rounded-lg ${getStatusColor(job.status)}`}
              >
                <HStack className="justify-between items-start">
                  <VStack className="flex-1">
                    <Text className="font-semibold">{job.jobName}</Text>
                    <Text className="text-sm mt-1">
                      {job.schedule} • {formatLastRun(job.lastRun)}
                    </Text>
                  </VStack>
                  <VStack className="items-end">
                    <Text className="text-xs font-medium">
                      {getStatusText(job.status)}
                    </Text>
                    <Text className="text-xs">성공률: {job.successRate}%</Text>
                  </VStack>
                </HStack>
              </Box>
            ))
          ) : (
            <Text className="text-gray-500 text-center py-4">
              등록된 배치 작업이 없습니다.
            </Text>
          )}
        </VStack>
      </Box>

      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <Heading size="md" className="mb-3">
          📊 최근 실행 기록
        </Heading>
        {logsLoading ? (
          <Text className="text-gray-500">로그를 불러오는 중...</Text>
        ) : executionLogs && executionLogs.length > 0 ? (
          <VStack space="sm">
            {executionLogs.slice(0, 5).map((log, index) => (
              <Box
                key={log.id}
                className="py-2 border-b border-gray-100 last:border-b-0"
              >
                <HStack className="justify-between items-center">
                  <VStack>
                    <Text className="font-medium text-sm">{log.jobName}</Text>
                    <Text className="text-xs text-gray-600">
                      {formatLastRun(log.startedAt)}
                    </Text>
                    {log.status === "failed" && log.errorMessage && (
                      <Text className="text-xs text-red-600 mt-1">
                        🚨 {log.errorMessage}
                      </Text>
                    )}
                  </VStack>
                  <Box
                    className={`px-2 py-1 rounded ${
                      log.status === "success"
                        ? "bg-green-100"
                        : log.status === "failed"
                        ? "bg-red-100"
                        : "bg-yellow-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        log.status === "success"
                          ? "text-green-700"
                          : log.status === "failed"
                          ? "text-red-700"
                          : "text-yellow-700"
                      }`}
                    >
                      {log.status === "success"
                        ? "성공"
                        : log.status === "failed"
                        ? "실패"
                        : log.status}
                    </Text>
                  </Box>
                </HStack>
                {log.durationMs !== null && log.durationMs !== undefined && (
                  <Text className="text-xs text-gray-500 mt-1">
                    실행시간: {Math.round(Math.max(log.durationMs, 0) / 1000)}초
                  </Text>
                )}
              </Box>
            ))}
          </VStack>
        ) : (
          <Text className="text-gray-500">실행 기록이 없습니다.</Text>
        )}
      </Box>
    </VStack>
  );
};

const PremiumTabContent = () => {
  const { data: stats, isLoading: statsLoading } = usePremiumStats();

  // 무한 스크롤 훅 사용
  const {
    data: requestsData,
    isLoading: requestsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminServiceRequestsInfinite(10);

  const updateStatusMutation = useUpdateServiceRequestStatus();
  const router = useRouter();

  // 모든 페이지의 서비스 요청 데이터를 평면화 (중복 제거)
  const allRequests = React.useMemo(() => {
    const allData = requestsData?.pages.flatMap((page) => page.data) || [];
    // ID를 기준으로 중복 제거
    const uniqueData = allData.filter(
      (request, index, self) =>
        index === self.findIndex((r) => r.id === request.id)
    );
    return uniqueData;
  }, [requestsData]);

  // 더 보기 버튼 핸들러
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // 서비스 타입 텍스트 변환
  const getServiceTypeText = (type: string) => {
    return type === "appraisal" ? "회사 방문 감정 및 매입" : "개인 매입 서비스";
  };

  // 상태 텍스트 변환
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "대기 중";
      case "assigned":
        return "담당자 배정";
      case "in_progress":
        return "진행 중";
      case "completed":
        return "완료";
      case "cancelled":
        return "취소";
      default:
        return status;
    }
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-orange-600";
      case "assigned":
        return "text-blue-600";
      case "in_progress":
        return "text-purple-600";
      case "completed":
        return "text-green-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // 시간 포맷 헬퍼
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 가격 포맷 헬퍼
  const formatPrice = (price?: number) => {
    if (!price) return "-";
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(price);
  };

  // 상태 변경 처리
  const handleStatusUpdate = async (request: AdminServiceRequest) => {
    const statusOptions = [
      { label: "대기 중", value: "pending" },
      { label: "담당자 배정", value: "assigned" },
      { label: "진행 중", value: "in_progress" },
      { label: "완료", value: "completed" },
      { label: "취소", value: "cancelled" },
    ];

    Alert.alert(
      "상태 변경",
      `${getServiceTypeText(request.serviceType)} • ${request.userName}\n${
        request.address
      }`,
      [
        ...statusOptions.map((option) => ({
          text: option.label,
          onPress: async () => {
            let finalOfferNumber: number | undefined;

            if (option.value === "completed") {
              // 완료 상태일 때 최종 견적 입력 받기
              Alert.prompt(
                "최종 견적 입력",
                "금액을 입력하세요 (선택사항)",
                [
                  { text: "취소", style: "cancel" },
                  {
                    text: "확인",
                    onPress: async (finalOffer) => {
                      finalOfferNumber = finalOffer
                        ? parseInt(finalOffer.replace(/[^0-9]/g, ""))
                        : undefined;

                      const result = await updateStatusMutation.mutateAsync({
                        requestId: request.id,
                        status: option.value as any,
                        finalOffer: finalOfferNumber,
                      });

                      if (result.success) {
                        Alert.alert(
                          "성공",
                          "상태가 성공적으로 변경되었습니다."
                        );
                      } else {
                        Alert.alert(
                          "오류",
                          result.error || "상태 변경에 실패했습니다."
                        );
                      }
                    },
                  },
                ],
                "plain-text",
                request.finalOffer?.toString() || ""
              );
            } else {
              const result = await updateStatusMutation.mutateAsync({
                requestId: request.id,
                status: option.value as any,
                finalOffer: finalOfferNumber,
              });

              if (result.success) {
                Alert.alert("성공", "상태가 성공적으로 변경되었습니다.");
              } else {
                Alert.alert(
                  "오류",
                  result.error || "상태 변경에 실패했습니다."
                );
              }
            }
          },
        })),
        { text: "취소", style: "cancel" },
      ]
    );
  };

  if (statsLoading) {
    return (
      <Box className="flex-1 items-center justify-center py-8">
        <Text className="text-gray-500">통계를 불러오는 중...</Text>
      </Box>
    );
  }

  return (
    <VStack space="lg">
      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <Heading size="md" className="mb-3">
          🏆 프리미엄 서비스 통계
        </Heading>
        <VStack space="md">
          <HStack className="justify-between items-center py-2 border-b border-gray-100">
            <Text className="font-medium">전체 요청</Text>
            <Text className="text-gray-800 font-bold">
              {`${stats?.total || 0}건`}
            </Text>
          </HStack>
          <HStack className="justify-between items-center py-2 border-b border-gray-100">
            <Text className="font-medium">대기 중</Text>
            <Text className="text-orange-600 font-bold">
              {`${stats?.pending || 0}건`}
            </Text>
          </HStack>
          <HStack className="justify-between items-center py-2 border-b border-gray-100">
            <Text className="font-medium">진행 중</Text>
            <Text className="text-blue-600 font-bold">
              {`${(stats?.assigned || 0) + (stats?.inProgress || 0)}건`}
            </Text>
          </HStack>
          <HStack className="justify-between items-center py-2 border-b border-gray-100">
            <Text className="font-medium">완료</Text>
            <Text className="text-green-600 font-bold">
              {`${stats?.completed || 0}건`}
            </Text>
          </HStack>
          <HStack className="justify-between items-center py-2">
            <Text className="font-medium">총 거래액</Text>
            <Text className="text-purple-600 font-bold">
              {formatPrice(stats?.totalValue)}
            </Text>
          </HStack>
        </VStack>
      </Box>

      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <Heading size="md" className="mb-3">
          📋 서비스 요청 목록
        </Heading>
        {requestsLoading ? (
          <Text className="text-gray-500">요청 목록을 불러오는 중...</Text>
        ) : allRequests && allRequests.length > 0 ? (
          <VStack space="md">
            {allRequests.map((request) => (
              <Pressable
                key={request.id}
                onPress={() =>
                  router.push(`/service-request-detail/${request.id}`)
                }
                className="p-3 bg-gray-50 rounded-lg active:bg-gray-100"
              >
                <VStack space="sm">
                  <HStack className="justify-between items-start">
                    <VStack className="flex-1">
                      <Text className="font-semibold">
                        {getServiceTypeText(request.serviceType)} •{" "}
                        {request.userName}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {request.address}
                      </Text>
                      <VStack space="xs">
                        <HStack className="items-center" space="sm">
                          <Text className="text-xs text-gray-500">
                            📞 {request.contactPhone}
                          </Text>
                        </HStack>
                        <HStack className="items-center" space="xs">
                          <Text className="text-xs text-gray-400">
                            안심번호:
                          </Text>
                          <Box
                            className={`px-2 py-1 rounded-full ${
                              request.use_safe_number
                                ? "bg-green-100"
                                : "bg-gray-100"
                            }`}
                          >
                            <Text
                              className={`text-xs font-medium ${
                                request.use_safe_number
                                  ? "text-green-700"
                                  : "text-gray-600"
                              }`}
                            >
                              {request.use_safe_number
                                ? "🛡️ 사용"
                                : "❌ 미사용"}
                            </Text>
                          </Box>
                        </HStack>
                      </VStack>

                      {/* 추가 정보 표시 */}
                      {(request.item_type || request.quantity) && (
                        <HStack
                          className="items-center flex-wrap mt-1"
                          space="xs"
                        >
                          {request.item_type && (
                            <HStack className="items-center" space="xs">
                              <Text className="text-xs text-gray-400">
                                종류:
                              </Text>
                              <Box className="bg-blue-100 px-2 py-1 rounded-full">
                                <Text className="text-xs font-medium text-blue-700">
                                  📦 {request.item_type}
                                </Text>
                              </Box>
                            </HStack>
                          )}
                          {request.quantity && (
                            <HStack className="items-center" space="xs">
                              <Text className="text-xs text-gray-400">
                                수량:
                              </Text>
                              <Box className="bg-purple-100 px-2 py-1 rounded-full">
                                <Text className="text-xs font-medium text-purple-700">
                                  ⚖️ {request.quantity}kg
                                </Text>
                              </Box>
                            </HStack>
                          )}
                        </HStack>
                      )}

                      {request.description && (
                        <Text className="text-xs text-gray-500 mt-1">
                          {request.description}
                        </Text>
                      )}
                      {/* 이미지 표시 */}
                      {request.photos && request.photos.length > 0 && (
                        <HStack className="items-center mt-1">
                          <Text className="text-xs text-gray-500">
                            📸 이미지 {request.photos.length}장
                          </Text>
                        </HStack>
                      )}
                    </VStack>
                    <VStack className="items-end">
                      <Text
                        className={`text-sm font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusText(request.status)}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {formatDate(request.createdAt)}
                      </Text>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(request);
                        }}
                        className="mt-2 p-2 bg-blue-100 rounded-lg"
                      >
                        <Edit3 size={16} color="#3B82F6" />
                      </Pressable>
                    </VStack>
                  </HStack>
                  {request.finalOffer && (
                    <HStack className="justify-between items-center pt-2 border-t border-gray-200">
                      <Text className="text-sm font-medium">최종 견적</Text>
                      <Text className="text-sm font-bold text-purple-600">
                        {formatPrice(request.finalOffer)}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </Pressable>
            ))}

            {/* 더 보기 버튼 */}
            {hasNextPage && (
              <Pressable
                onPress={handleLoadMore}
                disabled={isFetchingNextPage}
                className={`mt-4 py-3 px-4 rounded-lg border-2 border-dashed ${
                  isFetchingNextPage
                    ? "border-gray-200 bg-gray-50"
                    : "border-blue-200 bg-blue-50 active:bg-blue-100"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    isFetchingNextPage ? "text-gray-500" : "text-blue-600"
                  }`}
                >
                  {isFetchingNextPage ? "불러오는 중..." : "더 보기"}
                </Text>
              </Pressable>
            )}

            {/* 총 개수 표시 */}
            <Text className="text-center text-gray-500 text-sm mt-2">
              {`총 ${stats?.total || allRequests.length}건의 서비스 요청`}
            </Text>
          </VStack>
        ) : (
          <Text className="text-gray-500">등록된 서비스 요청이 없습니다.</Text>
        )}
      </Box>
    </VStack>
  );
};

const AuctionTabContent = () => {
  const { data: auctionStats, isLoading: statsLoading } = useAuctionStats();
  const { data: categoryStats, isLoading: categoryLoading } =
    useCategoryStats();

  // 무한 스크롤 훅 사용
  const {
    data: auctionsData,
    isLoading: auctionsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminAuctionsInfinite(10);

  // 모달 상태
  const [selectedAuctionId, setSelectedAuctionId] = React.useState<
    string | null
  >(null);
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  // 모든 페이지의 경매 데이터를 평면화 (중복 제거)
  const allAuctions = React.useMemo(() => {
    const allData = auctionsData?.pages.flatMap((page) => page.data) || [];
    // ID를 기준으로 중복 제거
    const uniqueData = allData.filter(
      (auction, index, self) =>
        index === self.findIndex((a) => a.id === auction.id)
    );
    return uniqueData;
  }, [auctionsData]);

  // 경매 아이템 클릭 핸들러
  const handleAuctionPress = (auctionId: string) => {
    setSelectedAuctionId(auctionId);
    setIsModalVisible(true);
  };

  // 모달 닫기 핸들러
  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedAuctionId(null);
  };

  // 더 보기 버튼 핸들러
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // 카테고리명 변환
  const getCategoryText = (category: string) => {
    switch (category) {
      case "scrap":
        return "고철/비철";
      case "machinery":
        return "중고기계";
      case "materials":
        return "중고자재";
      case "demolition":
        return "철거";
      default:
        return category;
    }
  };

  // 상태 텍스트 변환
  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "진행중";
      case "ending":
        return "마감임박";
      case "ended":
        return "종료";
      case "cancelled":
        return "취소";
      default:
        return status;
    }
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-blue-600";
      case "ending":
        return "text-orange-600";
      case "ended":
        return "text-gray-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // 가격 포맷 헬퍼
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(price);
  };

  // 시간 포맷 헬퍼
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (statsLoading) {
    return (
      <Box className="flex-1 items-center justify-center py-8">
        <Text className="text-gray-500">경매 통계를 불러오는 중...</Text>
      </Box>
    );
  }

  return (
    <VStack space="lg">
      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <Heading size="md" className="mb-3">
          🏷️ 경매 통계
        </Heading>
        <VStack space="md">
          <HStack className="justify-between items-center py-2 border-b border-gray-100">
            <Text className="font-medium">전체 경매</Text>
            <Text className="text-gray-800 font-bold">
              {`${auctionStats?.total || 0}건`}
            </Text>
          </HStack>
          <HStack className="justify-between items-center py-2 border-b border-gray-100">
            <Text className="font-medium">진행 중인 경매</Text>
            <Text className="text-blue-600 font-bold">
              {`${auctionStats?.active || 0}건`}
            </Text>
          </HStack>
          <HStack className="justify-between items-center py-2 border-b border-gray-100">
            <Text className="font-medium">마감 임박 (24시간 이내)</Text>
            <Text className="text-orange-600 font-bold">
              {`${auctionStats?.ending || 0}건`}
            </Text>
          </HStack>
          <HStack className="justify-between items-center py-2 border-b border-gray-100">
            <Text className="font-medium">오늘 신규 등록</Text>
            <Text className="text-green-600 font-bold">
              {`${auctionStats?.todayNew || 0}건`}
            </Text>
          </HStack>
          <HStack className="justify-between items-center py-2">
            <Text className="font-medium">이번달 거래액</Text>
            <Text className="text-purple-600 font-bold">
              {formatPrice(auctionStats?.thisMonthValue || 0)}
            </Text>
          </HStack>
        </VStack>
      </Box>

      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <Heading size="md" className="mb-3">
          📈 카테고리별 현황
        </Heading>
        {categoryLoading ? (
          <Text className="text-gray-500">카테고리 통계를 불러오는 중...</Text>
        ) : (
          <VStack space="md">
            <HStack className="justify-between items-center py-2 border-b border-gray-100">
              <Text className="font-medium">🔩 고철</Text>
              <Text className="text-blue-600 font-bold">
                {`${categoryStats?.scrap || 0}건`}
              </Text>
            </HStack>
            <HStack className="justify-between items-center py-2 border-b border-gray-100">
              <Text className="font-medium">⚙️ 중고기계</Text>
              <Text className="text-green-600 font-bold">
                {`${categoryStats?.machinery || 0}건`}
              </Text>
            </HStack>
            <HStack className="justify-between items-center py-2 border-b border-gray-100">
              <Text className="font-medium">🏗️ 중고자재</Text>
              <Text className="text-orange-600 font-bold">
                {`${categoryStats?.materials || 0}건`}
              </Text>
            </HStack>
            <HStack className="justify-between items-center py-2">
              <Text className="font-medium">🏢 철거</Text>
              <Text className="text-red-600 font-bold">
                {`${categoryStats?.demolition || 0}건`}
              </Text>
            </HStack>
          </VStack>
        )}
      </Box>

      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <Heading size="md" className="mb-3">
          🏆 경매 목록
        </Heading>
        {auctionsLoading ? (
          <Text className="text-gray-500">경매 목록을 불러오는 중...</Text>
        ) : allAuctions && allAuctions.length > 0 ? (
          <VStack space="md">
            {allAuctions.map((auction) => (
              <Pressable
                key={auction.id}
                onPress={() => handleAuctionPress(auction.id)}
                className="p-3 bg-gray-50 rounded-lg active:bg-gray-100"
              >
                <VStack space="sm">
                  <HStack className="justify-between items-start">
                    <VStack className="flex-1">
                      <Text className="font-semibold">{auction.title}</Text>
                      <Text className="text-sm text-gray-600">
                        {getCategoryText(auction.auctionCategory)} • 입찰자{" "}
                        {auction.bidderCount}명
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text
                        className={`text-sm font-medium ${getStatusColor(
                          auction.status
                        )}`}
                      >
                        {getStatusText(auction.status)}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {formatDate(auction.createdAt)}
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack className="justify-between items-center mt-2 pt-2 border-t border-gray-200">
                    <Text className="text-sm text-gray-600">
                      시작가: {formatPrice(auction.startingPrice)}
                    </Text>
                    <Text className="text-sm font-bold text-green-600">
                      현재가: {formatPrice(auction.currentBid)}
                    </Text>
                  </HStack>
                </VStack>
              </Pressable>
            ))}

            {/* 더 보기 버튼 */}
            {hasNextPage && (
              <Pressable
                onPress={handleLoadMore}
                disabled={isFetchingNextPage}
                className={`mt-4 py-3 px-4 rounded-lg border-2 border-dashed ${
                  isFetchingNextPage
                    ? "border-gray-200 bg-gray-50"
                    : "border-blue-200 bg-blue-50 active:bg-blue-100"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    isFetchingNextPage ? "text-gray-500" : "text-blue-600"
                  }`}
                >
                  {isFetchingNextPage ? "불러오는 중..." : "더 보기"}
                </Text>
              </Pressable>
            )}

            {/* 총 개수 표시 */}
            <Text className="text-center text-gray-500 text-sm mt-2">
              {`총 ${auctionStats?.total || allAuctions.length}건의 경매`}
            </Text>
          </VStack>
        ) : (
          <Text className="text-gray-500 text-center py-4">
            등록된 경매가 없습니다.
          </Text>
        )}
      </Box>

      {/* 경매 상세 정보 모달 */}
      <AuctionDetailModal
        auctionId={selectedAuctionId}
        isVisible={isModalVisible}
        onClose={handleModalClose}
      />
    </VStack>
  );
};

const AdminTabContent = () => {
  const [adminUsers, setAdminUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchPhone, setSearchPhone] = React.useState("");
  const [searchResult, setSearchResult] = React.useState<AdminUser | null>(
    null
  );
  const [searchLoading, setSearchLoading] = React.useState(false);

  // 관리자 목록 로드
  const loadAdminUsers = async () => {
    setLoading(true);
    try {
      const users = await getAllAdminUsers();
      setAdminUsers(users);
    } catch (error) {
      console.error("관리자 목록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 전화번호로 사용자 검색
  const handleSearch = async () => {
    if (!searchPhone.trim()) {
      setSearchResult(null);
      return;
    }

    setSearchLoading(true);
    try {
      const user = await searchUserByPhone(searchPhone.trim());
      setSearchResult(user);
    } catch (error) {
      console.error("사용자 검색 실패:", error);
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  // 관리자 권한 부여
  const handleGrantAdmin = async (userId: string) => {
    try {
      const success = await grantAdminRole(userId);
      if (success) {
        Alert.alert("성공", "관리자 권한을 부여했습니다.");
        loadAdminUsers(); // 목록 새로고침
        setSearchResult(null); // 검색 결과 초기화
      } else {
        Alert.alert("실패", "관리자 권한 부여에 실패했습니다.");
      }
    } catch (error) {
      console.error("관리자 권한 부여 실패:", error);
      Alert.alert("오류", "관리자 권한 부여 중 오류가 발생했습니다.");
    }
  };

  // 관리자 권한 해제
  const handleRevokeAdmin = async (userId: string) => {
    try {
      const success = await revokeAdminRole(userId);
      if (success) {
        Alert.alert("성공", "관리자 권한을 해제했습니다.");
        loadAdminUsers(); // 목록 새로고침
        setSearchResult(null); // 검색 결과 초기화
      } else {
        Alert.alert("실패", "관리자 권한 해제에 실패했습니다.");
      }
    } catch (error) {
      console.error("관리자 권한 해제 실패:", error);
      Alert.alert("오류", "관리자 권한 해제 중 오류가 발생했습니다.");
    }
  };

  // 컴포넌트 마운트 시 관리자 목록 로드
  React.useEffect(() => {
    loadAdminUsers();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <VStack space="lg" className="p-4">
      {/* 사용자 검색 */}
      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <Heading size="md" className="mb-3">
          🔍 사용자 검색
        </Heading>
        <VStack space="md">
          <HStack space="sm">
            <Box className="flex-1">
              <TextInput
                placeholder="전화번호 입력 (예: 01012345678)"
                value={searchPhone}
                onChangeText={setSearchPhone}
                style={{
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                }}
                keyboardType="phone-pad"
              />
            </Box>
            <Pressable
              onPress={handleSearch}
              disabled={searchLoading}
              className="bg-blue-500 px-4 py-3 rounded-lg"
            >
              <Text className="text-white font-medium">
                {searchLoading ? "검색 중..." : "검색"}
              </Text>
            </Pressable>
          </HStack>

          {searchResult && (
            <Box className="p-3 bg-gray-50 rounded-lg">
              <VStack space="sm">
                <HStack className="justify-between items-center">
                  <VStack>
                    <Text className="font-semibold">{searchResult.name}</Text>
                    <Text className="text-sm text-gray-600">
                      {searchResult.phoneNumber}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      가입일: {formatDate(searchResult.createdAt)}
                    </Text>
                  </VStack>
                  <VStack className="items-end">
                    <Text
                      className={`text-sm font-medium ${
                        searchResult.isAdmin
                          ? "text-green-600"
                          : "text-gray-600"
                      }`}
                    >
                      {searchResult.isAdmin ? "관리자" : "일반 사용자"}
                    </Text>
                    {searchResult.isAdmin ? (
                      <Pressable
                        onPress={() => handleRevokeAdmin(searchResult.id)}
                        className="bg-red-500 px-3 py-1 rounded"
                      >
                        <Text className="text-white text-xs">권한 해제</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleGrantAdmin(searchResult.id)}
                        className="bg-green-500 px-3 py-1 rounded"
                      >
                        <Text className="text-white text-xs">권한 부여</Text>
                      </Pressable>
                    )}
                  </VStack>
                </HStack>
              </VStack>
            </Box>
          )}

          {searchResult === null && searchPhone.trim() && !searchLoading && (
            <Text className="text-gray-500 text-center py-2">
              해당 전화번호의 사용자를 찾을 수 없습니다.
            </Text>
          )}
        </VStack>
      </Box>

      {/* 관리자 목록 */}
      <Box className="bg-white rounded-xl p-4 border border-gray-200">
        <HStack className="justify-between items-center mb-3">
          <Heading size="md">👥 관리자 목록</Heading>
          <Pressable onPress={loadAdminUsers} disabled={loading}>
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </Pressable>
        </HStack>

        {loading ? (
          <Text className="text-gray-500 text-center py-4">
            관리자 목록을 불러오는 중...
          </Text>
        ) : adminUsers.length > 0 ? (
          <VStack space="md">
            {adminUsers.map((user) => (
              <Box key={user.id} className="p-3 bg-gray-50 rounded-lg">
                <HStack className="justify-between items-center">
                  <VStack>
                    <Text className="font-semibold">{user.name}</Text>
                    <Text className="text-sm text-gray-600">
                      {user.phoneNumber}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      가입일: {formatDate(user.createdAt)}
                    </Text>
                  </VStack>
                  <VStack className="items-end">
                    <Text className="text-sm font-medium text-green-600">
                      관리자
                    </Text>
                    <Pressable
                      onPress={() => handleRevokeAdmin(user.id)}
                      className="bg-red-500 px-3 py-1 rounded"
                    >
                      <Text className="text-white text-xs">권한 해제</Text>
                    </Pressable>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        ) : (
          <Text className="text-gray-500 text-center py-4">
            등록된 관리자가 없습니다.
          </Text>
        )}
      </Box>
    </VStack>
  );
};

// 경매 등록 탭 컴포넌트
const AuctionCreateTabContent = () => {
  const { slaveUsers, isLoading, error, refetch } = useSlaveUsers();
  const router = useRouter();

  const handleCreateAuction = (user: SlaveUser) => {
    console.log("🚀 [관리자 대시보드] 슬레이브 유저 선택:", {
      userId: user.id,
      userName: user.name,
      phoneNumber: user.phone_number,
    });

    // 경매 타입 선택 화면으로 이동
    const targetUrl = `/admin/slave-auction/type-selection?slaveUserId=${
      user.id
    }&slaveName=${encodeURIComponent(user.name)}`;

    console.log("🔗 [관리자 대시보드] 이동할 URL:", targetUrl);

    router.push(targetUrl as any);
  };

  if (isLoading) {
    return (
      <VStack space="lg">
        <Text className="text-xl font-bold text-gray-900">
          슬레이브 유저 경매 등록
        </Text>
        <Box className="bg-gray-50 border border-gray-200 rounded-xl p-8">
          <Text className="text-center text-gray-500">
            슬레이브 유저 목록을 불러오는 중...
          </Text>
        </Box>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack space="lg">
        <Text className="text-xl font-bold text-gray-900">
          슬레이브 유저 경매 등록
        </Text>
        <Box className="bg-red-50 border border-red-200 rounded-xl p-8">
          <Text className="text-center text-red-600">오류: {error}</Text>
          <Button className="mt-4 bg-red-600" onPress={refetch}>
            <ButtonText className="text-white">다시 시도</ButtonText>
          </Button>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack space="lg">
      <VStack space="md">
        <Text className="text-xl font-bold text-gray-900">
          슬레이브 유저 경매 등록
        </Text>
      </VStack>

      <VStack space="md">
        <HStack className="items-center justify-between">
          <Text className="text-lg font-semibold"></Text>
          <HStack className="items-center" space="sm">
            <Text className="text-sm text-gray-500">
              총 {slaveUsers.length}명
            </Text>
            <Pressable onPress={refetch}>
              <RefreshCw size={16} className="text-gray-500" />
            </Pressable>
          </HStack>
        </HStack>

        {slaveUsers.length > 0 ? (
          <VStack space="sm">
            {slaveUsers.map((user) => (
              <SlaveUserCard
                key={user.id}
                user={user}
                onCreateAuction={handleCreateAuction}
              />
            ))}
          </VStack>
        ) : (
          <Box className="bg-gray-50 border border-gray-200 rounded-xl p-8">
            <Text className="text-center text-gray-500">
              등록된 슬레이브 유저가 없습니다.
            </Text>
          </Box>
        )}
      </VStack>
    </VStack>
  );
};

// 히든 경매 탭 컨텐츠
const HiddenAuctionTabContent = () => {
  const { user } = useAuth();
  const router = useRouter();
  const {
    hiddenAuctions,
    stats,
    isLoading,
    error,
    refetch,
    unhideAuction,
    getHiddenAuctionDetail,
  } = useHiddenAuctions();

  // 디버깅용 로그
  console.log("🎯 HiddenAuctionTabContent 렌더링:");
  console.log("  - hiddenAuctions:", hiddenAuctions);
  console.log("  - hiddenAuctions.length:", hiddenAuctions?.length);
  console.log("  - stats:", stats);
  console.log("  - isLoading:", isLoading);
  console.log("  - error:", error);

  const handleUnhideAuction = async (auction: HiddenAuction) => {
    if (!user?.id) {
      Alert.alert("오류", "사용자 정보를 찾을 수 없습니다.");
      return;
    }

    Alert.alert(
      "히든 경매 해제",
      `"${auction.title}" 경매를 일반 경매로 전환하시겠습니까?\n\n전환 시 모든 사용자에게 알림이 발송됩니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "해제",
          style: "destructive",
          onPress: async () => {
            const success = await unhideAuction(
              auction.auction_id,
              user.id,
              "관리자에 의한 히든 해제"
            );
            if (success) {
              Alert.alert("성공", "히든 경매가 일반 경매로 전환되었습니다.");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <VStack space="lg">
        <Text className="text-xl font-bold text-gray-900">
          🔒 히든 경매 관리
        </Text>
        <Box className="bg-gray-50 border border-gray-200 rounded-xl p-8">
          <Text className="text-center text-gray-500">로딩 중...</Text>
        </Box>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack space="lg">
        <Text className="text-xl font-bold text-gray-900">
          🔒 히든 경매 관리
        </Text>
        <Box className="bg-red-50 border border-red-200 rounded-xl p-6">
          <VStack space="sm" className="items-center">
            <Text className="text-4xl">🚫</Text>
            <Text className="text-red-600 text-center font-medium">
              {error}
            </Text>
            {error.includes("관리자 권한") && (
              <Text className="text-red-500 text-center text-sm">
                관리자 계정으로 다시 로그인해주세요.
              </Text>
            )}
            <Button size="sm" variant="outline" onPress={refetch}>
              <ButtonText className="text-red-600">다시 시도</ButtonText>
            </Button>
          </VStack>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack space="lg">
      <VStack space="md">
        <HStack className="items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">
            🔒 히든 경매 관리
          </Text>
          <Pressable onPress={refetch}>
            <RefreshCw size={20} className="text-gray-500" />
          </Pressable>
        </HStack>

        {/* 통계 카드 */}
        {stats && (
          <HStack space="sm" className="flex-wrap">
            <Box className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1 min-w-[120px]">
              <Text className="text-blue-600 text-sm font-medium">
                전체 히든
              </Text>
              <Text className="text-blue-900 text-lg font-bold">
                {stats.total_hidden}개
              </Text>
            </Box>
            <Box className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1 min-w-[120px]">
              <Text className="text-green-600 text-sm font-medium">
                오늘 히든
              </Text>
              <Text className="text-green-900 text-lg font-bold">
                {stats.hidden_today}개
              </Text>
            </Box>
            <Box className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex-1 min-w-[120px]">
              <Text className="text-purple-600 text-sm font-medium">
                이번 주
              </Text>
              <Text className="text-purple-900 text-lg font-bold">
                {stats.hidden_this_week}개
              </Text>
            </Box>
            <Box className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex-1 min-w-[120px]">
              <Text className="text-orange-600 text-sm font-medium">
                평균 일수
              </Text>
              <Text className="text-orange-900 text-lg font-bold">
                {stats.avg_days_hidden}일
              </Text>
            </Box>
          </HStack>
        )}
      </VStack>

      {/* 히든 경매 목록 */}
      <VStack space="md">
        <HStack className="items-center justify-between">
          <VStack>
            <Text className="text-lg font-semibold">히든 경매 목록</Text>
            <Text className="text-xs text-gray-400">
              경매를 클릭하면 상세 정보를 볼 수 있습니다
            </Text>
          </VStack>
          <Text className="text-sm text-gray-500">
            총 {hiddenAuctions.length}개
          </Text>
        </HStack>

        {hiddenAuctions.length > 0 ? (
          <VStack space="sm">
            {(() => {
              console.log(
                "🔄 히든 경매 목록 렌더링:",
                hiddenAuctions.length,
                "개"
              );
              console.log("🔄 첫 번째 경매:", hiddenAuctions[0]);
              return hiddenAuctions.map((auction) => (
                <Pressable
                  key={auction.auction_id}
                  onPress={() =>
                    router.push(`/auction-detail/${auction.auction_id}`)
                  }
                  className="bg-white border border-gray-200 rounded-xl p-4 active:bg-gray-50"
                >
                  <VStack space="sm">
                    <HStack className="items-start justify-between">
                      <VStack space="xs" className="flex-1">
                        <Text className="font-semibold text-gray-900 text-base">
                          {auction.title}
                        </Text>
                        <HStack space="sm" className="items-center">
                          <Text className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {auction.category}
                          </Text>
                          <Text className="text-sm text-gray-500">
                            {auction.seller_name}
                          </Text>
                        </HStack>
                      </VStack>
                      <Text className="text-xs text-gray-400">
                        {auction.days_hidden}일 전
                      </Text>
                    </HStack>

                    <VStack space="xs">
                      <HStack className="items-center justify-between">
                        <Text className="text-xs text-gray-500">
                          히든 처리: {formatDate(auction.approved_at)}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          종료: {formatDate(auction.end_time)}
                        </Text>
                      </HStack>
                      {auction.hidden_reason && (
                        <Text className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          사유: {auction.hidden_reason}
                        </Text>
                      )}
                    </VStack>

                    <HStack space="sm" className="items-center justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={(e) => {
                          e.stopPropagation();
                          handleUnhideAuction(auction);
                        }}
                      >
                        <ButtonText className="text-blue-600">
                          히든 해제
                        </ButtonText>
                      </Button>
                    </HStack>
                  </VStack>
                </Pressable>
              ));
            })()}
          </VStack>
        ) : (
          <Box className="bg-gray-50 border border-gray-200 rounded-xl p-8">
            <VStack space="sm" className="items-center">
              <Text className="text-4xl">🔒</Text>
              <Text className="text-center text-gray-500 font-medium">
                히든 경매가 없습니다
              </Text>
              <Text className="text-center text-gray-400 text-sm">
                관리자가 히든 처리한 경매가 여기에 표시됩니다
              </Text>
            </VStack>
          </Box>
        )}
      </VStack>
    </VStack>
  );
};

// 승인대기 탭 컨텐츠
const PendingApprovalTabContent = () => {
  const {
    data: pendingAuctions,
    isLoading: pendingLoading,
    refetch: refetchPendingAuctions,
  } = usePendingApprovalAuctions();
  const {
    data: pendingStats,
    isLoading: statsLoading,
    refetch: refetchPendingStats,
  } = usePendingApprovalStats();
  const { user } = useAuth();
  const router = useRouter();

  // 전체 새로고침 함수
  const handleRefreshAll = async () => {
    await Promise.all([refetchPendingAuctions(), refetchPendingStats()]);
  };

  const handleApproveAuction = async (auctionId: string) => {
    if (!user?.id) {
      Alert.alert("오류", "사용자 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("approve_auction", {
        p_auction_id: auctionId,
        p_admin_id: user.id,
        p_reason: "관리자에 의한 승인",
      });

      if (error) throw error;

      Alert.alert("성공", "경매가 승인되었습니다.");
      // 승인 후 데이터 새로고침
      handleRefreshAll();
    } catch (error) {
      console.error("경매 승인 오류:", error);
      Alert.alert("오류", "경매 승인 중 오류가 발생했습니다.");
    }
  };

  const handleHideAuction = async (auctionId: string) => {
    if (!user?.id) {
      Alert.alert("오류", "사용자 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("hide_auction", {
        p_auction_id: auctionId,
        p_admin_id: user.id,
        p_reason: "관리자에 의한 히든 처리",
      });

      if (error) throw error;

      Alert.alert("성공", "경매가 히든 처리되었습니다.");
      // 히든 처리 후 데이터 새로고침
      handleRefreshAll();
    } catch (error) {
      console.error("경매 히든 처리 오류:", error);
      Alert.alert("오류", "경매 히든 처리 중 오류가 발생했습니다.");
    }
  };

  const isRefreshing = pendingLoading || statsLoading;

  return (
    <VStack space="lg" className="flex-1">
      {/* 새로고침 버튼 */}
      <Box className="flex-row justify-end">
        <Pressable
          onPress={handleRefreshAll}
          disabled={isRefreshing}
          className={`flex-row items-center px-4 py-2 rounded-lg ${
            isRefreshing ? "bg-gray-100" : "bg-blue-50 active:bg-blue-100"
          }`}
        >
          <RefreshCw
            size={16}
            color={isRefreshing ? "#9CA3AF" : "#3B82F6"}
            style={{
              transform: [{ rotate: isRefreshing ? "360deg" : "0deg" }],
            }}
          />
          <Text
            className={`ml-2 text-sm font-medium ${
              isRefreshing ? "text-gray-500" : "text-blue-600"
            }`}
          >
            {isRefreshing ? "새로고침 중..." : "새로고침"}
          </Text>
        </Pressable>
      </Box>

      {/* 승인대기 통계 */}
      <VStack space="md">
        <Heading size="lg" className="text-gray-900">
          ⏳ 승인대기 경매 관리
        </Heading>

        <HStack space="sm" className="flex-wrap">
          <Box className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex-1 min-w-[120px]">
            <VStack>
              <Text className="text-orange-800 font-semibold">
                승인대기 경매
              </Text>
              <Text className="text-orange-600 text-lg font-bold">
                {statsLoading
                  ? "로딩 중..."
                  : `${pendingStats?.totalPending || 0}개`}
              </Text>
            </VStack>
          </Box>

          <Box className="bg-red-50 border border-red-200 rounded-xl p-4 flex-1 min-w-[120px]">
            <VStack>
              <Text className="text-red-800 font-semibold text-sm">
                자동승인 임박
              </Text>
              <Text className="text-red-600 text-lg font-bold">
                {statsLoading
                  ? "로딩 중..."
                  : `${pendingStats?.autoApprovalSoon || 0}개`}
              </Text>
            </VStack>
          </Box>

          <Box className="bg-green-50 border border-green-200 rounded-xl p-4 flex-1 min-w-[120px]">
            <VStack>
              <Text className="text-green-800 font-semibold text-sm">
                오늘 승인
              </Text>
              <Text className="text-green-600 text-lg font-bold">
                {statsLoading
                  ? "로딩 중..."
                  : `${pendingStats?.todayApproved || 0}개`}
              </Text>
            </VStack>
          </Box>
        </HStack>
      </VStack>

      {/* 승인대기 경매 목록 */}
      <VStack space="md">
        <HStack className="items-center justify-between">
          <VStack>
            <Text className="text-lg font-semibold">승인대기 경매 목록</Text>
            <Text className="text-xs text-gray-400">
              경매를 클릭하면 상세 정보를 볼 수 있습니다
            </Text>
          </VStack>
          <Text className="text-sm text-gray-500">
            {pendingAuctions?.length || 0}개
          </Text>
        </HStack>

        {pendingLoading ? (
          <Box className="bg-gray-50 border border-gray-200 rounded-xl p-8">
            <Text className="text-center text-gray-500">로딩 중...</Text>
          </Box>
        ) : pendingAuctions && pendingAuctions.length > 0 ? (
          <VStack space="sm">
            {pendingAuctions.map((auction) => (
              <Pressable
                key={auction.id}
                onPress={() => router.push(`/auction-detail/${auction.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-4 active:bg-gray-50"
              >
                <VStack space="sm">
                  <HStack className="items-start justify-between">
                    <VStack className="flex-1">
                      <Text className="font-semibold text-gray-900">
                        {auction.title}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        카테고리: {auction.auction_category}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        등록자: {auction.seller_name}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        등록일:{" "}
                        {new Date(auction.created_at).toLocaleDateString()}
                      </Text>
                      {auction.waiting_minutes !== undefined && (
                        <Text className="text-xs text-orange-600">
                          대기시간: {auction.waiting_minutes}분
                          {auction.waiting_minutes > 25 && " (자동승인 임박)"}
                        </Text>
                      )}
                    </VStack>
                    <Box className="bg-orange-100 px-2 py-1 rounded">
                      <Text className="text-xs text-orange-800 font-medium">
                        승인대기
                      </Text>
                    </Box>
                  </HStack>

                  {/* 액션 버튼들 */}
                  <HStack space="sm" className="mt-3">
                    <Button
                      size="sm"
                      className="bg-green-600 flex-1"
                      onPress={(e) => {
                        e.stopPropagation();
                        handleApproveAuction(auction.id);
                      }}
                    >
                      <ButtonText className="text-white">✅ 승인</ButtonText>
                    </Button>

                    <Button
                      size="sm"
                      className="bg-orange-600 flex-1"
                      onPress={(e) => {
                        e.stopPropagation();
                        handleHideAuction(auction.id);
                      }}
                    >
                      <ButtonText className="text-white">🔒 히든</ButtonText>
                    </Button>
                  </HStack>
                </VStack>
              </Pressable>
            ))}
          </VStack>
        ) : (
          <Box className="bg-gray-50 border border-gray-200 rounded-xl p-8">
            <VStack space="sm" className="items-center">
              <Text className="text-4xl">✅</Text>
              <Text className="text-center text-gray-500 font-medium">
                승인대기 경매가 없습니다
              </Text>
              <Text className="text-center text-gray-400 text-sm">
                새로 등록된 경매가 승인을 기다리고 있을 때 여기에 표시됩니다
              </Text>
            </VStack>
          </Box>
        )}
      </VStack>
    </VStack>
  );
};

// 계산 기준 탭 컨텐츠
const CalculationStandardsTabContent = () => {
  const {
    data: standards,
    isLoading,
    refetch,
    isFetching,
  } = useCalculationStandards();
  const createMutation = useCreateCalculationStandard();
  const updateMutation = useUpdateCalculationStandard();
  const deleteMutation = useDeleteCalculationStandard();

  // 폼 상태
  const [isFormVisible, setIsFormVisible] = React.useState(false);
  const [editingStandard, setEditingStandard] =
    React.useState<CalculationStandard | null>(null);
  const [formData, setFormData] = React.useState<CreateCalculationStandardData>(
    {
      metal_type: "",
      category: "",
      calculation_type: "lme_based",
      lme_ratio: 95,
      fixed_price: undefined,
      deviation: 10,
    }
  );

  // 입력 필드용 문자열 상태 (소수점 입력 지원)
  const [lmeRatioText, setLmeRatioText] = React.useState("95");
  const [fixedPriceText, setFixedPriceText] = React.useState("");
  const [deviationText, setDeviationText] = React.useState("10");

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      metal_type: "",
      category: "",
      calculation_type: "lme_based",
      lme_ratio: 95,
      fixed_price: undefined,
      deviation: 10,
    });
    setLmeRatioText("95");
    setFixedPriceText("");
    setDeviationText("10");
    setEditingStandard(null);
    setIsFormVisible(false);
  };

  // 수정 모드로 전환
  const handleEdit = (standard: CalculationStandard) => {
    setFormData({
      metal_type: standard.metal_type,
      category: standard.category,
      calculation_type: standard.calculation_type,
      lme_ratio: standard.lme_ratio,
      fixed_price: standard.fixed_price,
      deviation: standard.deviation,
    });
    setLmeRatioText(standard.lme_ratio?.toString() || "");
    setFixedPriceText(standard.fixed_price?.toString() || "");
    setDeviationText(standard.deviation.toString());
    setEditingStandard(standard);
    setIsFormVisible(true);
  };

  // 폼 제출
  const handleSubmit = async () => {
    try {
      // 문자열 입력값을 숫자로 변환
      const deviation = parseFloat(deviationText) || 0;

      // 편차 범위 검증
      if (deviation < 0 || deviation > 100) {
        Alert.alert("오류", "편차는 0-100 사이의 값이어야 합니다.");
        return;
      }

      let submitData: CreateCalculationStandardData = {
        ...formData,
        deviation: deviation,
      };

      // 계산 타입별 유효성 검사 및 데이터 설정
      if (formData.calculation_type === "lme_based") {
        const lmeRatio = parseFloat(lmeRatioText) || 0;
        if (lmeRatio < 0 || lmeRatio > 300) {
          Alert.alert("오류", "LME 비율은 0-300 사이의 값이어야 합니다.");
          return;
        }
        submitData.lme_ratio = lmeRatio;
        submitData.fixed_price = undefined;
      } else if (formData.calculation_type === "fixed_price") {
        const fixedPrice = parseFloat(fixedPriceText) || 0;
        if (fixedPrice <= 0) {
          Alert.alert("오류", "고정가격은 0보다 큰 값이어야 합니다.");
          return;
        }
        submitData.fixed_price = fixedPrice;
        submitData.lme_ratio = undefined;
      }

      if (editingStandard) {
        // 수정
        const result = await updateMutation.mutateAsync({
          ...submitData,
          id: editingStandard.id,
        } as UpdateCalculationStandardData);
        if (result.success) {
          Alert.alert("성공", "계산 기준이 수정되었습니다.");
          resetForm();
        } else {
          Alert.alert("오류", result.error || "수정에 실패했습니다.");
        }
      } else {
        // 생성
        const result = await createMutation.mutateAsync(submitData);
        if (result.success) {
          Alert.alert("성공", "계산 기준이 추가되었습니다.");
          resetForm();
        } else {
          Alert.alert("오류", result.error || "추가에 실패했습니다.");
        }
      }
    } catch (error) {
      console.error("계산 기준 저장 오류:", error);
      Alert.alert("오류", "저장 중 오류가 발생했습니다.");
    }
  };

  // 삭제 처리
  const handleDelete = (standard: CalculationStandard) => {
    Alert.alert(
      "삭제 확인",
      `${standard.metal_type} ${standard.category} 계산 기준을 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteMutation.mutateAsync(standard.id);
              if (result.success) {
                Alert.alert("성공", "계산 기준이 삭제되었습니다.");
              } else {
                Alert.alert("오류", result.error || "삭제에 실패했습니다.");
              }
            } catch (error) {
              console.error("계산 기준 삭제 오류:", error);
              Alert.alert("오류", "삭제 중 오류가 발생했습니다.");
            }
          },
        },
      ]
    );
  };

  // 입력값 유효성 검사
  const isFormValid = () => {
    const basicValid =
      formData.metal_type.trim() !== "" &&
      formData.category.trim() !== "" &&
      formData.deviation >= 0 &&
      formData.deviation <= 100;

    if (formData.calculation_type === "lme_based") {
      return (
        basicValid &&
        formData.lme_ratio !== undefined &&
        formData.lme_ratio >= 0 &&
        formData.lme_ratio <= 300
      );
    } else if (formData.calculation_type === "fixed_price") {
      return (
        basicValid &&
        formData.fixed_price !== undefined &&
        formData.fixed_price > 0
      );
    }

    return false;
  };

  if (isLoading) {
    return (
      <VStack space="lg">
        <Text className="text-xl font-bold text-gray-900">
          📊 계산 기준 관리
        </Text>
        <Box className="bg-gray-50 border border-gray-200 rounded-xl p-8">
          <Text className="text-center text-gray-500">
            계산 기준을 불러오는 중...
          </Text>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack space="lg">
      {/* 헤더 */}
      <VStack space="md">
        <HStack className="items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">
            📊 계산 기준 관리
          </Text>
          <HStack space="sm">
            <Pressable
              onPress={() => {
                refetch();
              }}
              disabled={isFetching}
              className={`p-2 rounded-lg ${
                isFetching ? "bg-gray-100" : "bg-transparent active:bg-gray-100"
              }`}
            >
              <RefreshCw
                size={20}
                color={isFetching ? "#9CA3AF" : "#6B7280"}
                style={{
                  transform: [{ rotate: isFetching ? "360deg" : "0deg" }],
                }}
              />
            </Pressable>
            <Button
              size="sm"
              className="bg-blue-600"
              onPress={() => setIsFormVisible(true)}
            >
              <ButtonText className="text-white">+ 새 기준 추가</ButtonText>
            </Button>
          </HStack>
        </HStack>
        <Text className="text-sm text-gray-600">
          비철 계산기에서 사용할 금속별 계산 기준을 관리합니다.
        </Text>
      </VStack>

      {/* 추가/수정 폼 */}
      {isFormVisible && (
        <Box className="bg-white border border-gray-200 rounded-xl p-4">
          <VStack space="md">
            <HStack className="items-center justify-between">
              <Text className="text-lg font-semibold">
                {editingStandard ? "계산 기준 수정" : "새 계산 기준 추가"}
              </Text>
              <Pressable onPress={resetForm}>
                <Text className="text-gray-500">✕</Text>
              </Pressable>
            </HStack>

            <VStack space="sm">
              <VStack space="xs">
                <Text className="text-sm font-medium text-gray-700">
                  금속 종류
                </Text>
                <TextInput
                  value={formData.metal_type}
                  onChangeText={(text) =>
                    setFormData({ ...formData, metal_type: text })
                  }
                  placeholder="예: 구리, 알루미늄, 아연"
                  style={{
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                />
              </VStack>

              <VStack space="xs">
                <Text className="text-sm font-medium text-gray-700">구분</Text>
                <TextInput
                  value={formData.category}
                  onChangeText={(text) =>
                    setFormData({ ...formData, category: text })
                  }
                  placeholder="예: A동, B동, 1급"
                  style={{
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                />
              </VStack>

              {/* 계산 타입 선택 */}
              <VStack space="xs">
                <Text className="text-sm font-medium text-gray-700">
                  계산 타입
                </Text>
                <HStack space="sm">
                  <Pressable
                    onPress={() => {
                      setFormData({
                        ...formData,
                        calculation_type: "lme_based",
                      });
                      setFixedPriceText("");
                    }}
                    className={`flex-1 p-3 rounded-lg border ${
                      formData.calculation_type === "lme_based"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-center font-medium ${
                        formData.calculation_type === "lme_based"
                          ? "text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      📈 LME 기반
                    </Text>
                    <Text className="text-xs text-center text-gray-500 mt-1">
                      LME 시세 × 비율
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setFormData({
                        ...formData,
                        calculation_type: "fixed_price",
                      });
                      setLmeRatioText("");
                    }}
                    className={`flex-1 p-3 rounded-lg border ${
                      formData.calculation_type === "fixed_price"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-center font-medium ${
                        formData.calculation_type === "fixed_price"
                          ? "text-green-700"
                          : "text-gray-700"
                      }`}
                    >
                      💰 고정가격
                    </Text>
                    <Text className="text-xs text-center text-gray-500 mt-1">
                      특정 값 고정
                    </Text>
                  </Pressable>
                </HStack>
              </VStack>

              {/* 조건부 입력 필드 */}
              <HStack space="sm">
                {formData.calculation_type === "lme_based" ? (
                  <VStack space="xs" className="flex-1">
                    <Text className="text-sm font-medium text-gray-700">
                      LME 비율 (0-300%)
                    </Text>
                    <TextInput
                      value={lmeRatioText}
                      onChangeText={(text) => {
                        // 숫자와 소수점만 허용
                        const numericText = text.replace(/[^0-9.]/g, "");

                        // 소수점이 여러 개 있으면 첫 번째만 유지
                        const parts = numericText.split(".");
                        const cleanText =
                          parts.length > 2
                            ? parts[0] + "." + parts.slice(1).join("")
                            : numericText;

                        setLmeRatioText(cleanText);

                        // formData도 함께 업데이트
                        const numericValue = parseFloat(cleanText);
                        setFormData({
                          ...formData,
                          lme_ratio: isNaN(numericValue)
                            ? undefined
                            : numericValue,
                        });
                      }}
                      placeholder="95.00"
                      keyboardType="decimal-pad"
                      style={{
                        borderWidth: 1,
                        borderColor: "#D1D5DB",
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                      }}
                    />
                  </VStack>
                ) : (
                  <VStack space="xs" className="flex-1">
                    <Text className="text-sm font-medium text-gray-700">
                      고정가격 (원/kg)
                    </Text>
                    <TextInput
                      value={fixedPriceText}
                      onChangeText={(text) => {
                        // 숫자와 소수점만 허용
                        const numericText = text.replace(/[^0-9.]/g, "");

                        // 소수점이 여러 개 있으면 첫 번째만 유지
                        const parts = numericText.split(".");
                        const cleanText =
                          parts.length > 2
                            ? parts[0] + "." + parts.slice(1).join("")
                            : numericText;

                        setFixedPriceText(cleanText);

                        // formData도 함께 업데이트
                        const numericValue = parseFloat(cleanText);
                        setFormData({
                          ...formData,
                          fixed_price: isNaN(numericValue)
                            ? undefined
                            : numericValue,
                        });
                      }}
                      placeholder="8500.00"
                      keyboardType="decimal-pad"
                      style={{
                        borderWidth: 1,
                        borderColor: "#D1D5DB",
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 16,
                      }}
                    />
                  </VStack>
                )}

                <VStack space="xs" className="flex-1">
                  <Text className="text-sm font-medium text-gray-700">
                    편차 (0-100%)
                  </Text>
                  <TextInput
                    value={deviationText}
                    onChangeText={(text) => {
                      // 숫자와 소수점만 허용
                      const numericText = text.replace(/[^0-9.]/g, "");

                      // 소수점이 여러 개 있으면 첫 번째만 유지
                      const parts = numericText.split(".");
                      const cleanText =
                        parts.length > 2
                          ? parts[0] + "." + parts.slice(1).join("")
                          : numericText;

                      setDeviationText(cleanText);

                      // formData도 함께 업데이트
                      const numericValue = parseFloat(cleanText);
                      setFormData({
                        ...formData,
                        deviation: isNaN(numericValue) ? 0 : numericValue,
                      });
                    }}
                    placeholder="10.00"
                    keyboardType="decimal-pad"
                    style={{
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                    }}
                  />
                </VStack>
              </HStack>
            </VStack>

            <HStack space="sm" className="justify-end">
              <Button size="sm" variant="outline" onPress={resetForm}>
                <ButtonText className="text-gray-600">취소</ButtonText>
              </Button>
              <Button
                size="sm"
                className="bg-blue-600"
                onPress={handleSubmit}
                disabled={
                  !isFormValid() ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                <ButtonText className="text-white">
                  {createMutation.isPending || updateMutation.isPending
                    ? "저장 중..."
                    : editingStandard
                    ? "수정"
                    : "추가"}
                </ButtonText>
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {/* 계산 기준 목록 */}
      <Box className="bg-white border border-gray-200 rounded-xl p-4">
        <VStack space="md">
          <HStack className="items-center justify-between">
            <Text className="text-lg font-semibold">계산 기준 목록</Text>
            <Text className="text-sm text-gray-500">
              총 {standards?.length || 0}개
            </Text>
          </HStack>

          {standards && standards.length > 0 ? (
            <VStack space="sm">
              {/* 헤더 */}
              <HStack className="py-2 px-3 bg-gray-50 rounded-lg">
                <Text className="flex-1 text-sm font-medium text-gray-700">
                  금속 종류
                </Text>
                <Text className="flex-1 text-sm font-medium text-gray-700">
                  구분
                </Text>
                <Text className="w-16 text-sm font-medium text-gray-700 text-center">
                  타입
                </Text>
                <Text className="w-20 text-sm font-medium text-gray-700 text-center">
                  비율/가격
                </Text>
                <Text className="w-16 text-sm font-medium text-gray-700 text-center">
                  편차
                </Text>
                <Text className="w-20 text-sm font-medium text-gray-700 text-center">
                  작업
                </Text>
              </HStack>

              {/* 데이터 행들 */}
              {standards.map((standard) => (
                <HStack
                  key={standard.id}
                  className="py-3 px-3 border-b border-gray-100 items-center"
                >
                  <Text className="flex-1 text-sm text-gray-900 font-medium">
                    {standard.metal_type}
                  </Text>
                  <Text className="flex-1 text-sm text-gray-700">
                    {standard.category}
                  </Text>
                  <Text
                    className={`w-16 text-xs text-center px-1 py-1 rounded ${
                      standard.calculation_type === "lme_based"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {standard.calculation_type === "lme_based" ? "LME" : "고정"}
                  </Text>
                  <Text className="w-20 text-sm text-gray-700 text-center">
                    {standard.calculation_type === "lme_based"
                      ? `${standard.lme_ratio}%`
                      : `${standard.fixed_price?.toLocaleString()}원`}
                  </Text>
                  <Text className="w-16 text-sm text-gray-700 text-center">
                    ±{standard.deviation}%
                  </Text>
                  <HStack space="xs" className="w-20 justify-center">
                    <Pressable
                      onPress={() => handleEdit(standard)}
                      className="p-1"
                    >
                      <Edit3 size={14} color="#3B82F6" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(standard)}
                      className="p-1"
                      disabled={deleteMutation.isPending}
                    >
                      <Text className="text-red-500 text-sm">🗑</Text>
                    </Pressable>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          ) : (
            <Box className="py-8">
              <VStack space="sm" className="items-center">
                <Text className="text-4xl">📊</Text>
                <Text className="text-center text-gray-500 font-medium">
                  등록된 계산 기준이 없습니다
                </Text>
                <Text className="text-center text-gray-400 text-sm">
                  새 기준 추가 버튼을 눌러 계산 기준을 추가해보세요
                </Text>
              </VStack>
            </Box>
          )}
        </VStack>
      </Box>
    </VStack>
  );
};
