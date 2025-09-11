import { ApprovalStatus } from "@/data/types/auction";

export interface ApprovalStatusConfig {
  text: string;
  color: string;
  backgroundColor: string;
  icon: string;
}

/**
 * 승인 상태별 UI 설정을 반환하는 함수
 */
export function getApprovalStatusConfig(
  status: ApprovalStatus
): ApprovalStatusConfig {
  switch (status) {
    case "pending_approval":
      return {
        text: "승인 대기",
        color: "#F59E0B", // amber-500
        backgroundColor: "rgba(245, 158, 11, 0.1)", // amber-500 with opacity
        icon: "⏳",
      };
    case "approved":
      return {
        text: "승인됨",
        color: "#10B981", // emerald-500
        backgroundColor: "rgba(16, 185, 129, 0.1)", // emerald-500 with opacity
        icon: "✅",
      };
    case "hidden":
      return {
        text: "히든",
        color: "#6B7280", // gray-500
        backgroundColor: "rgba(107, 114, 128, 0.1)", // gray-500 with opacity
        icon: "🔒",
      };
    case "rejected":
      return {
        text: "거부됨",
        color: "#EF4444", // red-500
        backgroundColor: "rgba(239, 68, 68, 0.1)", // red-500 with opacity
        icon: "❌",
      };
    default:
      return {
        text: "알 수 없음",
        color: "#6B7280",
        backgroundColor: "rgba(107, 114, 128, 0.1)",
        icon: "❓",
      };
  }
}

/**
 * 승인 상태가 표시되어야 하는지 확인하는 함수
 * approved 상태는 기본 상태이므로 표시하지 않음
 */
export function shouldShowApprovalStatus(status: ApprovalStatus): boolean {
  return status !== "approved";
}
