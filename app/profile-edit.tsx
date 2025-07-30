import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { ChevronLeftIcon, EditIcon, Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Image } from "react-native";
import { ScrollView } from "@/components/ui/scroll-view";
import { Avatar, AvatarBadge, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Input, InputField } from "@/components/ui/input";
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxLabel,
  CheckboxIcon,
} from "@/components/ui/checkbox";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Keyboard } from "react-native";
import { EditPhotoIcon } from "@/screens/profile-screens/profile/assets/icons/edit-photo";
import { useImagePicker } from "@/hooks/useImagePicker";
import {
  DaumAddressSearch,
  DaumAddressResult,
} from "@/components/DaumAddressSearch";
import { Check } from "lucide-react-native";
import { getAvatarUrl } from "@/utils/avatar";

const userSchema = z
  .object({
    name: z
      .string()
      .min(2, "이름은 2글자 이상 입력해주세요")
      .max(50, "이름은 50자 이하로 입력해주세요"),
    // 사업자 정보 (사업자 체크 시 필수)
    companyName: z.string().optional(),
    businessNumber: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim() === "") return true; // 빈 값은 허용 (필수 검증은 별도)
          // 하이픈 제거 후 10자리 숫자인지 확인
          const cleaned = val.replace(/-/g, "");
          return /^\d{10}$/.test(cleaned);
        },
        {
          message: "사업자등록번호는 10자리 숫자여야 합니다 (예: 000-00-00000)",
        }
      ),
    businessType: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // isBusiness는 여기서 접근할 수 없으므로, 폼 제출 시 별도로 검증
  });

type UserSchemaDetails = z.infer<typeof userSchema>;

// 사업자등록번호 포맷팅 함수
const formatBusinessNumber = (value: string): string => {
  // 숫자만 추출
  const numbers = value.replace(/[^\d]/g, "");

  // 10자리를 초과하면 자르기
  const truncated = numbers.slice(0, 10);

  // 000-00-00000 형태로 포맷팅
  if (truncated.length <= 3) {
    return truncated;
  } else if (truncated.length <= 5) {
    return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
  } else {
    return `${truncated.slice(0, 3)}-${truncated.slice(3, 5)}-${truncated.slice(
      5
    )}`;
  }
};

