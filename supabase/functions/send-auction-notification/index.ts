import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Expo, ExpoPushMessage } from "npm:expo-server-sdk@3.15.0";

console.log("send-auction-notification 함수가 시작되었습니다.");

Deno.serve(async (req: Request) => {
  try {
    // CORS 헤더 설정
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    // OPTIONS 요청 처리
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // POST 요청만 처리
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 요청 본문 파싱
    const { tokens, title, body, data } = await req.json();

    console.log(`알림 전송 요청: ${title} - 토큰 수: ${tokens?.length}`);

    // 입력값 검증
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.error("유효하지 않은 토큰 배열:", tokens);
      return new Response(
        JSON.stringify({ error: "tokens는 비어있지 않은 배열이어야 합니다." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!title || !body) {
      console.error("title 또는 body가 비어있음:", { title, body });
      return new Response(
        JSON.stringify({ error: "title과 body는 필수입니다." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Expo Access Token 가져오기
    const accessToken = Deno.env.get("EXPO_PUBLIC_EXPO_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("EXPO_PUBLIC_EXPO_ACCESS_TOKEN이 설정되지 않았습니다.");
      return new Response(
        JSON.stringify({ error: "Expo access token이 설정되지 않았습니다." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Expo SDK 클라이언트 생성
    const expo = new Expo({
      accessToken,
      useFcmV1: true, // FCMv1 사용 (권장)
    });

    // 유효한 토큰만 필터링
    const validTokens = tokens.filter((token: string) => {
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`유효하지 않은 Expo 푸시 토큰: ${token}`);
        return false;
      }
      return true;
    });

    if (validTokens.length === 0) {
      console.warn("유효한 Expo 푸시 토큰이 없습니다.");
      return new Response(
        JSON.stringify({
          error: "유효한 Expo 푸시 토큰이 없습니다.",
          invalidTokens: tokens.length,
          validTokens: 0,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`유효한 토큰 수: ${validTokens.length}/${tokens.length}`);

    // 푸시 메시지 생성
    const messages: ExpoPushMessage[] = validTokens.map((token: string) => ({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: data || {},
      // 한국어 알림을 위한 설정
      channelId: "auction-notifications",
      priority: "high",
    }));

    // 메시지를 청크로 분할 (Expo 권장사항)
    const chunks = expo.chunkPushNotifications(messages);
    const allTickets: any[] = [];
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log(`${chunks.length}개의 청크로 분할하여 전송 시작`);

    // 각 청크를 순차적으로 전송
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        console.log(
          `청크 ${i + 1}/${chunks.length} 전송 중... (메시지 ${chunk.length}개)`
        );

        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        allTickets.push(...ticketChunk);

        // 각 티켓 처리
        for (const ticket of ticketChunk) {
          if (ticket.status === "ok") {
            results.sent++;
            console.log(`성공: ${ticket.id}`);
          } else {
            results.failed++;
            const errorMsg = `실패: ${ticket.message || "Unknown error"}`;
            results.errors.push(errorMsg);
            console.error(errorMsg, ticket.details);
          }
        }
      } catch (error) {
        results.failed += chunk.length;
        const errorMsg = `청크 ${i + 1} 전송 실패: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    console.log(
      `알림 전송 완료: 성공 ${results.sent}개, 실패 ${results.failed}개`
    );

    // 성공 응답
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `${results.sent}개의 알림이 성공적으로 전송되었습니다.`,
        tickets: allTickets,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("send-auction-notification 함수 오류:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
        details: error.stack,
      }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  }
});
