import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/hooks/auth/api";

export interface TokenInfo {
  token: string;
  deviceType: string;
  createdAt: string;
  lastValidated?: string;
}

export interface TokenRepository {
  getCachedToken(): Promise<TokenInfo | null>;
  setCachedToken(tokenInfo: TokenInfo): Promise<void>;
  clearCachedToken(): Promise<void>;
  getServerToken(userId: string): Promise<TokenInfo | null>;
  saveToServer(userId: string, tokenInfo: TokenInfo): Promise<void>;
  validateTokenWithServer(userId: string, token: string): Promise<boolean>;
}

class TokenRepositoryImpl implements TokenRepository {
  private readonly CACHE_KEY = "expo_push_token_cache";

  async getCachedToken(): Promise<TokenInfo | null> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const tokenInfo: TokenInfo = JSON.parse(cached);

      // 캐시된 토큰이 7일 이상 되었으면 무효화
      const createdAt = new Date(tokenInfo.createdAt);
      const now = new Date();
      const daysDiff =
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 7) {
        console.log("📅 캐시된 토큰이 만료됨 (7일 초과)");
        await this.clearCachedToken();
        return null;
      }

      return tokenInfo;
    } catch (error) {
      console.error("❌ 캐시된 토큰 조회 실패:", error);
      return null;
    }
  }

  async setCachedToken(tokenInfo: TokenInfo): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(tokenInfo));
      console.log("✅ 토큰 캐시 저장 완료");
    } catch (error) {
      console.error("❌ 토큰 캐시 저장 실패:", error);
    }
  }

  async clearCachedToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
      console.log("🗑️ 토큰 캐시 삭제 완료");
    } catch (error) {
      console.error("❌ 토큰 캐시 삭제 실패:", error);
    }
  }

  async getServerToken(userId: string): Promise<TokenInfo | null> {
    try {
      console.log("🔍 서버에서 Push Token 조회:", {
        userId,
        deviceType: Platform.OS,
      });

      // 사용자 존재 여부 먼저 확인
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        console.error("❌ 사용자 확인 실패:", userError);
        return null;
      }

      const { data, error } = await supabase
        .from("user_push_tokens")
        .select("token, device_type, created_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("device_type", Platform.OS)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.log("📤 서버에 저장된 토큰 없음");
        return null;
      }

      console.log("✅ 서버 토큰 조회 성공");
      return {
        token: data.token,
        deviceType: data.device_type,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error("❌ 서버 토큰 조회 실패:", error);
      return null;
    }
  }

  async saveToServer(userId: string, tokenInfo: TokenInfo): Promise<void> {
    try {
      console.log("📤 Push Token 서버 저장 시작:", {
        userId,
        deviceType: tokenInfo.deviceType,
      });

      // 사용자 존재 여부 확인 (custom 인증 시스템용)
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        console.error("❌ 사용자 확인 실패:", userError);
        throw new Error("유효하지 않은 사용자입니다.");
      }

      console.log("✅ 사용자 확인 완료:", user.id);

      // 기존 토큰들을 비활성화
      const { error: updateError } = await supabase
        .from("user_push_tokens")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("device_type", Platform.OS);

      if (updateError) {
        console.warn("⚠️ 기존 토큰 비활성화 실패 (무시):", updateError);
        // 기존 토큰 업데이트 실패는 무시하고 계속 진행
      }

      // 새 토큰 저장
      const { error: insertError } = await supabase
        .from("user_push_tokens")
        .insert({
          user_id: userId,
          token: tokenInfo.token,
          device_type: tokenInfo.deviceType,
          is_active: true,
        });

      if (insertError) {
        console.error("❌ 새 토큰 저장 실패:", insertError);
        throw insertError;
      }

      console.log("✅ Push Token 서버 저장 완료");
    } catch (error) {
      console.error("❌ 서버 토큰 저장 실패:", error);
      throw error;
    }
  }

  async validateTokenWithServer(
    userId: string,
    token: string
  ): Promise<boolean> {
    try {
      console.log("🔍 서버에서 토큰 유효성 검증:", { userId });

      // 사용자 존재 여부 먼저 확인
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        console.error("❌ 사용자 확인 실패:", userError);
        return false;
      }

      const { data } = await supabase
        .from("user_push_tokens")
        .select("id")
        .eq("user_id", userId)
        .eq("token", token)
        .eq("is_active", true)
        .single();

      const isValid = !!data;
      console.log(
        isValid ? "✅ 토큰 유효성 검증 성공" : "❌ 토큰 유효하지 않음"
      );
      return isValid;
    } catch (error) {
      console.error("❌ 토큰 유효성 검증 실패:", error);
      return false;
    }
  }
}

export const tokenRepository = new TokenRepositoryImpl();
