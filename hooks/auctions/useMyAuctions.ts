import { useQuery } from "@tanstack/react-query";
import { auctionAPI } from "./api";
import { useAuth } from "@/hooks/useAuth";

/**
 * 내가 등록한 경매 목록을 조회하는 훅
 */
export const useMyAuctions = () => {
  const { user, isLoggedIn } = useAuth();

  return useQuery({
    queryKey: ["auctions", "my", user?.id],
    queryFn: () => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return auctionAPI.getMyAuctions(user.id);
    },
    enabled: isLoggedIn && !!user?.id,
    staleTime: 30 * 1000, // 30초
    gcTime: 5 * 60 * 1000, // 5분
  });
};

/**
 * 내가 입찰한 경매 목록을 조회하는 훅
 */
export const useMyBiddings = () => {
  const { user, isLoggedIn } = useAuth();

  return useQuery({
    queryKey: ["auctions", "my-biddings", user?.id],
    queryFn: () => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return auctionAPI.getMyBiddings(user.id);
    },
    enabled: isLoggedIn && !!user?.id,
    staleTime: 30 * 1000, // 30초
    gcTime: 5 * 60 * 1000, // 5분
  });
};
