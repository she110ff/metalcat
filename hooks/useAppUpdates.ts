import { useState, useEffect, useCallback } from "react";
import * as Updates from "expo-updates";
import { Platform, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export interface UpdateState {
  // 업데이트 상태
  updateStatus: "idle" | "checking" | "downloading" | "downloaded" | "error";
  downloadProgress: number | null;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;

  // 커스텀 상태
  lastChecked: Date | null;
  error: string | null;
  updateInfo: Updates.UpdateCheckResult | null;
  isAutoCheckEnabled: boolean;
  isDownloading: boolean;
  isDownloaded: boolean;

  // 업데이트 메시지
  updateMessage: string | null;

  // 버전 정보
  currentVersion: string;
  buildNumber: string;
}

const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24시간
const LAST_CHECK_KEY = "lastUpdateCheck";
const AUTO_CHECK_KEY = "autoUpdateCheck";

export function useAppUpdates() {
  // useUpdates() 훅 사용 (문서에 따르면 이 훅은 아직 안정적이지 않을 수 있음)
  // const updates = useUpdates();

  const [state, setState] = useState<UpdateState>({
    updateStatus: "idle",
    downloadProgress: null,
    isUpdateAvailable: false,
    isUpdatePending: false,
    lastChecked: null,
    error: null,
    updateInfo: null,
    isAutoCheckEnabled: true,
    isDownloading: false,
    isDownloaded: false,
    updateMessage: null,
    currentVersion: Constants.expoConfig?.version || "알 수 없음",
    buildNumber: String(
      Constants.expoConfig?.ios?.buildNumber ||
        Constants.expoConfig?.android?.versionCode ||
        "알 수 없음"
    ),
  });

  // 마지막 체크 시간 및 자동 체크 설정 로드
  const loadSettings = useCallback(async () => {
    try {
      const [lastCheck, autoCheck] = await Promise.all([
        AsyncStorage.getItem(LAST_CHECK_KEY),
        AsyncStorage.getItem(AUTO_CHECK_KEY),
      ]);

      setState((prev) => ({
        ...prev,
        lastChecked: lastCheck ? new Date(lastCheck) : null,
        isAutoCheckEnabled: autoCheck !== "false", // 기본값 true
      }));
    } catch (error) {
      console.warn("설정 로드 실패:", error);
    }
  }, []);

  // 마지막 체크 시간 저장
  const saveLastCheckTime = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_CHECK_KEY, now);
      setState((prev) => ({ ...prev, lastChecked: new Date(now) }));
    } catch (error) {
      console.warn("마지막 체크 시간 저장 실패:", error);
    }
  }, []);

  // 자동 체크 설정 저장
  const saveAutoCheckSetting = useCallback(async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(AUTO_CHECK_KEY, enabled.toString());
      setState((prev) => ({ ...prev, isAutoCheckEnabled: enabled }));
    } catch (error) {
      console.warn("자동 체크 설정 저장 실패:", error);
    }
  }, []);

  // 업데이트 체크
  const checkForUpdates = useCallback(
    async (force: boolean = false) => {
      // 개발 환경에서는 스킵
      if (__DEV__) {
        console.log("개발 환경: 업데이트 체크 스킵");
        return;
      }

      // 강제 체크가 아니고 자동 체크가 비활성화되어 있다면 스킵
      if (!force && !state.isAutoCheckEnabled) {
        console.log("자동 체크가 비활성화됨");
        return;
      }

      // 강제 체크가 아니고 마지막 체크 후 24시간이 지나지 않았다면 스킵
      if (!force && state.lastChecked) {
        const timeSinceLastCheck = Date.now() - state.lastChecked.getTime();
        if (timeSinceLastCheck < UPDATE_CHECK_INTERVAL) {
          console.log("업데이트 체크 간격이 지나지 않음");
          return;
        }
      }

      try {
        setState((prev) => ({ ...prev, error: null }));

        console.log("업데이트 체크 시작...");
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          console.log("업데이트 발견:", update);

          // 업데이트 메시지 추출
          let updateMessage = null;
          if (update.manifest) {
            // manifest에서 메시지 추출 시도
            updateMessage =
              (update.manifest as any).message ||
              (update.manifest as any).description ||
              (update.manifest as any).releaseNotes;
          }

          setState((prev) => ({
            ...prev,
            isUpdateAvailable: true,
            updateInfo: update,
            updateMessage: updateMessage,
          }));
        } else {
          console.log("사용 가능한 업데이트 없음");
          setState((prev) => ({
            ...prev,
            isUpdateAvailable: false,
            updateInfo: null,
            updateMessage: null,
          }));
        }

        await saveLastCheckTime();
      } catch (error) {
        console.error("업데이트 체크 실패:", error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "업데이트 체크 실패",
        }));
      }
    },
    [state.lastChecked, state.isAutoCheckEnabled, saveLastCheckTime]
  );

  // 업데이트 다운로드
  const downloadUpdate = useCallback(async () => {
    if (!state.isUpdateAvailable || state.isDownloading) {
      return;
    }

    try {
      setState((prev) => ({
        ...prev,
        isDownloading: true,
        error: null,
        updateMessage: "업데이트를 다운로드하고 있습니다...",
      }));

      console.log("업데이트 다운로드 시작...");

      // 개발 환경에서는 다운로드 시뮬레이션
      if (__DEV__) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("개발 환경: 업데이트 다운로드 시뮬레이션 완료");
      } else {
        await Updates.fetchUpdateAsync();
        console.log("업데이트 다운로드 완료");
      }

      // 다운로드 완료 후 상태 확인
      const isUpdatePending = await Updates.checkForUpdateAsync();
      
      setState((prev) => ({
        ...prev,
        isDownloading: false,
        isDownloaded: true,
        isUpdatePending: isUpdatePending.isAvailable,
        updateMessage: "다운로드 완료! 업데이트를 적용할 수 있습니다.",
      }));

    } catch (error) {
      console.error("업데이트 다운로드 실패:", error);
      setState((prev) => ({
        ...prev,
        isDownloading: false,
        error: error instanceof Error ? error.message : "다운로드 실패",
        updateMessage: null,
      }));
    }
  }, [state.isUpdateAvailable, state.isDownloading]);

  // 업데이트 적용
  const applyUpdate = useCallback(async () => {
    if (!state.isDownloaded && !state.isUpdatePending) {
      console.log("다운로드된 업데이트가 없습니다");
      return;
    }

    try {
      console.log("업데이트 적용 중...");

      // 개발 환경에서는 업데이트 적용 불가 알림
      if (__DEV__) {
        setState((prev) => ({
          ...prev,
          error: "개발 환경에서는 업데이트를 적용할 수 없습니다",
          updateMessage: null,
        }));
        return;
      }

      // 사용자에게 안내 후 약간의 지연을 두어 UI가 업데이트되도록 함
      setState((prev) => ({
        ...prev,
        updateMessage: "앱을 재시작하고 있습니다...",
      }));

      // UI 업데이트를 위한 짧은 지연
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 업데이트 적용 가능 여부 재확인
      const updateInfo = await Updates.checkForUpdateAsync();
      
      if (!updateInfo.isAvailable) {
        console.log("적용할 업데이트가 없습니다. 앱을 재시작합니다.");
      }

      // 앱 재시작 - 타임아웃 추가
      const reloadPromise = Updates.reloadAsync();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("재시작 타임아웃")), 5000)
      );

      await Promise.race([reloadPromise, timeoutPromise]);
      
    } catch (error) {
      console.error("업데이트 적용 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "업데이트 적용 실패";
      
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        updateMessage: null,
        isDownloaded: false, // 실패 시 다운로드 상태 초기화
      }));
    }
  }, [state.isDownloaded, state.isUpdatePending]);

  // 업데이트 상태 초기화
  const resetUpdateState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isUpdateAvailable: false,
      isDownloading: false,
      isDownloaded: false,
      error: null,
      updateInfo: null,
      updateMessage: null,
    }));
  }, []);

  // 강제 업데이트 체크 (24시간 제한 무시)
  const forceCheckForUpdates = useCallback(async () => {
    console.log("강제 업데이트 체크 시작...");
    await checkForUpdates(true);
  }, [checkForUpdates]);

  // useUpdates() 훅의 상태를 동기화 (현재는 주석 처리)
  // useEffect(() => {
  //   setState(prev => ({
  //     ...prev,
  //     updateStatus,
  //     downloadProgress,
  //     isUpdateAvailable: isUpdateAvailable || prev.isUpdateAvailable,
  //     isUpdatePending,
  //   }));
  // }, [updateStatus, downloadProgress, isUpdateAvailable, isUpdatePending]);

  // 앱 상태 변경 감지 - 배터리 최적화를 위해 비활성화
  // useEffect(() => {
  //   const handleAppStateChange = (nextAppState: string) => {
  //     if (nextAppState === "active" && state.isAutoCheckEnabled) {
  //       // 앱이 포그라운드로 돌아올 때 체크
  //       checkForUpdates();
  //     }
  //   };

  //   const subscription = AppState.addEventListener(
  //     "change",
  //     handleAppStateChange
  //   );
  //   return () => subscription?.remove();
  // }, [checkForUpdates, state.isAutoCheckEnabled]);

  // 초기 설정 로드 및 체크
  useEffect(() => {
    loadSettings().then(() => {
      if (state.isAutoCheckEnabled) {
        checkForUpdates();
      }
    });
  }, [loadSettings, checkForUpdates, state.isAutoCheckEnabled]);

  return {
    ...state,
    checkForUpdates,
    forceCheckForUpdates,
    downloadUpdate,
    applyUpdate,
    resetUpdateState,
    saveAutoCheckSetting,
    reload: Updates.reloadAsync,
  };
}
