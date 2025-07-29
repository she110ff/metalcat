import React, { useState } from "react";
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

const userSchema = z.object({
  lastName: z
    .string()
    .min(1, "성은 필수입니다")
    .max(50, "성은 50자 이하로 입력해주세요"),
  firstName: z
    .string()
    .min(1, "이름은 필수입니다")
    .max(50, "이름은 50자 이하로 입력해주세요"),
});

type UserSchemaDetails = z.infer<typeof userSchema>;

export default function ProfileEditScreen() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const [isLastNameFocused, setIsLastNameFocused] = useState(false);
  const [isFirstNameFocused, setIsFirstNameFocused] = useState(false);

  // 주소 관련 state
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
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
  } = useForm<UserSchemaDetails>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      lastName: "Leslie",
      firstName: "Alexander",
    },
  });

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
    console.log("Profile updated:", data);
    console.log("Avatar image:", avatarImage);
    console.log("Address:", address);
    console.log("Address detail:", addressDetail);
    // TODO: API 호출로 프로필 업데이트
    router.back();
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
                {avatarImage ? (
                  <AvatarImage
                    alt="Profile Image"
                    source={{ uri: avatarImage }}
                  />
                ) : (
                  <AvatarImage
                    alt="Profile Image"
                    source={require("@/assets/profile-screens/profile/image.png")}
                  />
                )}
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
          </Box>

          {/* 폼 */}
          <VStack className="px-6" space="lg">
            {/* 성/이름 */}
            <VStack space="md">
              <Text className="text-typography-900 text-lg font-medium">
                이름
              </Text>
              <HStack className="items-center justify-between" space="md">
                <VStack className="flex-1" space="sm">
                  <Text className="text-typography-600 text-sm">성</Text>
                  <Controller
                    name="lastName"
                    control={control}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input>
                        <InputField
                          placeholder="성"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          onFocus={() => setIsLastNameFocused(true)}
                          onSubmitEditing={handleKeyPress}
                          returnKeyType="next"
                        />
                      </Input>
                    )}
                  />
                  {errors.lastName && (
                    <Text className="text-error-500 text-xs">
                      {errors.lastName.message}
                    </Text>
                  )}
                </VStack>

                <VStack className="flex-1" space="sm">
                  <Text className="text-typography-600 text-sm">이름</Text>
                  <Controller
                    name="firstName"
                    control={control}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input>
                        <InputField
                          placeholder="이름"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          onFocus={() => setIsFirstNameFocused(true)}
                          onSubmitEditing={handleKeyPress}
                          returnKeyType="next"
                        />
                      </Input>
                    )}
                  />
                  {errors.firstName && (
                    <Text className="text-error-500 text-xs">
                      {errors.firstName.message}
                    </Text>
                  )}
                </VStack>
              </HStack>
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

            {/* 저장 버튼 */}
            <VStack space="md" className="mt-6">
              <Button
                onPress={handleSubmit(onSubmit)}
                className="bg-primary-600"
                disabled={imageLoading}
              >
                <ButtonText>저장하기</ButtonText>
              </Button>
              <Button variant="outline" onPress={() => router.back()}>
                <ButtonText>취소</ButtonText>
              </Button>
            </VStack>
          </VStack>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
