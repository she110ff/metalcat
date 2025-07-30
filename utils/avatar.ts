/**
 * 아바타 관련 유틸리티 함수들
 * UI Avatars API를 사용하여 안정적인 아바타 생성 (한글 완벽 지원)
 */

// 아바타 색상 팔레트
const AVATAR_COLORS = [
  "3B82F6", // blue
  "10B981", // green
  "F59E0B", // yellow
  "EF4444", // red
  "8B5CF6", // purple
  "F97316", // orange
  "06B6D4", // cyan
  "84CC16", // lime
  "EC4899", // pink
  "6366F1", // indigo
];

/**
 * 한글 글자를 해시 기반으로 영문자로 변환
 * @param char - 한글 글자
 * @returns 영문자 (A-Z)
 */
function koreanCharToEnglish(char: string): string {
  // 한글 글자의 유니코드 값을 이용해 A-Z로 매핑
  const charCode = char.charCodeAt(0);

  // 한글 범위: 가(44032) ~ 힣(55203)
  if (charCode >= 44032 && charCode <= 55203) {
    const index = (charCode - 44032) % 26;
    return String.fromCharCode(65 + index); // A(65) ~ Z(90)
  }

  // 한글 자음/모음: ㄱ(12593) ~ ㅣ(12643)
  if (charCode >= 12593 && charCode <= 12643) {
    const index = (charCode - 12593) % 26;
    return String.fromCharCode(65 + index);
  }

  // 기타 문자는 해시 기반 변환
  const hash = charCode % 26;
  return String.fromCharCode(65 + hash);
}

/**
 * 한글 이름을 영문 이니셜로 변환 (해시 기반)
 * @param koreanName - 한글 이름
 * @returns 영문 이니셜 (2글자)
 */
function convertKoreanToInitials(koreanName: string): string {
  if (!koreanName || koreanName.length === 0) return "XX";

  let initials = "";

  // 첫 번째 글자
  const firstName = koreanName.charAt(0);
  initials += koreanCharToEnglish(firstName);

  // 두 번째 글자 (있는 경우)
  if (koreanName.length > 1) {
    const secondName = koreanName.charAt(1);
    initials += koreanCharToEnglish(secondName);
  } else {
    // 이름이 한 글자인 경우, 첫 글자를 다시 해시해서 두 번째 글자 생성
    const hash = firstName.charCodeAt(0) + 7;
    const secondChar = String.fromCharCode(65 + (hash % 26));
    initials += secondChar;
  }

  return initials.toUpperCase();
}

/**
 * 문자열을 기반으로 해시 생성
 * @param str - 입력 문자열
 * @returns 해시 값
 */
function generateHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * 안전한 이니셜 생성 (한글, 영어, 숫자 모두 지원)
 * @param input - 사용자 입력 (이름, 전화번호 등)
 * @returns 안전한 2글자 이니셜
 */
function generateSafeInitials(input: string): string {
  if (!input || input.trim() === "") return "XX";

  const trimmed = input.trim();

  // 1. 전화번호인 경우: 마지막 2자리 사용
  const phoneNumbers = trimmed.replace(/[^\d]/g, "");
  if (phoneNumbers.length >= 8) {
    // 전화번호로 추정
    return phoneNumbers.slice(-2);
  }

  // 2. 한글이 포함된 경우: 한글→영문 변환
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(trimmed);
  if (hasKorean) {
    return convertKoreanToInitials(trimmed);
  }

  // 3. 영문인 경우: 첫 2글자 또는 첫글자+마지막글자
  if (/^[a-zA-Z]/.test(trimmed)) {
    if (trimmed.length >= 2) {
      return trimmed.charAt(0).toUpperCase() + trimmed.charAt(1).toUpperCase();
    } else {
      return trimmed.charAt(0).toUpperCase() + "X";
    }
  }

  // 4. 기타: 해시 기반 2글자 생성
  const hash = generateHash(trimmed);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const first = letters[hash % letters.length];
  const second = letters[(hash + 7) % letters.length];
  return first + second;
}

/**
 * UI Avatars를 사용한 안정적인 아바타 생성
 * @param seed - 시드 값 (이름, 전화번호 등)
 * @param size - 아바타 크기 (기본값: 150)
 * @returns 아바타 이미지 URL
 */
