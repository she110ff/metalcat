import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 환경 변수 인터페이스
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// 요청 인터페이스
interface VerifyCodeRequest {
  phoneNumber: string;
  code: string;
}

// 사용자 인터페이스
interface User {
  id: string;
  phone_number: string;
  name?: string;
  phone_verification_status: string;
  phone_verified_at: string;
  created_at: string;
  updated_at: string;
}

// 에러 클래스
class VerificationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "VerificationError";
  }
}

// 환경 변수 가져오기
function getEnv(): Env {
  const env = {
    SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "",
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  };

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new VerificationError("Missing required environment variables");
  }

  return env;
}

// 사용자 생성 또는 업데이트
async function createOrUpdateUser(
  supabase: any,
  phoneNumber: string
): Promise<User> {
  // 기존 사용자 확인
  const { data: existingUser, error: findError } = await supabase
    .from("users")
    .select("*")
    .eq("phone_number", phoneNumber)
    .single();

  if (findError && findError.code !== "PGRST116") {
    // PGRST116 = No rows found
    console.error("User lookup error:", findError);
    throw new VerificationError("사용자 조회 중 오류가 발생했습니다");
  }

  const now = new Date().toISOString();

  if (existingUser) {
    // 기존 사용자 업데이트
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        phone_verification_status: "verified",
        phone_verified_at: now,
        phone_verification_attempts: 0,
        last_verification_request: now,
        updated_at: now,
      })
      .eq("id", existingUser.id)
      .select()
      .single();

    if (updateError) {
      console.error("User update error:", updateError);
      throw new VerificationError(
        "사용자 정보 업데이트 중 오류가 발생했습니다"
      );
    }

    return updatedUser;
  } else {
    // 새 사용자 생성
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        phone_number: phoneNumber,
        name: `사용자_${phoneNumber.slice(-4)}`, // 임시 이름
        phone_verification_status: "verified",
        phone_verified_at: now,
        phone_verification_attempts: 0,
        last_verification_request: now,
        is_phone_verified: true,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (createError) {
      console.error("User creation error:", createError);
      throw new VerificationError("사용자 생성 중 오류가 발생했습니다");
    }

    return newUser;
  }
}

// Auth 세션 생성
async function createAuthSession(supabase: any, user: User): Promise<any> {
  // Supabase Auth에 전화번호 기반 사용자 생성/로그인
  const email = `${user.phone_number}@phone.auth`; // 임시 이메일 형식
  const password = `phone_${user.phone_number}_${user.id}`; // 임시 패스워드

  // 기존 auth 사용자 확인
  const { data: existingAuthUser } = await supabase.auth.admin.getUserByEmail(
    email
  );

  if (existingAuthUser.user) {
    // 기존 auth 사용자의 세션 생성
    const { data: sessionData, error: sessionError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
      });

    if (sessionError) {
      console.error("Session generation error:", sessionError);
      throw new VerificationError("인증 세션 생성 중 오류가 발생했습니다");
    }

    return sessionData;
  } else {
    // 새 auth 사용자 생성
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          phone_number: user.phone_number,
          user_id: user.id,
        },
      });

    if (authError) {
      console.error("Auth user creation error:", authError);
      throw new VerificationError("인증 사용자 생성 중 오류가 발생했습니다");
    }

    return authData;
  }
}

// 메인 핸들러
serve(async (req) => {
  // CORS 헤더 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // POST 요청만 허용
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // 환경 변수 로드
    const env = getEnv();

    // Supabase 클라이언트 초기화
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 요청 본문 파싱
    const { phoneNumber, code }: VerifyCodeRequest = await req.json();

    // 입력 검증
    if (!phoneNumber || !/^[0-9]{10,11}$/.test(phoneNumber)) {
      throw new VerificationError("올바른 전화번호를 입력해주세요");
    }

    if (!code || !/^[0-9]{6}$/.test(code)) {
      throw new VerificationError(
        "올바른 인증번호를 입력해주세요 (6자리 숫자)"
      );
    }

    // 만료된 세션 정리
    await supabase.rpc("cleanup_expired_verification_sessions");

    // 현재 시간 로깅 (한국 시간대로 조정)
    const now = new Date();
    const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC+9
    const currentTime = koreaTime.toISOString();
    console.log("Current time (Korea):", currentTime);
    console.log("Current time (UTC):", now.toISOString());

    // 모든 세션 조회 (디버깅용)
    const { data: allSessions } = await supabase
      .from("phone_verification_sessions")
      .select("*")
      .eq("phone_number", phoneNumber)
      .order("created_at", { ascending: false })
      .limit(3);

    console.log("All sessions for phone:", phoneNumber, allSessions);

    // 활성 인증 세션 조회
    const { data: session, error: sessionError } = await supabase
      .from("phone_verification_sessions")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("status", "pending")
      .gt("expires_at", currentTime)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    console.log("Active session query result:", { session, sessionError });

    if (sessionError || !session) {
      // 최신 세션이라도 가져와서 확인
      const { data: latestSession } = await supabase
        .from("phone_verification_sessions")
        .select("*")
        .eq("phone_number", phoneNumber)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      console.log("Latest session:", latestSession);
      console.log("Latest session expires_at vs current time:", {
        expires_at: latestSession?.expires_at,
        current_time: currentTime,
        is_expired: latestSession
          ? new Date(latestSession.expires_at) < new Date(currentTime)
          : "no session",
      });

      throw new VerificationError(
        "유효한 인증 세션이 없습니다. 인증번호를 다시 요청해주세요"
      );
    }

    // 최대 시도 횟수 확인
    if (session.attempts >= session.max_attempts) {
      // 세션 만료 처리
      await supabase
        .from("phone_verification_sessions")
        .update({ status: "failed" })
        .eq("id", session.id);

      throw new VerificationError(
        "최대 시도 횟수를 초과했습니다. 인증번호를 다시 요청해주세요"
      );
    }

    // 인증번호 확인
    if (session.verification_code !== code) {
      // 시도 횟수 증가
      await supabase
        .from("phone_verification_sessions")
        .update({
          attempts: session.attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      const remainingAttempts = session.max_attempts - (session.attempts + 1);
      throw new VerificationError(
        `인증번호가 올바르지 않습니다. ${remainingAttempts}번의 기회가 남았습니다`
      );
    }

    // 인증 성공 처리
    const { error: verificationError } = await supabase
      .from("phone_verification_sessions")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (verificationError) {
      console.error("Verification update error:", verificationError);
      throw new VerificationError("인증 처리 중 오류가 발생했습니다");
    }

    // 사용자 생성 또는 업데이트
    const user = await createOrUpdateUser(supabase, phoneNumber);

    // Auth 세션 생성 (선택적)
    let authSession = null;
    try {
      authSession = await createAuthSession(supabase, user);
    } catch (authError) {
      console.warn("Auth session creation failed:", authError);
      // Auth 세션 생성 실패해도 전화번호 인증은 성공으로 처리
    }

    console.log(`✅ 인증 성공: ${phoneNumber}, User ID: ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "인증이 완료되었습니다",
        user: {
          id: user.id,
          phoneNumber: user.phone_number,
          name: user.name,
          isPhoneVerified: true,
          verifiedAt: user.phone_verified_at,
        },
        session: authSession,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in verify-phone-code:", error);
    console.error("Error details:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
    });

    const message =
      error instanceof VerificationError
        ? error.message
        : "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요";

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        debug: {
          errorType: error?.name || "Unknown",
          errorMessage: error?.message || "No message",
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error instanceof VerificationError ? 400 : 500,
      }
    );
  }
});
