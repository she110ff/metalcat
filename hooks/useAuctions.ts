import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sampleScrapAuctions,
  sampleMachineryAuctions,
  sampleMaterialsAuctions,
  sampleDemolitionAuctions,
  type AuctionItem,
  type AuctionCategory,
  type ScrapAuctionFormData,
  type BidInfo,
} from "@/data";

// 쿼리 키 패턴
export const auctionKeys = {
  all: ["auctions"] as const,
  lists: () => [...auctionKeys.all, "list"] as const,
  list: (filters?: {
    category?: AuctionCategory;
    status?: string;
    sortBy?: "createdAt" | "endTime";
  }) => [...auctionKeys.lists(), filters] as const,
  details: () => [...auctionKeys.all, "detail"] as const,
  detail: (id: string) => [...auctionKeys.details(), id] as const,
  myAuctions: (userId: string) => [...auctionKeys.all, "my", userId] as const,
  bids: (auctionId: string) =>
    [...auctionKeys.detail(auctionId), "bids"] as const,
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
    sortBy?: "createdAt" | "endTime";
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

    // 상태 필터 처리
    if (filters?.status) {
      if (filters.status === "active") {
        // 진행중: active 또는 ending 상태
        filtered = filtered.filter(
          (auction) =>
            auction.status === "active" || auction.status === "ending"
        );
      } else {
        // 기타 상태 (ended 등)
        filtered = filtered.filter(
          (auction) => auction.status === filters.status
        );
      }
    }

    // 정렬 처리
    return filtered.sort((a, b) => {
      if (filters?.sortBy === "endTime") {
        // 마감시간 순 (가장 빨리 끝나는 것부터)
        const dateA =
          typeof a.endTime === "string" ? new Date(a.endTime) : a.endTime;
        const dateB =
          typeof b.endTime === "string" ? new Date(b.endTime) : b.endTime;
        return dateA.getTime() - dateB.getTime();
      } else {
        // 기본: 등록일 순 (최신부터)
        const dateA =
          typeof a.createdAt === "string" ? new Date(a.createdAt) : a.createdAt;
        const dateB =
          typeof b.createdAt === "string" ? new Date(b.createdAt) : b.createdAt;
        return dateB.getTime() - dateA.getTime();
      }
    });
  },

  // 경매 상세 조회
  getAuctionById: async (id: string): Promise<AuctionItem | null> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("🔍 경매 상세 조회 요청:", {
      requestedId: id,
      totalAuctions: localAuctionData.length,
      availableIds: localAuctionData.map((a) => a.id).slice(0, 5), // 처음 5개만
    });

    const foundAuction = localAuctionData.find((auction) => auction.id === id);

    if (!foundAuction) {
      console.log("❌ 경매를 찾을 수 없음:", {
        requestedId: id,
        allIds: localAuctionData.map((a) => a.id),
      });
    } else {
      console.log("✅ 경매 찾음:", {
        id: foundAuction.id,
        title:
          (foundAuction as any).title ||
          "제목 없음",
      });
    }

    return foundAuction || null;
  },

  // 경매 생성
  createAuction: async (
    auctionData: Partial<AuctionItem>
  ): Promise<AuctionItem> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // endTime이 없으면 기본값 설정 (7일 후)
    const endTime =
      auctionData.endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newAuction: AuctionItem = {
      id: `auction_${Date.now()}`,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      viewCount: 0,
      bids: [],
      endTime,
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

  // 입찰 생성
  createBid: async (
    auctionId: string,
    bidData: {
      userId: string;
      userName: string;
      amount: number;
      location: string;
    }
  ): Promise<BidInfo> => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const auctionIndex = localAuctionData.findIndex(
      (auction) => auction.id === auctionId
    );
    if (auctionIndex === -1) {
      throw new Error("경매를 찾을 수 없습니다.");
    }

    const auction = localAuctionData[auctionIndex];

    // 경매가 종료되었는지 확인
    if (auction.status === "ended") {
      throw new Error("이미 종료된 경매입니다.");
    }

    // 현재 최고 입찰가 확인
    const currentTopBid =
      auction.bids.length > 0
        ? Math.max(...auction.bids.map((bid) => bid.amount))
        : 0;

    // 입찰가가 현재 최고 입찰가보다 낮으면 에러
    if (bidData.amount <= currentTopBid) {
      throw new Error("현재 최고 입찰가보다 높은 금액을 입력해주세요.");
    }

    // 새 입찰 생성
    const newBid: BidInfo = {
      id: `bid_${Date.now()}`,
      userId: bidData.userId,
      userName: bidData.userName,
      amount: bidData.amount,
      location: bidData.location,
      bidTime: new Date(),
      isTopBid: true,
    };

    // 기존 입찰들의 isTopBid를 false로 변경
    auction.bids.forEach((bid) => {
      bid.isTopBid = false;
    });

    // 새 입찰 추가
    auction.bids.push(newBid);

    // 경매 정보 업데이트
    auction.currentBid = bidData.amount;
    auction.bidders = new Set(auction.bids.map((bid) => bid.userId)).size;
    auction.updatedAt = new Date();

    // 입찰 기록을 금액 순으로 정렬 (최고가 순)
    auction.bids.sort((a, b) => b.amount - a.amount);

    return newBid;
  },

  // 경매의 입찰 기록 조회
  getBids: async (auctionId: string): Promise<BidInfo[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const auction = localAuctionData.find(
      (auction) => auction.id === auctionId
    );

    if (!auction) {
      throw new Error("경매를 찾을 수 없습니다.");
    }

    // 입찰 기록을 금액 순으로 정렬 (최고가 순)
    return [...auction.bids].sort((a, b) => b.amount - a.amount);
  },
};

