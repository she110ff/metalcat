/**
 * 단순화된 서비스 요청 카드 컴포넌트
 * 작성일: 2025-01-30
 * 목적: My 화면에서 사용할 간략한 요청 정보 표시
 */

import React from "react";
import { Pressable } from "@/components/ui/pressable";
import { Card } from "@/components/ui/card";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { MapPin, Calendar, CheckCircle } from "lucide-react-native";
import { ServiceRequest } from "@/types/service-request";

interface SimpleRequestCardProps {
  request: ServiceRequest;
  onPress?: () => void;
}

// 상태별 설정
const STATUS_CONFIG = {
  pending: {
    label: "접수 대기",
    color: "#FCD34D",
    bgColor: "#FEF3C7",
    icon: "🟡",
  },
  assigned: {
    label: "담당자 배정",
    color: "#60A5FA",
    bgColor: "#DBEAFE",
    icon: "🔵",
  },
  in_progress: {
    label: "진행 중",
    color: "#34D399",
    bgColor: "#D1FAE5",
    icon: "🟢",
  },
  completed: {
    label: "완료",
    color: "#10B981",
    bgColor: "#ECFDF5",
    icon: "✅",
  },
  cancelled: {
    label: "취소",
    color: "#EF4444",
    bgColor: "#FEE2E2",
    icon: "❌",
  },
} as const;

// 서비스 타입 라벨
const SERVICE_TYPE_LABELS = {
  appraisal: "감정 서비스",
  purchase: "매입 서비스",
} as const;

// 유틸리티 함수들
function getShortLocation(address: string): string {
  // "서울시 강남구 테헤란로 123" -> "강남구"
  const parts = address.split(" ");
  if (parts.length >= 2) {
    return parts[1]; // 두 번째 부분 (구)
  }
  return address.slice(0, 10) + "..."; // fallback
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours === 0 ? "방금 전" : `${diffHours}시간 전`;
  } else if (diffDays === 1) {
    return "1일 전";
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  }
}

export function SimpleRequestCard({
  request,
  onPress,
}: SimpleRequestCardProps) {
  const statusConfig = STATUS_CONFIG[request.status];
  const serviceTypeLabel = SERVICE_TYPE_LABELS[request.service_type];

  return (
    <Pressable onPress={onPress}>
      <Card className="mb-3 p-4 bg-white border border-gray-200">
        <VStack space="sm">
          {/* 상태 + 서비스 타입 헤더 */}
          <HStack className="justify-between items-center">
            {/* 상태 배지 */}
            <HStack
              space="xs"
              className="items-center px-2 py-1 rounded-full"
              style={{ backgroundColor: statusConfig.bgColor }}
            >
              <Text style={{ color: statusConfig.color, fontSize: 12 }}>
                {statusConfig.icon} {statusConfig.label}
              </Text>
            </HStack>

            {/* 서비스 타입 */}
            <Text className="text-sm font-medium text-gray-700">
              {serviceTypeLabel}
            </Text>
          </HStack>

          {/* 위치 + 요청 시간 */}
          <HStack space="md" className="items-center">
            <HStack space="xs" className="items-center">
              <MapPin size={14} color="#666" strokeWidth={2} />
              <Text className="text-sm text-gray-600">
                {getShortLocation(request.address)}
              </Text>
            </HStack>
            <HStack space="xs" className="items-center">
              <Calendar size={14} color="#666" strokeWidth={2} />
              <Text className="text-sm text-gray-600">
                {formatDate(request.created_at)}
              </Text>
            </HStack>
          </HStack>

          {/* 완료 시간 (완료된 경우만) */}
          {request.status === "completed" && request.completed_at && (
            <HStack space="xs" className="items-center">
              <CheckCircle size={14} color="#10B981" strokeWidth={2} />
              <Text className="text-sm text-green-600">
                {formatDate(request.completed_at)} 완료
              </Text>
            </HStack>
          )}

          {/* 요청 내용 미리보기 */}
          <Text className="text-gray-800 text-sm" numberOfLines={2}>
            💬 "{request.description.slice(0, 50)}
            {request.description.length > 50 ? "..." : ""}"
          </Text>
        </VStack>
      </Card>
    </Pressable>
  );
}
