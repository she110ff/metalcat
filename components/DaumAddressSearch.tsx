import React, { useState } from "react";
import { Modal, SafeAreaView, StatusBar, Platform } from "react-native";
import { Box } from "../components/ui/box";
import { VStack } from "../components/ui/vstack";
import { HStack } from "../components/ui/hstack";
import { Text } from "../components/ui/text";
import { Pressable } from "../components/ui/pressable";
import { Input, InputField } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Ionicons } from "@expo/vector-icons";
import Postcode from "@actbase/react-daum-postcode";

// 주소 결과 타입 정의
export interface DaumAddressResult {
  address: string;
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
  buildingName: string;
  apartment: string;
  bname: string;
  sido: string;
  sigungu: string;
  userSelectedType: string;
}

// 컴포넌트 Props 타입 정의
interface DaumAddressSearchProps {
  visible: boolean;
  onComplete: (address: DaumAddressResult) => void;
  onClose: () => void;
}

// @actbase/react-daum-postcode 기반 완벽한 React Native 주소 검색 컴포넌트
export const DaumAddressSearch: React.FC<DaumAddressSearchProps> = ({
  visible,
  onComplete,
  onClose,
}) => {
  const [searchMode, setSearchMode] = useState<"api" | "manual">("api");
  const [manualAddress, setManualAddress] = useState("");

  // @actbase/react-daum-postcode 주소 선택 완료 핸들러
  const handleAddressSelected = (data: any) => {
    console.log("🎉 주소 선택 완료!", data);

    // 공식 주소 처리 로직 적용
    let fullAddress = data.address;
    let extraAddress = "";

    if (data.addressType === "R") {
      if (data.bname !== "") {
        extraAddress += data.bname;
      }
      if (data.buildingName !== "") {
        extraAddress +=
          extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
    }

    const addressResult: DaumAddressResult = {
      address: fullAddress,
      roadAddress: data.roadAddress || data.address || "",
      jibunAddress: data.jibunAddress || "",
      zonecode: data.zonecode || "",
      buildingName: data.buildingName || "",
      apartment: data.apartment || "",
      bname: data.bname || "",
      sido: data.sido || "",
      sigungu: data.sigungu || "",
      userSelectedType: data.userSelectedType || "R",
    };

    console.log("📋 처리된 주소 결과:", addressResult);
    onComplete(addressResult);
    onClose();
  };

  // 수동 주소 입력 완료
  const handleManualSubmit = () => {
    if (!manualAddress.trim()) return;

    const manualResult: DaumAddressResult = {
      address: manualAddress.trim(),
      roadAddress: manualAddress.trim(),
      jibunAddress: manualAddress.trim(),
      zonecode: "00000",
      buildingName: "",
      apartment: "",
      bname: "",
      sido: "",
      sigungu: "",
      userSelectedType: "R",
    };

    console.log("📝 수동 입력 주소:", manualResult);
    onComplete(manualResult);
    onClose();
  };

  // 모드 전환
  const toggleMode = () => {
    setSearchMode(searchMode === "api" ? "manual" : "api");
    setManualAddress("");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView className="flex-1 bg-white">
        <VStack className="flex-1">
          {/* 헤더 */}
          <HStack className="items-center justify-between p-4 bg-white border-b border-gray-200">
            <Pressable
              onPress={onClose}
              className="p-2 active:opacity-60"
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
                size={Platform.OS === "ios" ? 28 : 24}
                color="#212529"
              />
            </Pressable>
            <Text className="text-gray-800 text-lg font-bold">주소 검색</Text>
            <Pressable
              onPress={toggleMode}
              className="p-2 active:opacity-60"
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={searchMode === "api" ? "create" : "search"}
                size={24}
                color="#007BFF"
              />
            </Pressable>
          </HStack>

          {/* 모드 표시 */}
          <Box className="bg-blue-50 px-4 py-2 border-b border-blue-200">
            <HStack className="items-center justify-center">
              <Ionicons
                name={searchMode === "api" ? "search" : "create"}
                size={16}
                color="#007BFF"
              />
              <Text className="text-blue-700 text-sm font-medium ml-2">
                {searchMode === "api" ? "다음 주소 검색" : "수동 입력"}
              </Text>
            </HStack>
          </Box>

          {/* 콘텐츠 */}
          {searchMode === "api" ? (
            <Box className="flex-1">
              {/* @actbase/react-daum-postcode 컴포넌트 */}
              <Postcode
                style={{
                  width: "100%",
                  height: "100%",
                  flex: 1,
                }}
                jsOptions={{
                  animation: true,
                  autoMapping: true,
                  shorthand: false,
                  pleaseReadGuide: 0,
                  useBannerLink: false,
                  hideMapBtn: false,
                  hideEngBtn: true,
                  theme: {
                    bgColor: "#FFFFFF",
                    searchBgColor: "#F8F9FA",
                    contentBgColor: "#FFFFFF",
                    pageBgColor: "#FFFFFF",
                    textColor: "#212529",
                    queryTextColor: "#495057",
                    postcodeTextColor: "#007BFF",
                    emphTextColor: "#DC3545",
                  },
                }}
                onSelected={handleAddressSelected}
                onError={(error) => {
                  console.error("❌ 주소 검색 오류:", error);
                }}
              />
            </Box>
          ) : (
            /* 수동 입력 모드 */
            <VStack className="flex-1 p-4 space-y-4">
              {/* 안내 메시지 */}
              <Box className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <HStack className="items-start">
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#F59E0B"
                  />
                  <VStack className="flex-1 ml-3">
                    <Text className="text-yellow-800 font-medium mb-1">
                      수동 주소 입력
                    </Text>
                    <Text className="text-yellow-700 text-sm">
                      주소를 직접 입력하세요. 정확한 주소 검색을 원하시면 다음
                      주소 검색 모드를 이용해주세요.
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* 주소 입력 필드 */}
              <VStack className="space-y-2">
                <Text className="text-gray-700 font-medium">주소 입력</Text>
                <Input
                  variant="outline"
                  size="lg"
                  className="border border-gray-300 rounded-lg"
                >
                  <InputField
                    value={manualAddress}
                    onChangeText={setManualAddress}
                    placeholder="예: 서울시 강남구 테헤란로 123"
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </Input>
              </VStack>

              {/* 입력 완료 버튼 */}
              <Button
                onPress={handleManualSubmit}
                disabled={!manualAddress.trim()}
                className={`rounded-lg py-3 ${
                  manualAddress.trim()
                    ? "bg-blue-600 active:bg-blue-700"
                    : "bg-gray-300"
                }`}
              >
                <HStack className="items-center justify-center">
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white font-medium ml-2">
                    주소 입력 완료
                  </Text>
                </HStack>
              </Button>

              {/* 사용 팁 */}
              <Box className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <HStack className="items-start">
                  <Ionicons name="bulb" size={16} color="#6B7280" />
                  <VStack className="flex-1 ml-2">
                    <Text className="text-gray-700 font-medium mb-1">
                      입력 팁
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      • 도로명 주소를 입력하세요 (예: 테헤란로 123)
                      {"\n"}• 건물명이나 상세주소도 포함 가능합니다
                      {"\n"}• 정확한 주소 검색을 원하시면 다음 주소 검색 모드를
                      이용하세요
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* 다음 주소 검색 장점 */}
              <Box className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <HStack className="items-start">
                  <Ionicons name="star" size={16} color="#007BFF" />
                  <VStack className="flex-1 ml-2">
                    <Text className="text-blue-700 font-medium mb-1">
                      다음 주소 검색의 장점
                    </Text>
                    <Text className="text-blue-600 text-sm">
                      • 무료, 무제한 사용 가능
                      {"\n"}• 최신 도로명 주소 데이터 제공
                      {"\n"}• 건물명, 우편번호 자동 입력
                      {"\n"}• 빠르고 정확한 검색 결과
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            </VStack>
          )}
        </VStack>
      </SafeAreaView>
    </Modal>
  );
};
