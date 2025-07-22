import React, { useState } from "react";
import { ScrollView, Alert } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TextareaInput } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxIndicator } from "@/components/ui/checkbox";
import { CheckboxIcon } from "@/components/ui/checkbox";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Ionicons } from "@expo/vector-icons";
import { scrapSalesEnvironmentOptions } from "@/data";

export default function ScrapAdditionalInfo() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [desiredPrice, setDesiredPrice] = useState("");
  const [phoneNumberDisclosure, setPhoneNumberDisclosure] = useState(false);
  const [salesEnvironment, setSalesEnvironment] = useState({
    delivery: "",
    shippingCost: "",
    truckAccess: false,
    loading: "",
    sacksNeeded: false,
    craneAccess: false,
    forkliftAccess: false,
  });
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const handleBack = () => {
    router.back();
  };

  const handleAddressSearch = () => {
    // TODO: 주소 검색 기능 구현
    Alert.alert("주소 검색", "주소 검색 기능은 추후 구현 예정입니다.");
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("알림", "글 제목을 입력해주세요.");
      return;
    }
    if (!desiredPrice.trim()) {
      Alert.alert("알림", "희망 가격을 입력해주세요.");
      return;
    }
    if (!phoneNumberDisclosure) {
      Alert.alert("알림", "전화번호 노출에 동의해주세요.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("알림", "현장 주소를 입력해주세요.");
      return;
    }

    // 다음 화면으로 이동
    router.push("/auction-create/scrap/confirmation" as any);
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <VStack className="flex-1 p-6" space="xl">
            {/* Header */}
            <VStack space="lg">
              <Box className="flex-row items-center justify-between">
                <Button variant="outline" onPress={handleBack} className="p-2">
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </Button>
                <Text
                  className="text-white text-xl font-bold"
                  style={{ fontFamily: "NanumGothic" }}
                >
                  추가 정보 입력
                </Text>
                <Box className="w-10" />
              </Box>
            </VStack>

            {/* 전화번호 노출 동의 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                전화번호 노출 안내
              </Text>
              <Text
                className="text-gray-300 text-sm"
                style={{ fontFamily: "NanumGothic" }}
              >
                중고 거래에서는 전화번호가 반드시 노출 되야 합니다
              </Text>

              <Pressable
                onPress={() => setPhoneNumberDisclosure(!phoneNumberDisclosure)}
              >
                <HStack className="items-center space-x-3">
                  <Box
                    className="w-5 h-5 rounded border-2 items-center justify-center"
                    style={{
                      borderColor: phoneNumberDisclosure
                        ? "#9333EA"
                        : "rgba(255, 255, 255, 0.3)",
                      backgroundColor: phoneNumberDisclosure
                        ? "#9333EA"
                        : "transparent",
                    }}
                  >
                    {phoneNumberDisclosure && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </Box>
                  <Text
                    className="text-white text-base"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    네 전화 번호 노출하는 것에 동의합니다
                  </Text>
                </HStack>
              </Pressable>
            </VStack>

            {/* 글 제목 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                글 제목
              </Text>
              <Input>
                <InputField
                  placeholder="글 제목을 입력하세요"
                  value={title}
                  onChangeText={setTitle}
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "NanumGothic",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                  }}
                />
              </Input>
            </VStack>

            {/* 희망 가격 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                희망 가격 설정 (원)
              </Text>
              <Input>
                <InputField
                  placeholder="희망 가격을 입력하세요"
                  value={desiredPrice}
                  onChangeText={setDesiredPrice}
                  keyboardType="numeric"
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "NanumGothic",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                  }}
                />
              </Input>
            </VStack>

            {/* 판매 환경 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                고철 판매 환경
              </Text>
              <Text
                className="text-gray-300 text-sm"
                style={{ fontFamily: "NanumGothic" }}
              >
                해당하는 것을 전부 선택해 주세요.
              </Text>

              <VStack space="sm">
                {scrapSalesEnvironmentOptions.delivery.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() =>
                      setSalesEnvironment({
                        ...salesEnvironment,
                        delivery: option.id,
                      })
                    }
                  >
                    <HStack className="items-center space-x-3">
                      <Box
                        className="w-4 h-4 rounded-full border-2 items-center justify-center"
                        style={{
                          borderColor:
                            salesEnvironment.delivery === option.id
                              ? "#9333EA"
                              : "rgba(255, 255, 255, 0.3)",
                          backgroundColor:
                            salesEnvironment.delivery === option.id
                              ? "#9333EA"
                              : "transparent",
                        }}
                      >
                        {salesEnvironment.delivery === option.id && (
                          <Box className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </Box>
                      <Text
                        className="text-white text-base"
                        style={{ fontFamily: "NanumGothic" }}
                      >
                        {option.label}
                      </Text>
                    </HStack>
                  </Pressable>
                ))}
              </VStack>
            </VStack>

            {/* 현장 주소 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                현장 주소
              </Text>
              <HStack space="md">
                <Input className="flex-1">
                  <InputField
                    placeholder="현장 주소를 입력하세요"
                    value={address}
                    onChangeText={setAddress}
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "NanumGothic",
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderColor: "rgba(255, 255, 255, 0.08)",
                    }}
                  />
                </Input>
                <Button
                  variant="outline"
                  onPress={handleAddressSearch}
                  className="px-4"
                >
                  <ButtonText style={{ fontFamily: "NanumGothic" }}>
                    주소 찾기
                  </ButtonText>
                </Button>
              </HStack>
            </VStack>

            {/* 설명 */}
            <VStack space="md">
              <Text
                className="text-yellow-300 text-lg font-bold"
                style={{ fontFamily: "NanumGothic" }}
              >
                설명
              </Text>
              <Textarea>
                <TextareaInput
                  placeholder="고철에 대한 상세 설명을 입력하세요"
                  value={description}
                  onChangeText={setDescription}
                  numberOfLines={4}
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "NanumGothic",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    borderColor: "rgba(255, 255, 255, 0.08)",
                  }}
                />
              </Textarea>
            </VStack>
          </VStack>
        </ScrollView>

        {/* 하단 등록 버튼 */}
        <Box className="p-6">
          <Button
            variant="solid"
            onPress={handleSubmit}
            className="w-full"
            style={{
              backgroundColor: "rgba(147, 51, 234, 0.9)",
            }}
          >
            <ButtonText
              className="text-white font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              경매 등록
            </ButtonText>
          </Button>
        </Box>
      </SafeAreaView>
    </LinearGradient>
  );
}
