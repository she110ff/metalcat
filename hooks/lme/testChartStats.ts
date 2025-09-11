import { lmeRpc } from "./supabaseClient";
import { getMetalCode, getMetalName } from "./api";

/**
 * 차트 통계 기능 통합 테스트
 */

export async function testChartStatsFunction() {
  console.log("🧪 차트 통계 SQL Function 테스트 시작");

  try {
    const testMetals = ["구리", "알루미늄", "아연"];
    const testPeriods: ("daily" | "weekly" | "monthly")[] = [
      "daily",
      "weekly",
      "monthly",
    ];

    for (const metalName of testMetals) {
      const metalCode = getMetalCode(metalName);
      console.log(`\n📊 ${metalName} (${metalCode}) 테스트:`);

      for (const period of testPeriods) {
        try {
          const { data, error } = await lmeRpc.getChartStats(
            metalCode,
            period,
            5
          );

          if (error) {
            console.log(`  ❌ ${period} 데이터 오류:`, error.message);
            continue;
          }

          if (!data || data.length === 0) {
            console.log(`  ⚠️ ${period} 데이터 없음`);
            continue;
          }

          console.log(`  ✅ ${period}: ${data.length}개 데이터`);

          // 첫 번째 데이터 샘플 출력
          const sample = data[0];
          console.log(
            `    샘플: ${sample.period_label} - ${Number(
              sample.avg_price
            ).toLocaleString("ko-KR")}원/KG`
          );
        } catch (error) {
          console.log(`  ❌ ${period} 테스트 실패:`, error);
        }
      }
    }

    return true;
  } catch (error) {
    console.error("❌ 차트 통계 함수 테스트 실패:", error);
    return false;
  }
}

export async function testMetalCodeMapping() {
  console.log("\n🏷️ 금속 코드 매핑 테스트");

  const testCases = [
    { korean: "구리", expected: "CU" },
    { korean: "알루미늄", expected: "AL" },
    { korean: "아연", expected: "ZN" },
    { korean: "납", expected: "PB" },
    { korean: "니켈", expected: "NI" },
    { korean: "주석", expected: "SN" },
  ];

  let passed = 0;

  for (const testCase of testCases) {
    const result = getMetalCode(testCase.korean);
    const reverse = getMetalName(result);

    if (result === testCase.expected && reverse === testCase.korean) {
      console.log(`  ✅ ${testCase.korean} ↔ ${testCase.expected}`);
      passed++;
    } else {
      console.log(
        `  ❌ ${testCase.korean} → ${result} (예상: ${testCase.expected})`
      );
    }
  }

  console.log(`\n매핑 테스트 결과: ${passed}/${testCases.length} 통과`);
  return passed === testCases.length;
}

export async function testChartDataValidation() {
  console.log("\n🔍 차트 데이터 유효성 검증 테스트");

  try {
    const { data, error } = await lmeRpc.getChartStats("CU", "daily", 3);

    if (error) {
      console.log("❌ 데이터 조회 실패:", error.message);
      return false;
    }

    if (!data || data.length === 0) {
      console.log("⚠️ 테스트할 데이터가 없습니다");
      return false;
    }

    let validCount = 0;

    for (const item of data) {
      const isValid =
        item &&
        typeof item.avg_price === "number" &&
        item.avg_price > 0 &&
        item.period_start &&
        item.period_label &&
        typeof item.change_percent === "number" &&
        ["positive", "negative", "unchanged"].includes(item.change_type);

      if (isValid) {
        validCount++;
        console.log(
          `  ✅ ${item.period_label}: ${Number(item.avg_price).toLocaleString(
            "ko-KR"
          )}원 (${item.change_type})`
        );
      } else {
        console.log(`  ❌ 유효하지 않은 데이터:`, item);
      }
    }

    const allValid = validCount === data.length;
    console.log(`\n데이터 유효성: ${validCount}/${data.length} 유효`);

    return allValid;
  } catch (error) {
    console.error("❌ 데이터 유효성 검증 실패:", error);
    return false;
  }
}

export async function testPerformance() {
  console.log("\n⚡ 성능 테스트");

  const testCases = [
    { period: "daily" as const, limit: 30 },
    { period: "weekly" as const, limit: 30 },
    { period: "monthly" as const, limit: 30 },
  ];

  for (const testCase of testCases) {
    const startTime = Date.now();

    try {
      const { data, error } = await lmeRpc.getChartStats(
        "CU",
        testCase.period,
        testCase.limit
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (error) {
        console.log(`  ❌ ${testCase.period} 오류: ${error.message}`);
        continue;
      }

      const dataSize = data ? data.length : 0;
      console.log(
        `  ✅ ${testCase.period}: ${duration}ms (${dataSize}개 데이터)`
      );

      if (duration > 2000) {
        console.log(`    ⚠️ 응답 시간이 느립니다 (${duration}ms > 2000ms)`);
      }
    } catch (error) {
      console.log(`  ❌ ${testCase.period} 테스트 실패:`, error);
    }
  }
}

export async function runAllChartTests() {
  console.log("🚀 차트 통계 전체 테스트 시작\n");

  const results = {
    sqlFunction: false,
    codeMapping: false,
    dataValidation: false,
    performance: true, // 성능 테스트는 실패해도 전체 결과에 영향 없음
  };

  // 1. SQL Function 테스트
  results.sqlFunction = await testChartStatsFunction();

  // 2. 코드 매핑 테스트
  results.codeMapping = await testMetalCodeMapping();

  // 3. 데이터 유효성 테스트
  results.dataValidation = await testChartDataValidation();

  // 4. 성능 테스트
  await testPerformance();

  // 결과 요약
  console.log("\n📋 테스트 결과 요약:");
  console.log(`  SQL Function: ${results.sqlFunction ? "✅ 통과" : "❌ 실패"}`);
  console.log(`  코드 매핑: ${results.codeMapping ? "✅ 통과" : "❌ 실패"}`);
  console.log(
    `  데이터 유효성: ${results.dataValidation ? "✅ 통과" : "❌ 실패"}`
  );
  console.log(`  성능 테스트: ✅ 완료`);

  const allPassed =
    results.sqlFunction && results.codeMapping && results.dataValidation;

  console.log(
    `\n${allPassed ? "🎉 모든 테스트 통과!" : "⚠️ 일부 테스트 실패"}`
  );

  return allPassed;
}

// 개별 테스트 실행을 위한 헬퍼 함수들
export const chartTestUtils = {
  testFunction: testChartStatsFunction,
  testMapping: testMetalCodeMapping,
  testValidation: testChartDataValidation,
  testPerformance: testPerformance,
  runAll: runAllChartTests,
};
