import React, { useState } from "react";
import { View, Alert, TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Phone,
  Shield,
  User,
  MapPin,
  MessageCircle,
} from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import {
  DaumAddressSearch,
  DaumAddressResult,
} from "@/components/DaumAddressSearch";

export default function AuthScreen() {
  const router = useRouter();
  const {
    sendCode,
    verifyCode,
    signup,
    login,
    isSendingCode,
    isVerifyingCode,
    isSigningUp,
    isLoggingIn,
    sendCodeError,
    verifyCodeError,
    signupError,
    loginError,
    verificationStatus,
    isPhoneVerified,
  } = useAuth();

  // 모드 관리 (회원가입 vs 로그인)
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");

  // 회원가입 데이터
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  // 단계 관리 (새로운 인증 플로우)
  const [step, setStep] = useState<
    "mode" | "phone" | "verify" | "info" | "final"
  >("mode");

  // 주소 검색 모달
  const [showAddressSearch, setShowAddressSearch] = useState(false);

  // 전화번호 형식 변환
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{3})(\d{4})(\d{4})$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return cleaned;
  };

  // 모드 선택 완료
  const handleModeSelect = (mode: "signup" | "login") => {
    setAuthMode(mode);
    setStep("phone");
  };

  // 전화번호 입력 및 인증코드 발송
  const handleSendCode = () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 10) {
      Alert.alert("입력 확인", "올바른 전화번호를 입력해주세요.");
      return;
    }

    const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");

    sendCode(
      { phoneNumber: cleanPhoneNumber },
      {
        onSuccess: (data) => {
          // 인증번호 입력 필드 초기화
          setVerificationCode("");
          Alert.alert("인증번호 발송", data.message, [
            { text: "확인", onPress: () => setStep("verify") },
          ]);
        },
        onError: (error: any) => {
          Alert.alert(
            "발송 실패",
            error.message || "인증번호 발송에 실패했습니다."
          );
        },
      }
    );
  };

  // 인증번호 확인
  const handleVerifyCode = () => {
    if (!verificationCode || verificationCode.length < 6) {
      Alert.alert("입력 확인", "인증번호 6자리를 입력해주세요.");
      return;
    }

    const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");

    verifyCode(
      {
        phoneNumber: cleanPhoneNumber,
        code: verificationCode,
      },
      {
        onSuccess: (data) => {
          Alert.alert("인증 성공", data.message, [
            {
              text: "확인",
              onPress: () => {
                if (authMode === "login") {
                  setStep("final"); // 로그인은 바로 최종 처리
                } else {
                  setStep("info"); // 회원가입은 정보 입력
                }
              },
            },
          ]);
        },
        onError: (error: any) => {
          Alert.alert(
            "인증 실패",
            error.message || "인증번호가 올바르지 않습니다."
          );
        },
      }
    );
  };

  // 주소 검색 완료
  const handleAddressComplete = (addressResult: DaumAddressResult) => {
    setAddress(addressResult.roadAddress || addressResult.address);
    setShowAddressSearch(false);
  };

  // 회원가입 정보 입력 완료
  const handleInfoNext = () => {
    if (!name || name.trim().length < 2) {
      Alert.alert("입력 확인", "올바른 이름을 입력해주세요 (최소 2글자).");
      return;
    }

    if (!address || address.trim().length < 5) {
      Alert.alert("입력 확인", "주소를 입력해주세요.");
      return;
    }

    setStep("final");
  };

  // 최종 처리 (회원가입 또는 로그인)
  const handleFinalSubmit = () => {
    const onSuccess = () => {
      const message = authMode === "signup" ? "회원가입 성공" : "로그인 성공";
      Alert.alert(message, "환영합니다!", [
        {
          text: "확인",
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          },
        },
      ]);
    };

    const onError = (error: any) => {
      const operation = authMode === "signup" ? "회원가입" : "로그인";
      Alert.alert(
        `${operation} 실패`,
        error.message || `${operation} 중 오류가 발생했습니다.`
      );
    };

    if (authMode === "signup") {
      // 회원가입 처리 (인증된 전화번호 자동 사용)
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");
      signup(
        {
          phoneNumber: cleanPhoneNumber,
          name: name.trim(),
          address: address.trim(),
          addressDetail: addressDetail.trim(),
        },
        { onSuccess, onError }
      );
    } else {
      // 로그인 처리
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");
      // 로그인은 전화번호 인증이 이미 완료된 상태이므로
      // 별도의 로그인 프로세스 대신 사용자 정보를 직접 가져옴
      // TODO: 실제 로그인 로직으로 변경 필요
      onSuccess();
    }
  };

  // 이전 단계로
  const handlePrevious = () => {
    switch (step) {
      case "phone":
        setStep("mode");
        break;
      case "verify":
        setVerificationCode(""); // 인증번호 입력 필드 초기화
        setStep("phone");
        break;
      case "info":
        setStep("verify");
        break;
      case "final":
        if (authMode === "login") {
          setStep("verify");
        } else {
          setStep("info");
        }
        break;
      default:
        router.back();
    }
  };

  // 단계별 제목과 아이콘
  const getStepInfo = () => {
    switch (step) {
      case "mode":
        return { title: "시작하기", icon: Shield, progress: 1 };
      case "phone":
        return {
          title: "전화번호 입력",
          icon: Phone,
          progress: 2,
          total: authMode === "login" ? 4 : 5,
        };
      case "verify":
        return {
          title: "인증번호 확인",
          icon: MessageCircle,
          progress: 3,
          total: authMode === "login" ? 4 : 5,
        };
      case "info":
        return {
          title: "정보 입력",
          icon: User,
          progress: 4,
          total: 5,
        };
      case "final":
        return {
          title: authMode === "login" ? "로그인" : "회원가입 완료",
          icon: Shield,
          progress: authMode === "login" ? 4 : 5,
          total: authMode === "login" ? 4 : 5,
        };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <>
      <LinearGradient
        colors={["#1A0F2A", "#2D1B3D", "#3D2F5A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1">
          <KeyboardAwareScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 50 }}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={20}
          >
            {/* Header */}
            <VStack className="px-6 pt-4 pb-6">
              <HStack className="items-center justify-between mb-8">
                <Pressable onPress={handlePrevious} className="p-2">
                  <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
                </Pressable>
                <Text
                  className="text-white text-lg font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {step === "mode"
                    ? "인증"
                    : authMode === "login"
                    ? "로그인"
                    : "회원가입"}
                  {step !== "mode" &&
                    ` (${stepInfo.progress}/${stepInfo.total})`}
                </Text>
                <View style={{ width: 32 }} />
              </HStack>

              {/* Step Icon & Title */}
              <VStack className="items-center mb-12">
                <View className="w-20 h-20 rounded-full bg-yellow-400/20 items-center justify-center mb-6">
                  <stepInfo.icon size={40} color="#FCD34D" strokeWidth={2} />
                </View>
                <Text
                  className="text-white text-2xl font-bold text-center mb-2"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {stepInfo.title}
                </Text>
                <Text
                  className="text-white/70 text-base text-center"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  {step === "mode" &&
                    "신규 회원가입 또는 기존 계정 로그인을 선택하세요"}
                  {step === "phone" &&
                    "전화번호를 입력하고 인증번호를 받아주세요"}
                  {step === "verify" && "발송된 인증번호를 입력해주세요"}
                  {step === "info" &&
                    "회원가입을 위해 이름과 주소를 입력해주세요"}
                  {step === "final" &&
                    authMode === "login" &&
                    "인증 완료! 로그인을 진행합니다"}
                  {step === "final" &&
                    authMode === "signup" &&
                    "모든 정보 입력 완료! 회원가입을 진행합니다"}
                </Text>
              </VStack>

              {/* 단계별 폼 렌더링 */}
              {step === "mode" && (
                <VStack space="lg">
                  <VStack space="md">
                    <Pressable
                      onPress={() => handleModeSelect("signup")}
                      className="rounded-2xl p-6 bg-yellow-400"
                      style={{
                        shadowColor: "#FFC107",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 8,
                      }}
                    >
                      <VStack space="sm" className="items-center">
                        <User size={32} color="#000" strokeWidth={2} />
                        <Text className="text-black text-center text-lg font-bold">
                          신규 회원가입
                        </Text>
                        <Text className="text-black/70 text-center text-sm">
                          처음 이용하시는 경우
                        </Text>
                      </VStack>
                    </Pressable>

                    <Pressable
                      onPress={() => handleModeSelect("login")}
                      className="rounded-2xl p-6 bg-white/10 border-2 border-white/20"
                    >
                      <VStack space="sm" className="items-center">
                        <Shield size={32} color="#FCD34D" strokeWidth={2} />
                        <Text className="text-white text-center text-lg font-bold">
                          기존 계정 로그인
                        </Text>
                        <Text className="text-white/70 text-center text-sm">
                          이미 가입된 경우
                        </Text>
                      </VStack>
                    </Pressable>
                  </VStack>
                </VStack>
              )}

              {step === "phone" && (
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
                    onPress={handleSendCode}
                    disabled={isSendingCode}
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
                      {isSendingCode ? "발송 중..." : "인증번호 받기"}
                    </Text>
                  </Pressable>
                </VStack>
              )}

              {step === "verify" && (
                <VStack space="lg">
                  <VStack space="md">
                    <Text
                      className="text-white text-base text-center"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      {phoneNumber}로 발송된
                    </Text>
                    <Text
                      className="text-yellow-300 text-xl font-bold text-center mb-4"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      SMS로 발송된 인증번호를 입력하세요
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

                  <Pressable
                    onPress={handleVerifyCode}
                    disabled={isVerifyingCode}
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
                      {isVerifyingCode ? "확인 중..." : "인증 확인"}
                    </Text>
                  </Pressable>
                </VStack>
              )}

              {step === "info" && (
                <VStack space="lg">
                  {/* 이름 입력 */}
                  <VStack space="md">
                    <HStack className="items-center" space="sm">
                      <User size={20} color="#FCD34D" strokeWidth={2} />
                      <Text
                        className="text-yellow-300 text-lg font-bold"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        이름
                      </Text>
                    </HStack>

                    <TextInput
                      placeholder="홍길동"
                      placeholderTextColor="#9CA3AF"
                      value={name}
                      onChangeText={setName}
                      maxLength={20}
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

                  {/* 주소 입력 */}
                  <VStack space="md">
                    <HStack className="items-center" space="sm">
                      <MapPin size={20} color="#FCD34D" strokeWidth={2} />
                      <Text
                        className="text-yellow-300 text-lg font-bold"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        주소
                      </Text>
                    </HStack>

                    <Pressable
                      onPress={() => setShowAddressSearch(true)}
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        borderRadius: 12,
                        padding: 16,
                        minHeight: 50,
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: address ? "#FFFFFF" : "#9CA3AF",
                          fontFamily: "NanumGothic",
                          fontSize: 16,
                        }}
                      >
                        {address || "주소를 검색해주세요"}
                      </Text>
                    </Pressable>

                    {address && (
                      <TextInput
                        placeholder="상세 주소 (선택사항)"
                        placeholderTextColor="#9CA3AF"
                        value={addressDetail}
                        onChangeText={setAddressDetail}
                        maxLength={100}
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
                    )}
                  </VStack>

                  <Pressable
                    onPress={handleInfoNext}
                    disabled={isSigningUp}
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
                      다음
                    </Text>
                  </Pressable>
                </VStack>
              )}

              {step === "final" && (
                <VStack space="lg">
                  <VStack space="md" className="items-center">
                    <Shield size={60} color="#FCD34D" strokeWidth={2} />
                    <Text
                      className="text-white text-xl font-bold text-center"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      {authMode === "signup"
                        ? "회원가입 준비 완료!"
                        : "로그인 준비 완료!"}
                    </Text>
                    <Text
                      className="text-white/70 text-center"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      {authMode === "signup"
                        ? "입력하신 정보로 계정을 생성합니다."
                        : "인증된 번호로 로그인합니다."}
                    </Text>
                  </VStack>

                  <Pressable
                    onPress={handleFinalSubmit}
                    disabled={isSigningUp || isLoggingIn}
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
                      {authMode === "signup" && isSigningUp && "회원가입 중..."}
                      {authMode === "login" && isLoggingIn && "로그인 중..."}
                      {!isSigningUp &&
                        !isLoggingIn &&
                        (authMode === "signup" ? "회원가입 완료" : "로그인")}
                    </Text>
                  </Pressable>
                </VStack>
              )}

              {/* 에러 표시 */}
              {(sendCodeError ||
                verifyCodeError ||
                signupError ||
                loginError) && (
                <Box className="mt-6 bg-red-600/10 border border-red-500/30 rounded-xl p-4">
                  <Text
                    className="text-red-300 text-center text-sm"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    {sendCodeError?.message ||
                      verifyCodeError?.message ||
                      signupError?.message ||
                      loginError?.message}
                  </Text>
                </Box>
              )}

              {/* 개발자 정보 */}
              {step === "verify" && (
                <Box className="mt-8 bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                  <Text
                    className="text-blue-300 text-center text-xs"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    SMS로 받은 6자리 인증번호를 입력하세요
                  </Text>
                </Box>
              )}
            </VStack>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* 주소 검색 모달 */}
      <DaumAddressSearch
        visible={showAddressSearch}
        onComplete={handleAddressComplete}
        onClose={() => setShowAddressSearch(false)}
      />
    </>
  );
}
