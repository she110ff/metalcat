import { BatteryOptimizationSettings } from "@/hooks/useBatteryOptimization";

/**
 * 배터리 최적화 설정을 적용하는 유틸리티 함수들
 */

/**
 * LME 크롤링 간격을 설정에 맞게 조정
 */
export function getLmeCrawlingInterval(
  settings: BatteryOptimizationSettings
): number {
  return settings.lmeCrawlingInterval;
}

/**
 * LME 가격 데이터 간격을 설정에 맞게 조정
 */
export function getLmePriceInterval(
  settings: BatteryOptimizationSettings
): number {
  return settings.lmePriceInterval;
}

/**
 * 경매 데이터 갱신 간격을 설정에 맞게 조정
 */
export function getAuctionRefreshInterval(
  settings: BatteryOptimizationSettings
): number {
  return settings.auctionRefreshInterval;
}

/**
 * 알림 갱신 간격을 설정에 맞게 조정
 */
export function getNotificationRefreshInterval(
  settings: BatteryOptimizationSettings
): number {
  return settings.notificationRefreshInterval;
}

/**
 * 이미지 품질을 설정에 맞게 조정
 */
export function getImageQuality(settings: BatteryOptimizationSettings): number {
  return settings.imageQuality;
}

/**
 * 애니메이션 활성화 여부를 설정에 맞게 조정
 */
export function shouldDisableAnimations(
  settings: BatteryOptimizationSettings
): boolean {
  return settings.disableAnimations;
}

/**
 * 백그라운드 폴링 활성화 여부를 설정에 맞게 조정
 */
export function shouldDisableBackgroundPolling(
  settings: BatteryOptimizationSettings
): boolean {
  return settings.disableBackgroundPolling;
}

/**
 * 배터리 절약 모드인지 확인
 */
export function isBatterySaverMode(
  settings: BatteryOptimizationSettings
): boolean {
  return (
    settings.lmeCrawlingInterval >= 2 * 60 * 60 * 1000 && // 2시간 이상
    settings.lmePriceInterval >= 6 * 60 * 60 * 1000 && // 6시간 이상
    settings.auctionRefreshInterval >= 20 * 60 * 1000 && // 20분 이상
    settings.imageQuality <= 60 && // 60% 이하
    settings.disableAnimations && // 애니메이션 비활성화
    settings.disableBackgroundPolling // 백그라운드 폴링 비활성화
  );
}

/**
 * 성능 모드인지 확인
 */
export function isPerformanceMode(
  settings: BatteryOptimizationSettings
): boolean {
  return (
    settings.lmeCrawlingInterval <= 30 * 60 * 1000 && // 30분 이하
    settings.lmePriceInterval <= 2 * 60 * 60 * 1000 && // 2시간 이하
    settings.auctionRefreshInterval <= 5 * 60 * 1000 && // 5분 이하
    settings.imageQuality >= 85 && // 85% 이상
    !settings.disableAnimations && // 애니메이션 활성화
    !settings.disableBackgroundPolling // 백그라운드 폴링 활성화
  );
}

/**
 * 현재 설정의 배터리 절약 효과를 백분율로 계산
 */
export function calculateBatterySavingEffect(
  settings: BatteryOptimizationSettings
): number {
  let score = 0;

  // LME 크롤링 간격 (최대 30점)
  if (settings.lmeCrawlingInterval >= 2 * 60 * 60 * 1000) score += 30;
  else if (settings.lmeCrawlingInterval >= 1 * 60 * 60 * 1000) score += 20;
  else if (settings.lmeCrawlingInterval >= 30 * 60 * 1000) score += 10;

  // LME 가격 간격 (최대 25점)
  if (settings.lmePriceInterval >= 6 * 60 * 60 * 1000) score += 25;
  else if (settings.lmePriceInterval >= 4 * 60 * 60 * 1000) score += 15;
  else if (settings.lmePriceInterval >= 2 * 60 * 60 * 1000) score += 10;

  // 경매 갱신 간격 (최대 20점)
  if (settings.auctionRefreshInterval >= 20 * 60 * 1000) score += 20;
  else if (settings.auctionRefreshInterval >= 10 * 60 * 1000) score += 15;
  else if (settings.auctionRefreshInterval >= 5 * 60 * 1000) score += 10;

  // 이미지 품질 (최대 15점)
  if (settings.imageQuality <= 60) score += 15;
  else if (settings.imageQuality <= 70) score += 10;
  else if (settings.imageQuality <= 80) score += 5;

  // 기타 설정 (최대 10점)
  if (settings.disableAnimations) score += 5;
  if (settings.disableBackgroundPolling) score += 5;

  return Math.min(score, 100);
}

