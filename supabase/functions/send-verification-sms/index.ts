import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 환경 변수 인터페이스
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NC_SMS_ACCESS_KEY: string;
  NC_SMS_SECRET_KEY: string;
  NC_SMS_SERVICE_ID: string;
  NC_SMS_FROM_NUMBER: string;
}

// 요청 인터페이스
interface SendSMSRequest {
  phoneNumber: string;
}

// 네이버 SMS API 응답 인터페이스
interface NaverSMSResponse {
  requestId: string;
  requestTime: string;
  statusCode: string;
  statusName: string;
}

// 에러 클래스
class SMSError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "SMSError";
  }
}

// 환경 변수 가져오기
function getEnv(): Env {
  const env = {
    SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "",
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    NC_SMS_ACCESS_KEY: Deno.env.get("NC_SMS_ACCESS_KEY") || "",
    NC_SMS_SECRET_KEY: Deno.env.get("NC_SMS_SECRET_KEY") || "",
    NC_SMS_SERVICE_ID: Deno.env.get("NC_SMS_SERVICE_ID") || "",
    NC_SMS_FROM_NUMBER: Deno.env.get("NC_SMS_FROM_NUMBER") || "",
  };

  // 필수 환경 변수 검증
  const requiredVars = Object.entries(env).filter(([_, value]) => !value);
  if (requiredVars.length > 0) {
    throw new SMSError(
      `Missing environment variables: ${requiredVars
        .map(([key]) => key)
        .join(", ")}`
    );
  }

  return env;
}

// 6자리 보안 인증번호 생성
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// HMAC-SHA256 시그니처 생성
async function createSignature(
  method: string,
  uri: string,
  timestamp: string,
  accessKey: string,
  secretKey: string
): Promise<string> {
  const message = `${method} ${uri}\n${timestamp}\n${accessKey}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// 네이버 SMS API 호출
async function sendNaverSMS(
  phoneNumber: string,
  verificationCode: string,
  env: Env
): Promise<NaverSMSResponse> {
  const timestamp = Date.now().toString();
  const uri = `/sms/v2/services/${env.NC_SMS_SERVICE_ID}/messages`;
  const apiUrl = "https://sens.apigw.ntruss.com";

  // 시그니처 생성
  const signature = await createSignature(
    "POST",
    uri,
    timestamp,
    env.NC_SMS_ACCESS_KEY,
    env.NC_SMS_SECRET_KEY
  );

  // 메시지 내용
  const messageContent = `[메타캣] 인증번호는 [${verificationCode}]입니다.`;

  // 요청 본문
  const requestBody = {
    type: "SMS",
    contentType: "COMM",
    countryCode: "82",
    from: env.NC_SMS_FROM_NUMBER,
    content: messageContent,
    messages: [
      {
        to: phoneNumber,
        content: messageContent,
      },
    ],
  };

  // API 호출
  const response = await fetch(`${apiUrl}${uri}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": env.NC_SMS_ACCESS_KEY,
      "x-ncp-apigw-signature-v2": signature,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new SMSError(`SMS API 호출 실패: ${response.status} - ${errorData}`);
  }

  return await response.json();
}

// 클라이언트 IP 주소 추출
function getClientIP(request: Request): string | null {
  // Cloudflare, AWS 등의 프록시 헤더 확인
  const headers = [
    "cf-connecting-ip",
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
  ];

  for (const header of headers) {
    const ip = request.headers.get(header);
    if (ip) {
      return ip.split(",")[0].trim();
    }
  }

  return null;
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
    const { phoneNumber }: SendSMSRequest = await req.json();

    // 입력 검증
    if (!phoneNumber || !/^[0-9]{10,11}$/.test(phoneNumber)) {
      throw new SMSError("올바른 전화번호를 입력해주세요 (10-11자리 숫자)");
    }

    // 클라이언트 IP 추출
    const clientIP = getClientIP(req);

    // Rate limiting 검증
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc(
      "check_verification_rate_limit",
      {
        p_phone_number: phoneNumber,
        p_ip_address: clientIP,
      }
    );

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      throw new SMSError("Rate limiting 검증 중 오류가 발생했습니다");
    }

    if (!rateLimitCheck) {
      throw new SMSError("요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요");
    }

    // 만료된 세션 정리
    await supabase.rpc("cleanup_expired_verification_sessions");

    // 기존 활성 세션 확인 및 무효화
    const { error: updateError } = await supabase
      .from("phone_verification_sessions")
      .update({ status: "expired" })
      .eq("phone_number", phoneNumber)
      .eq("status", "pending");

    if (updateError) {
      console.error("Existing session cleanup error:", updateError);
    }

    // 인증번호 생성
    const verificationCode = generateVerificationCode();
    // 한국 시간 기준으로 5분 후 만료
    const now = new Date();
    const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC+9
    const expiresAt = new Date(koreaTime.getTime() + 5 * 60 * 1000);

    console.log("Korea current time:", koreaTime.toISOString());
    console.log("Expires at (Korea):", expiresAt.toISOString());

    // 인증 세션 생성
    const { data: session, error: sessionError } = await supabase
      .from("phone_verification_sessions")
      .insert({
        phone_number: phoneNumber,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIP,
        user_agent: req.headers.get("user-agent") || null,
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("Session creation error:", sessionError);
      throw new SMSError("인증 세션 생성 중 오류가 발생했습니다");
    }

    // 네이버 SMS 발송
    try {
      const smsResult = await sendNaverSMS(phoneNumber, verificationCode, env);

      // SMS 발송 결과 업데이트
      await supabase
        .from("phone_verification_sessions")
        .update({
          naver_request_id: smsResult.requestId,
          sms_sent_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      console.log(
        `✅ SMS 발송 성공: ${phoneNumber}, Request ID: ${smsResult.requestId}`
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: `${phoneNumber}로 인증번호가 발송되었습니다.`,
          expiresIn: 300, // 5분
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (smsError) {
      console.error("SMS 발송 실패:", smsError);

      // SMS 발송 실패 시 오류 정보 저장
      await supabase
        .from("phone_verification_sessions")
        .update({
          sms_error: smsError.message,
          status: "failed",
        })
        .eq("id", session.id);

      throw new SMSError("SMS 발송에 실패했습니다. 잠시 후 다시 시도해주세요");
    }
  } catch (error) {
    console.error("Error in send-verification-sms:", error);

    const message =
      error instanceof SMSError
        ? error.message
        : "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요";

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error instanceof SMSError ? 400 : 500,
      }
    );
  }
});
