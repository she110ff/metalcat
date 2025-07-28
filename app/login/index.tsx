import React, { useState } from "react";
import { ScrollView, View, Alert, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { useRouter } from "expo-router";
import { ArrowLeft, Phone, Shield } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const router = useRouter();
  const { login, isLoggingIn, loginError } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"phone" | "verification">("phone");

  // 전화번호 형식 변환
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{3})(\d{4})(\d{4})$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return cleaned;
  };

  // 전화번호 인증 요청
  const handleRequestVerification = () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 10) {
      Alert.alert("입력 확인", "올바른 전화번호를 입력해주세요.");
      return;
    }

    // 실제로는 SMS 인증 API 호출
    console.log("📱 인증번호 발송:", phoneNumber);
    Alert.alert(
      "인증번호 발송",
      `${phoneNumber}로 인증번호가 발송되었습니다.\n\n개발 모드에서는 임의의 6자리 숫자를 입력하세요.`,
      [{ text: "확인", onPress: () => setStep("verification") }]
    );
  };

  // 인증번호 확인 및 로그인
  const handleVerifyAndLogin = () => {
    if (!verificationCode || verificationCode.length < 4) {
      Alert.alert("입력 확인", "인증번호를 입력해주세요.");
      return;
    }

    // 로그인 처리
    login(
      {
        phoneNumber: phoneNumber.replace(/\D/g, ""),
        verificationCode,
      },
      {
        onSuccess: () => {
          Alert.alert("로그인 성공", "환영합니다!", [
            {
              text: "확인",
              onPress: () => {
                // 이전 화면으로 돌아가거나 메인으로 이동
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)/");
                }
              },
            },
          ]);
        },
        onError: (error: any) => {
          Alert.alert(
            "로그인 실패",
            error.message || "로그인 중 오류가 발생했습니다."
          );
        },
      }
    );
  };

  return (
    <LinearGradient
      colors={["#1A0F2A", "#2D1B3D", "#3D2F5A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          {/* Header */}
          <VStack className="px-6 pt-4 pb-6">
            <HStack className="items-center justify-between mb-8">
              <Pressable onPress={() => router.back()} className="p-2">
                <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
              </Pressable>
              <Text
                className="text-white text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                로그인
              </Text>
              <View style={{ width: 32 }} />
            </HStack>

            {/* Logo & Title */}
            <VStack className="items-center mb-12">
              <View className="w-20 h-20 rounded-full bg-yellow-400/20 items-center justify-center mb-6">
                <Shield size={40} color="#FCD34D" strokeWidth={2} />
              </View>
              <Text
                className="text-white text-2xl font-bold text-center mb-2"
                style={{ fontFamily: "NanumGothic" }}
              >
                안전한 로그인
              </Text>
              <Text
                className="text-white/70 text-base text-center"
                style={{ fontFamily: "NanumGothic" }}
              >
                전화번호로 간편하게 로그인하세요
              </Text>
            </VStack>

            {step === "phone" ? (
              /* 전화번호 입력 단계 */
              <VStack space="lg">
                <VStack space="md">
                  <HStack className="items-center" space="sm">
                    <Phone size={20} color="#FCD34D" strokeWidth={2} />
                    <Text
                      className="text-yellow-300 text-lg font-bold"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      전화번호
                    </Text>
                  </HStack>

                  <TextInput
                    placeholder="01012345678"
                    placeholderTextColor="#9CA3AF"
                    value={phoneNumber}
                    onChangeText={(text) =>
                      setPhoneNumber(formatPhoneNumber(text))
                    }
                    keyboardType="phone-pad"
                    maxLength={13}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      borderRadius: 12,
                      padding: 16,
                      color: "#FFFFFF",
                      fontFamily: "NanumGothic",
                      fontSize: 16,
                    }}
                  />
                </VStack>

                <Pressable
                  onPress={handleRequestVerification}
                  disabled={isLoggingIn}
                  className="rounded-2xl p-4 bg-yellow-400"
                  style={{
                    shadowColor: "#FFC107",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <Text className="text-black text-center text-base font-bold">
                    인증번호 받기
                  </Text>
                </Pressable>
              </VStack>
            ) : (
              /* 인증번호 입력 단계 */
              <VStack space="lg">
                <VStack space="md">
                  <Text
                    className="text-white text-base text-center"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    {phoneNumber}로 발송된
                  </Text>
                  <Text
                    className="text-white text-base text-center mb-4"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    인증번호를 입력해주세요
                  </Text>

                  <TextInput
                    placeholder="인증번호 6자리"
                    placeholderTextColor="#9CA3AF"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      borderRadius: 12,
                      padding: 16,
                      color: "#FFFFFF",
                      fontFamily: "NanumGothic",
                      fontSize: 18,
                      textAlign: "center",
                      letterSpacing: 4,
                    }}
                  />
                </VStack>

                <VStack space="md">
                  <Pressable
                    onPress={handleVerifyAndLogin}
                    disabled={isLoggingIn}
                    className="rounded-2xl p-4 bg-yellow-400"
                    style={{
                      shadowColor: "#FFC107",
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.3,
                      shadowRadius: 16,
                      elevation: 8,
                    }}
                  >
                    <Text className="text-black text-center text-base font-bold">
                      {isLoggingIn ? "로그인 중..." : "로그인"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setStep("phone")}
                    className="rounded-2xl p-4 bg-white/10 border border-white/20"
                  >
                    <Text className="text-white text-center text-base font-semibold">
                      번호 다시 입력
                    </Text>
                  </Pressable>
                </VStack>
              </VStack>
            )}

            {/* 에러 표시 */}
            {loginError && (
              <Box className="mt-6 bg-red-600/10 border border-red-500/30 rounded-xl p-4">
                <Text
                  className="text-red-300 text-center text-sm"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {loginError.message}
                </Text>
              </Box>
            )}

            {/* 개발자 정보 */}
            <Box className="mt-8 bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
              <Text
                className="text-blue-300 text-center text-xs"
                style={{ fontFamily: "NanumGothic" }}
              >
                개발 모드: 실제 SMS 발송 없이 임의의 인증번호로 로그인 가능
              </Text>
            </Box>
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
