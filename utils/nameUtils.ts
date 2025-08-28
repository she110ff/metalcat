/**
 * 이름 관련 유틸리티 함수들
 */

/**
 * 입찰자 이름을 마스킹하는 함수 (첫 글자만 표시, 나머지는 *)
 * @param name 원본 이름
 * @returns 마스킹된 이름
 *
 * @example
 * maskBidderName("홍길동") // "홍**"
 * maskBidderName("김철수") // "김**"
 * maskBidderName("이") // "이"
 * maskBidderName("") // "익명"
 */
export const maskBidderName = (name: string): string => {
  if (!name || name.length === 0) {
    return "익명";
  }

  if (name.length === 1) {
    return name;
  }

  // 첫 글자 + 나머지 글자 수만큼 * 표시
  const firstChar = name.charAt(0);
  const maskedChars = "*".repeat(name.length - 1);

  return firstChar + maskedChars;
};

/**
 * 전화번호를 마스킹하는 함수 (중간 4자리를 ****로 표시)
 * @param phoneNumber 원본 전화번호
 * @returns 마스킹된 전화번호
 *
 * @example
 * maskPhoneNumber("01012345678") // "010****5678"
 * maskPhoneNumber("010-1234-5678") // "010-****-5678"
 */
export const maskPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) {
    return "";
  }

  // 숫자만 추출
  const numbers = phoneNumber.replace(/[^\d]/g, "");

  if (numbers.length === 11) {
    // 01012345678 -> 010****5678
    return `${numbers.slice(0, 3)}****${numbers.slice(7)}`;
  } else if (numbers.length === 10) {
    // 0212345678 -> 02****5678
    return `${numbers.slice(0, 2)}****${numbers.slice(6)}`;
  }

  // 형식이 맞지 않으면 원본 반환
  return phoneNumber;
};
