// 차트 함수 테스트 스크립트
// 브라우저 콘솔에서 실행하거나 React Native 앱에서 테스트

const testChartFunction = async () => {
  console.log("🧪 차트 함수 테스트 시작");

  try {
    // 구리 일별 데이터 테스트
    const response = await fetch(
      "https://vxdncswvbhelstpkfcvv.supabase.co/rest/v1/rpc/get_lme_chart_stats",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZG5jc3d2YmhlbHN0cGtmY3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1ODc5NDEsImV4cCI6MjAzODE2Mzk0MX0.qxNxJZCqQNjHOJFGIJJJqJdKqJdKqJdKqJdKqJdKqJdK",
        },
        body: JSON.stringify({
          p_metal_code: "CU",
          p_period: "daily",
          p_limit: 5,
        }),
      }
    );

    const data = await response.json();
    console.log("✅ 일별 데이터:", data);

    // 주별 데이터 테스트
    const weeklyResponse = await fetch(
      "https://vxdncswvbhelstpkfcvv.supabase.co/rest/v1/rpc/get_lme_chart_stats",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZG5jc3d2YmhlbHN0cGtmY3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI1ODc5NDEsImV4cCI6MjAzODE2Mzk0MX0.qxNxJZCqQNjHOJFGIJJJqJdKqJdKqJdKqJdKqJdKqJdK",
        },
        body: JSON.stringify({
          p_metal_code: "CU",
          p_period: "weekly",
          p_limit: 3,
        }),
      }
    );

    const weeklyData = await weeklyResponse.json();
    console.log("✅ 주별 데이터:", weeklyData);
  } catch (error) {
    console.error("❌ 테스트 실패:", error);
  }
};

// 테스트 실행
testChartFunction();
