import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { tokenRepository, TokenInfo } from "./tokenRepository";

export interface TokenResult {
  success: boolean;
  token?: string;
  error?: string;
  source?: "cache" | "server" | "new";
}

export interface TokenService {
  initializeToken(userId: string): Promise<TokenResult>;
  refreshToken(userId: string): Promise<TokenResult>;
  validateAndSync(userId: string): Promise<TokenResult>;
  forceRegister(userId: string): Promise<TokenResult>;
  simpleCreateToken(): Promise<TokenResult>;
}

class TokenServiceImpl implements TokenService {
  private readonly PROJECT_ID = "19829544-dd83-47d5-8c48-ffcdc913c8b1";

  async initializeToken(userId: string): Promise<TokenResult> {
    try {
      // 1. 캐시된 토큰 확인
      const cachedToken = await tokenRepository.getCachedToken();
      if (cachedToken) {
        // 캐시된 토큰이 서버에서도 유효한지 확인
        const isValid = await tokenRepository.validateTokenWithServer(
          userId,
          cachedToken.token
        );
        if (isValid) {
          return {
            success: true,
            token: cachedToken.token,
            source: "cache",
          };
        }
      }

      // 2. 서버에서 기존 토큰 조회
      const serverToken = await tokenRepository.getServerToken(userId);
      if (serverToken) {
        // 서버 토큰을 캐시에 저장
        await tokenRepository.setCachedToken({
          ...serverToken,
          lastValidated: new Date().toISOString(),
        });

        return {
          success: true,
          token: serverToken.token,
          source: "server",
        };
      }

      // 3. 새 토큰 생성
      return await this.createNewToken(userId);
    } catch (error) {
      console.error("토큰 초기화 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }

  async refreshToken(userId: string): Promise<TokenResult> {
    try {
      // 캐시 클리어
      await tokenRepository.clearCache();

      // 새 토큰 생성
      return await this.createNewToken(userId);
    } catch (error) {
      console.error("토큰 새로고침 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }

  async validateAndSync(userId: string): Promise<TokenResult> {
    try {
      const cachedToken = await tokenRepository.getCachedToken();
      if (!cachedToken) {
        return await this.initializeToken(userId);
      }

      // 서버와 동기화 확인
      const isValid = await tokenRepository.validateTokenWithServer(
        userId,
        cachedToken.token
      );
      if (isValid) {
        return {
          success: true,
          token: cachedToken.token,
          source: "cache",
        };
      }

      // 서버에 없으면 새로 등록
      return await this.createNewToken(userId);
    } catch (error) {
      console.error("토큰 동기화 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }

  async forceRegister(userId: string): Promise<TokenResult> {
    try {
      // 모든 캐시 클리어
      await tokenRepository.clearCache();

      // 강제로 새 토큰 생성 및 등록
      return await this.createNewToken(userId);
    } catch (error) {
      console.error("토큰 강제 등록 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }

  private async createNewToken(userId: string): Promise<TokenResult> {
    // 디바이스 및 권한 확인
    if (!Device.isDevice) {
      return {
        success: false,
        error: "실제 디바이스에서만 푸시 알림을 사용할 수 있습니다.",
      };
    }

    // 권한 요청
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      return {
        success: false,
        error: "알림 권한이 필요합니다. 설정에서 권한을 허용해주세요.",
      };
    }

    try {
      // Expo 푸시 토큰 생성
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: this.PROJECT_ID,
      });

      const tokenInfo: TokenInfo = {
        token: tokenResponse.data,
        platform: Platform.OS,
        deviceId: Device.osInternalBuildId || null,
        createdAt: new Date().toISOString(),
      };

      // 서버에 저장
      await tokenRepository.saveToServer(userId, tokenInfo);

      // 캐시에 저장
      await tokenRepository.setCachedToken(tokenInfo);

      return {
        success: true,
        token: tokenInfo.token,
        source: "new",
      };
    } catch (error) {
      console.error("새 토큰 생성 실패:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "토큰 생성에 실패했습니다.",
      };
    }
  }

  // 단순 토큰 생성 (시세 화면과 동일한 방식)
  async simpleCreateToken(): Promise<TokenResult> {
    // 디바이스 및 권한 확인
    if (!Device.isDevice) {
      return {
        success: false,
        error: "실제 디바이스에서만 푸시 알림을 사용할 수 있습니다.",
      };
    }

    // 권한 요청
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      return {
        success: false,
        error: "알림 권한이 필요합니다. 설정에서 권한을 허용해주세요.",
      };
    }

    try {
      // Expo 푸시 토큰 생성만 (서버 저장 없이)
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: this.PROJECT_ID,
      });

      return {
        success: true,
        token: tokenResponse.data,
        source: "new",
      };
    } catch (error) {
      console.error("단순 토큰 생성 실패:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "토큰 생성에 실패했습니다.",
      };
    }
  }
}

// 싱글톤 인스턴스
export const tokenService: TokenService = new TokenServiceImpl();
