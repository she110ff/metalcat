import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sampleScrapAuctions,
  sampleMachineryAuctions,
  sampleMaterialsAuctions,
  sampleDemolitionAuctions,
  type AuctionItem,
  type AuctionCategory,
  type ScrapAuctionFormData,
} from "@/data";

// 쿼리 키 패턴
export const auctionKeys = {
  all: ["auctions"] as const,
  lists: () => [...auctionKeys.all, "list"] as const,
  list: (filters?: { category?: AuctionCategory; status?: string }) =>
    [...auctionKeys.lists(), filters] as const,
  details: () => [...auctionKeys.all, "detail"] as const,
  detail: (id: string) => [...auctionKeys.details(), id] as const,
  myAuctions: (userId: string) => [...auctionKeys.all, "my", userId] as const,
};

// 로컬 데이터 저장소 (실제로는 AsyncStorage나 상태관리 라이브러리 사용)
let localAuctionData: AuctionItem[] = [];

// 초기 데이터가 없으면 Sample 데이터 추가
const initializeSampleData = () => {
  if (localAuctionData.length === 0) {
    localAuctionData = [
      ...sampleScrapAuctions,
      ...sampleMachineryAuctions,
      ...sampleMaterialsAuctions,
      ...sampleDemolitionAuctions,
    ];
    console.log("Sample 데이터 초기화 완료:", localAuctionData.length, "개");
  }
};

// 시뮬레이션된 API 함수들
const auctionAPI = {
  // 경매 목록 조회
  getAuctions: async (filters?: {
    category?: AuctionCategory;
    status?: string;
  }): Promise<AuctionItem[]> => {
    // 네트워크 지연 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 데이터가 없으면 Sample 데이터 초기화
    initializeSampleData();

    let filtered = localAuctionData;

    if (filters?.category) {
      filtered = filtered.filter(
        (auction) => auction.auctionCategory === filters.category
      );
    }

    if (filters?.status) {
      filtered = filtered.filter(
        (auction) => auction.status === filters.status
      );
    }

    return filtered.sort((a, b) => {
      const dateA =
        typeof a.createdAt === "string" ? new Date(a.createdAt) : a.createdAt;
      const dateB =
        typeof b.createdAt === "string" ? new Date(b.createdAt) : b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });
  },

  // 경매 상세 조회
  getAuctionById: async (id: string): Promise<AuctionItem | null> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return localAuctionData.find((auction) => auction.id === id) || null;
  },

  // 경매 생성
  createAuction: async (
    auctionData: Partial<AuctionItem>
  ): Promise<AuctionItem> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newAuction: AuctionItem = {
      id: `auction_${Date.now()}`,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
      bids: [],
      ...auctionData,
    } as AuctionItem;

    localAuctionData.unshift(newAuction);
    return newAuction;
  },

  // 경매 수정
  updateAuction: async (
    id: string,
    updates: Partial<AuctionItem>
  ): Promise<AuctionItem> => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const index = localAuctionData.findIndex((auction) => auction.id === id);
    if (index === -1) {
      throw new Error("경매를 찾을 수 없습니다.");
    }

    localAuctionData[index] = {
      ...localAuctionData[index],
      ...updates,
      updatedAt: new Date(),
    } as AuctionItem;

    return localAuctionData[index];
  },

  // 경매 삭제
  deleteAuction: async (id: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const index = localAuctionData.findIndex((auction) => auction.id === id);
    if (index === -1) {
      throw new Error("경매를 찾을 수 없습니다.");
    }

    localAuctionData.splice(index, 1);
  },
};

// 경매 목록 조회 훅
export const useAuctions = (filters?: {
  category?: AuctionCategory;
  status?: string;
}) => {
  return useQuery({
    queryKey: auctionKeys.list(filters),
    queryFn: () => auctionAPI.getAuctions(filters),
    staleTime: 2 * 60 * 1000, // 2분
  });
};

// 경매 상세 조회 훅
export const useAuction = (id: string) => {
  return useQuery({
    queryKey: auctionKeys.detail(id),
    queryFn: () => auctionAPI.getAuctionById(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1분
  });
};

// 경매 생성 훅
export const useCreateAuction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: auctionAPI.createAuction,
    onSuccess: (newAuction) => {
      // 경매 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });

      // 새 경매를 상세 캐시에 추가
      queryClient.setQueryData(auctionKeys.detail(newAuction.id), newAuction);
    },
    onError: (error) => {
      console.error("경매 생성 실패:", error);
    },
  });
};

// 경매 수정 훅
export const useUpdateAuction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<AuctionItem>;
    }) => auctionAPI.updateAuction(id, updates),
    onSuccess: (updatedAuction) => {
      // 경매 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });

      // 상세 캐시 업데이트
      queryClient.setQueryData(
        auctionKeys.detail(updatedAuction.id),
        updatedAuction
      );
    },
  });
};

// 경매 삭제 훅
export const useDeleteAuction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: auctionAPI.deleteAuction,
    onSuccess: (_, deletedId) => {
      // 경매 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });

      // 상세 캐시에서 제거
      queryClient.removeQueries({ queryKey: auctionKeys.detail(deletedId) });
    },
  });
};
