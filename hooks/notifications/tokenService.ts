import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { tokenRepository, TokenInfo } from "./tokenRepository";

export interface TokenResult {
  success: boolean;
  token?: string;
  error?: string;
  source?: "cached" | "server" | "new" | "existing" | "updated";
}

export interface TokenService {
  getToken(userId: string): Promise<TokenResult>;
  refreshToken(userId: string): Promise<TokenResult>;
  upsertToken(userId: string, tokenInfo: TokenInfo): Promise<TokenResult>;
  simpleCreateToken(): Promise<TokenResult>;
}

class TokenServiceImpl implements TokenService {
  private readonly PROJECT_ID = "19829544-dd83-47d5-8c48-ffcdc913c8b1";

  async getToken(userId: string): Promise<TokenResult> {
    try {
      console.log("🔍 Push Token 조회 시작:", { userId });

      // 1. 캐시에서 토큰 확인
      const cachedToken = await tokenRepository.getCachedToken();
      if (cachedToken) {
        console.log("✅ 캐시에서 토큰 발견");

        // 캐시된 토큰이 서버에서 유효한지 확인
        const isValid = await tokenRepository.validateTokenWithServer(
          userId,
          cachedToken.token
        );

        if (isValid) {
          return {
            success: true,
            token: cachedToken.token,
            source: "cached",
          };
        } else {
          console.log("⚠️ 캐시된 토큰이 서버에서 유효하지 않음");
          await tokenRepository.clearCachedToken();
        }
      }

      // 2. 서버에서 토큰 확인
      const serverToken = await tokenRepository.getServerToken(userId);
      if (serverToken) {
        console.log("✅ 서버에서 토큰 발견");

        // 서버 토큰을 캐시에 저장
        await tokenRepository.setCachedToken(serverToken);

        return {
          success: true,
          token: serverToken.token,
          source: "server",
        };
      }

      // 3. 새 토큰 생성
      console.log("🆕 새 토큰 생성 필요");
      return await this.createNewToken(userId);
    } catch (error) {
      console.error("❌ 토큰 조회 실패:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "토큰 조회에 실패했습니다.",
      };
    }
  }

  async refreshToken(userId: string): Promise<TokenResult> {
    try {
      console.log("🔄 토큰 새로고침 시작:", { userId });

      // 기존 토큰 확인
      const currentToken = await this.getToken(userId);

      // 토큰이 있으면 UPSERT, 없으면 새로 생성
      if (currentToken.success && currentToken.token) {
        return await this.upsertToken(userId, {
          token: currentToken.token,
          deviceType: Platform.OS,
          createdAt: new Date().toISOString(),
        });
      } else {
        return await this.createNewToken(userId);
      }
    } catch (error) {
      console.error("❌ 토큰 새로고침 실패:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "토큰 새로고침에 실패했습니다.",
      };
    }
  }

  async upsertToken(
    userId: string,
    tokenInfo: TokenInfo
  ): Promise<TokenResult> {
    try {
      console.log("🔄 토큰 UPSERT 시작:", { userId });

      // 권한 확인 (재요청 없이)
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        return {
          success: false,
          error: "알림 권한이 필요합니다. 설정에서 권한을 허용해주세요.",
        };
      }

      // 기존 토큰 확인
      const existingToken = await tokenRepository.getServerToken(userId);

      // 토큰이 동일하면 업데이트만
      if (existingToken && existingToken.token === tokenInfo.token) {
        await tokenRepository.updateTokenActivity(userId, tokenInfo.token);
        return {
          success: true,
          token: tokenInfo.token,
          source: "existing",
        };
      }

      // UPSERT로 토큰 저장
      await tokenRepository.upsertToken(userId, tokenInfo);

      // 캐시에 저장
      await tokenRepository.setCachedToken(tokenInfo);

      return {
        success: true,
        token: tokenInfo.token,
        source: "updated",
      };
    } catch (error) {
      console.error("토큰 UPSERT 실패:", error);

      // UPSERT 실패 시 기존 토큰 유지
      try {
        const existingToken = await tokenRepository.getServerToken(userId);
        if (existingToken) {
          return {
            success: true,
            token: existingToken.token,
            source: "existing",
          };
        }
      } catch (fallbackError) {
        console.error("기존 토큰 복구 실패:", fallbackError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "토큰 저장 실패",
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
        deviceType: Platform.OS,
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

export const tokenService = new TokenServiceImpl();
