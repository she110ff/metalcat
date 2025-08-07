import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface BatteryOptimizationSettings {
  // LME 데이터 폴링 설정
  lmeCrawlingInterval: number; // 1시간 (기본값)
  lmePriceInterval: number; // 4시간 (기본값)

  // 경매 데이터 폴링 설정
  auctionRefreshInterval: number; // 10분 (기본값)

  // 알림 설정
  notificationRefreshInterval: number; // 10분 (기본값)

  // 이미지 최적화 설정
  imageQuality: number; // 70% (기본값)

  // 애니메이션 설정
  disableAnimations: boolean; // false (기본값)

  // 백그라운드 폴링 설정
  disableBackgroundPolling: boolean; // true (기본값)

  // 캐시 최적화 설정
  cacheStaleTimeMultiplier: number; // 0.5 (기본값) - staleTime을 폴링 간격의 50%로 설정
  cacheGcTimeMultiplier: number; // 2.0 (기본값) - gcTime을 폴링 간격의 2배로 설정
  enableAggressiveCaching: boolean; // false (기본값) - 공격적인 캐싱 활성화
  cacheMaxAge: number; // 24시간 (기본값) - 캐시 최대 보관 시간
}

const DEFAULT_SETTINGS: BatteryOptimizationSettings = {
  lmeCrawlingInterval: 60 * 60 * 1000, // 1시간
  lmePriceInterval: 4 * 60 * 60 * 1000, // 4시간
  auctionRefreshInterval: 10 * 60 * 1000, // 10분
  notificationRefreshInterval: 10 * 60 * 1000, // 10분
  imageQuality: 70, // 70%
  disableAnimations: false, // 애니메이션 활성화
  disableBackgroundPolling: true, // 백그라운드 폴링 비활성화
  cacheStaleTimeMultiplier: 0.5, // staleTime을 폴링 간격의 50%로 설정
  cacheGcTimeMultiplier: 2.0, // gcTime을 폴링 간격의 2배로 설정
  enableAggressiveCaching: false, // 공격적인 캐싱 비활성화
  cacheMaxAge: 24 * 60 * 60 * 1000, // 24시간
};

const STORAGE_KEY = "battery_optimization_settings";

export function useBatteryOptimization() {
  const [settings, setSettings] =
    useState<BatteryOptimizationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // 설정 로드
  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.warn("배터리 최적화 설정 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 설정 저장
  const saveSettings = async (
    newSettings: Partial<BatteryOptimizationSettings>
  ) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error("배터리 최적화 설정 저장 실패:", error);
      return false;
    }
  };

  // 설정 초기화
  const resetSettings = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSettings(DEFAULT_SETTINGS);
      return true;
    } catch (error) {
      console.error("배터리 최적화 설정 초기화 실패:", error);
      return false;
    }
  };

  // 배터리 절약 모드 토글
  const toggleBatterySaverMode = async () => {
    const batterySaverSettings: Partial<BatteryOptimizationSettings> = {
      lmeCrawlingInterval: 2 * 60 * 60 * 1000, // 2시간
      lmePriceInterval: 6 * 60 * 60 * 1000, // 6시간
      auctionRefreshInterval: 20 * 60 * 1000, // 20분
      notificationRefreshInterval: 20 * 60 * 1000, // 20분
      imageQuality: 60, // 60%
      disableAnimations: true, // 애니메이션 비활성화
      disableBackgroundPolling: true, // 백그라운드 폴링 비활성화
      cacheStaleTimeMultiplier: 0.8, // staleTime을 폴링 간격의 80%로 설정 (더 오래 캐시)
      cacheGcTimeMultiplier: 3.0, // gcTime을 폴링 간격의 3배로 설정 (더 오래 보관)
      enableAggressiveCaching: true, // 공격적인 캐싱 활성화
      cacheMaxAge: 48 * 60 * 60 * 1000, // 48시간
    };

    return await saveSettings(batterySaverSettings);
  };

  // 성능 모드 토글
  const togglePerformanceMode = async () => {
    const performanceSettings: Partial<BatteryOptimizationSettings> = {
      lmeCrawlingInterval: 30 * 60 * 1000, // 30분
      lmePriceInterval: 2 * 60 * 60 * 1000, // 2시간
      auctionRefreshInterval: 5 * 60 * 1000, // 5분
      notificationRefreshInterval: 5 * 60 * 1000, // 5분
      imageQuality: 85, // 85%
      disableAnimations: false, // 애니메이션 활성화
      disableBackgroundPolling: false, // 백그라운드 폴링 활성화
      cacheStaleTimeMultiplier: 0.3, // staleTime을 폴링 간격의 30%로 설정 (빠른 갱신)
      cacheGcTimeMultiplier: 1.5, // gcTime을 폴링 간격의 1.5배로 설정
      enableAggressiveCaching: false, // 공격적인 캐싱 비활성화
      cacheMaxAge: 12 * 60 * 60 * 1000, // 12시간
    };

    return await saveSettings(performanceSettings);
  };

  // 초기 설정 로드
  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    isLoading,
    saveSettings,
    resetSettings,
    toggleBatterySaverMode,
    togglePerformanceMode,
    loadSettings,
  };
}
