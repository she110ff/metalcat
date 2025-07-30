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
  useLatestLmePricesCompatible,
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

  // 시세 화면과 동일한 최신 가격 데이터 조회
  const {
    data: latestPricesData,
    isLoading: isLatestLoading,
    error: latestError,
  } = useLatestLmePricesCompatible();

  // 30일 히스토리 데이터 조회 (차트용)
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

  // 금속 코드를 한국어명으로 변환 (시세 화면과 동일한 매핑)
  const getKoreanMetalName = (metalCode: string): string => {
    const metalMap: { [key: string]: string } = {
      cu: "구리",
      copper: "구리",
      ni: "니켈",
      nickel: "니켈",
      al: "알루미늄",
      aluminum: "알루미늄",
      zn: "아연",
      zinc: "아연",
      sn: "주석",
      tin: "주석",
      pb: "납",
      lead: "납",
    };
    return metalMap[metalCode.toLowerCase()] || "니켈";
  };

  // 시세 화면과 동일한 방식으로 해당 금속의 최신 가격 찾기
  const targetKoreanName = getKoreanMetalName(normalizedMetalCode);
  const currentPriceData = latestPricesData?.find((item) => {
    return item.metalName === targetKoreanName;
  });

  // 🔍 디버깅: 데이터 확인
  console.log("🔍 상세화면 디버깅:", {
    metal: metal,
    normalizedMetalCode: normalizedMetalCode,
    targetKoreanName: targetKoreanName,
    latestPricesData: latestPricesData,
    currentPriceData: currentPriceData,
    hasLatestData: !!latestPricesData,
    latestDataLength: latestPricesData?.length || 0,
  });

  // 실시간 데이터 변환 (히스토리는 차트용으로만 사용)
  const realtimeData = historyData
    ? transformHistoryToDetailData(historyData, normalizedMetalCode)
    : null;

  // 🔍 변환된 실시간 데이터 로그
  console.log("🔄 변환된 실시간 데이터:", {
    hasRealtimeData: !!realtimeData,
    realtimeData: realtimeData
      ? {
          metalName: realtimeData.metalName,
          currentPrice: realtimeData.currentPrice,
          unit: realtimeData.unit,
          changePercent: realtimeData.changePercent,
          dailyDataLength: realtimeData.dailyData.length,
        }
      : null,
  });

  // 현재 가격을 시세 화면과 동일한 데이터로 교체
  if (realtimeData && currentPriceData) {
    realtimeData.currentPrice = currentPriceData.price;
    realtimeData.changePercent =
      parseFloat(currentPriceData.changePercent.replace(/[%+]/g, "")) || 0;
    realtimeData.unit = "원/KG";
  }

  // 실시간 데이터가 있으면 해당 데이터의 금속명 사용, 없으면 정적 데이터 사용
  let finalData = mergeWithStaticData(realtimeData, staticData);

  // 🔍 merge 결과 로그
  console.log("🔗 mergeWithStaticData 결과:", {
    metalName: finalData.metalName,
    currentPrice: finalData.currentPrice,
    unit: finalData.unit,
    changePercent: finalData.changePercent,
    dailyDataLength: finalData.dailyData.length,
    source: realtimeData ? "실시간 데이터" : "정적 데이터",
  });

  // 최신 가격 데이터가 있으면 현재 가격을 시세 화면과 동일하게 설정 (히스토리 데이터 유무와 관계없이)
  console.log("🔎 currentPriceData 조건 확인:", {
    currentPriceData: currentPriceData,
    isCurrentPriceDataTruthy: !!currentPriceData,
    typeofCurrentPriceData: typeof currentPriceData,
    currentPriceDataKeys: currentPriceData
      ? Object.keys(currentPriceData)
      : null,
  });

  if (currentPriceData) {
    console.log("✅ 시세화면 데이터 적용:", {
      oldPrice: finalData.currentPrice,
      newPrice: currentPriceData.price,
      changePercent: currentPriceData.changePercent,
    });

    finalData = {
      ...finalData,
      currentPrice: currentPriceData.price,
      changePercent:
        parseFloat(currentPriceData.changePercent.replace(/[%+]/g, "")) || 0,
      unit: "원/KG",
    };
  } else {
    console.log("❌ currentPriceData를 찾지 못함, 기존 데이터 사용:", {
      currentPrice: finalData.currentPrice,
      metalName: finalData.metalName,
      unit: finalData.unit,
    });
  }

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

  // 로딩 상태와 에러 상태 통합
  const isLoading = isLatestLoading || isHistoryLoading;
  const error = latestError || historyError;
  const hasRealtimeData = !!realtimeData || !!currentPriceData;

  // 🔍 최종 결과 로그
  console.log("✨ 최종 finalData:", {
    metalName: finalData.metalName,
    currentPrice: finalData.currentPrice,
    unit: finalData.unit,
    changePercent: finalData.changePercent,
    dailyDataLength: finalData.dailyData.length,
    isLoading,
    hasError: !!error,
    hasRealtimeData,
  });

  return (
    <MetalDetailScreen
      data={finalData}
      onBack={handleBack}
      isLoading={isLoading}
      error={error}
      isRealtimeData={hasRealtimeData}
    />
  );
}
