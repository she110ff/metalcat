import React, { useRef, useState } from "react";
import { Modal, View, ActivityIndicator, Platform } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/ui/input";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Ionicons } from "@expo/vector-icons";

export interface DaumAddressResult {
  address: string; // 기본 주소
  roadAddress: string; // 도로명 주소
  jibunAddress: string; // 지번 주소
  zonecode: string; // 우편번호
  buildingName: string; // 건물명
  apartment: string; // 아파트명
  bname: string; // 법정동명
  bname1: string; // 법정리명
  bname2: string; // 법정읍면동명
  sido: string; // 시도명
  sigungu: string; // 시군구명
  sigunguCode: string; // 시군구코드
  roadnameCode: string; // 도로명코드
  roadname: string; // 도로명
  userSelectedType: string; // 사용자가 선택한 주소 타입
  userLanguageType: string; // 사용자가 선택한 언어 타입
}

interface DaumAddressSearchProps {
  visible: boolean;
  onComplete: (result: DaumAddressResult) => void;
  onClose: () => void;
}

export const DaumAddressSearch: React.FC<DaumAddressSearchProps> = ({
  visible,
  onComplete,
  onClose,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.action === "ready") {
        setIsLoading(false);
        setError(null);
      } else if (data.action === "close") {
        if (data.reason === "user_cancelled") {
          onClose();
        }
      } else {
        // 주소 선택 완료
        const addressResult: DaumAddressResult = {
          address: data.address || "",
          roadAddress: data.roadAddress || "",
          jibunAddress: data.jibunAddress || "",
          zonecode: data.zonecode || "",
          buildingName: data.buildingName || "",
          apartment: data.apartment || "",
          bname: data.bname || "",
          bname1: data.bname1 || "",
          bname2: data.bname2 || "",
          sido: data.sido || "",
          sigungu: data.sigungu || "",
          sigunguCode: data.sigunguCode || "",
          roadnameCode: data.roadnameCode || "",
          roadname: data.roadname || "",
          userSelectedType: data.userSelectedType || "",
          userLanguageType: data.userLanguageType || "",
        };

        onComplete(addressResult);
        onClose();
      }
    } catch (error) {
      console.error("주소 검색 메시지 파싱 에러:", error);
      setError("주소 데이터를 처리하는데 문제가 발생했습니다.");
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error("WebView 에러:", nativeEvent);
    setError("주소 검색 페이지를 불러오는데 실패했습니다.");
    setIsLoading(false);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  // 웹 환경에서 샘플 주소 사용
  const handleSampleAddress = () => {
    onComplete({
      address: "서울특별시 강남구 테헤란로 123",
      roadAddress: "서울특별시 강남구 테헤란로 123",
      jibunAddress: "서울특별시 강남구 역삼동 123-45",
      zonecode: "06123",
      buildingName: "테헤란빌딩",
      apartment: "",
      bname: "역삼동",
      bname1: "",
      bname2: "",
      sido: "서울특별시",
      sigungu: "강남구",
      sigunguCode: "11680",
      roadnameCode: "116803122009",
      roadname: "테헤란로",
      userSelectedType: "R",
      userLanguageType: "K",
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <VStack className="flex-1">
          {/* 헤더 */}
          <HStack className="items-center justify-between p-4 border-b border-gray-200">
            <Button variant="outline" onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="#000" />
            </Button>
            <Text
              className="text-black text-lg font-bold"
              style={{ fontFamily: "NanumGothic" }}
            >
              주소 검색
            </Text>
            <Box className="w-10" />
          </HStack>

          {/* 컨텐츠 영역 */}
          <Box className="flex-1 relative">
            {Platform.OS === "web" ? (
              // 웹 환경: 간단한 주소 입력 폼
              <Box className="p-6">
                <VStack space="lg">
                  <Text
                    className="text-gray-700 text-base text-center"
                    style={{ fontFamily: "NanumGothic" }}
                  >
                    웹 환경에서는 주소 검색 기능이 제한됩니다.
                    {"\n"}직접 주소를 입력해주세요.
                  </Text>

                  <VStack space="md">
                    <Input>
                      <InputField
                        placeholder="우편번호"
                        style={{
                          color: "#000000",
                          fontFamily: "NanumGothic",
                          backgroundColor: "#F3F4F6",
                          borderColor: "#D1D5DB",
                        }}
                      />
                    </Input>

                    <Input>
                      <InputField
                        placeholder="기본 주소"
                        style={{
                          color: "#000000",
                          fontFamily: "NanumGothic",
                          backgroundColor: "#F3F4F6",
                          borderColor: "#D1D5DB",
                        }}
                      />
                    </Input>

                    <Input>
                      <InputField
                        placeholder="상세 주소"
                        style={{
                          color: "#000000",
                          fontFamily: "NanumGothic",
                          backgroundColor: "#F3F4F6",
                          borderColor: "#D1D5DB",
                        }}
                      />
                    </Input>
                  </VStack>

                  <Button
                    variant="solid"
                    onPress={handleSampleAddress}
                    style={{ backgroundColor: "#9333EA" }}
                  >
                    <ButtonText style={{ fontFamily: "NanumGothic" }}>
                      샘플 주소 사용
                    </ButtonText>
                  </Button>
                </VStack>
              </Box>
            ) : (
              // 모바일 환경: WebView 사용
              <>
                {isLoading && (
                  <Box className="absolute inset-0 bg-white items-center justify-center z-10">
                    <ActivityIndicator size="large" color="#9333EA" />
                    <Text
                      className="text-gray-600 text-base mt-4"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      주소 검색을 준비하는 중...
                    </Text>
                  </Box>
                )}

                {error && (
                  <Box className="absolute inset-0 bg-white items-center justify-center z-10 p-6">
                    <Ionicons name="alert-circle" size={48} color="#EF4444" />
                    <Text
                      className="text-red-500 text-base mt-4 text-center"
                      style={{ fontFamily: "NanumGothic" }}
                    >
                      {error}
                    </Text>
                    <Button
                      variant="outline"
                      onPress={() => {
                        setError(null);
                        setIsLoading(true);
                        webViewRef.current?.reload();
                      }}
                      className="mt-4"
                    >
                      <ButtonText style={{ fontFamily: "NanumGothic" }}>
                        다시 시도
                      </ButtonText>
                    </Button>
                  </Box>
                )}

                <WebView
                  ref={webViewRef}
                  source={require("../assets/daum-address.html")}
                  onMessage={handleMessage}
                  onError={handleError}
                  onLoadStart={handleLoadStart}
                  onLoadEnd={handleLoadEnd}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  scalesPageToFit={true}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  style={{ flex: 1 }}
                />
              </>
            )}
          </Box>
        </VStack>
      </SafeAreaView>
    </Modal>
  );
};
