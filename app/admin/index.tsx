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
} from "@/hooks/admin/useAdminPremium";
import {
  useAuctionStats,
  useCategoryStats,
  useRecentAuctions,
} from "@/hooks/admin/useAdminAuctions";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { ScrollView } from "@/components/ui/scroll-view";
import { useRouter } from "expo-router";
import { ChevronLeftIcon, Icon } from "@/components/ui/icon";
import { Alert } from "react-native";

// 탭 컴포넌트 import (아직 생성하지 않았으므로 임시)
// import { BatchTab } from "./tabs/BatchTab";
// import { PremiumTab } from "./tabs/PremiumTab";
// import { AuctionTab } from "./tabs/AuctionTab";

type AdminTab = "batch" | "premium" | "auction";

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
            <Icon as={ChevronLeftIcon} size="lg" />
          </Pressable>
          <Heading size="lg">🛠️ 관리자 대시보드</Heading>
          <Box style={{ width: 24 }} />
        </HStack>
      </Box>

      {/* 탭 네비게이션 */}
      <Box className="px-4 pt-4">
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
              activeTab === "premium" ? "bg-white shadow-sm" : "bg-transparent"
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
              activeTab === "auction" ? "bg-white shadow-sm" : "bg-transparent"
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
        </HStack>
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
  } = useBatchStatus();
  const { data: executionLogs, isLoading: logsLoading } = useExecutionLogs(10);
  const { data: systemHealth, isLoading: healthLoading } = useSystemHealth();

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

  return (
    <VStack space="lg">
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
  const { data: requests, isLoading: requestsLoading } =
    useAdminServiceRequests();

  // 서비스 타입 텍스트 변환
  const getServiceTypeText = (type: string) => {
    return type === "appraisal" ? "현장 감정" : "즉시 매입";
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
          📋 최근 서비스 요청 목록
        </Heading>
        {requestsLoading ? (
          <Text className="text-gray-500">요청 목록을 불러오는 중...</Text>
        ) : requests && requests.length > 0 ? (
          <VStack space="md">
            {requests.slice(0, 10).map((request) => (
              <Box key={request.id} className="p-3 bg-gray-50 rounded-lg">
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
                      <Text className="text-xs text-gray-500">
                        📞 {request.contactPhone}
                      </Text>
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
                    </VStack>
                  </HStack>

                  {request.description && (
                    <Text className="text-sm text-gray-700 mt-2">
                      💬{" "}
                      {request.description.length > 50
                        ? `${request.description.substring(0, 50)}...`
                        : request.description}
                    </Text>
                  )}

                  {(request.estimatedValue || request.finalOffer) && (
                    <HStack className="justify-between items-center mt-2 pt-2 border-t border-gray-200">
                      {request.estimatedValue && (
                        <Text className="text-xs text-blue-600">
                          예상가: {formatPrice(request.estimatedValue)}
                        </Text>
                      )}
                      {request.finalOffer && (
                        <Text className="text-xs text-green-600 font-bold">
                          최종가: {formatPrice(request.finalOffer)}
                        </Text>
                      )}
                    </HStack>
                  )}
                </VStack>
              </Box>
            ))}

            {requests.length > 10 && (
              <Text className="text-center text-gray-500 text-sm mt-4">
                {`총 ${requests.length}건 중 최근 10건 표시`}
              </Text>
            )}
          </VStack>
        ) : (
          <Text className="text-gray-500 text-center py-4">
            등록된 서비스 요청이 없습니다.
          </Text>
        )}
      </Box>
    </VStack>
  );
};

const AuctionTabContent = () => {
  const { data: auctionStats, isLoading: statsLoading } = useAuctionStats();
  const { data: categoryStats, isLoading: categoryLoading } =
    useCategoryStats();
  const { data: recentAuctions, isLoading: auctionsLoading } =
    useRecentAuctions(8);

  // 카테고리명 변환
  const getCategoryText = (category: string) => {
    switch (category) {
      case "scrap":
        return "고철";
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
          🏆 최근 경매 목록
        </Heading>
        {auctionsLoading ? (
          <Text className="text-gray-500">경매 목록을 불러오는 중...</Text>
        ) : recentAuctions && recentAuctions.length > 0 ? (
          <VStack space="md">
            {recentAuctions.map((auction) => (
              <Box key={auction.id} className="p-3 bg-gray-50 rounded-lg">
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
              </Box>
            ))}

            {recentAuctions.length >= 8 && (
              <Text className="text-center text-gray-500 text-sm mt-4">
                {`최근 8건 표시 • 전체 ${auctionStats?.total || 0}건`}
              </Text>
            )}
          </VStack>
        ) : (
          <Text className="text-gray-500 text-center py-4">
            등록된 경매가 없습니다.
          </Text>
        )}
      </Box>
    </VStack>
  );
};
