/**
 * 슬레이브 유저 50개 생성 스크립트
 * 실제 같은 한국인 이름, 전화번호, 주소 데이터 생성
 */

// 한국인 성씨 (빈도 높은 순)
const surnames = [
  "김",
  "이",
  "박",
  "최",
  "정",
  "강",
  "조",
  "윤",
  "장",
  "임",
  "한",
  "오",
  "서",
  "신",
  "권",
  "황",
  "안",
  "송",
  "류",
  "전",
  "홍",
  "고",
  "문",
  "양",
  "손",
  "배",
  "조",
  "백",
  "허",
  "유",
];

// 한국인 이름 (남녀 공용, 최신 트렌드)
const givenNames = [
  "민준",
  "서준",
  "도윤",
  "예준",
  "시우",
  "하준",
  "주원",
  "지호",
  "준서",
  "건우",
  "현우",
  "우진",
  "지훈",
  "선우",
  "연우",
  "유준",
  "정우",
  "승우",
  "시윤",
  "준혁",
  "지우",
  "승현",
  "시후",
  "은우",
  "준영",
  "소율",
  "서연",
  "서윤",
  "지유",
  "채원",
  "하은",
  "유나",
  "지안",
  "서현",
  "민서",
  "예은",
  "수아",
  "지민",
  "하린",
  "다은",
  "예린",
  "아린",
  "지원",
  "채은",
  "서아",
  "윤서",
  "예나",
  "유진",
  "하율",
  "수빈",
  "민지",
  "수연",
  "지혜",
  "혜진",
  "영희",
  "철수",
  "영수",
  "순자",
  "미영",
  "정호",
];

// 실제 존재하는 주소 (도로명주소 기준)
const addresses = [
  // 서울 (30%)
  "서울특별시 강남구 테헤란로 152",
  "서울특별시 강남구 강남대로 298",
  "서울특별시 서초구 반포대로 58",
  "서울특별시 서초구 서초대로 396",
  "서울특별시 송파구 올림픽로 300",
  "서울특별시 송파구 송파대로 167",
  "서울특별시 마포구 월드컵로 240",
  "서울특별시 용산구 한강대로 405",
  "서울특별시 종로구 종로 1",
  "서울특별시 중구 세종대로 110",
  "서울특별시 영등포구 여의대로 108",
  "서울특별시 구로구 구로중앙로 152",
  "서울특별시 관악구 관악로 145",
  "서울특별시 동작구 상도로 369",
  "서울특별시 성동구 왕십리로 222",

  // 경기도 (25%)
  "경기도 성남시 분당구 판교역로 166",
  "경기도 성남시 분당구 성남대로 601",
  "경기도 수원시 영통구 월드컵로 206",
  "경기도 수원시 팔달구 중부대로 129",
  "경기도 고양시 일산동구 중앙로 1200",
  "경기도 고양시 덕양구 권율대로 570",
  "경기도 용인시 기흥구 용구대로 152",
  "경기도 안양시 동안구 시민대로 230",
  "경기도 부천시 길주로 210",
  "경기도 화성시 동탄대로 636",
  "경기도 평택시 중앙로 232",
  "경기도 의정부시 의정부대로 1",
  "경기도 시흥시 정왕대로 32",

  // 부산 (15%)
  "부산광역시 해운대구 해운대해변로 264",
  "부산광역시 부산진구 중앙대로 708",
  "부산광역시 동래구 충렬대로 170",
  "부산광역시 남구 수영로 190",
  "부산광역시 서구 구덕로 225",
  "부산광역시 북구 금곡대로 466",
  "부산광역시 연제구 중앙대로 1001",
  "부산광역시 사상구 낙동대로 1570",

  // 기타 광역시 (30%)
  "대구광역시 수성구 동대구로 165",
  "대구광역시 중구 국채보상로 680",
  "인천광역시 연수구 컨벤시아대로 165",
  "인천광역시 남동구 구월남로 170",
  "광주광역시 서구 상무중앙로 61",
  "광주광역시 북구 용봉로 77",
  "대전광역시 유성구 대학로 291",
  "대전광역시 서구 둔산로 100",
  "울산광역시 남구 삼산로 277",
  "세종특별자치시 한누리대로 2130",
];

// 상세주소 생성 함수
function generateDetailAddress() {
  const types = ["아파트", "오피스텔", "주택"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "아파트") {
    const dong = Math.floor(Math.random() * 15) + 101; // 101동~115동
    const ho = Math.floor(Math.random() * 20) + 1001; // 1001호~1020호
    return `${dong}동 ${ho}호`;
  } else if (type === "오피스텔") {
    const ho = Math.floor(Math.random() * 50) + 201; // 201호~250호
    return `${ho}호`;
  } else {
    return "1층";
  }
}

// 전화번호 생성 함수 (중복 방지)
function generatePhoneNumber(usedNumbers) {
  let phoneNumber;
  do {
    const middle = String(Math.floor(Math.random() * 9000) + 1000); // 1000~9999
    const last = String(Math.floor(Math.random() * 9000) + 1000); // 1000~9999
    phoneNumber = `010${middle}${last}`;
  } while (usedNumbers.has(phoneNumber));

  usedNumbers.add(phoneNumber);
  return phoneNumber;
}

// 슬레이브 유저 50개 생성
function generateSlaveUsers() {
  const users = [];
  const usedNumbers = new Set();

  for (let i = 0; i < 50; i++) {
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
    const name = surname + givenName;

    const phoneNumber = generatePhoneNumber(usedNumbers);
    const address = addresses[Math.floor(Math.random() * addresses.length)];
    const addressDetail = generateDetailAddress();

    users.push({
      name,
      phoneNumber,
      address,
      addressDetail,
    });
  }

  return users;
}

// SQL INSERT 문 생성
function generateSQL() {
  const users = generateSlaveUsers();

  let sql = `-- 슬레이브 유저 50개 추가
INSERT INTO users (
  name, 
  phone_number, 
  address, 
  address_detail, 
  is_slave, 
  is_phone_verified
) VALUES\n`;

  const values = users
    .map(
      (user) =>
        `  ('${user.name}', '${user.phoneNumber}', '${user.address}', '${user.addressDetail}', true, true)`
    )
    .join(",\n");

  sql += values;
  sql += "\nON CONFLICT (phone_number) DO NOTHING;";

  return sql;
}

// 실행
console.log("🚀 슬레이브 유저 50개 생성 중...");
const sqlScript = generateSQL();
console.log("\n📝 생성된 SQL 스크립트:");
console.log(sqlScript);
console.log("\n✅ 완료!");
