import { MetalDetailScreen } from "@/components/MetalDetailScreen";
import {
  aluminumDetailData,
  leadDetailData,
  zincDetailData,
  copperDetailData,
  tinDetailData,
  nickelDetailData,
} from "@/data/dashboard/collected-metal-prices";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  useMetalHistory,
  transformHistoryToDetailData,
  mergeWithStaticData,
  normalizeMetalCode,
} from "@/hooks/lme";
import type { MetalDetailData } from "@/data/types/metal-price";

export default function MetalDetailPage() {
  const router = useRouter();
  const { metal } = useLocalSearchParams<{ metal: string }>();

  const handleBack = () => {
    router.back();
  };

  // 금속 코드 정규화
  const normalizedMetalCode = normalizeMetalCode(metal || "nickel");

  // 실시간 30일 히스토리 데이터 조회
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    error: historyError,
  } = useMetalHistory(normalizedMetalCode, 30);

  // 정적 데이터 매핑 (fallback용)
  const getStaticMetalData = (metalName: string): MetalDetailData => {
    switch (metalName) {
      case "copper":
      case "구리":
        return copperDetailData;
      case "nickel":
      case "니켈":
        return nickelDetailData;
      case "aluminum":
      case "알루미늄":
        return aluminumDetailData;
      case "lead":
      case "납":
        return leadDetailData;
      case "zinc":
      case "아연":
        return zincDetailData;
      case "tin":
      case "주석":
        return tinDetailData;
      default:
        return nickelDetailData; // 기본값
    }
  };

  const staticData = getStaticMetalData(metal || "nickel");

  // 실시간 데이터 변환
  const realtimeData = historyData
    ? transformHistoryToDetailData(historyData, normalizedMetalCode)
    : null;

  // 실시간 데이터가 있으면 해당 데이터의 금속명 사용, 없으면 정적 데이터 사용
  let finalData = mergeWithStaticData(realtimeData, staticData);

  // 실시간 데이터가 있고 금속명이 다르면 실시간 데이터의 금속명 우선 사용
  if (
    realtimeData &&
    realtimeData.metalName &&
    realtimeData.metalName !== staticData.metalName
  ) {
    console.log(
      `금속명 실시간 데이터 우선 사용: ${realtimeData.metalName} (기존: ${staticData.metalName})`
    );
    finalData = {
      ...finalData,
      metalName: realtimeData.metalName, // 실시간 데이터의 금속명 우선 사용
    };
  }

  return (
    <MetalDetailScreen
      data={finalData}
      onBack={handleBack}
      isLoading={isHistoryLoading}
      error={historyError}
      isRealtimeData={!!realtimeData}
    />
  );
}
