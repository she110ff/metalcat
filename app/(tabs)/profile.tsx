import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { SimpleProfile as Profile } from "@/screens/profile-screens/profile/simple";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  // 로그인하지 않은 상태에서는 로그인 안내 화면 표시
  if (!isLoading && !isLoggedIn) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 24, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
          로그인이 필요합니다
        </Text>
        <Text style={{ color: "gray", textAlign: "center", marginBottom: 20 }}>
          프로필을 확인하려면{"\n"}로그인해주세요
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={{
            backgroundColor: "#007AFF",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>로그인하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 로그인된 상태에서는 원래 프로필 화면 표시
  return <Profile />;
}
