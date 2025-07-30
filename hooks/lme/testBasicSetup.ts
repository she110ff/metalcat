/**
 * Phase 1 기반 구조 검증 테스트
 *
 * 실제 앱에서 사용하기 전에 기본 설정이 올바른지 확인
 */

import { lmeKeys, lmeQueryUtils } from "./queryKeys";
import { classifyError, validateLmePrice, LME_ERROR_CODES } from "./errorUtils";
import { supabase, lmeRpc, lmeTables } from "./supabaseClient";
import type { LatestLmePrice } from "../../types/lme";

// 1. 쿼리 키 패턴 검증
export function testQueryKeys() {
  console.log("🔑 쿼리 키 패턴 테스트 시작");

  // 기본 키 구조 확인
  const baseKeys = lmeKeys.all;
  console.log("Base keys:", baseKeys);

  // 최신 가격 키
  const latestKeys = lmeKeys.latestPrices();
  console.log("Latest price keys:", latestKeys);

  // 특정 금속 히스토리 키
  const copperHistoryKeys = lmeKeys.metalHistory("copper", 30);
  console.log("Copper history keys:", copperHistoryKeys);

  // 무효화 유틸리티 테스트
  const invalidateKeys = lmeQueryUtils.invalidateMetal("aluminum");
  console.log("Invalidate aluminum keys:", invalidateKeys);

  console.log("✅ 쿼리 키 패턴 검증 완료\n");
}

// 2. 에러 처리 유틸리티 검증
export function testErrorHandling() {
  console.log("🚨 에러 처리 유틸리티 테스트 시작");

  // 네트워크 에러 분류 테스트
  const networkError = classifyError({ code: "NETWORK_ERROR" });
  console.log("Network error:", networkError);

  // HTTP 에러 분류 테스트
  const httpError = classifyError({
    status: 500,
    message: "Internal Server Error",
  });
  console.log("HTTP error:", httpError);

  // 데이터 검증 테스트
  const validData = {
    metal_code: "copper",
    price_krw_per_kg: 13250,
    price_date: "2025-01-30",
    change_type: "positive",
  };
  const isValid = validateLmePrice(validData);
  console.log("Valid data test:", isValid);

  const invalidData = { invalid: true };
  const isInvalid = validateLmePrice(invalidData);
  console.log("Invalid data test:", isInvalid);

  console.log("✅ 에러 처리 유틸리티 검증 완료\n");
}

// 3. Supabase 연결 테스트
export async function testSupabaseConnection() {
  console.log("🔗 Supabase 연결 테스트 시작");

  try {
    // 기본 연결 확인
    console.log("Supabase connection test started");

    // 테이블 스키마 확인 (메타데이터 조회)
    const { data: tableInfo, error } = await supabase
      .from("lme_processed_prices")
      .select("*")
      .limit(1);

    if (error) {
      console.log("⚠️ 테이블 쿼리 에러:", error.message);
      console.log("   (데이터가 아직 없을 수 있음)");
    } else {
      console.log("✅ 테이블 연결 성공, 샘플 데이터:", tableInfo);
    }

    // RPC 함수 테스트
    const { data: rpcData, error: rpcError } = await lmeRpc.getLatestPrices();

    if (rpcError) {
      console.log("⚠️ RPC 함수 에러:", rpcError.message);
      console.log("   (함수가 아직 생성되지 않았을 수 있음)");
    } else {
      console.log("✅ RPC 함수 호출 성공");
    }
  } catch (error) {
    console.log("❌ Supabase 연결 실패:", error);
  }

  console.log("✅ Supabase 연결 테스트 완료\n");
}

// 4. 통합 테스트 실행
export async function runPhase1Tests() {
  console.log("🧪 Phase 1 기반 구조 검증 시작\n");

  // 순차적으로 모든 테스트 실행
  testQueryKeys();
  testErrorHandling();
  await testSupabaseConnection();

  console.log("🎉 Phase 1 기반 구조 검증 완료!");
  console.log("   다음 단계: Phase 2 - 시세 화면 연동");
}

// 개발 환경에서만 자동 실행
if (__DEV__ && typeof window !== "undefined") {
  // 자동 실행하지 않고 수동으로 호출할 수 있도록 함
  (window as any).runLmePhase1Tests = runPhase1Tests;
  console.log("💡 브라우저에서 runLmePhase1Tests() 호출하여 테스트 실행 가능");
}
