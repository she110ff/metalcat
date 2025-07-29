import React, { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import {
  ChevronLeftIcon,
  CloseIcon,
  EditIcon,
  Icon,
} from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
// ✅ React Native 기본 Image 컴포넌트 사용 (Asset Registry 충돌 해결)
import { Image } from "react-native";
import { ScrollView } from "@/components/ui/scroll-view";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
} from "@/components/ui/modal";
import { Input, InputField } from "@/components/ui/input";
import {
  Avatar,
  AvatarBadge,
  AvatarFallbackText,
  AvatarImage,
} from "@/components/ui/avatar";
// ✅ expo-router 사용으로 일관성 맞춤
import { useRouter } from "expo-router";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { cn } from "@gluestack-ui/nativewind-utils/cn";
import { Keyboard, Platform } from "react-native";
import { SubscriptionIcon } from "./assets/icons/subscription";
import { DownloadIcon } from "./assets/icons/download";
import { FaqIcon } from "./assets/icons/faq";
import { NewsBlogIcon } from "./assets/icons/news-blog";
import { HomeIcon } from "./assets/icons/home";
import { GlobeIcon } from "./assets/icons/globe";
import { InboxIcon } from "./assets/icons/inbox";
import { HeartIcon } from "./assets/icons/heart";
import { CameraSparklesIcon } from "./assets/icons/camera-sparkles";
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
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from "@/components/ui/select";
import { EditPhotoIcon } from "./assets/icons/edit-photo";

const bottomTabsList = [
  {
    iconName: HomeIcon,
    iconText: "Home",
  },

  {
    iconName: GlobeIcon,
    iconText: "Community",
  },
  {
    iconName: InboxIcon,
    iconText: "Inbox",
  },
  {
    iconName: HeartIcon,
    iconText: "Favourite",
  },
  {
    iconName: ProfileIcon,
    iconText: "Profile",
  },
];

interface UserStats {
  friends: string;
  friendsText: string;
  followers: string;
  followersText: string;
  rewards: string;
  rewardsText: string;
  posts: string;
  postsText: string;
}
const userData: UserStats[] = [
  {
    friends: "45K",
    friendsText: "Friends",
    followers: "500M",
    followersText: "Followers",
    rewards: "40",
    rewardsText: "Rewards",
    posts: "346",
    postsText: "Posts",
  },
];

