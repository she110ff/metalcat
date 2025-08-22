import React from "react";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { SlaveUser } from "@/hooks/admin/useSlaveUsers";

interface SlaveUserCardProps {
  user: SlaveUser;
  onCreateAuction: (user: SlaveUser) => void;
}

const SlaveUserCard: React.FC<SlaveUserCardProps> = ({
  user,
  onCreateAuction,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    // 전화번호 포맷팅 (예: 01012345678 -> 010-1234-5678)
    if (phoneNumber.length === 11) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(
        3,
        7
      )}-${phoneNumber.slice(7)}`;
    }
    return phoneNumber;
  };

  return (
    <Box className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <HStack className="items-center justify-between">
        <VStack space="xs" className="flex-1">
          <HStack className="items-center" space="sm">
            <Text className="font-semibold text-gray-900 text-base">
              {user.name}
            </Text>
            <Box className="bg-blue-100 px-2 py-1 rounded-full">
              <Text className="text-xs text-blue-800 font-medium">
                슬레이브
              </Text>
            </Box>
            {user.is_phone_verified && (
              <Box className="bg-green-100 px-2 py-1 rounded-full">
                <Text className="text-xs text-green-800 font-medium">
                  인증완료
                </Text>
              </Box>
            )}
          </HStack>

          <Text className="text-sm text-gray-600">
            📞 {formatPhoneNumber(user.phone_number)}
          </Text>

          <Text className="text-xs text-gray-500">
            가입일: {formatDate(user.created_at)}
          </Text>
        </VStack>

        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onPress={() => onCreateAuction(user)}
        >
          <ButtonText className="text-white font-medium">경매 등록</ButtonText>
        </Button>
      </HStack>
    </Box>
  );
};

export default SlaveUserCard;