// 경매 목록 조회 훅
export const useAuctions = (filters?: {
  category?: AuctionCategory;
  status?: string;
  sortBy?: "createdAt" | "endTime";
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

// 입찰 생성 훅
export const useCreateBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      auctionId,
      bidData,
    }: {
      auctionId: string;
      bidData: {
        userId: string;
        userName: string;
        amount: number;
        location: string;
      };
    }) => auctionAPI.createBid(auctionId, bidData),
    // ✅ 낙관적 업데이트 추가
    onMutate: async ({ auctionId, bidData }) => {
      // 진행 중인 쿼리들을 취소
      await queryClient.cancelQueries({
        queryKey: auctionKeys.detail(auctionId),
      });
      await queryClient.cancelQueries({ queryKey: auctionKeys.lists() });

      // 이전 데이터를 백업
      const previousAuctionDetail = queryClient.getQueryData(
        auctionKeys.detail(auctionId)
      );
      const previousAuctionsList = queryClient.getQueryData(
        auctionKeys.lists()
      );

      // 낙관적으로 경매 상세 업데이트
      queryClient.setQueryData(auctionKeys.detail(auctionId), (old: any) => {
        if (!old) return old;

        const newBid = {
          id: `optimistic_bid_${Date.now()}`,
          userId: bidData.userId,
          userName: bidData.userName,
          amount: bidData.amount,
          location: bidData.location,
          bidTime: new Date(),
          isTopBid: true,
        };

        // 기존 입찰들의 isTopBid를 false로 변경
        const updatedBids = (old.bids || []).map((bid: any) => ({
          ...bid,
          isTopBid: false,
        }));

        return {
          ...old,
          currentBid: bidData.amount,
          bidders: new Set([
            ...updatedBids.map((bid: any) => bid.userId),
            bidData.userId,
          ]).size,
          bids: [newBid, ...updatedBids],
        };
      });

      // 낙관적으로 경매 목록 업데이트
      queryClient.setQueryData(auctionKeys.lists(), (old: any) => {
        if (!old) return old;

        return old.map((auction: any) => {
          if (auction.id === auctionId) {
            return {
              ...auction,
              currentBid: bidData.amount,
              bidders: auction.bidders + 1, // 간단하게 +1
            };
          }
          return auction;
        });
      });

      // 롤백을 위한 이전 데이터 반환
      return { previousAuctionDetail, previousAuctionsList };
    },
    onSuccess: (newBid, { auctionId }) => {
      // 성공 시 서버 데이터로 새로고침
      queryClient.invalidateQueries({
        queryKey: auctionKeys.detail(auctionId),
      });

      // 입찰 기록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: auctionKeys.bids(auctionId) });

      // 경매 목록 캐시 무효화 (현재 입찰가 업데이트)
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });
    },
    onError: (error, { auctionId }, context) => {
      console.error("입찰 실패:", error);

      // 에러 시 이전 상태로 롤백
      if (context?.previousAuctionDetail) {
        queryClient.setQueryData(
          auctionKeys.detail(auctionId),
          context.previousAuctionDetail
        );
      }
      if (context?.previousAuctionsList) {
        queryClient.setQueryData(
          auctionKeys.lists(),
          context.previousAuctionsList
        );
      }
    },
  });
};

// 입찰 기록 조회 훅
export const useBids = (auctionId: string) => {
  return useQuery({
    queryKey: auctionKeys.bids(auctionId),
    queryFn: () => auctionAPI.getBids(auctionId),
    enabled: !!auctionId,
    staleTime: 30 * 1000, // 30초
  });
};
