import { createClient } from "@supabase/supabase-js";

// 인터페이스 정의
export interface SendCodeResponse {
  success: boolean;
  message: string;
  expiresIn: number;
}

export interface VerifyCodeResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    phoneNumber: string;
    name?: string;
    isPhoneVerified: boolean;
    verifiedAt: string;
  };
  session?: any;
}

export interface AuthUser {
  id: string;
  phoneNumber: string;
  name?: string;
  isPhoneVerified: boolean;
  verifiedAt?: string;
}

// 에러 클래스
export class PhoneAuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "PhoneAuthError";
  }
}

/**
 * 전화번호 인증 서비스 클래스
 * 네이버 클라우드 SMS API와 Supabase Edge Functions을 활용한 전화번호 인증
 */
export class PhoneAuthService {
  private static instance: PhoneAuthService;
  private supabaseClient: any;

  private constructor() {
    // AsyncStorage를 사용하지 않는 별도의 supabase 클라이언트 생성
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54331";
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
    
    this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // AsyncStorage 사용 안함
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): PhoneAuthService {
    if (!PhoneAuthService.instance) {
      PhoneAuthService.instance = new PhoneAuthService();
    }
    return PhoneAuthService.instance;
  }

  /**
   * 전화번호 형식 검증
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    // 한국 전화번호 형식: 10-11자리 숫자
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * 인증번호 형식 검증
   */
  private validateVerificationCode(code: string): boolean {
    // 6자리 숫자
    const codeRegex = /^[0-9]{6}$/;
    return codeRegex.test(code);
  }

  /**
   * 전화번호 정규화 (하이픈, 공백 제거)
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[\s-]/g, "");
  }

  /**
   * Edge Function 호출 시 에러 처리
   */
  private handleEdgeFunctionError(error: any): never {
    console.error("Edge Function 호출 오류:", error);

    if (error.message) {
      throw new PhoneAuthError(error.message);
    }

    throw new PhoneAuthError(
      "서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요"
    );
  }

  /**
   * 인증번호 발송
   * @param phoneNumber 전화번호 (10-11자리)
   * @returns 발송 결과
   */
  async sendVerificationCode(phoneNumber: string): Promise<SendCodeResponse> {
    try {
      // 전화번호 정규화 및 검증
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      if (!this.validatePhoneNumber(normalizedPhone)) {
        throw new PhoneAuthError(
          "올바른 전화번호를 입력해주세요 (10-11자리 숫자)"
        );
      }

      console.log("📱 인증번호 발송 요청:", normalizedPhone);

              // Supabase Edge Function 호출
        const { data, error } = await this.supabaseClient.functions.invoke(
          "send-verification-sms",
          {
            body: {
              phoneNumber: normalizedPhone,
            },
          }
        );

      if (error) {
        this.handleEdgeFunctionError(error);
      }

      if (!data.success) {
        throw new PhoneAuthError(data.error || "SMS 발송에 실패했습니다");
      }

      console.log("✅ SMS 발송 성공");

      return {
        success: true,
        message: data.message,
        expiresIn: data.expiresIn || 300, // 기본 5분
      };
    } catch (error) {
      console.error("❌ 인증번호 발송 실패:", error);

      if (error instanceof PhoneAuthError) {
        throw error;
      }

      throw new PhoneAuthError("인증번호 발송 중 오류가 발생했습니다");
    }
  }

  /**
   * 인증번호 검증
   * @param phoneNumber 전화번호
   * @param code 인증번호 (6자리)
   * @returns 검증 결과 및 사용자 정보
   */
  async verifyCode(
    phoneNumber: string,
    code: string
  ): Promise<VerifyCodeResponse> {
    try {
      // 입력값 정규화 및 검증
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const normalizedCode = code.trim();

      if (!this.validatePhoneNumber(normalizedPhone)) {
        throw new PhoneAuthError("올바른 전화번호를 입력해주세요");
      }

      if (!this.validateVerificationCode(normalizedCode)) {
        throw new PhoneAuthError("올바른 인증번호를 입력해주세요 (6자리 숫자)");
      }

      console.log("🔐 인증번호 검증 요청:", normalizedPhone);

              // Supabase Edge Function 호출
        const { data, error } = await this.supabaseClient.functions.invoke(
          "verify-phone-code",
          {
            body: {
              phoneNumber: normalizedPhone,
              code: normalizedCode,
            },
          }
        );

      if (error) {
        this.handleEdgeFunctionError(error);
      }

      if (!data.success) {
        throw new PhoneAuthError(data.error || "인증번호가 올바르지 않습니다");
      }

      console.log("✅ 인증번호 검증 성공:", normalizedPhone);

      return {
        success: true,
        message: data.message,
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      console.error("❌ 인증번호 검증 실패:", error);

      if (error instanceof PhoneAuthError) {
        throw error;
      }

      throw new PhoneAuthError("인증번호 검증 중 오류가 발생했습니다");
    }
  }

  /**
   * 인증번호 재발송
   * @param phoneNumber 전화번호
   * @returns 재발송 결과
   */
  async resendVerificationCode(phoneNumber: string): Promise<SendCodeResponse> {
    // 기본적으로 sendVerificationCode와 동일한 로직
    // 필요시 재발송 특별 로직 추가 가능
    return this.sendVerificationCode(phoneNumber);
  }

  /**
   * 현재 인증 상태 확인
   * @param phoneNumber 전화번호
   * @returns 인증 상태 정보
   */
  async getVerificationStatus(phoneNumber: string): Promise<{
    hasActiveSession: boolean;
    expiresAt?: string;
    attemptsRemaining?: number;
  }> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      if (!this.validatePhoneNumber(normalizedPhone)) {
        throw new PhoneAuthError("올바른 전화번호를 입력해주세요");
      }

              // Supabase에서 활성 세션 조회
        const { data, error } = await this.supabaseClient
          .from("phone_verification_sessions")
          .select("expires_at, attempts, max_attempts")
          .eq("phone_number", normalizedPhone)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = No rows found
        console.error("인증 상태 조회 오류:", error);
        return { hasActiveSession: false };
      }

      if (!data) {
        return { hasActiveSession: false };
      }

      return {
        hasActiveSession: true,
        expiresAt: data.expires_at,
        attemptsRemaining: data.max_attempts - data.attempts,
      };
    } catch (error) {
      console.error("인증 상태 확인 오류:", error);
      return { hasActiveSession: false };
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const phoneAuthService = PhoneAuthService.getInstance();
