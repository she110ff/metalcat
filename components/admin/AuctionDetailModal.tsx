import React from "react";
import { Modal } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { X, User, Phone, MapPin, Gavel } from "lucide-react-native";
import {
  useAuctionDetailInfo,
  AuctionDetailInfo,
} from "@/hooks/admin/useBidderDetails";

interface AuctionDetailModalProps {
  auctionId: string | null;
  isVisible: boolean;
  onClose: () => void;
}

const AuctionDetailModal: React.FC<AuctionDetailModalProps> = ({
  auctionId,
  isVisible,
  onClose,
}) => {
  const {
    data: auctionDetail,
    isLoading,
    error,
  } = useAuctionDetailInfo(auctionId || "");

  // 카테고리명 변환
  const getCategoryText = (category: string) => {
    switch (category) {
      case "scrap":
        return "고철";
      case "machinery":
        return "중고기계";
      case "materials":
        return "중고자재";
      case "demolition":
        return "철거";
      default:
        return category;
    }
  };

  // 상태 텍스트 변환
  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "진행중";
      case "ending":
        return "마감임박";
      case "ended":
        return "종료";
      case "cancelled":
        return "취소";
      default:
        return status;
    }
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-blue-600";
      case "ending":
        return "text-orange-600";
      case "ended":
        return "text-gray-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // 가격 포맷 헬퍼
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(price);
  };

  // 시간 포맷 헬퍼
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 전화번호 포맷 헬퍼
  const formatPhoneNumber = (phoneNumber: string) => {
    if (phoneNumber.length === 11) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(
        3,
        7
      )}-${phoneNumber.slice(7)}`;
    }
    return phoneNumber;
  };

  // 주소 포맷 헬퍼
  const formatAddress = (address: any) => {
    if (typeof address === "string") {
      return address;
    }
    if (address && typeof address === "object") {
      return `${address.address || ""} ${address.addressDetail || ""}`.trim();
    }
    return "주소 정보 없음";
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Box className="flex-1 bg-background-0">
        {/* 헤더 */}
        <Box className="py-4 px-4 border-b border-border-300 bg-background-0">
          <HStack className="items-center justify-between">
            <Heading size="lg">경매 상세 정보</Heading>
            <Pressable onPress={onClose} className="p-2">
              <X size={24} color="#666" />
            </Pressable>
          </HStack>
        </Box>

        <ScrollView className="flex-1 px-4 py-4">
          {isLoading ? (
            <Box className="flex-1 items-center justify-center py-8">
              <Text className="text-gray-500">상세 정보를 불러오는 중...</Text>
            </Box>
          ) : error ? (
            <Box className="flex-1 items-center justify-center py-8">
              <Text className="text-red-500">
                정보를 불러오는데 실패했습니다.
              </Text>
            </Box>
          ) : auctionDetail ? (
            <VStack space="lg">
              {/* 경매 기본 정보 */}
              <Box className="bg-white rounded-xl p-4 border border-gray-200">
                <Heading size="md" className="mb-3">
                  📋 경매 정보
                </Heading>
                <VStack space="md">
                  <VStack space="xs">
                    <Text className="font-semibold text-lg">
                      {auctionDetail.title}
                    </Text>
                    <HStack className="items-center" space="sm">
                      <Text className="text-sm text-gray-600">
                        {getCategoryText(auctionDetail.auctionCategory)}
                      </Text>
                      <Text className="text-sm">•</Text>
                      <Text
                        className={`text-sm font-medium ${getStatusColor(
                          auctionDetail.status
                        )}`}
                      >
                        {getStatusText(auctionDetail.status)}
                      </Text>
                    </HStack>
                  </VStack>

                  {auctionDetail.description && (
                    <Text className="text-sm text-gray-700">
                      {auctionDetail.description}
                    </Text>
                  )}

                  <HStack className="justify-between items-center py-2 border-t border-gray-100">
                    <Text className="font-medium">시작가</Text>
                    <Text className="text-gray-800">
                      {formatPrice(auctionDetail.startingPrice)}
                    </Text>
                  </HStack>
                  <HStack className="justify-between items-center py-2 border-t border-gray-100">
                    <Text className="font-medium">현재 최고가</Text>
                    <Text className="text-green-600 font-bold">
                      {formatPrice(auctionDetail.currentBid)}
                    </Text>
                  </HStack>
                  <HStack className="justify-between items-center py-2 border-t border-gray-100">
                    <Text className="font-medium">입찰자 수</Text>
                    <Text className="text-blue-600 font-bold">
                      {auctionDetail.bidderCount}명
                    </Text>
                  </HStack>
                  <HStack className="justify-between items-center py-2 border-t border-gray-100">
                    <Text className="font-medium">마감 시간</Text>
                    <Text className="text-gray-800">
                      {formatDate(auctionDetail.endTime)}
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              {/* 등록자 정보 */}
              <Box className="bg-white rounded-xl p-4 border border-gray-200">
                <Heading size="md" className="mb-3">
                  👤 등록자 정보
                </Heading>
                <VStack space="md">
                  <HStack className="items-center" space="sm">
                    <User size={16} color="#666" />
                    <Text className="font-semibold">
                      {auctionDetail.seller.name}
                    </Text>
                  </HStack>
                  <HStack className="items-center" space="sm">
                    <Phone size={16} color="#666" />
                    <Text className="text-gray-700">
                      {formatPhoneNumber(auctionDetail.seller.phoneNumber)}
                    </Text>
                  </HStack>
                  <HStack className="items-start" space="sm">
                    <MapPin size={16} color="#666" className="mt-1" />
                    <Text className="text-gray-700 flex-1">
                      {formatAddress(auctionDetail.seller.address)}
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              {/* 입찰자 정보 */}
              <Box className="bg-white rounded-xl p-4 border border-gray-200">
                <Heading size="md" className="mb-3">
                  🏆 입찰자 정보 ({auctionDetail.bidders.length}명)
                </Heading>
                {auctionDetail.bidders.length > 0 ? (
                  <VStack space="md">
                    {auctionDetail.bidders.map((bidder, index) => (
                      <Box
                        key={bidder.id}
                        className={`p-3 rounded-lg border ${
                          bidder.isTopBid
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <VStack space="sm">
                          <HStack className="justify-between items-start">
                            <VStack className="flex-1">
                              <HStack className="items-center" space="sm">
                                <Text className="font-semibold">
                                  {bidder.name}
                                </Text>
                                {bidder.isTopBid && (
                                  <Box className="bg-green-100 px-2 py-1 rounded-full">
                                    <Text className="text-xs text-green-700 font-medium">
                                      최고가
                                    </Text>
                                  </Box>
                                )}
                              </HStack>
                              <HStack className="items-center" space="sm">
                                <Phone size={14} color="#666" />
                                <Text className="text-sm text-gray-700">
                                  {formatPhoneNumber(bidder.phoneNumber)}
                                </Text>
                              </HStack>
                              <HStack className="items-start" space="sm">
                                <MapPin
                                  size={14}
                                  color="#666"
                                  className="mt-0.5"
                                />
                                <Text className="text-sm text-gray-700 flex-1">
                                  {bidder.address}
                                  {bidder.addressDetail &&
                                    ` ${bidder.addressDetail}`}
                                </Text>
                              </HStack>
                            </VStack>
                            <VStack className="items-end">
                              <HStack className="items-center" space="xs">
                                <Gavel size={14} color="#666" />
                                <Text className="text-sm font-bold text-blue-600">
                                  {formatPrice(bidder.bidAmount)}
                                </Text>
                              </HStack>
                              <Text className="text-xs text-gray-500">
                                {formatDate(bidder.bidTime)}
                              </Text>
                            </VStack>
                          </HStack>
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Text className="text-gray-500 text-center py-4">
                    아직 입찰자가 없습니다.
                  </Text>
                )}
              </Box>
            </VStack>
          ) : (
            <Box className="flex-1 items-center justify-center py-8">
              <Text className="text-gray-500">
                경매 정보를 찾을 수 없습니다.
              </Text>
            </Box>
          )}
        </ScrollView>
      </Box>
    </Modal>
  );
};

export default AuctionDetailModal;