/**
 * 배터리 절약 효과를 텍스트로 표현
 */
export function getBatterySavingText(effect: number): string {
  if (effect >= 80) return "매우 높음";
  if (effect >= 60) return "높음";
  if (effect >= 40) return "보통";
  if (effect >= 20) return "낮음";
  return "매우 낮음";
}

/**
 * 배터리 절약 효과에 따른 색상 반환
 */
export function getBatterySavingColor(effect: number): string {
  if (effect >= 80) return "#10B981"; // green-500
  if (effect >= 60) return "#059669"; // green-600
  if (effect >= 40) return "#F59E0B"; // amber-500
  if (effect >= 20) return "#F97316"; // orange-500
  return "#EF4444"; // red-500
}

/**
 * 캐시 staleTime을 설정에 맞게 계산
 */
export function getCacheStaleTime(
  settings: BatteryOptimizationSettings,
  baseInterval: number
): number {
  if (settings.enableAggressiveCaching) {
    // 공격적인 캐싱: staleTime을 더 길게 설정
    return Math.min(
      baseInterval * settings.cacheStaleTimeMultiplier * 1.5,
      settings.cacheMaxAge
    );
  }
  return Math.min(
    baseInterval * settings.cacheStaleTimeMultiplier,
    settings.cacheMaxAge
  );
}

/**
 * 캐시 gcTime을 설정에 맞게 계산
 */
export function getCacheGcTime(
  settings: BatteryOptimizationSettings,
  baseInterval: number
): number {
  if (settings.enableAggressiveCaching) {
    // 공격적인 캐싱: gcTime을 더 길게 설정
    return Math.min(
      baseInterval * settings.cacheGcTimeMultiplier * 1.5,
      settings.cacheMaxAge
    );
  }
  return Math.min(
    baseInterval * settings.cacheGcTimeMultiplier,
    settings.cacheMaxAge
  );
}

/**
 * 캐시 최적화가 활성화되었는지 확인
 */
export function isCacheOptimizationEnabled(
  settings: BatteryOptimizationSettings
): boolean {
  return (
    settings.enableAggressiveCaching ||
    settings.cacheStaleTimeMultiplier > 0.3 ||
    settings.cacheGcTimeMultiplier > 1.5
  );
}

/**
 * 캐시 설정의 배터리 절약 효과를 백분율로 계산
 */
export function calculateCacheBatterySavingEffect(
  settings: BatteryOptimizationSettings
): number {
  let score = 0;

  // staleTime 배수 (최대 20점)
  if (settings.cacheStaleTimeMultiplier >= 0.8) score += 20;
  else if (settings.cacheStaleTimeMultiplier >= 0.6) score += 15;
  else if (settings.cacheStaleTimeMultiplier >= 0.4) score += 10;

  // gcTime 배수 (최대 20점)
  if (settings.cacheGcTimeMultiplier >= 3.0) score += 20;
  else if (settings.cacheGcTimeMultiplier >= 2.5) score += 15;
  else if (settings.cacheGcTimeMultiplier >= 2.0) score += 10;

  // 공격적인 캐싱 (최대 30점)
  if (settings.enableAggressiveCaching) score += 30;

  // 캐시 최대 보관 시간 (최대 30점)
  if (settings.cacheMaxAge >= 48 * 60 * 60 * 1000) score += 30;
  else if (settings.cacheMaxAge >= 24 * 60 * 60 * 1000) score += 20;
  else if (settings.cacheMaxAge >= 12 * 60 * 60 * 1000) score += 10;

  return Math.min(score, 100);
}
