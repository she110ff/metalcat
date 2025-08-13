import { phoneAuthService, PhoneAuthError } from "./phoneAuthService";

// ============================================
// 타입 정의
// ============================================

export interface SendCodeRequest {
  phoneNumber: string;
}

export interface VerifyCodeRequest {
  phoneNumber: string;
  code: string;
}

// ============================================
// 에러 처리
// ============================================

class VerificationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "VerificationError";
  }
}

// ============================================
// API 함수들
// ============================================

/**
 * 인증번호 발송 (네이버 클라우드 SMS 사용)
 */
export async function sendVerificationCode(request: SendCodeRequest): Promise<{
  success: boolean;
  message: string;
  expiresIn: number;
}> {
  try {
    console.log("📱 인증번호 발송 요청:", request.phoneNumber);

    // 1. 전화번호 유효성 검사
    if (!request.phoneNumber || request.phoneNumber.length < 10) {
      throw new VerificationError("올바른 전화번호를 입력해주세요");
    }

    // 2. PhoneAuthService를 통한 실제 SMS 발송
    const result = await phoneAuthService.sendVerificationCode(
      request.phoneNumber
    );

    console.log("✅ SMS 발송 성공");

    return {
      success: result.success,
      message: result.message,
      expiresIn: result.expiresIn,
    };
  } catch (error) {
    console.error("❌ 인증번호 발송 실패:", error);

    if (error instanceof PhoneAuthError) {
      throw new VerificationError(error.message);
    }

    throw new VerificationError("인증번호 발송에 실패했습니다");
  }
}

/**
 * 인증번호 확인
 */
export async function verifyCode(request: VerifyCodeRequest): Promise<{
  success: boolean;
  message: string;
  phoneNumber: string;
  user?: any;
}> {
  try {
    console.log("🔐 인증번호 확인 요청:", request.phoneNumber);

    // 1. 입력값 검증
    if (!request.phoneNumber || !request.code) {
      throw new VerificationError("전화번호와 인증번호를 모두 입력해주세요");
    }

    // 2. PhoneAuthService를 통한 실제 인증번호 검증
    const result = await phoneAuthService.verifyCode(
      request.phoneNumber,
      request.code
    );

    if (!result.success) {
      throw new VerificationError(
        result.message || "인증번호가 올바르지 않습니다"
      );
    }

    console.log("✅ 인증번호 확인 성공:", request.phoneNumber);

    return {
      success: true,
      message: result.message,
      phoneNumber: request.phoneNumber,
      user: result.user,
    };
  } catch (error) {
    console.error("❌ 인증번호 확인 실패:", error);

    if (error instanceof PhoneAuthError) {
      throw new VerificationError(error.message);
    }

    throw new VerificationError("인증번호 확인에 실패했습니다");
  }
}

/**
 * 현재 인증 상태 확인 (서버에서 조회)
 */
export async function getVerificationStatus(phoneNumber: string): Promise<{
  hasActiveSession: boolean;
  expiresAt?: string;
  attemptsRemaining?: number;
}> {
  try {
    return await phoneAuthService.getVerificationStatus(phoneNumber);
  } catch (error) {
    console.error("인증 상태 확인 실패:", error);
    return { hasActiveSession: false };
  }
}
