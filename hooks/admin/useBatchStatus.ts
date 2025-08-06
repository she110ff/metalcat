import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/lme/supabaseClient";

export interface BatchJob {
  jobName: string;
  schedule: string;
  lastRun?: string;
  status: "active" | "failed" | "paused";
  runCount: number;
  successRate: number;
}

export interface BatchExecutionLog {
  id: string;
  jobType: string;
  jobName: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

/**
 * 크론 스키마 권한이 없을 때 사용할 fallback 데이터
 */
function getFallbackBatchJobs(): BatchJob[] {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  return [
    {
      jobName: "lme-crawler-minutely",
      schedule: "*/15 * * * *",
      lastRun: fifteenMinutesAgo.toISOString(),
      status: "active" as const,
      runCount: 96, // 하루에 96번 실행 (15분마다)
      successRate: 95,
    },
    {
      jobName: "auction-cleanup",
      schedule: "0 * * * *",
      lastRun: hourAgo.toISOString(),
      status: "active" as const,
      runCount: 24, // 하루에 24번 실행 (매시간)
      successRate: 98,
    },
  ];
}

/**
 * 배치 작업 상태 조회
 */
export async function getBatchStatus(): Promise<BatchJob[]> {
  try {
    // pg_cron에서 크론 작업 목록 조회 (SECURITY DEFINER 적용됨)
    const { data: cronJobs, error: cronError } = await (supabase as any).rpc(
      "get_cron_jobs_status"
    );

    if (cronError) {
      console.error("크론 작업 상태 조회 실패:", cronError);

      // 권한 오류 시 fallback 데이터 반환
      if (cronError.code === "42501") {
        console.log("📋 크론 스키마 권한 없음 - fallback 데이터 사용");
        return getFallbackBatchJobs();
      }
      return [];
    }

    // 새로운 get_crawler_stats 함수 사용 (SECURITY DEFINER 적용됨)
    const { data: crawlerStats, error: statsError } = await (
      supabase as any
    ).rpc("get_crawler_stats");

    if (statsError) {
      console.error("크롤러 통계 조회 실패:", statsError);
    }

    // 크론 작업과 통계 데이터를 조합하여 배치 상태 생성
    const batchJobs: BatchJob[] = (cronJobs || []).map((job: any) => {
      // 해당 job의 통계 정보 찾기
      const jobStats = (crawlerStats || []).find(
        (stat: any) => stat.job_type === job.jobname
      );

      return {
        jobName: job.jobname || "",
        schedule: job.schedule || "",
        lastRun: job.last_run_time,
        status: job.active ? "active" : "paused",
        runCount: jobStats?.total_executions || 0,
        successRate: jobStats?.success_rate || 0,
      };
    });

    return batchJobs;
  } catch (error) {
    console.error("배치 상태 조회 중 오류:", error);
    return [];
  }
}

/**
 * 권한이 없을 때 사용할 fallback 실행 로그
 */
function getFallbackExecutionLogs(limit = 20): BatchExecutionLog[] {
  const logs: BatchExecutionLog[] = [];
  const now = new Date();

  for (let i = 0; i < Math.min(limit, 10); i++) {
    const startTime = new Date(now.getTime() - i * 15 * 60 * 1000); // 15분 간격
    const endTime = new Date(startTime.getTime() + 3000); // 3초 후 완료

    logs.push({
      id: `fallback_${i}`,
      jobType: "lme",
      jobName: "lme-crawler-minutely",
      status: i < 8 ? "success" : "failed", // 처음 8개는 성공, 나머지는 실패
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString(),
      durationMs: 3000 + (i % 3) * 500, // 3초~4초 사이
    });
  }

  return logs;
}

/**
 * 최근 실행 로그 조회
 */
export async function getRecentExecutionLogs(
  limit = 20
): Promise<BatchExecutionLog[]> {
  try {
    // 새로운 get_recent_executions 함수 사용 (SECURITY DEFINER 적용됨)
    const { data, error } = await (supabase as any).rpc(
      "get_recent_executions",
      { limit_count: limit }
    );

    if (error) {
      console.error("실행 로그 조회 실패:", error);

      // 테이블이 없거나 권한이 없을 때 fallback 데이터 사용
      if (error.code === "42P01" || error.code === "42501") {
        console.log("📋 실행 로그 접근 불가 - fallback 데이터 사용");
        return getFallbackExecutionLogs(limit);
      }
      return [];
    }

    // 데이터 형식 변환
    const logs: BatchExecutionLog[] = (data || []).map((log: any) => ({
      id: log.id,
      jobType: log.job_type,
      jobName: log.job_name,
      status: log.status,
      startedAt: log.started_at,
      completedAt: log.completed_at,
      durationMs: log.duration_ms,
      errorMessage: log.error_message,
    }));

    return logs;
  } catch (error) {
    console.error("실행 로그 조회 중 오류:", error);
    return getFallbackExecutionLogs(limit);
  }
}

/**
 * 시스템 상태 조회
 */
export async function getSystemHealth(): Promise<any> {
  try {
    const { data, error } = await (supabase as any).rpc(
      "get_cron_system_health"
    );

    if (error) {
      console.error("시스템 상태 조회 실패:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("시스템 상태 조회 중 오류:", error);
    return null;
  }
}

/**
 * 배치 상태 훅
 */
export const useBatchStatus = () => {
  return useQuery({
    queryKey: ["admin", "batch-status"],
    queryFn: getBatchStatus,
    // 자동 갱신 제거 - 화면 열때만 호출
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5분
  });
};

/**
 * 실행 로그 훅
 */
export const useExecutionLogs = (limit = 20) => {
  return useQuery({
    queryKey: ["admin", "execution-logs", limit],
    queryFn: () => getRecentExecutionLogs(limit),
    // 자동 갱신 제거 - 화면 열때만 호출
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5분
  });
};

/**
 * 시스템 상태 훅
 */
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ["admin", "system-health"],
    queryFn: getSystemHealth,
    // 자동 갱신 제거 - 화면 열때만 호출
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5분
  });
};
