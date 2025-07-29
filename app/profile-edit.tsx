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
import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Keyboard } from "react-native";
import { EditPhotoIcon } from "@/screens/profile-screens/profile/assets/icons/edit-photo";
import { useImagePicker } from "@/hooks/useImagePicker";

const userSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().max(200, "Bio must be less than 200 characters").optional(),
});

type UserSchemaDetails = z.infer<typeof userSchema>;

export default function ProfileEditScreen() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isBioFocused, setIsBioFocused] = useState(false);

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
      firstName: "Alexander",
      lastName: "Leslie",
      email: "alexander.leslie@example.com",
      bio: "",
    },
  });

  const handleKeyPress = () => {
    Keyboard.dismiss();
  };

  const onSubmit = (data: UserSchemaDetails) => {
    console.log("Profile updated:", data);
    console.log("Avatar image:", avatarImage);
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
            {/* 이름 */}
            <HStack className="items-center justify-between" space="md">
              <FormControl
                isInvalid={!!errors.firstName || isNameFocused}
                className="flex-1"
              >
                <FormControlLabel className="mb-2">
                  <FormControlLabelText>이름</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input>
                      <InputField
                        placeholder="이름"
                        type="text"
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
                <FormControlError>
                  <FormControlErrorText>
                    {errors.firstName?.message}
                  </FormControlErrorText>
                </FormControlError>
              </FormControl>

              <FormControl isInvalid={!!errors.lastName} className="flex-1">
                <FormControlLabel className="mb-2">
                  <FormControlLabelText>성</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  name="lastName"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input>
                      <InputField
                        placeholder="성"
                        type="text"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onSubmitEditing={handleKeyPress}
                        returnKeyType="next"
                      />
                    </Input>
                  )}
                />
                <FormControlError>
                  <FormControlErrorText>
                    {errors.lastName?.message}
                  </FormControlErrorText>
                </FormControlError>
              </FormControl>
            </HStack>

            {/* 이메일 */}
            <FormControl isInvalid={!!errors.email || isEmailFocused}>
              <FormControlLabel className="mb-2">
                <FormControlLabelText>이메일</FormControlLabelText>
              </FormControlLabel>
              <Controller
                name="email"
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input>
                    <InputField
                      placeholder="이메일"
                      type="text"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      onFocus={() => setIsEmailFocused(true)}
                      onSubmitEditing={handleKeyPress}
                      returnKeyType="next"
                      keyboardType="email-address"
                    />
                  </Input>
                )}
              />
              <FormControlError>
                <FormControlErrorText>
                  {errors.email?.message}
                </FormControlErrorText>
              </FormControlError>
            </FormControl>

            {/* 자기소개 */}
            <FormControl isInvalid={!!errors.bio || isBioFocused}>
              <FormControlLabel className="mb-2">
                <FormControlLabelText>자기소개</FormControlLabelText>
              </FormControlLabel>
              <Controller
                name="bio"
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input className="h-20">
                    <InputField
                      placeholder="자기소개를 입력하세요"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      onFocus={() => setIsBioFocused(true)}
                      multiline
                      textAlignVertical="top"
                      returnKeyType="done"
                    />
                  </Input>
                )}
              />
              <FormControlError>
                <FormControlErrorText>
                  {errors.bio?.message}
                </FormControlErrorText>
              </FormControlError>
            </FormControl>

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
