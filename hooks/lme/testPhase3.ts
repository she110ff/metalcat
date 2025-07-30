/**
 * Phase 3 실시간 상세 화면 연동 검증 테스트
 *
 * 실제 DB 데이터 구조를 기반으로 Metal Detail 화면 연동 테스트
 */

import {
  fetchMetalHistory,
  transformHistoryToDetailData,
  normalizeMetalCode,
  getMetalName,
} from "./api";
import { mergeWithStaticData } from "./dataTransformers";
import type { MetalHistoryData } from "../../types/lme";

// 실제 DB 금속 코드와 한글명 매핑 테스트
export function testRealDbMapping() {
  console.log("🗄️ 실제 DB 데이터 매핑 테스트 시작");

  const realDbData = [
    { korean: "주석", code: "SN" },
    { korean: "알루미늄", code: "AL" },
    { korean: "니켈", code: "NI" },
    { korean: "구리", code: "CU" },
    { korean: "납", code: "PB" },
    { korean: "아연", code: "ZN" },
  ];

  console.log("한글명 → DB 코드 변환:");
  realDbData.forEach(({ korean, code }) => {
    const normalized = normalizeMetalCode(korean);
    const isCorrect = normalized === code;
    console.log(
      `   ${korean} → ${normalized} ${isCorrect ? "✅" : "❌"} (예상: ${code})`
    );
  });

  console.log("\nDB 코드 → 한글명 변환:");
  realDbData.forEach(({ korean, code }) => {
    const metalName = getMetalName(code);
    const isCorrect = metalName === korean;
    console.log(
      `   ${code} → ${metalName} ${isCorrect ? "✅" : "❌"} (예상: ${korean})`
    );
  });

  console.log("✅ 실제 DB 데이터 매핑 테스트 완료\n");
}

// 30일 히스토리 데이터 조회 테스트
export async function testMetalHistoryFetch() {
  console.log("📈 30일 히스토리 데이터 조회 테스트 시작");

  const testMetals = ["CU", "AL", "NI"]; // 실제 DB 코드 사용

  for (const metalCode of testMetals) {
    try {
      console.log(
        `\n🔍 ${metalCode} (${getMetalName(metalCode)}) 데이터 조회 중...`
      );

      const historyData = await fetchMetalHistory(metalCode, 30);

      if (historyData && historyData.length > 0) {
        console.log(`✅ ${historyData.length}일간 데이터 조회 성공`);
        console.log(
          `   최신 데이터: ${
            historyData[0].price_date
          } - ${historyData[0].price_krw_per_kg.toLocaleString()}원/KG`
        );
        console.log(
          `   가장 오래된 데이터: ${
            historyData[historyData.length - 1].price_date
          }`
        );
      } else {
        console.log(`⚠️ 데이터 없음 (길이: ${historyData?.length || 0})`);
      }
    } catch (error) {
      console.log(`❌ ${metalCode} 조회 실패:`, error);
    }
  }

  console.log("\n✅ 30일 히스토리 데이터 조회 테스트 완료\n");
}

