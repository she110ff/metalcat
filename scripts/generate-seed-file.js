#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Supabase 로컬 API 설정
const SUPABASE_URL = "http://127.0.0.1:54331";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

async function fetchLmeData() {
  try {
    console.log("🔍 로컬 Supabase에서 LME 데이터 조회 중...");

    // 최근 60일간의 데이터만 가져오기 (각 금속별로 약 60개씩, 총 360개)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/lme_processed_prices?select=*&order=price_date.desc&limit=360`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ ${data.length}개의 LME 데이터 조회 완료`);

    return data;
  } catch (error) {
    console.error("❌ 데이터 조회 실패:", error);
    throw error;
  }
}

function generateSeedSQL(data) {
  console.log("🛠️  시드 SQL 생성 중...");

  // SQL 헤더
  let sql = `-- 🌱 LME 가격 데이터 시드 파일
-- 자동 생성됨: ${new Date().toISOString()}
-- 총 데이터: ${data.length}개

-- 기존 데이터 삭제 (개발 환경용)
TRUNCATE TABLE lme_processed_prices CASCADE;

-- 시퀀스 리셋
ALTER SEQUENCE IF EXISTS lme_processed_prices_id_seq RESTART WITH 1;

-- LME 가격 데이터 삽입
INSERT INTO lme_processed_prices (
  id,
  metal_code,
  metal_name_kr,
  price_usd_per_ton,
  price_krw_per_kg,
  change_percent,
  change_type,
  change_amount_krw,
  price_date,
  exchange_rate,
  exchange_rate_source,
  processed_at,
  created_at
) VALUES\n`;

  // 데이터 변환
  const values = data.map((item, index) => {
    const id = `'${item.id}'`;
    const metalCode = `'${item.metal_code}'`;
    const metalNameKr = `'${item.metal_name_kr}'`;
    const priceUsd = item.price_usd_per_ton;
    const priceKrw = item.price_krw_per_kg;
    const changePercent = item.change_percent;
    const changeType = `'${item.change_type}'`;
    const changeAmountKrw = item.change_amount_krw;
    const priceDate = `'${item.price_date}'`;
    const exchangeRate = item.exchange_rate;
    const exchangeRateSource = `'${item.exchange_rate_source}'`;
    const processedAt = `'${item.processed_at}'`;
    const createdAt = `'${item.created_at}'`;

    const isLast = index === data.length - 1;
    const ending = isLast ? ";" : ",";

    return `  (${id}, ${metalCode}, ${metalNameKr}, ${priceUsd}, ${priceKrw}, ${changePercent}, ${changeType}, ${changeAmountKrw}, ${priceDate}, ${exchangeRate}, ${exchangeRateSource}, ${processedAt}, ${createdAt})${ending}`;
  });

  sql += values.join("\n");

  // 통계 정보 추가
  const metalCounts = data.reduce((acc, item) => {
    acc[item.metal_code] = (acc[item.metal_code] || 0) + 1;
    return acc;
  }, {});

  const dates = data.map((item) => item.price_date).sort();
  const oldestDate = dates[dates.length - 1];
  const newestDate = dates[0];

  sql += `

-- 📊 시드 데이터 통계
-- 총 레코드: ${data.length}개
-- 날짜 범위: ${oldestDate} ~ ${newestDate}
-- 금속별 데이터:
${Object.entries(metalCounts)
  .map(([metal, count]) => `--   ${metal}: ${count}개`)
  .join("\n")}

-- 🔍 데이터 확인 쿼리
-- SELECT metal_code, COUNT(*) as count FROM lme_processed_prices GROUP BY metal_code ORDER BY metal_code;
-- SELECT MIN(price_date) as oldest, MAX(price_date) as newest FROM lme_processed_prices;
-- SELECT COUNT(*) as total_records FROM lme_processed_prices;
`;

  console.log(`✅ SQL 생성 완료: ${data.length}개 레코드`);
  return sql;
}

async function main() {
  try {
    console.log("🌱 Supabase 시드 파일 생성 시작");
    console.log("================================");

    // 1. 데이터 조회
    const data = await fetchLmeData();

    if (data.length === 0) {
      console.log(
        "⚠️  조회된 데이터가 없습니다. 먼저 벌크 크롤링을 실행하세요."
      );
      console.log("💡 실행 명령: ./scripts/seed-data.sh");
      process.exit(1);
    }

    // 2. SQL 생성
    const sql = generateSeedSQL(data);

    // 3. 파일 저장
    const seedPath = path.join(process.cwd(), "supabase", "seed.sql");
    fs.writeFileSync(seedPath, sql, "utf8");

    console.log("");
    console.log("🎉 시드 파일 생성 완료!");
    console.log("================================");
    console.log(`📄 파일 위치: ${seedPath}`);
    console.log(`📊 총 데이터: ${data.length}개`);
    console.log("");
    console.log("💡 사용법:");
    console.log("  supabase db reset  # 마이그레이션과 시드 데이터 모두 적용");
    console.log("  supabase db seed   # 시드 데이터만 적용");
  } catch (error) {
    console.error("❌ 시드 파일 생성 실패:", error);
    process.exit(1);
  }
}

main();
