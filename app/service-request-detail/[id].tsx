import React, { useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/service-request/supabaseClient";
import { useUpdateServiceRequestStatus } from "@/hooks/admin/useAdminPremium";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { ScrollView } from "@/components/ui/scroll-view";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Edit3,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Images,
  Expand,
  Shield,
  Package,
  Hash,
} from "lucide-react-native";
import {
  Alert,
  FlatList,
  Dimensions,
  Image,
  Modal,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { getOptimizedAuctionPhotoUrl } from "@/utils/imageOptimizer";

const { width: screenWidth } = Dimensions.get("window");

interface ServiceRequestPhoto {
  id: string;
  photo_url: string;
  photo_order: number;
  is_representative: boolean;
  created_at: string;
}

interface ServiceRequestDetail {
  id: string;
  serviceType: "appraisal" | "purchase";
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  contactPhone: string;
  useSafeNumber: boolean; // 새 필드
  address?: string; // 선택사항으로 변경
  addressDetail?: string;
  description?: string; // 선택사항으로 변경
  itemType?: string; // 새 필드
  quantity?: number; // 새 필드
  scheduledDate?: string;
  estimatedValue?: number;
  finalOffer?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  userName?: string;
  expertNotes?: string;
  photos?: ServiceRequestPhoto[];
}

/**
 * 서비스 요청 상세 정보 조회
 */
async function getServiceRequestDetail(
  requestId: string
): Promise<ServiceRequestDetail | null> {
  try {
    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (error) {
      console.error("서비스 요청 상세 조회 실패:", error);
      return null;
    }

    // 사용자 정보 조회
    let userName = "비회원";
    if (data.user_id) {
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("name")
          .eq("id", data.user_id)
          .single();

        if (userData?.name) {
          userName = userData.name;
        } else {
          userName = `회원 (${data.user_id.substring(0, 8)}...)`;
        }
      } catch (userError) {
        userName = `회원 (${data.user_id.substring(0, 8)}...)`;
      }
    }

    // 사진 정보 조회
    const { data: photosData } = await supabase
      .from("service_request_photos")
      .select("*")
      .eq("service_request_id", requestId)
      .order("photo_order", { ascending: true });

    return {
      id: data.id,
      serviceType: data.service_type,
      status: data.status,
      contactPhone: data.contact_phone,
      useSafeNumber: data.use_safe_number || false, // 새 필드
      address: data.address,
      addressDetail: data.address_detail,
      description: data.description,
      itemType: data.item_type, // 새 필드
      quantity: data.quantity, // 새 필드
      scheduledDate: data.scheduled_date,
      estimatedValue: data.estimated_value,
      finalOffer: data.final_offer,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      completedAt: data.completed_at,
      userName,
      expertNotes: data.expert_notes,
      photos: photosData || [],
    };
  } catch (error) {
    console.error("서비스 요청 상세 조회 중 오류:", error);
    return null;
  }
}

