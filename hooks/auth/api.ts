import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  canProceedWithSignup,
  clearVerificationAfterSignup,
} from "./verification";

// 전용 Supabase 클라이언트 (auth용) - fallback 로직 포함
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "http://127.0.0.1:54331";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================
// 타입 정의
// ============================================

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  address: string;
  addressDetail?: string;
  avatarUrl?: string;
  isPhoneVerified: boolean;
  // 사업자 정보
  isBusiness: boolean;
  companyName?: string;
  businessNumber?: string;
  businessType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignupRequest {
  name: string;
  address: string;
  addressDetail?: string;
  // phoneNumber는 인증된 번호를 자동으로 사용하므로 제거
  // verificationCode도 이미 인증 완료되었으므로 제거
}

export interface LoginRequest {
  phoneNumber: string;
  verificationCode: string;
}

export interface AuthResponse {
  user: User;
  session: any;
}

// ============================================
// 에러 처리
// ============================================

class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "AuthError";
  }
}

function handleAuthError(error: any, operation: string): never {
  // 개발자용 로그는 간소화
  console.log(`[${operation}] 처리 중 오류 발생`);
  // 상세 에러는 디버그 모드에서만
  if (__DEV__) {
    console.error(`[${operation}] 상세 오류:`, error);
  }

  if (error.message?.includes("duplicate key")) {
    throw new AuthError("이미 가입된 전화번호입니다.");
  }

  if (error.message?.includes("verification")) {
    throw new AuthError("인증코드가 올바르지 않습니다.");
  }

  if (error.message?.includes("row-level security")) {
    throw new AuthError(
      "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
    );
  }

  if (error.code === "42501") {
    throw new AuthError(
      "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
    );
  }

  // 네트워크 관련 에러
  if (error.message?.includes("network") || error.message?.includes("fetch")) {
    throw new AuthError("네트워크 연결을 확인하고 다시 시도해주세요.");
  }

  // 일반적인 사용자 친화적 메시지
  throw new AuthError(
    "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
  );
}

// ============================================
// API 함수들
// ============================================

/**
 * 회원가입 (인증된 전화번호 기반)
 * 이 함수는 전화번호 인증이 완료된 상태에서만 호출되어야 함
 */
export async function signupWithPhone(
  request: SignupRequest
): Promise<AuthResponse> {
  try {
    console.log("📱 인증된 전화번호로 회원가입 시작");

    // 1. 인증된 전화번호 확인
    const { canProceed, phoneNumber, reason } = await canProceedWithSignup();

    if (!canProceed) {
      throw new AuthError(reason || "전화번호 인증이 필요합니다.");
    }

    console.log("📱 인증된 전화번호:", phoneNumber);

    // 2. 입력 검증
    if (!request.name || request.name.trim().length < 2) {
      throw new AuthError("올바른 이름을 입력해주세요 (최소 2글자)");
    }

    if (!request.address || request.address.trim().length < 5) {
      throw new AuthError("올바른 주소를 입력해주세요");
    }

    // 3. 전화번호 중복 확인 (인증된 번호로)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phoneNumber)
      .single();

    if (existingUser) {
      throw new AuthError("이미 가입된 전화번호입니다.");
    }

    // 4. 사용자 생성
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        phone_number: phoneNumber, // 인증된 전화번호 사용
        name: request.name.trim(),
        address: request.address.trim(),
        address_detail: request.addressDetail?.trim() || null,
        is_phone_verified: true, // 인증 완료됨
      })
      .select()
      .single();

    if (insertError) {
      // 개발자용 상세 로그 (콘솔에만)
      console.error("❌ 회원가입 DB 삽입 실패:", insertError);
      // 사용자에게는 친화적인 메시지만 전달
      handleAuthError(insertError, "회원가입");
    }

    // 5. 세션 생성 (임시 - 나중에 실제 Supabase Auth로 교체)
    const session = {
      access_token: `temp_token_${newUser.id}`,
      user: {
        id: newUser.id,
        phone: newUser.phone_number,
      },
    };

    // 6. 로컬 저장
    await AsyncStorage.setItem("supabase.auth.token", session.access_token);
    await AsyncStorage.setItem("auth.user", JSON.stringify(newUser));

    // 7. 인증 세션 정리
    await clearVerificationAfterSignup();

    const user: User = {
      id: newUser.id,
      phoneNumber: newUser.phone_number,
      name: newUser.name,
      address: newUser.address,
      addressDetail: newUser.address_detail,
      avatarUrl: newUser.avatar_url,
      isPhoneVerified: newUser.is_phone_verified,
      isBusiness: newUser.is_business || false,
      companyName: newUser.company_name,
      businessNumber: newUser.business_number,
      businessType: newUser.business_type,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
    };

    console.log("✅ 회원가입 성공:", user);
    return { user, session };
  } catch (error) {
    // 개발자용 로그만 출력, 사용자에게는 이미 친화적 메시지가 전달됨
    if (error instanceof AuthError) {
      console.log("🔄 회원가입 처리 중 사용자 알림:", error.message);
    } else {
      console.error("❌ 예상치 못한 회원가입 오류:", error);
    }
    throw error;
  }
}

