import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Button, ButtonText } from "@/components/ui/button";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function ScrapTest() {
  const router = useRouter();

  console.log("🧪 ScrapTest 컴포넌트 로드됨");

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <View style={{ padding: 20 }}>
          <Text
            style={{
              color: "white",
              fontSize: 24,
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            🧪 라우팅 테스트 성공!
          </Text>
          <Text
            style={{
              color: "white",
              fontSize: 16,
              marginBottom: 30,
              textAlign: "center",
            }}
          >
            고철 경매 화면이 정상적으로 로드되었습니다.
          </Text>
          <Button
            onPress={() => router.back()}
            style={{
              backgroundColor: "#9333EA",
              padding: 15,
              borderRadius: 10,
            }}
          >
            <ButtonText style={{ color: "white", fontWeight: "bold" }}>
              뒤로 가기
            </ButtonText>
          </Button>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