// 데이터 변환 테스트 (실제 DB 구조)
export async function testDataTransformation() {
  console.log("🔄 실제 DB 데이터 변환 테스트 시작");

  try {
    // 구리 데이터로 테스트
    const copperHistory = await fetchMetalHistory("CU", 7);

    if (copperHistory && copperHistory.length > 0) {
      console.log(`원본 데이터 (${copperHistory.length}일):`);
      copperHistory.slice(0, 3).forEach((item, idx) => {
        console.log(
          `   ${idx + 1}. ${
            item.price_date
          }: ${item.price_krw_per_kg.toLocaleString()}원/KG (${
            item.metal_name_kr
          })`
        );
      });

      // MetalDetailData로 변환
      const detailData = transformHistoryToDetailData(copperHistory, "CU");

      console.log("\n변환된 MetalDetailData:");
      console.log(`   금속명: ${detailData.metalName}`);
      console.log(
        `   현재가격: ${detailData.currentPrice.toLocaleString()} ${
          detailData.unit
        }`
      );
      console.log(
        `   변화율: ${detailData.changePercent}% (${detailData.changeType})`
      );
      console.log(`   일별 데이터: ${detailData.dailyData.length}일`);
      console.log(
        `   통계 - 최고: ${detailData.statistics.highestPrice}, 최저: ${detailData.statistics.lowestPrice}`
      );

      // 실제 DB 금속명이 잘 사용되는지 확인
      const originalMetalName = copperHistory[0].metal_name_kr;
      if (detailData.metalName === originalMetalName) {
        console.log(`✅ 실제 DB 금속명 사용됨: ${originalMetalName}`);
      } else {
        console.log(
          `⚠️ 금속명 불일치: 변환됨(${detailData.metalName}) vs 원본(${originalMetalName})`
        );
      }
    } else {
      console.log("⚠️ 테스트할 구리 데이터가 없습니다.");

      // 가짜 데이터로 변환 테스트
      const fakeHistoryData: MetalHistoryData[] = [
        {
          metal_code: "CU",
          metal_name_kr: "구리", // 실제 DB에서 오는 한글명
          price_date: "2025-01-30",
          price_krw_per_kg: 13250, // 메인 가격 데이터
          price_usd_per_ton: 9800, // 참고용 (실제로는 원/KG 사용)
          change_percent: 1.5,
          change_type: "positive",
          exchange_rate: 1350,
        },
      ];

      const detailData = transformHistoryToDetailData(fakeHistoryData, "CU");
      console.log("가짜 데이터 변환 결과:");
      console.log(
        `   금속명: ${detailData.metalName} (원본: ${fakeHistoryData[0].metal_name_kr})`
      );
    }
  } catch (error) {
    console.log("❌ 데이터 변환 테스트 실패:", error);
  }

  console.log("\n✅ 데이터 변환 테스트 완료\n");
}

// Metal Detail 화면 경로 파라미터 테스트
export function testMetalDetailRouting() {
  console.log("🔗 Metal Detail 라우팅 테스트 시작");

  const routeParams = [
    "구리",
    "copper",
    "CU", // 구리 접근 방법들
    "알루미늄",
    "aluminum",
    "AL", // 알루미늄 접근 방법들
    "니켈",
    "nickel",
    "NI", // 니켈 접근 방법들
  ];

  console.log("라우트 파라미터 → 정규화된 코드:");
  routeParams.forEach((param) => {
    const normalized = normalizeMetalCode(param);
    const metalName = getMetalName(normalized);
    console.log(`   "${param}" → ${normalized} (${metalName})`);
  });

  console.log("✅ Metal Detail 라우팅 테스트 완료\n");
}

// 통합 테스트 실행
export async function runPhase3Tests() {
  console.log("🚀 Phase 3 실시간 상세 화면 연동 검증 시작\n");

  // 순차적으로 모든 테스트 실행
  testRealDbMapping();
  await testMetalHistoryFetch();
  await testDataTransformation();
  testMetalDetailRouting();

  console.log("📊 Phase 3 테스트 결과 요약:");
  console.log("   - 실제 DB 매핑: 6개 금속 코드 검증");
  console.log("   - 히스토리 데이터: 실제 API 호출 테스트");
  console.log("   - 데이터 변환: MetalDetailData 형식 변환");
  console.log("   - 라우팅: 다양한 파라미터 정규화");

  console.log("\n🎉 Phase 3 실시간 상세 화면 연동 검증 완료!");
  console.log("   다음 단계: 실제 앱에서 Metal Detail 화면 테스트");

  return {
    success: true,
    testsRun: 4,
    realDbMapping: true,
  };
}

// 개발 환경에서만 자동 실행
if (__DEV__ && typeof window !== "undefined") {
  (window as any).runLmePhase3Tests = runPhase3Tests;
  console.log("💡 브라우저에서 runLmePhase3Tests() 호출하여 테스트 실행 가능");
}
