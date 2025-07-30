import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================
// 타입 정의
// ============================================

export interface VerificationSession {
  phoneNumber: string;
  code: string;
  expiresAt: string;
  isVerified: boolean;
  createdAt: string;
}

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
// 인증 세션 관리
// ============================================

const VERIFICATION_SESSION_KEY = "verification_session";
const VERIFICATION_EXPIRY_MINUTES = 5; // 5분

/**
 * 인증 세션 저장
 */
async function saveVerificationSession(
  session: VerificationSession
): Promise<void> {
  await AsyncStorage.setItem(VERIFICATION_SESSION_KEY, JSON.stringify(session));
}

/**
 * 인증 세션 조회
 */
async function getVerificationSession(): Promise<VerificationSession | null> {
  try {
    const sessionData = await AsyncStorage.getItem(VERIFICATION_SESSION_KEY);
    if (!sessionData) return null;

    const session: VerificationSession = JSON.parse(sessionData);

    // 만료 확인
    if (new Date() > new Date(session.expiresAt)) {
      await clearVerificationSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error("인증 세션 조회 실패:", error);
    return null;
  }
}

/**
 * 인증 세션 삭제
 */
async function clearVerificationSession(): Promise<void> {
  await AsyncStorage.removeItem(VERIFICATION_SESSION_KEY);
}

// ============================================
// API 함수들
// ============================================

/**
 * 인증번호 발송 (개발 단계에서는 시뮬레이션)
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

    // 2. 인증번호 생성 (개발 단계에서는 고정값)
    const verificationCode = "123456";
    const expiresAt = new Date(
      Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000
    );

    // 3. 인증 세션 생성
    const session: VerificationSession = {
      phoneNumber: request.phoneNumber,
      code: verificationCode,
      expiresAt: expiresAt.toISOString(),
      isVerified: false,
      createdAt: new Date().toISOString(),
    };

    // 4. 세션 저장
    await saveVerificationSession(session);

    // 5. 실제로는 SMS API 호출
    // await sendSMS(request.phoneNumber, verificationCode);

    console.log(`📱 개발 모드: 인증번호 ${verificationCode} 발송됨`);

    return {
      success: true,
      message: `${request.phoneNumber}로 인증번호가 발송되었습니다.`,
      expiresIn: VERIFICATION_EXPIRY_MINUTES * 60, // 초 단위
    };
  } catch (error) {
    console.error("❌ 인증번호 발송 실패:", error);
    throw error;
  }
}

/**
 * 인증번호 확인
 */
export async function verifyCode(request: VerifyCodeRequest): Promise<{
  success: boolean;
  message: string;
  phoneNumber: string;
}> {
  try {
    console.log("🔐 인증번호 확인 요청:", request.phoneNumber);

    // 1. 입력값 검증
    if (!request.phoneNumber || !request.code) {
      throw new VerificationError("전화번호와 인증번호를 모두 입력해주세요");
    }

    // 2. 저장된 인증 세션 조회
    const session = await getVerificationSession();
    if (!session) {
      throw new VerificationError(
        "인증 세션이 만료되었습니다. 다시 인증번호를 요청해주세요."
      );
    }

    // 3. 전화번호 일치 확인
    if (session.phoneNumber !== request.phoneNumber) {
      throw new VerificationError("인증 요청된 전화번호와 일치하지 않습니다.");
    }

    // 4. 인증번호 확인
    if (session.code !== request.code) {
      throw new VerificationError("인증번호가 올바르지 않습니다.");
    }

    // 5. 인증 성공 처리
    const verifiedSession: VerificationSession = {
      ...session,
      isVerified: true,
    };
    await saveVerificationSession(verifiedSession);

    console.log("✅ 인증번호 확인 성공:", request.phoneNumber);

    return {
      success: true,
      message: "인증이 완료되었습니다.",
      phoneNumber: request.phoneNumber,
    };
  } catch (error) {
    console.error("❌ 인증번호 확인 실패:", error);
    throw error;
  }
}

/**
 * 현재 인증 상태 확인
 */
export async function getVerificationStatus(): Promise<{
  isVerified: boolean;
  phoneNumber?: string;
  expiresAt?: string;
}> {
  try {
    const session = await getVerificationSession();

    if (!session) {
      return { isVerified: false };
    }

    return {
      isVerified: session.isVerified,
      phoneNumber: session.phoneNumber,
      expiresAt: session.expiresAt,
    };
  } catch (error) {
    console.error("인증 상태 확인 실패:", error);
    return { isVerified: false };
  }
}

/**
 * 인증된 전화번호로 회원가입 진행 가능 여부 확인
 */
export async function canProceedWithSignup(): Promise<{
  canProceed: boolean;
  phoneNumber?: string;
  reason?: string;
}> {
  try {
    const session = await getVerificationSession();

    if (!session) {
      return {
        canProceed: false,
        reason: "인증 세션이 없습니다. 먼저 전화번호 인증을 완료해주세요.",
      };
    }

    if (!session.isVerified) {
      return {
        canProceed: false,
        phoneNumber: session.phoneNumber,
        reason: "전화번호 인증이 완료되지 않았습니다.",
      };
    }

    return {
      canProceed: true,
      phoneNumber: session.phoneNumber,
    };
  } catch (error) {
    console.error("회원가입 진행 가능 여부 확인 실패:", error);
    return {
      canProceed: false,
      reason: "인증 상태 확인 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 회원가입 완료 후 인증 세션 정리
 */
export async function clearVerificationAfterSignup(): Promise<void> {
  await clearVerificationSession();
  console.log("✅ 회원가입 완료 후 인증 세션 정리됨");
}