const MainContent = () => {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"auction" | "bidding" | "premium">(
    "auction"
  );
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/(tabs)/");
  };

  // 샘플 데이터 - 실제로는 API에서 가져올 데이터
  const myAuctions = [
    {
      id: "1",
      title: "고순도 구리 스크랩",
      category: "고철",
      currentBid: "₩12,500,000",
      status: "진행중",
      endTime: "2일 남음",
    },
    {
      id: "2",
      title: "알루미늄 캔 스크랩",
      category: "고철",
      currentBid: "₩3,600,000",
      status: "종료",
      endTime: "종료됨",
    },
    {
      id: "3",
      title: "스테인리스 스틸 파이프",
      category: "고철",
      currentBid: "₩8,900,000",
      status: "진행중",
      endTime: "1일 14시간",
    },
    {
      id: "4",
      title: "황동 배관 자재",
      category: "고철",
      currentBid: "₩5,200,000",
      status: "진행중",
      endTime: "3일 8시간",
    },
    {
      id: "5",
      title: "티타늄 합금 스크랩",
      category: "특수금속",
      currentBid: "₩18,750,000",
      status: "진행중",
      endTime: "12시간 30분",
    },
    {
      id: "6",
      title: "산업용 철 구조물",
      category: "고철",
      currentBid: "₩4,300,000",
      status: "종료",
      endTime: "종료됨",
    },
    {
      id: "7",
      title: "니켈 도금 부품",
      category: "특수금속",
      currentBid: "₩7,650,000",
      status: "진행중",
      endTime: "4일 2시간",
    },
  ];

  const myBiddings = [
    {
      id: "3",
      title: "스테인리스 스틸 스크랩",
      category: "고철",
      myBid: "₩8,500,000",
      currentBid: "₩8,960,000",
      status: "진행중",
      endTime: "1시간 45분",
    },
    {
      id: "4",
      title: "황동 스크랩",
      category: "고철",
      myBid: "₩4,750,000",
      currentBid: "₩4,750,000",
      status: "낙찰",
      endTime: "종료됨",
    },
    {
      id: "5",
      title: "알루미늄 합금 판재",
      category: "고철",
      myBid: "₩6,200,000",
      currentBid: "₩6,800,000",
      status: "진행중",
      endTime: "2일 12시간",
    },
    {
      id: "6",
      title: "구리 전선 스크랩",
      category: "고철",
      myBid: "₩15,300,000",
      currentBid: "₩15,300,000",
      status: "최고가",
      endTime: "6시간 20분",
    },
    {
      id: "7",
      title: "몰리브덴 합금",
      category: "특수금속",
      myBid: "₩22,000,000",
      currentBid: "₩23,500,000",
      status: "진행중",
      endTime: "3일 15시간",
    },
  ];

  const myPremiumServices = [
    {
      id: "p1",
      serviceName: "금속 시세 분석 리포트",
      requestDate: "2024-01-15",
      status: "완료",
      price: "₩50,000",
    },
    {
      id: "p2",
      serviceName: "맞춤형 시장 동향 분석",
      requestDate: "2024-01-10",
      status: "진행중",
      price: "₩100,000",
    },
    {
      id: "p3",
      serviceName: "스크랩 품질 감정 서비스",
      requestDate: "2024-01-08",
      status: "완료",
      price: "₩75,000",
    },
    {
      id: "p4",
      serviceName: "월간 금속 전망 보고서",
      requestDate: "2024-01-05",
      status: "진행중",
      price: "₩120,000",
    },
    {
      id: "p5",
      serviceName: "특수금속 매입 컨설팅",
      requestDate: "2024-01-03",
      status: "대기중",
      price: "₩200,000",
    },
    {
      id: "p6",
      serviceName: "국제 금속 시장 분석",
      requestDate: "2024-01-01",
      status: "완료",
      price: "₩150,000",
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "auction":
        return (
          <VStack space="md">
            {myAuctions.map((auction) => (
              <Box
                key={auction.id}
                className="p-4 border border-border-300 rounded-xl bg-white/50"
              >
                <VStack space="sm">
                  <HStack className="justify-between items-start">
                    <VStack className="flex-1">
                      <Text className="font-semibold text-lg">
                        {auction.title}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {auction.category}
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="font-bold text-green-600">
                        {auction.currentBid}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {auction.endTime}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack className="justify-between items-center">
                    <Box
                      className={`px-2 py-1 rounded ${
                        auction.status === "진행중"
                          ? "bg-green-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          auction.status === "진행중"
                            ? "text-green-700"
                            : "text-gray-700"
                        }`}
                      >
                        {auction.status}
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
              </Box>
            ))}
          </VStack>
        );

      case "bidding":
        return (
          <VStack space="md">
            {myBiddings.map((bidding) => (
              <Box
                key={bidding.id}
                className="p-4 border border-border-300 rounded-xl bg-white/50"
              >
                <VStack space="sm">
                  <HStack className="justify-between items-start">
                    <VStack className="flex-1">
                      <Text className="font-semibold text-lg">
                        {bidding.title}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {bidding.category}
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="font-bold text-blue-600">
                        현재: {bidding.currentBid}
                      </Text>
                      <Text className="text-sm text-gray-700">
                        내 입찰: {bidding.myBid}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {bidding.endTime}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack className="justify-between items-center">
                    <Box
                      className={`px-2 py-1 rounded ${
                        bidding.status === "진행중"
                          ? "bg-blue-100"
                          : bidding.status === "낙찰"
                          ? "bg-green-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          bidding.status === "진행중"
                            ? "text-blue-700"
                            : bidding.status === "낙찰"
                            ? "text-green-700"
                            : "text-gray-700"
                        }`}
                      >
                        {bidding.status}
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
              </Box>
            ))}
          </VStack>
        );

      case "premium":
        return (
          <VStack space="md">
            {myPremiumServices.map((service) => (
              <Box
                key={service.id}
                className="p-4 border border-border-300 rounded-xl bg-white/50"
              >
                <VStack space="sm">
                  <HStack className="justify-between items-start">
                    <VStack className="flex-1">
                      <Text className="font-semibold text-lg">
                        {service.serviceName}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        요청일: {service.requestDate}
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="font-bold text-purple-600">
                        {service.price}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack className="justify-between items-center">
                    <Box
                      className={`px-2 py-1 rounded ${
                        service.status === "완료"
                          ? "bg-green-100"
                          : "bg-orange-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          service.status === "완료"
                            ? "text-green-700"
                            : "text-orange-700"
                        }`}
                      >
                        {service.status}
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
              </Box>
            ))}
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <VStack
      className="w-full mb-16"
      style={{ justifyContent: "flex-start", alignItems: "stretch" }}
    >
      <ModalComponent showModal={showModal} setShowModal={setShowModal} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 0 }}
        contentContainerStyle={{
          paddingBottom: 110,
          flexGrow: 0,
          justifyContent: "flex-start",
        }}
      >
        <VStack className="w-full pb-8">
          <Box className="w-full h-[190px]">
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

          {/* 아바타 및 Edit Profile 섹션 */}
          <Box className="w-full -mt-12 px-6 mb-5">
            <HStack space="lg" className="items-center">
              <Avatar size="lg" className="bg-primary-600">
                <AvatarImage
                  alt="Profile Image"
                  height={"100%"}
                  width={"100%"}
                  source={require("@/assets/profile-screens/profile/image.png")}
                />
                <AvatarBadge />
              </Avatar>
              <VStack space="md" className="flex-1">
                <Text size="2xl" className="font-roboto text-dark">
                  Alexander Leslie
                </Text>
                <Button
                  variant="outline"
                  action="secondary"
                  onPress={() => setShowModal(true)}
                  className="gap-3 relative self-start"
                >
                  <ButtonText className="text-dark">Edit Profile</ButtonText>
                  <ButtonIcon as={EditIcon} />
                </Button>
              </VStack>
            </HStack>
          </Box>

          {/* 활동 내역 탭 섹션 */}
          <VStack className="mx-6" space="lg">
            {/* 탭 헤더 */}
            <HStack className="bg-gray-100 rounded-xl p-1" space="xs">
              <Pressable
                onPress={() => setActiveTab("auction")}
                className={`flex-1 py-3 px-4 rounded-lg ${
                  activeTab === "auction" ? "bg-white shadow-sm" : ""
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    activeTab === "auction"
                      ? "text-primary-600"
                      : "text-gray-600"
                  }`}
                >
                  경매
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("bidding")}
                className={`flex-1 py-3 px-4 rounded-lg ${
                  activeTab === "bidding" ? "bg-white shadow-sm" : ""
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    activeTab === "bidding"
                      ? "text-primary-600"
                      : "text-gray-600"
                  }`}
                >
                  입찰
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("premium")}
                className={`flex-1 py-3 px-4 rounded-lg ${
                  activeTab === "premium" ? "bg-white shadow-sm" : ""
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    activeTab === "premium"
                      ? "text-primary-600"
                      : "text-gray-600"
                  }`}
                >
                  프리미엄
                </Text>
              </Pressable>
            </HStack>

            {/* 탭 컨텐츠 */}
            <Box className="min-h-[300px]">{renderTabContent()}</Box>
          </VStack>
        </VStack>
      </ScrollView>
    </VStack>
  );
};
const ModalComponent = ({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: any;
}) => {
  const ref = useRef(null);
  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<userSchemaDetails>({
    resolver: zodResolver(userSchema),
  });

  const handleKeyPress = () => {
    Keyboard.dismiss();
  };
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const onSubmit = (_data: userSchemaDetails) => {
    setShowModal(false);
    reset();
  };

  return (
    <Modal
      isOpen={showModal}
      onClose={() => {
        setShowModal(false);
      }}
      finalFocusRef={ref}
      size="lg"
    >
      <ModalBackdrop />
      <ModalContent>
        <Box className={"w-full h-[215px] "}>
          <Image
            source={require("@/assets/profile-screens/profile/image2.png")}
            height={"100%"}
            width={"100%"}
            alt="Banner Image"
          />
        </Box>
        <Pressable className="absolute bg-background-500 rounded-full items-center justify-center h-8 w-8 right-6 top-44">
          <Icon as={CameraSparklesIcon} />
        </Pressable>
        <ModalHeader className="absolute w-full">
          <Heading size="2xl" className="text-typography-800 pt-4 pl-4">
            Edit Profile
          </Heading>
          <ModalCloseButton>
            <Icon
              as={CloseIcon}
              size="md"
              className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
            />
          </ModalCloseButton>
        </ModalHeader>
        <Center className="w-full absolute top-16">
          <Avatar size="2xl">
            <AvatarImage
              source={require("@/assets/profile-screens/profile/image.png")}
            />
            <AvatarBadge className="justify-center items-center bg-background-500">
              <Icon as={EditPhotoIcon} />
            </AvatarBadge>
          </Avatar>
        </Center>
        <ModalBody className="px-10 py-6">
          <VStack space="2xl">
            <HStack className="items-center justify-between">
              <FormControl
                isInvalid={!!errors.firstName || isNameFocused}
                className="w-[47%]"
              >
                <FormControlLabel className="mb-2">
                  <FormControlLabelText>First Name</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  name="firstName"
                  control={control}
                  rules={{
                    validate: async (value) => {
                      try {
                        await userSchema.parseAsync({
                          firstName: value,
                        });
                        return true;
                      } catch (error: any) {
                        return error.message;
                      }
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input>
                      <InputField
                        placeholder="First Name"
                        type="text"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onSubmitEditing={handleKeyPress}
                        returnKeyType="done"
                      />
                    </Input>
                  )}
                />
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircleIcon} size="md" />
                  <FormControlErrorText>
                    {errors?.firstName?.message}
                  </FormControlErrorText>
                </FormControlError>
              </FormControl>
              <FormControl
                isInvalid={!!errors.lastName || isNameFocused}
                className="w-[47%]"
              >
                <FormControlLabel className="mb-2">
                  <FormControlLabelText>Last Name</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  name="lastName"
                  control={control}
                  rules={{
                    validate: async (value) => {
                      try {
                        await userSchema.parseAsync({
                          lastName: value,
                        });
                        return true;
                      } catch (error: any) {
                        return error.message;
                      }
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input>
                      <InputField
                        placeholder="Last Name"
                        type="text"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onSubmitEditing={handleKeyPress}
                        returnKeyType="done"
                      />
                    </Input>
                  )}
                />
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircleIcon} size="md" />
                  <FormControlErrorText>
                    {errors?.lastName?.message}
                  </FormControlErrorText>
                </FormControlError>
              </FormControl>
            </HStack>
            <HStack className="items-center justify-between">
              <FormControl className="w-[47%]" isInvalid={!!errors.gender}>
                <FormControlLabel className="mb-2">
                  <FormControlLabelText>Gender</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  name="gender"
                  control={control}
                  rules={{
                    validate: async (value) => {
                      try {
                        await userSchema.parseAsync({ city: value });
                        return true;
                      } catch (error: any) {
                        return error.message;
                      }
                    },
                  }}
                  render={({ field: { onChange, value } }) => (
                    <Select onValueChange={onChange} selectedValue={value}>
                      <SelectTrigger variant="outline" size="md">
                        <SelectInput placeholder="Select" />
                        <SelectIcon className="mr-3" as={ChevronDownIcon} />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          <SelectDragIndicatorWrapper>
                            <SelectDragIndicator />
                          </SelectDragIndicatorWrapper>
                          <SelectItem label="Male" value="male" />
                          <SelectItem label="Female" value="female" />
                          <SelectItem label="Others" value="others" />
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} size="md" />
                  <FormControlErrorText>
                    {errors?.gender?.message}
                  </FormControlErrorText>
                </FormControlError>
              </FormControl>

              <FormControl className="w-[47%]" isInvalid={!!errors.phoneNumber}>
                <FormControlLabel className="mb-2">
                  <FormControlLabelText>Phone number</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  name="phoneNumber"
                  control={control}
                  rules={{
                    validate: async (value) => {
                      try {
                        await userSchema.parseAsync({ phoneNumber: value });
                        return true;
                      } catch (error: any) {
                        return error.message;
                      }
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <HStack className="gap-1">
                      <Select className="w-[28%]">
                        <SelectTrigger variant="outline" size="md">
                          <SelectInput placeholder="+91" />
                          <SelectIcon className="mr-1" as={ChevronDownIcon} />
                        </SelectTrigger>
                        <SelectPortal>
                          <SelectBackdrop />
                          <SelectContent>
                            <SelectDragIndicatorWrapper>
                              <SelectDragIndicator />
                            </SelectDragIndicatorWrapper>
                            <SelectItem label="93" value="93" />
                            <SelectItem label="155" value="155" />
                            <SelectItem label="1-684" value="-1684" />
                          </SelectContent>
                        </SelectPortal>
                      </Select>
                      <Input className="flex-1">
                        <InputField
                          placeholder="89867292632"
                          type="text"
                          value={value}
                          onChangeText={onChange}
                          keyboardType="number-pad"
                          onBlur={onBlur}
                          onSubmitEditing={handleKeyPress}
                          returnKeyType="done"
                        />
                      </Input>
                    </HStack>
                  )}
                />
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} size="md" />
                  <FormControlErrorText>
                    {errors?.phoneNumber?.message}
                  </FormControlErrorText>
                </FormControlError>
              </FormControl>
            </HStack>
            <HStack className="items-center justify-between">
              <FormControl
                className="w-[47%]"
                isInvalid={(!!errors.city || isEmailFocused) && !!errors.city}
              >
                <FormControlLabel className="mb-2">
                  <FormControlLabelText>City</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  name="city"
                  control={control}
                  rules={{
                    validate: async (value) => {
                      try {
                        await userSchema.parseAsync({ city: value });
                        return true;
                      } catch (error: any) {
                        return error.message;
                      }
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Select onValueChange={onChange} selectedValue={value}>
                      <SelectTrigger variant="outline" size="md">
                        <SelectInput placeholder="Select" />
                        <SelectIcon className="mr-3" as={ChevronDownIcon} />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          <SelectDragIndicatorWrapper>
                            <SelectDragIndicator />
                          </SelectDragIndicatorWrapper>
                          <SelectItem label="Bengaluru" value="Bengaluru" />
                          <SelectItem label="Udupi" value="Udupi" />
                          <SelectItem label="Others" value="Others" />
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} size="md" />
                  <FormControlErrorText>
                    {errors?.city?.message}
                  </FormControlErrorText>
                </FormControlError>
              </FormControl>

              <FormControl
                className="w-[47%]"
                isInvalid={(!!errors.state || isEmailFocused) && !!errors.state}
              >
                <FormControlLabel className="mb-2">
                  <FormControlLabelText>State</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  name="state"
                  control={control}
                  rules={{
                    validate: async (value) => {
                      try {
                        await userSchema.parseAsync({ state: value });
                        return true;
                      } catch (error: any) {
                        return error.message;
                      }
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Select onValueChange={onChange} selectedValue={value}>
                      <SelectTrigger variant="outline" size="md">
                        <SelectInput placeholder="Select" />
                        <SelectIcon className="mr-3" as={ChevronDownIcon} />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          <SelectDragIndicatorWrapper>
                            <SelectDragIndicator />
                          </SelectDragIndicatorWrapper>
                          <SelectItem label="Karnataka" value="Karnataka" />
                          <SelectItem label="Haryana" value="Haryana" />
                          <SelectItem label="Others" value="Others" />
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} size="md" />
                  <FormControlErrorText>
                    {errors?.state?.message}
                  </FormControlErrorText>
                </FormControlError>
              </FormControl>
            </HStack>
            <HStack className="items-center justify-between">
              <FormControl
                className="w-[47%]"
                isInvalid={
                  (!!errors.country || isEmailFocused) && !!errors.country
                }
              >
                <FormControlLabel className="mb-2">
                  <FormControlLabelText>Country</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  name="country"
                  control={control}
                  rules={{
                    validate: async (value) => {
                      try {
                        await userSchema.parseAsync({ country: value });
                        return true;
                      } catch (error: any) {
                        return error.message;
                      }
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Select onValueChange={onChange} selectedValue={value}>
                      <SelectTrigger variant="outline" size="md">
                        <SelectInput placeholder="Select" />
                        <SelectIcon className="mr-3" as={ChevronDownIcon} />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent>
                          <SelectDragIndicatorWrapper>
                            <SelectDragIndicator />
                          </SelectDragIndicatorWrapper>
                          <SelectItem label="India" value="India" />
                          <SelectItem label="Sri Lanka" value="Sri Lanka" />
                          <SelectItem label="Others" value="Others" />
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  )}
                />
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} size="md" />
                  <FormControlErrorText>
                    {errors?.country?.message}
                  </FormControlErrorText>
                </FormControlError>
              </FormControl>
              <FormControl
                className="w-[47%]"
                isInvalid={!!errors.zipcode || isEmailFocused}
              >
                <FormControlLabel className="mb-2">
                  <FormControlLabelText>Zipcode</FormControlLabelText>
                </FormControlLabel>
                <Controller
                  name="zipcode"
                  control={control}
                  rules={{
                    validate: async (value) => {
                      try {
                        await userSchema.parseAsync({
                          zipCode: value,
                        });
                        return true;
                      } catch (error: any) {
                        return error.message;
                      }
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input>
                      <InputField
                        placeholder="Enter 6 - digit zip code"
                        type="text"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onSubmitEditing={handleKeyPress}
                        returnKeyType="done"
                      />
                    </Input>
                  )}
                />
                <FormControlError>
                  <FormControlErrorIcon as={AlertCircle} size="md" />
                  <FormControlErrorText>
                    {errors?.zipcode?.message}
                  </FormControlErrorText>
                </FormControlError>
              </FormControl>
            </HStack>
            <Button
              onPress={() => {
                handleSubmit(onSubmit)();
              }}
              className="flex-1 p-2"
            >
              <ButtonText>Save Changes</ButtonText>
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
function MobileFooter({ footerIcons }: { footerIcons: any }) {
  const router = useRouter();
  return (
    <HStack
      className={cn(
        "bg-background-0 justify-between w-full absolute left-0 bottom-0 right-0 p-3 overflow-hidden items-center border-t-border-300 border-t",
        { "pb-5": Platform.OS === "ios" },
        { "pb-5": Platform.OS === "android" }
      )}
    >
      {footerIcons.map(
        (
          item: { iconText: string; iconName: any },
          index: React.Key | null | undefined
        ) => {
          return (
            <Pressable
              className="px-0.5 flex-1 flex-col items-center"
              key={index}
              onPress={() => router.push("/(tabs)/")}
            >
              <Icon
                as={item.iconName}
                size="md"
                className="h-[32px] w-[65px]"
              />
              <Text className="text-xs text-center text-typography-600">
                {item.iconText}
              </Text>
            </Pressable>
          );
        }
      )}
    </HStack>
  );
}
export const Profile = () => {
  const { isLoggedIn, isLoading, user } = useAuth();
  const router = useRouter();

  // 로그인이 안 되어 있으면 로그인 안내 화면 표시
  if (isLoading) {
    return (
      <SafeAreaView className="h-full w-full">
        <Center className="flex-1">
          <Text>로딩 중...</Text>
        </Center>
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView className="h-full w-full">
        <Center className="flex-1 px-6">
          <VStack space="xl" className="items-center">
            <Box className="w-20 h-20 rounded-full bg-yellow-400/20 items-center justify-center">
              <Text style={{ fontSize: 40 }}>🔒</Text>
            </Box>
            <VStack space="md" className="items-center">
              <Heading className="text-2xl text-center">
                로그인이 필요합니다
              </Heading>
              <Text className="text-center text-typography-600">
                프로필을 확인하고 설정을 변경하려면{"\n"}로그인해주세요
              </Text>
            </VStack>
            <VStack space="md" className="w-full">
              <Button
                onPress={() => router.push("/login")}
                className="bg-primary-600"
              >
                <ButtonText>로그인하기</ButtonText>
              </Button>
              <Button variant="outline" onPress={() => router.back()}>
                <ButtonText>돌아가기</ButtonText>
              </Button>
            </VStack>
          </VStack>
        </Center>
        <MobileFooter footerIcons={bottomTabsList} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="h-full w-full bg-background-0"
      style={{ justifyContent: "flex-start" }}
    >
      {/* 간단한 모바일 헤더 */}
      <Box className="py-6 px-4 border-b border-border-300 bg-background-0">
        <HStack className="items-center" space="md">
          <Pressable
            onPress={() => {
              router.back();
            }}
          >
            <Icon as={ChevronLeftIcon} />
          </Pressable>
        </HStack>
      </Box>

      {/* 메인 컨텐츠 */}
      <MainContent />

      <MobileFooter footerIcons={bottomTabsList} />
    </SafeAreaView>
  );
};