export default function ServiceRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const updateStatusMutation = useUpdateServiceRequestStatus();
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const {
    data: request,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["service-request-detail", id],
    queryFn: () => getServiceRequestDetail(id!),
    enabled: !!id,
  });

  // 서비스 타입 텍스트 변환
  const getServiceTypeText = (type: string) => {
    return type === "appraisal" ? "회사 방문 감정 및 매입" : "개인 매입 서비스";
  };

  // 상태 텍스트 변환
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "대기 중";
      case "assigned":
        return "담당자 배정";
      case "in_progress":
        return "진행 중";
      case "completed":
        return "완료";
      case "cancelled":
        return "취소";
      default:
        return status;
    }
  };

  // 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-orange-600";
      case "assigned":
        return "text-blue-600";
      case "in_progress":
        return "text-purple-600";
      case "completed":
        return "text-green-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
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

  // 가격 포맷 헬퍼
  const formatPrice = (price?: number) => {
    if (!price) return "-";
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(price);
  };

  // 이미지 관련 함수들
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // 이미지 로딩 상태 관리
  const handleImageLoad = (imageId: string) => {
    setLoadedImages((prev) => new Set([...prev, imageId]));
  };

  const handleImageError = (imageId: string) => {
    setLoadedImages((prev) => new Set([...prev, imageId]));
  };

  // 이미지 클릭 핸들러
  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageViewerVisible(true);
  };

  // 이미지 뷰어 닫기
  const closeImageViewer = () => {
    setIsImageViewerVisible(false);
  };

  // 이미지 뷰어용 이미지 데이터 준비
  const getImageViewerData = () => {
    if (!request?.photos) return [];

    return request.photos.map((photo) => ({
      url: getOptimizedAuctionPhotoUrl(supabase, photo.photo_url, "fullsize"),
      props: {
        source: {
          uri: getOptimizedAuctionPhotoUrl(
            supabase,
            photo.photo_url,
            "fullsize"
          ),
        },
      },
    }));
  };

  // 이미지 슬라이드 렌더링 함수
  const renderImageItem = ({
    item,
    index,
  }: {
    item: ServiceRequestPhoto;
    index: number;
  }) => {
    const isLoaded = loadedImages.has(item.id);

    const optimizedImageUrl = getOptimizedAuctionPhotoUrl(
      supabase,
      item.photo_url,
      "detail"
    );

    return (
      <TouchableOpacity
        style={{ width: screenWidth - 32, height: 180 }}
        onPress={() => handleImagePress(index)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: optimizedImageUrl }}
          style={{
            width: screenWidth - 32,
            height: 180,
            resizeMode: "cover",
          }}
          onLoadEnd={() => handleImageLoad(item.id)}
          onError={() => handleImageError(item.id)}
        />
        {!isLoaded && (
          <Box className="absolute inset-0 bg-black/30 items-center justify-center">
            <ActivityIndicator size="large" color="#FFFFFF" />
          </Box>
        )}
        {/* 확대 아이콘 힌트 */}
        <Box className="absolute top-4 right-4">
          <Expand size={20} color="rgba(255, 255, 255, 0.8)" />
        </Box>
      </TouchableOpacity>
    );
  };

  // 이미지 인디케이터 렌더링 함수
  const renderImageIndicator = () => {
    const photos = request?.photos || [];
    if (photos.length <= 1) return null;

    return (
      <HStack
        className="absolute bottom-2 left-0 right-0 justify-center"
        space="sm"
      >
        {photos.map((_, index) => (
          <Box
            key={index}
            className={`w-1.5 h-1.5 rounded-full ${
              index === currentImageIndex ? "bg-white/90" : "bg-white/30"
            }`}
          />
        ))}
      </HStack>
    );
  };

  // 상태 변경 처리
  const handleStatusUpdate = async () => {
    if (!request) return;

    const statusOptions = [
      { label: "대기 중", value: "pending" },
      { label: "담당자 배정", value: "assigned" },
      { label: "진행 중", value: "in_progress" },
      { label: "완료", value: "completed" },
      { label: "취소", value: "cancelled" },
    ];

    Alert.alert(
      "상태 변경",
      `${getServiceTypeText(request.serviceType)} • ${request.userName}\n${
        request.address
      }`,
      [
        ...statusOptions.map((option) => ({
          text: option.label,
          onPress: async () => {
            let finalOfferNumber: number | undefined;

            if (option.value === "completed") {
              // 완료 상태일 때 최종 견적 입력 받기
              Alert.prompt(
                "최종 견적 입력",
                "금액을 입력하세요 (선택사항)",
                [
                  { text: "취소", style: "cancel" },
                  {
                    text: "확인",
                    onPress: async (finalOffer) => {
                      finalOfferNumber = finalOffer
                        ? parseInt(finalOffer.replace(/[^0-9]/g, ""))
                        : undefined;

                      const result = await updateStatusMutation.mutateAsync({
                        requestId: request.id,
                        status: option.value as any,
                        finalOffer: finalOfferNumber,
                      });

                      if (result.success) {
                        Alert.alert(
                          "성공",
                          "상태가 성공적으로 변경되었습니다."
                        );
                      } else {
                        Alert.alert(
                          "오류",
                          result.error || "상태 변경에 실패했습니다."
                        );
                      }
                    },
                  },
                ],
                "plain-text",
                request.finalOffer?.toString() || ""
              );
            } else {
              const result = await updateStatusMutation.mutateAsync({
                requestId: request.id,
                status: option.value as any,
                finalOffer: finalOfferNumber,
              });

              if (result.success) {
                Alert.alert("성공", "상태가 성공적으로 변경되었습니다.");
              } else {
                Alert.alert(
                  "오류",
                  result.error || "상태 변경에 실패했습니다."
                );
              }
            }
          },
        })),
        { text: "취소", style: "cancel" },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-0">
        <Box className="flex-1 items-center justify-center">
          <Text className="text-gray-500">로딩 중...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (error || !request) {
    return (
      <SafeAreaView className="flex-1 bg-background-0">
        <Box className="flex-1 items-center justify-center">
          <Text className="text-red-500">요청을 찾을 수 없습니다.</Text>
          <Button onPress={() => router.back()} className="mt-4">
            <Button.Text>뒤로 가기</Button.Text>
          </Button>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      {/* 헤더 */}
      <Box className="py-4 px-4 border-b border-border-300 bg-background-0">
        <HStack className="items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={24} />
          </Pressable>
          <Heading size="lg">📋 서비스 요청 상세</Heading>
          <Pressable
            onPress={handleStatusUpdate}
            className="p-2 bg-blue-100 rounded-lg"
          >
            <Edit3 size={20} color="#3B82F6" />
          </Pressable>
        </HStack>
      </Box>

      {/* 컨텐츠 */}
      <ScrollView className="flex-1 px-4 pt-4">
        <VStack space="lg">
          {/* 기본 정보 */}
          <Box className="bg-white rounded-xl p-4 border border-gray-200">
            <Heading size="md" className="mb-3">
              📋 기본 정보
            </Heading>
            <VStack space="md">
              <HStack className="justify-between items-center">
                <Text className="font-medium">서비스 타입</Text>
                <Text className="text-blue-600 font-semibold">
                  {getServiceTypeText(request.serviceType)}
                </Text>
              </HStack>
              <HStack className="justify-between items-center">
                <Text className="font-medium">상태</Text>
                <Text
                  className={`font-semibold ${getStatusColor(request.status)}`}
                >
                  {getStatusText(request.status)}
                </Text>
              </HStack>
              <HStack className="justify-between items-center">
                <Text className="font-medium">요청자</Text>
                <Text className="text-gray-800">{request.userName}</Text>
              </HStack>
              <HStack className="justify-between items-center">
                <Text className="font-medium">요청일</Text>
                <Text className="text-gray-600">
                  {formatDate(request.createdAt)}
                </Text>
              </HStack>
            </VStack>
          </Box>

          {/* 연락처 정보 */}
          <Box className="bg-white rounded-xl p-4 border border-gray-200">
            <Heading size="md" className="mb-3">
              📞 연락처 정보
            </Heading>
            <VStack space="md">
              <HStack className="items-start space-x-3">
                <Phone size={20} color="#6B7280" className="mt-1" />
                <VStack className="flex-1">
                  <Text className="font-medium">연락처</Text>
                  <HStack className="items-center" space="sm">
                    <Text className="text-gray-600">
                      {request.contactPhone}
                    </Text>
                    <Box
                      className={`px-2 py-1 rounded-full ${
                        request.useSafeNumber ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          request.useSafeNumber
                            ? "text-green-700"
                            : "text-gray-600"
                        }`}
                      >
                        {request.useSafeNumber
                          ? "🛡️ 안심번호"
                          : "📞 안심번호 미사용"}
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
              </HStack>
              {request.address && (
                <HStack className="items-start space-x-3">
                  <MapPin size={20} color="#6B7280" className="mt-1" />
                  <VStack className="flex-1">
                    <Text className="font-medium">주소</Text>
                    <Text className="text-gray-600">{request.address}</Text>
                    {request.addressDetail && (
                      <Text className="text-gray-500 text-sm">
                        {request.addressDetail}
                      </Text>
                    )}
                  </VStack>
                </HStack>
              )}
            </VStack>
          </Box>

          {/* 금속 정보 */}
          {(request.itemType || request.quantity) && (
            <Box className="bg-white rounded-xl p-4 border border-gray-200">
              <Heading size="md" className="mb-3">
                📦 금속 정보
              </Heading>
              <VStack space="md">
                {request.itemType && (
                  <HStack className="justify-between items-center">
                    <Text className="font-medium">종류</Text>
                    <Box className="bg-blue-100 px-3 py-1 rounded-full">
                      <Text className="text-blue-700 font-medium">
                        {request.itemType}
                      </Text>
                    </Box>
                  </HStack>
                )}
                {request.quantity && (
                  <HStack className="justify-between items-center">
                    <Text className="font-medium">수량</Text>
                    <Box className="bg-green-100 px-3 py-1 rounded-full">
                      <Text className="text-green-700 font-medium">
                        {request.quantity}kg
                      </Text>
                    </Box>
                  </HStack>
                )}
              </VStack>
            </Box>
          )}

          {/* 요청 내용 */}
          {request.description && (
            <Box className="bg-white rounded-xl p-4 border border-gray-200">
              <Heading size="md" className="mb-3">
                📝 요청 내용
              </Heading>
              <VStack space="md">
                <HStack className="items-start space-x-3">
                  <FileText size={20} color="#6B7280" className="mt-1" />
                  <VStack className="flex-1">
                    <Text className="font-medium">설명</Text>
                    <Text className="text-gray-600 leading-5">
                      {request.description}
                    </Text>
                  </VStack>
                </HStack>
                {request.scheduledDate && (
                  <HStack className="items-start space-x-3">
                    <Calendar size={20} color="#6B7280" className="mt-1" />
                    <VStack className="flex-1">
                      <Text className="font-medium">희망 일정</Text>
                      <Text className="text-gray-600">
                        {formatDate(request.scheduledDate)}
                      </Text>
                    </VStack>
                  </HStack>
                )}
              </VStack>
            </Box>
          )}

          {/* 이미지 갤러리 */}
          <Box className="bg-white rounded-xl p-4 border border-gray-200">
            <Heading size="md" className="mb-2">
              📸 업로드된 이미지
            </Heading>
            {request.photos && request.photos.length > 0 ? (
              <VStack space="sm">
                <Box style={{ width: "100%", height: 180 }}>
                  <FlatList
                    ref={flatListRef}
                    data={request.photos}
                    renderItem={({ item, index }) =>
                      renderImageItem({ item, index })
                    }
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1 }}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                  />
                  {renderImageIndicator()}
                </Box>
                <Text className="text-xs text-gray-500">
                  이미지를 탭하면 전체화면으로 볼 수 있습니다.
                </Text>
              </VStack>
            ) : (
              <VStack space="sm" className="items-center py-6">
                <Images size={40} color="#9CA3AF" />
                <Text className="text-gray-500 text-center text-sm">
                  업로드된 이미지가 없습니다.
                </Text>
                <Text className="text-gray-400 text-xs text-center">
                  요청 시 이미지를 업로드하지 않았거나{"\n"}
                  이미지가 삭제되었을 수 있습니다.
                </Text>
              </VStack>
            )}
          </Box>

          {/* 견적 정보 */}
          <Box className="bg-white rounded-xl p-4 border border-gray-200">
            <Heading size="md" className="mb-3">
              💰 견적 정보
            </Heading>
            <VStack space="md">
              <HStack className="justify-between items-center">
                <Text className="font-medium">예상 가치</Text>
                <Text className="text-blue-600 font-semibold">
                  {formatPrice(request.estimatedValue)}
                </Text>
              </HStack>
              <HStack className="justify-between items-center">
                <Text className="font-medium">최종 견적</Text>
                <Text className="text-green-600 font-bold text-lg">
                  {formatPrice(request.finalOffer)}
                </Text>
              </HStack>
            </VStack>
          </Box>

          {/* 처리 정보 */}
          <Box className="bg-white rounded-xl p-4 border border-gray-200">
            <Heading size="md" className="mb-3">
              ⚙️ 처리 정보
            </Heading>
            <VStack space="md">
              <HStack className="justify-between items-center">
                <Text className="font-medium">최종 수정</Text>
                <Text className="text-gray-600">
                  {formatDate(request.updatedAt)}
                </Text>
              </HStack>
              {request.completedAt && (
                <HStack className="justify-between items-center">
                  <Text className="font-medium">완료일</Text>
                  <Text className="text-green-600 font-semibold">
                    {formatDate(request.completedAt)}
                  </Text>
                </HStack>
              )}
              {request.expertNotes && (
                <VStack space="sm">
                  <Text className="font-medium">전문가 메모</Text>
                  <Text className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {request.expertNotes}
                  </Text>
                </VStack>
              )}
            </VStack>
          </Box>
        </VStack>
      </ScrollView>

      {/* 이미지 뷰어 모달 */}
      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        onRequestClose={closeImageViewer}
        animationType="fade"
      >
        <StatusBar hidden />
        <ImageViewer
          imageUrls={getImageViewerData()}
          index={selectedImageIndex}
          onCancel={closeImageViewer}
          enableSwipeDown={true}
          swipeDownThreshold={50}
          saveToLocalByLongPress={false}
          menuContext={{
            saveToLocal: "이미지 저장",
            cancel: "취소",
          }}
          renderHeader={() => (
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 50,
                right: 20,
                zIndex: 999,
                paddingHorizontal: 16,
                paddingVertical: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.3)",
              }}
              onPress={closeImageViewer}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                닫기
              </Text>
            </TouchableOpacity>
          )}
        />
      </Modal>
    </SafeAreaView>
  );
}
