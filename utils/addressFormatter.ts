/**
 * 주소 포맷팅 유틸리티 함수
 * 경매 목록에서 주소를 간략하게 표시하기 위한 함수들
 */

/**
 * 주소에서 최종 구/군/시까지만 추출하여 표시
 * @param address 전체 주소 문자열
 * @returns 포맷된 주소 문자열
 */
export function formatAddressForList(address: string): string {
  if (!address || typeof address !== "string") {
    return "";
  }

  // 주소를 공백으로 분리
  const parts = address.trim().split(/\s+/);

  if (parts.length === 0) {
    return "";
  }

  let result = "";

  // 첫 번째 부분 (도/특별시/광역시) 처리
  const firstPart = parts[0];

  // 도 단위 줄임말 처리
  const provinceMap: { [key: string]: string } = {
    경상남도: "경남",
    경상북도: "경북",
    전라남도: "전남",
    전라북도: "전북",
    충청남도: "충남",
    충청북도: "충북",
    강원도: "강원",
    제주도: "제주",
    제주특별자치도: "제주",
  };

  // 특별시/광역시 줄임말 처리
  const cityMap: { [key: string]: string } = {
    서울특별시: "서울시",
    부산광역시: "부산시",
    대구광역시: "대구시",
    인천광역시: "인천시",
    광주광역시: "광주시",
    대전광역시: "대전시",
    울산광역시: "울산시",
    세종특별자치시: "세종시",
  };

  // 첫 번째 부분이 도/특별시/광역시인 경우 줄임말 적용
  if (provinceMap[firstPart]) {
    result = provinceMap[firstPart];
  } else if (cityMap[firstPart]) {
    result = cityMap[firstPart];
    // 특별시/광역시인 경우 여기서 끝 (구까지만 표시)
    if (parts.length > 1) {
      const secondPart = parts[1];
      // 구로 끝나는 경우만 추가
      if (secondPart.endsWith("구")) {
        result += ` ${secondPart}`;
      }
    }
    return result;
  } else {
    result = firstPart;
  }

  // 나머지 부분들을 순서대로 확인
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // 구로 끝나는 경우 (예: 분당구, 군위군)
    if (part.endsWith("구") || part.endsWith("군")) {
      result += ` ${part}`;
      break; // 구/군까지만 표시하고 종료
    }

    // 시로 끝나는 경우 (예: 성남시, 화성시)
    if (part.endsWith("시")) {
      result += ` ${part}`;

      // 다음 부분이 구/군인지 확인
      if (i + 1 < parts.length) {
        const nextPart = parts[i + 1];
        if (nextPart.endsWith("구") || nextPart.endsWith("군")) {
          result += ` ${nextPart}`;
        }
      }
      break; // 시까지 표시하고 종료
    }
  }

  return result;
}

/**
 * 주소 포맷팅 테스트용 함수
 */
export function testAddressFormatting() {
  const testCases = [
    "경기 성남시 분당구",
    "경기도 화성시 우정읍",
    "대구 군위군 군위읍",
    "서울특별시 강남구 역삼동",
    "부산광역시 해운대구 우동",
    "경상남도 창원시 의창구",
    "전라북도 전주시 완산구",
    "충청남도 천안시 동남구",
    "제주특별자치도 제주시 일도일동",
  ];

  console.log("주소 포맷팅 테스트:");
  testCases.forEach((address) => {
    console.log(`${address} → ${formatAddressForList(address)}`);
  });
}