/**
 * 로그인 (전화번호 기반)
 */
export async function signinWithPhone(
  request: LoginRequest
): Promise<AuthResponse> {
  try {
    console.log("📱 전화번호 로그인 시작:", request.phoneNumber);

    // 1. 입력 검증
    if (!request.phoneNumber || request.phoneNumber.length < 10) {
      throw new AuthError("올바른 전화번호를 입력해주세요");
    }

    // 2. 임시 인증코드 확인 (개발 단계)
    if (request.verificationCode !== "123456") {
      throw new AuthError("인증코드가 올바르지 않습니다");
    }

    // 3. 사용자 조회
    const { data: user, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("phone_number", request.phoneNumber)
      .single();

    if (selectError || !user) {
      throw new AuthError(
        "등록되지 않은 전화번호입니다. 먼저 회원가입을 해주세요."
      );
    }

    // 4. 세션 생성 (임시)
    const session = {
      access_token: `temp_token_${user.id}`,
      user: {
        id: user.id,
        phone: user.phone_number,
      },
    };

    // 5. 로컬 저장
    await AsyncStorage.setItem("supabase.auth.token", session.access_token);
    await AsyncStorage.setItem("auth.user", JSON.stringify(user));

    const authUser: User = {
      id: user.id,
      phoneNumber: user.phone_number,
      name: user.name,
      address: user.address,
      addressDetail: user.address_detail,
      avatarUrl: user.avatar_url,
      isPhoneVerified: user.is_phone_verified,
      isBusiness: user.is_business || false,
      companyName: user.company_name,
      businessNumber: user.business_number,
      businessType: user.business_type,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    console.log("✅ 로그인 성공:", authUser);
    return { user: authUser, session };
  } catch (error) {
    // 개발자용 로그만 출력, 사용자에게는 이미 친화적 메시지가 전달됨
    if (error instanceof AuthError) {
      console.log("🔄 로그인 처리 중 사용자 알림:", error.message);
    } else {
      console.error("❌ 예상치 못한 로그인 오류:", error);
    }
    throw error;
  }
}

/**
 * 현재 사용자 정보 조회
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // 1. 새로운 시스템 토큰 확인
    let token = await AsyncStorage.getItem("supabase.auth.token");
    let userData: string | null = null;

    if (token) {
      // 새로운 시스템 사용자 데이터 확인
      userData = await AsyncStorage.getItem("auth.user");
      console.log("🔍 새로운 시스템 키에서 데이터 확인:", !!userData);
    } else {
      // 기존 시스템 키로 fallback 확인
      token = await AsyncStorage.getItem("authToken");
      if (token) {
        userData = await AsyncStorage.getItem("userData");
        console.log(
          "🔄 기존 시스템 키에서 사용자 데이터 발견, 마이그레이션 진행"
        );

        // 기존 키에서 새로운 키로 마이그레이션
        if (userData) {
          await AsyncStorage.setItem("supabase.auth.token", token);
          await AsyncStorage.setItem("auth.user", userData);
          // 기존 키는 정리하지 않음 (다른 곳에서 아직 사용할 수 있음)
          console.log("✅ 데이터 마이그레이션 완료");
        }
      }
    }

    if (!token || !userData) {
      console.log("📤 사용자 토큰 또는 데이터 없음");
      return null;
    }

    const user = JSON.parse(userData);

    // 3. 서버에서 최신 정보 조회 (선택적)
    const { data: latestUser, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !latestUser) {
      // 서버에서 조회 실패 시 로컬 데이터 반환
      console.warn("서버 사용자 정보 조회 실패, 로컬 데이터 사용:", error);
      return {
        id: user.id,
        phoneNumber: user.phone_number,
        name: user.name,
        address: user.address,
        addressDetail: user.address_detail,
        avatarUrl: user.avatar_url,
        isPhoneVerified: user.is_phone_verified,
        isBusiness: user.is_business || false,
        companyName: user.company_name,
        businessNumber: user.business_number,
        businessType: user.business_type,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    }

    // 4. 최신 정보로 로컬 업데이트
    await AsyncStorage.setItem("auth.user", JSON.stringify(latestUser));

    return {
      id: latestUser.id,
      phoneNumber: latestUser.phone_number,
      name: latestUser.name,
      address: latestUser.address,
      addressDetail: latestUser.address_detail,
      avatarUrl: latestUser.avatar_url,
      isPhoneVerified: latestUser.is_phone_verified,
      isBusiness: latestUser.is_business || false,
      companyName: latestUser.company_name,
      businessNumber: latestUser.business_number,
      businessType: latestUser.business_type,
      createdAt: latestUser.created_at,
      updatedAt: latestUser.updated_at,
    };
  } catch (error) {
    console.error("현재 사용자 조회 실패:", error);
    return null;
  }
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<void> {
  try {
    console.log("🚪 로그아웃 시작");

    // 1. 로컬 데이터 삭제
    await AsyncStorage.multiRemove([
      "supabase.auth.token",
      "auth.user",
      "authToken", // 기존 임시 토큰도 삭제
      "userData", // 기존 임시 데이터도 삭제
    ]);

    // 2. Supabase 세션 종료 (나중에 실제 Auth 사용 시)
    // await supabase.auth.signOut();

    console.log("✅ 로그아웃 성공");
  } catch (error) {
    console.error("❌ 로그아웃 실패:", error);
    throw error;
  }
}

/**
 * 사용자 정보 업데이트
 */
export async function updateUser(
  updates: Partial<Omit<User, "id" | "phoneNumber" | "createdAt" | "updatedAt">>
): Promise<User> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new AuthError("로그인이 필요합니다.");
    }

    // 업데이트할 데이터 준비
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.addressDetail !== undefined)
      updateData.address_detail = updates.addressDetail;
    if (updates.avatarUrl !== undefined)
      updateData.avatar_url = updates.avatarUrl;
    if (updates.isBusiness !== undefined)
      updateData.is_business = updates.isBusiness;
    if (updates.companyName !== undefined)
      updateData.company_name = updates.companyName || null; // 빈 문자열은 null로 변환
    if (updates.businessNumber !== undefined)
      updateData.business_number = updates.businessNumber || null; // 빈 문자열은 null로 변환
    if (updates.businessType !== undefined)
      updateData.business_type = updates.businessType || null; // 빈 문자열은 null로 변환

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", currentUser.id)
      .select()
      .single();

    if (error) {
      handleAuthError(error, "사용자 정보 업데이트");
    }

    // 로컬 저장소 업데이트
    await AsyncStorage.setItem("auth.user", JSON.stringify(updatedUser));

    return {
      id: updatedUser.id,
      phoneNumber: updatedUser.phone_number,
      name: updatedUser.name,
      address: updatedUser.address,
      addressDetail: updatedUser.address_detail,
      avatarUrl: updatedUser.avatar_url,
      isPhoneVerified: updatedUser.is_phone_verified,
      isBusiness: updatedUser.is_business || false,
      companyName: updatedUser.company_name,
      businessNumber: updatedUser.business_number,
      businessType: updatedUser.business_type,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
    };
  } catch (error) {
    console.error("사용자 정보 업데이트 실패:", error);
    throw error;
  }
}