export function generateSimpleAvatarUrl(
  seed: string,
  size: number = 150
): string {
  // 안전한 이니셜 생성
  const initials = generateSafeInitials(seed);

  // 시드 기반 색상 선택 (일관성 유지)
  const hash = generateHash(seed || "default");
  const colorIndex = hash % AVATAR_COLORS.length;
  const backgroundColor = AVATAR_COLORS[colorIndex];

  // UI Avatars API URL 생성 (확실히 작동하는 형식)
  const params = new URLSearchParams({
    name: initials,
    size: size.toString(),
    background: backgroundColor,
    color: "ffffff",
    bold: "true",
    format: "png",
  });

  const url = `https://ui-avatars.com/api/?${params.toString()}`;

  if (__DEV__) {
    console.log(
      `🎨 UI Avatar 생성: [${initials}] ${backgroundColor} -> ${url}`
    );
  }

  return url;
}

/**
 * 사용자 정보를 기반으로 아바타 URL 생성 (호환성 유지용)
 * @param seed - 시드 값 (이름, 전화번호 등)
 * @param style - 아바타 스타일 (사용 안함, 호환성 유지용)
 * @param size - 아바타 크기 (기본값: 150)
 * @returns 아바타 이미지 URL
 */
export function generateAvatarUrl(
  seed: string,
  style?: string,
  size: number = 150
): string {
  return generateSimpleAvatarUrl(seed, size);
}

/**
 * 표시할 아바타 URL 결정
 * 사용자 아바타가 있으면 그것을 사용하고, 없으면 안전한 UI Avatar 생성
 * @param userAvatarUrl - 사용자가 설정한 아바타 URL (선택적, HTTP/HTTPS URL)
 * @param fallbackSeed - fallback 아바타 생성용 시드 (이름, 전화번호 등)
 * @param size - 아바타 크기 (기본값: 150)
 * @returns 최종 아바타 URL (UI Avatars 또는 사용자 설정 URL)
 */
export function getAvatarUrl(
  userAvatarUrl?: string | null,
  fallbackSeed?: string,
  size: number = 150
): string {
  // 사용자 아바타가 있으면 그것을 사용
  if (userAvatarUrl && userAvatarUrl.trim()) {
    return userAvatarUrl;
  }

  // 없으면 fallback 시드로 UI Avatar 생성
  const seed = fallbackSeed || "default-user";
  const avatarUrl = generateSimpleAvatarUrl(seed, size);

  // 개발 중에는 생성된 아바타 정보 확인
  if (__DEV__) {
    // 전화번호인 경우 마스킹, 이름인 경우 그대로 표시
    const isPhoneNumber = /^\d/.test(seed.replace(/[^\d]/g, ""));
    let displaySeed = seed;

    if (isPhoneNumber) {
      const numbers = seed.replace(/[^\d]/g, "");
      displaySeed = numbers.length >= 4 ? `***${numbers.slice(-4)}` : numbers;
    }

    const initials = generateSafeInitials(seed);
    console.log(
      `🎨 최종 아바타 [${displaySeed}] → [${initials}]: ${avatarUrl}`
    );
  }

  return avatarUrl;
}

/**
 * 아바타 생성 테스트 함수 (개발용)
 * @param testSeeds - 테스트할 시드 배열 (이름, 전화번호 등)
 */
export function testAvatarGeneration(
  testSeeds: string[] = [
    "정개발",
    "김철수",
    "이영희",
    "박민수",
    "최지은",
    "010-1234-5678",
    "010-9876-5432",
    "010-1111-2222",
    "john.doe",
    "user123",
    "",
    "가",
    "AB",
  ]
): void {
  if (__DEV__) {
    console.log("🎨 === UI Avatar 생성 테스트 ===");
    testSeeds.forEach((seed) => {
      const avatarUrl = getAvatarUrl(null, seed, 150);
      const initials = generateSafeInitials(seed);
      console.log(`🎭 "${seed}" → [${initials}]: ${avatarUrl}`);
    });
    console.log("🎨 === 테스트 완료 ===");

    // 이니셜 변환 테스트
    console.log("\n🔤 === 이니셜 변환 테스트 ===");
    const koreanNames = [
      "정개발",
      "김철수",
      "이영희",
      "박민수",
      "최지은",
      "한글",
    ];
    koreanNames.forEach((name) => {
      const initials = convertKoreanToInitials(name);
      console.log(`🇰🇷 ${name} → ${initials}`);
    });

    console.log("\n📱 === 전화번호 테스트 ===");
    const phoneNumbers = ["010-1234-5678", "01012345678", "+82-10-1234-5678"];
    phoneNumbers.forEach((phone) => {
      const initials = generateSafeInitials(phone);
      console.log(`📞 ${phone} → ${initials}`);
    });
  }
}
