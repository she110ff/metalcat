import React, { useState, useEffect } from "react";
import { Modal, Alert, ActivityIndicator } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { X, User, Phone, MapPin, Check } from "lucide-react-native";
import { useSlaveUsers, SlaveUser } from "@/hooks/admin/useSlaveUsers";
import { useBids } from "@/hooks/useAuctions";

interface SlaveUserSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectUser: (user: SlaveUser) => void;
  auctionId: string;
  bidAmount: number;
  pricePerUnit?: number; // 고철 경매용 단위가격
}

export const SlaveUserSelectionModal: React.FC<
  SlaveUserSelectionModalProps
> = ({
  visible,
  onClose,
  onSelectUser,
  auctionId,
  bidAmount,
  pricePerUnit,
}) => {
  const { slaveUsers, isLoading, error, refetch } = useSlaveUsers();
  const { data: bids } = useBids(auctionId);
  const [selectedUser, setSelectedUser] = useState<SlaveUser | null>(null);

  // 이미 입찰한 슬레이브 유저 ID 목록
  const biddenSlaveUserIds = new Set(
    bids
      ?.filter((bid) => slaveUsers.some((slave) => slave.id === bid.userId))
      .map((bid) => bid.userId) || []
  );

  // 입찰 가능한 슬레이브 유저 목록 (이미 입찰한 유저 제외)
  const availableSlaveUsers = slaveUsers.filter(
    (user) => !biddenSlaveUserIds.has(user.id)
  );

  // 이미 입찰한 슬레이브 유저 목록
  const biddenSlaveUsers = slaveUsers.filter((user) =>
    biddenSlaveUserIds.has(user.id)
  );

  const handleSelectUser = () => {
    if (!selectedUser) {
      Alert.alert("선택 오류", "슬레이브 유저를 선택해주세요.");
      return;
    }

    Alert.alert(
      "입찰 확인",
      `${
        selectedUser.name
      } 유저로 ${bidAmount.toLocaleString()}원을 입찰하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "입찰하기",
          onPress: () => {
            onSelectUser(selectedUser);
            setSelectedUser(null);
            onClose();
          },
        },
      ]
    );
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    if (phoneNumber.length === 11) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(
        3,
        7
      )}-${phoneNumber.slice(7)}`;
    }
    return phoneNumber;
  };

  const renderSlaveUserItem = (
    user: SlaveUser,
    isDisabled: boolean = false
  ) => (
    <Pressable
      key={user.id}
      onPress={() => !isDisabled && setSelectedUser(user)}
      disabled={isDisabled}
      className={`p-4 rounded-xl border-2 mb-3 ${
        isDisabled
          ? "bg-gray-100 border-gray-200 opacity-60"
          : selectedUser?.id === user.id
          ? "bg-blue-50 border-blue-300"
          : "bg-white border-gray-200"
      }`}
    >
      <HStack className="items-center justify-between">
        <VStack space="xs" className="flex-1">
          <HStack className="items-center" space="sm">
            <User size={16} color={isDisabled ? "#9CA3AF" : "#374151"} />
            <Text
              className={`font-semibold text-base ${
                isDisabled ? "text-gray-400" : "text-gray-900"
              }`}
            >
              {user.name}
            </Text>
            {user.is_phone_verified && (
              <Box className="bg-green-100 px-2 py-1 rounded-full">
                <Text className="text-xs text-green-800 font-medium">인증</Text>
              </Box>
            )}
            {isDisabled && (
              <Box className="bg-red-100 px-2 py-1 rounded-full">
                <Text className="text-xs text-red-800 font-medium">
                  입찰완료
                </Text>
              </Box>
            )}
          </HStack>

          <HStack className="items-center" space="sm">
            <Phone size={14} color={isDisabled ? "#9CA3AF" : "#6B7280"} />
            <Text
              className={`text-sm ${
                isDisabled ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {formatPhoneNumber(user.phone_number)}
            </Text>
          </HStack>

          {user.address && (
            <HStack className="items-center" space="sm">
              <MapPin size={14} color={isDisabled ? "#9CA3AF" : "#6B7280"} />
              <Text
                className={`text-xs ${
                  isDisabled ? "text-gray-400" : "text-gray-500"
                }`}
                numberOfLines={1}
              >
                {user.address}
              </Text>
            </HStack>
          )}
        </VStack>

        {!isDisabled && selectedUser?.id === user.id && (
          <Box className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center">
            <Check size={16} color="white" />
          </Box>
        )}
      </HStack>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Box className="flex-1 bg-gray-50">
        {/* 헤더 */}
        <Box className="bg-white border-b border-gray-200 px-6 py-4">
          <HStack className="items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">
              슬레이브 유저 선택
            </Text>
            <Pressable onPress={onClose} className="p-2">
              <X size={24} color="#6B7280" />
            </Pressable>
          </HStack>
          <Text className="text-sm text-gray-600 mt-1">
            입찰할 슬레이브 유저를 선택해주세요
          </Text>
        </Box>

        {/* 입찰 금액 표시 */}
        <Box className="bg-blue-50 border-b border-blue-100 px-6 py-3">
          <Text className="text-center text-blue-800 font-semibold">
            입찰 금액: {bidAmount.toLocaleString()}원
          </Text>
        </Box>

        {/* 컨텐츠 */}
        <ScrollView className="flex-1 px-6 py-4">
          {isLoading ? (
            <Box className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-gray-500 mt-4">
                슬레이브 유저 목록을 불러오는 중...
              </Text>
            </Box>
          ) : error ? (
            <Box className="flex-1 items-center justify-center py-20">
              <Text className="text-red-600 text-center mb-4">
                오류: {error}
              </Text>
              <Button onPress={refetch} className="bg-red-600">
                <ButtonText className="text-white">다시 시도</ButtonText>
              </Button>
            </Box>
          ) : (
            <VStack space="lg">
              {/* 입찰 가능한 슬레이브 유저 */}
              {availableSlaveUsers.length > 0 && (
                <VStack space="md">
                  <Text className="text-lg font-bold text-gray-900">
                    입찰 가능한 유저 ({availableSlaveUsers.length}명)
                  </Text>
                  {availableSlaveUsers.map((user) =>
                    renderSlaveUserItem(user, false)
                  )}
                </VStack>
              )}

              {/* 이미 입찰한 슬레이브 유저 */}
              {biddenSlaveUsers.length > 0 && (
                <VStack space="md">
                  <Text className="text-lg font-bold text-gray-500">
                    이미 입찰한 유저 ({biddenSlaveUsers.length}명)
                  </Text>
                  {biddenSlaveUsers.map((user) =>
                    renderSlaveUserItem(user, true)
                  )}
                </VStack>
              )}

              {/* 슬레이브 유저가 없는 경우 */}
              {slaveUsers.length === 0 && (
                <Box className="items-center justify-center py-20">
                  <Text className="text-gray-500 text-center">
                    등록된 슬레이브 유저가 없습니다.
                  </Text>
                </Box>
              )}

              {/* 모든 슬레이브 유저가 이미 입찰한 경우 */}
              {slaveUsers.length > 0 && availableSlaveUsers.length === 0 && (
                <Box className="items-center justify-center py-10">
                  <Text className="text-orange-600 text-center font-medium">
                    모든 슬레이브 유저가 이미 입찰했습니다.
                  </Text>
                </Box>
              )}
            </VStack>
          )}
        </ScrollView>

        {/* 하단 버튼 */}
        {availableSlaveUsers.length > 0 && (
          <Box className="bg-white border-t border-gray-200 px-6 py-4">
            <HStack space="md">
              <Button onPress={onClose} className="flex-1 bg-gray-200">
                <ButtonText className="text-gray-700">취소</ButtonText>
              </Button>
              <Button
                onPress={handleSelectUser}
                disabled={!selectedUser}
                className={`flex-1 ${
                  selectedUser ? "bg-blue-600" : "bg-gray-400"
                }`}
              >
                <ButtonText className="text-white">
                  {selectedUser ? `${selectedUser.name}로 입찰` : "유저 선택"}
                </ButtonText>
              </Button>
            </HStack>
          </Box>
        )}
      </Box>
    </Modal>
  );
};