export default function ProfileEditScreen() {
  const { isLoggedIn, isLoading, user, updateUser, isUpdatingUser } = useAuth();
  const router = useRouter();
  const [isNameFocused, setIsNameFocused] = useState(false);

  // 사업자 체크 및 관련 필드들
  const [isBusiness, setIsBusiness] = useState(user?.isBusiness || false);

  // 주소 관련 state
  const [address, setAddress] = useState(user?.address || "");
  const [addressDetail, setAddressDetail] = useState(user?.addressDetail || "");
  const [selectedAddress, setSelectedAddress] =
    useState<DaumAddressResult | null>(null);
  const [showAddressSearch, setShowAddressSearch] = useState(false);

  // 이미지 선택 훅 사용
  const {
    selectedImage: avatarImage,
    selectImage: selectAvatarImage,
    isLoading: imageLoading,
  } = useImagePicker({
    aspect: [1, 1],
    quality: 0.8,
    title: "프로필 사진 변경",
    cameraText: "카메라로 촬영",
    galleryText: "갤러리에서 선택",
  });

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
    setError,
    getValues,
  } = useForm<UserSchemaDetails>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || "",
      companyName: user?.companyName || "",
      businessNumber: user?.businessNumber
        ? formatBusinessNumber(user.businessNumber)
        : "",
      businessType: user?.businessType || "",
    },
  });

  // 사용자 데이터가 로드되면 폼과 state 업데이트
  useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        companyName: user.companyName || "",
        businessNumber: user.businessNumber
          ? formatBusinessNumber(user.businessNumber)
          : "",
        businessType: user.businessType || "",
      });
      setIsBusiness(user.isBusiness || false);
      setAddress(user.address || "");
      setAddressDetail(user.addressDetail || "");
    }
  }, [user, reset]);

  // 주소 검색 관련 함수들
  const openAddressModal = () => {
    setShowAddressSearch(true);
  };

  const handleAddressComplete = (result: DaumAddressResult) => {
    setSelectedAddress(result);
    setAddress(result.roadAddress || result.jibunAddress || result.address);
    setShowAddressSearch(false);
  };

  const handleAddressClose = () => {
    setShowAddressSearch(false);
  };

  const handleKeyPress = () => {
    Keyboard.dismiss();
  };

  const onSubmit = (data: UserSchemaDetails) => {
    // 사업자 체크 시 필수 필드 검증
    if (isBusiness) {
      if (!data.companyName?.trim()) {
        setError("companyName", { message: "업체명은 필수입니다" });
        return;
      }
      if (!data.businessNumber?.trim()) {
        setError("businessNumber", { message: "사업자등록번호는 필수입니다" });
        return;
      }
      // 사업자등록번호 형식 재검증 (하이픈 제거 후 10자리 숫자)
      const cleanedBusinessNumber = data.businessNumber
        .trim()
        .replace(/-/g, "");
      if (!/^\d{10}$/.test(cleanedBusinessNumber)) {
        setError("businessNumber", {
          message: "사업자등록번호는 10자리 숫자여야 합니다 (예: 000-00-00000)",
        });
        return;
      }
      if (!data.businessType?.trim()) {
        setError("businessType", { message: "업종은 필수입니다" });
        return;
      }
    }

    // 주소 검증
    if (!address.trim()) {
      alert("주소를 입력해주세요");
      return;
    }

    // 아바타 URL 처리 (로컬 파일은 나중에 업로드 기능 구현 시 처리)
    let finalAvatarUrl = user?.avatarUrl;
    if (avatarImage) {
      // 로컬 파일 경로인지 확인 (file://, content://, ph:// 등)
      if (
        avatarImage.startsWith("http://") ||
        avatarImage.startsWith("https://")
      ) {
        finalAvatarUrl = avatarImage;
      } else {
        // 로컬 파일인 경우 현재는 업데이트하지 않음 (추후 서버 업로드 기능 구현 필요)
        console.log(
          "📷 로컬 이미지 선택됨. 서버 업로드 기능 구현 후 지원 예정:",
          avatarImage
        );
      }
    }

    // 업데이트할 데이터 준비
    const updateData = {
      name: data.name.trim(),
      address: address.trim(),
      addressDetail: addressDetail.trim() || undefined,
      avatarUrl: finalAvatarUrl,
      isBusiness,
      // 사업자인 경우에만 사업자 정보 포함, 아닌 경우 빈 문자열로 초기화 (DB에서 null로 변환됨)
      companyName: isBusiness ? data.companyName?.trim() : "",
      businessNumber: isBusiness
        ? data.businessNumber?.trim().replace(/-/g, "") // 하이픈 제거하고 숫자만 저장
        : "",
      businessType: isBusiness ? data.businessType?.trim() : "",
    };

    console.log("📝 업데이트할 데이터:", {
      ...updateData,
      businessNumber: updateData.businessNumber
        ? "***숨김***"
        : updateData.businessNumber,
    });

    // 프로필 업데이트 API 호출
    updateUser(updateData, {
      onSuccess: () => {
        console.log("✅ 프로필 업데이트 성공");
        router.back();
      },
      onError: (error) => {
        console.error("❌ 프로필 업데이트 실패:", error);
        alert("프로필 업데이트에 실패했습니다. 다시 시도해주세요.");
      },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="h-full w-full">
        <Box className="flex-1 items-center justify-center">
          <Text>로딩 중...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    router.replace("/(tabs)/profile");
    return null;
  }

  return (
    <SafeAreaView className="h-full w-full bg-background-0">
      {/* 주소 검색 모달 */}
      {showAddressSearch && (
        <DaumAddressSearch
          visible={showAddressSearch}
          onComplete={handleAddressComplete}
          onClose={handleAddressClose}
        />
      )}

      {/* 헤더 */}
      <Box className="py-4 px-4 border-b border-border-300 bg-background-0">
        <HStack className="items-center justify-between" space="md">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center"
          >
            <Icon as={ChevronLeftIcon} size="lg" className="mr-2" />
            <Text className="text-lg font-medium">뒤로</Text>
          </Pressable>
          <Heading size="lg" className="text-typography-900">
            프로필 수정
          </Heading>
          <Box className="w-[60px]" />
        </HStack>
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <VStack className="w-full">
          {/* 배너 이미지 */}
          <Box className="w-full h-[100px] relative">
            <Image
              source={require("@/assets/profile-screens/profile/image2.png")}
              style={{
                width: "100%",
                height: "100%",
              }}
              alt="Banner Image"
              resizeMode="cover"
            />
          </Box>

          {/* 아바타 */}
          <Box className="w-full -mt-16 px-6 mb-6 items-center">
            <Pressable onPress={selectAvatarImage} disabled={imageLoading}>
              <Avatar size="2xl" className="bg-primary-600">
                <AvatarImage
                  alt="Profile Image"
                  source={{
                    uri:
                      avatarImage ||
                      getAvatarUrl(user?.avatarUrl, user?.name, 200),
                  }}
                />
                <AvatarBadge className="justify-center items-center bg-background-500">
                  <Icon as={EditPhotoIcon} />
                </AvatarBadge>
              </Avatar>
              {imageLoading && (
                <Box className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                  <Text className="text-white text-sm">로딩...</Text>
                </Box>
              )}
            </Pressable>

            {/* 로컬 이미지 선택 시 안내 메시지 */}
            {avatarImage && !avatarImage.startsWith("http") && (
              <Box className="mt-2 px-4 py-2 bg-yellow-100 rounded-lg">
                <Text className="text-yellow-800 text-xs text-center">
                  ⚠️ 이미지 업로드 기능은 추후 제공될 예정입니다
                </Text>
              </Box>
            )}
          </Box>

          {/* 폼 */}
          <VStack className="px-6" space="lg">
            {/* 이름 */}
            <VStack space="md">
              <Text className="text-typography-900 text-lg font-medium">
                이름
              </Text>
              <VStack space="sm">
                <Controller
                  name="name"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input>
                      <InputField
                        placeholder="이름을 입력하세요"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onFocus={() => setIsNameFocused(true)}
                        onSubmitEditing={handleKeyPress}
                        returnKeyType="next"
                      />
                    </Input>
                  )}
                />
                {errors.name && (
                  <Text className="text-error-500 text-xs">
                    {errors.name.message}
                  </Text>
                )}
              </VStack>
            </VStack>

            {/* 전화번호 (수정 불가) */}
            <VStack space="md">
              <Text className="text-typography-900 text-lg font-medium">
                전화번호
              </Text>
              <VStack space="sm">
                <Input>
                  <InputField
                    placeholder="전화번호 없음"
                    value={user?.phoneNumber || "전화번호 없음"}
                    editable={false}
                    className="text-typography-400"
                  />
                </Input>
                <Text className="text-typography-400 text-xs">
                  전화번호는 고객센터를 통해 변경 가능합니다
                </Text>
              </VStack>
            </VStack>

            {/* 주소 */}
            <VStack space="md">
              <Text className="text-typography-900 text-lg font-medium">
                주소
              </Text>

              {/* 주소 입력 필드 (클릭시 주소 검색) */}
              <Pressable onPress={openAddressModal}>
                <Input pointerEvents="none">
                  <InputField
                    placeholder="주소를 검색하세요"
                    value={address}
                    editable={false}
                  />
                </Input>
              </Pressable>

              {/* 상세 주소 입력 */}
              {address && (
                <VStack space="sm">
                  <Text className="text-typography-600 text-sm">상세 주소</Text>
                  <Input>
                    <InputField
                      value={addressDetail}
                      onChangeText={setAddressDetail}
                      placeholder="상세 주소를 입력하세요 (건물명, 층수 등)"
                      returnKeyType="done"
                      onSubmitEditing={handleKeyPress}
                    />
                  </Input>
                </VStack>
              )}
            </VStack>

            {/* 사업자 체크박스 */}
            <VStack space="md">
              <Pressable
                onPress={() => {
                  const newBusinessState = !isBusiness;
                  setIsBusiness(newBusinessState);

                  // 사업자 체크를 해제하면 관련 필드 초기화
                  if (!newBusinessState) {
                    reset({
                      name: getValues("name"),
                      companyName: "",
                      businessNumber: "",
                      businessType: "",
                    });
                  }
                  console.log("🏢 사업자 상태 변경:", newBusinessState);
                }}
                className="flex-row items-center"
              >
                <Checkbox
                  value="business"
                  isChecked={isBusiness}
                  className="mr-3"
                >
                  <CheckboxIndicator>
                    <CheckboxIcon as={Check} />
                  </CheckboxIndicator>
                </Checkbox>
                <Text className="text-typography-900 text-base">사업자</Text>
              </Pressable>
            </VStack>

            {/* 사업자 정보 (체크했을 때만 표시) */}
            {isBusiness && (
              <VStack space="md">
                <Text className="text-typography-900 text-lg font-medium">
                  사업자 정보
                </Text>

                {/* 업체명 */}
                <VStack space="sm">
                  <Text className="text-typography-600 text-sm">
                    업체명 <Text className="text-error-500">*</Text>
                  </Text>
                  <Controller
                    name="companyName"
                    control={control}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input>
                        <InputField
                          placeholder="업체명을 입력하세요"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          returnKeyType="next"
                        />
                      </Input>
                    )}
                  />
                  {errors.companyName && (
                    <Text className="text-error-500 text-xs">
                      {errors.companyName.message}
                    </Text>
                  )}
                </VStack>

                {/* 사업자등록번호 */}
                <VStack space="sm">
                  <Text className="text-typography-600 text-sm">
                    사업자등록번호 <Text className="text-error-500">*</Text>
                  </Text>
                  <Controller
                    name="businessNumber"
                    control={control}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input>
                        <InputField
                          placeholder="000-00-00000"
                          value={value}
                          onChangeText={(text) => {
                            const formatted = formatBusinessNumber(text);
                            onChange(formatted);
                          }}
                          onBlur={onBlur}
                          keyboardType="numeric"
                          returnKeyType="next"
                          maxLength={12} // 000-00-00000 형태 최대 길이
                        />
                      </Input>
                    )}
                  />
                  {errors.businessNumber && (
                    <Text className="text-error-500 text-xs">
                      {errors.businessNumber.message}
                    </Text>
                  )}
                </VStack>

                {/* 업종 */}
                <VStack space="sm">
                  <Text className="text-typography-600 text-sm">
                    업종 <Text className="text-error-500">*</Text>
                  </Text>
                  <Controller
                    name="businessType"
                    control={control}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input>
                        <InputField
                          placeholder="예: 금속 재활용업, 건설업 등"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          returnKeyType="next"
                        />
                      </Input>
                    )}
                  />
                  {errors.businessType && (
                    <Text className="text-error-500 text-xs">
                      {errors.businessType.message}
                    </Text>
                  )}
                </VStack>
              </VStack>
            )}

            {/* 저장 버튼 */}
            <VStack space="md" className="mt-6">
              <Button
                onPress={handleSubmit(onSubmit)}
                className="bg-primary-600"
                disabled={imageLoading || isUpdatingUser}
              >
                <ButtonText>
                  {isUpdatingUser ? "저장 중..." : "저장하기"}
                </ButtonText>
              </Button>
              <Button
                variant="outline"
                onPress={() => router.back()}
                disabled={isUpdatingUser}
              >
                <ButtonText>취소</ButtonText>
              </Button>
            </VStack>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
