/**
 * 아바타 관련 유틸리티 함수들
 * UI Avatars API를 사용하여 간단한 이니셜 아바타 생성
 */

/**
 * 사용자 정보를 기반으로 간단한 아바타 URL 생성 (UI Avatars 사용)
 * @param name - 사용자 이름
 * @param size - 아바타 크기 (기본값: 150)
 * @returns 아바타 이미지 URL
 */
export function generateSimpleAvatarUrl(
  name: string,
  size: number = 150
): string {
  // 이름에서 첫 글자만 추출 (한글, 영어 모두 지원)
  const initials = name ? name.charAt(0).toUpperCase() : "U";

  // 배경색 선택 (이름을 기반으로 일관된 색상)
  const colors = [
    "3B82F6", // blue
    "10B981", // green
    "F59E0B", // yellow
    "EF4444", // red
    "8B5CF6", // purple
    "F97316", // orange
    "06B6D4", // cyan
    "84CC16", // lime
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const backgroundColor = colors[colorIndex];

  // UI Avatars API 사용 (더 안정적)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    initials
  )}&size=${size}&background=${backgroundColor}&color=ffffff&bold=true`;
}

/**
 * 사용자 정보를 기반으로 아바타 URL 생성 (호환성 유지용)
 * @param seed - 시드 값 (사용자 이름, ID 등)
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
 * 사용자 아바타가 있으면 그것을 사용하고, 없으면 이름 기반 간단한 아바타 생성
 * @param userAvatarUrl - 사용자가 설정한 아바타 URL (선택적, HTTP/HTTPS URL)
 * @param userName - 사용자 이름 (fallback 아바타 생성용)
 * @param size - 아바타 크기 (기본값: 150)
 * @returns 최종 아바타 URL (UI Avatars 또는 사용자 설정 URL)
 */
export function getAvatarUrl(
  userAvatarUrl?: string | null,
  userName?: string,
  size: number = 150
): string {
  // 사용자 아바타가 있으면 그것을 사용
  if (userAvatarUrl && userAvatarUrl.trim()) {
    return userAvatarUrl;
  }

  // 없으면 이름 기반 간단한 아바타 생성
  const seed = userName || "사용자";
  const avatarUrl = generateSimpleAvatarUrl(seed, size);

  // 개발 중에는 생성된 아바타 URL 확인
  if (__DEV__) {
    console.log(`🎨 생성된 간단 아바타 [${seed}]: ${avatarUrl}`);
  }

  return avatarUrl;
}

/**
 * 간단한 아바타 생성 테스트 함수 (개발용)
 * @param testNames - 테스트할 이름 배열
 */
export function testAvatarGeneration(
  testNames: string[] = ["김철수", "이영희", "박민수", "최지은", "사용자"]
): void {
  if (__DEV__) {
    console.log("🎨 === 간단 아바타 생성 테스트 ===");
    testNames.forEach((name) => {
      const avatarUrl = getAvatarUrl(null, name, 150);
      console.log(`👤 ${name}: ${avatarUrl}`);
    });
    console.log("🎨 === 테스트 완료 ===");
  }
}
