import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  phoneNumber: string;
  name?: string;
  createdAt: string;
}

interface LoginRequest {
  phoneNumber: string;
  verificationCode?: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

// 로그인 상태 조회
export const useAuth = () => {
  const queryClient = useQueryClient();

  // 저장된 토큰으로 사용자 정보 조회
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user"],
    queryFn: async (): Promise<User | null> => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        if (!token) return null;

        // 실제로는 API 호출
        // const response = await fetch('/api/auth/me', {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // if (!response.ok) throw new Error('인증 실패');
        // return await response.json();

        // 임시 데이터
        const userData = await AsyncStorage.getItem("userData");
        return userData ? JSON.parse(userData) : null;
      } catch (error) {
        // 토큰이 유효하지 않으면 제거
        await AsyncStorage.multiRemove(["authToken", "userData"]);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  });

  // 전화번호 로그인
  const loginMutation = useMutation({
    mutationFn: async (request: LoginRequest): Promise<LoginResponse> => {
      // 실제로는 API 호출
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(request)
      // });
      // if (!response.ok) throw new Error('로그인 실패');
      // return await response.json();

      // 임시 구현 - 개발용
      if (!request.phoneNumber || request.phoneNumber.length < 10) {
        throw new Error("올바른 전화번호를 입력해주세요");
      }

      // 가짜 사용자 데이터
      const mockUser: User = {
        id: `user_${Date.now()}`,
        phoneNumber: request.phoneNumber,
        name: `사용자${request.phoneNumber.slice(-4)}`,
        createdAt: new Date().toISOString(),
      };

      const mockToken = `token_${Date.now()}`;

      return {
        user: mockUser,
        token: mockToken,
      };
    },
    onSuccess: async (data) => {
      // 토큰과 사용자 정보 저장
      await AsyncStorage.setItem("authToken", data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(data.user));

      // 쿼리 캐시 업데이트
      queryClient.setQueryData(["user"], data.user);

      console.log("✅ 로그인 성공:", data.user);
    },
    onError: (error) => {
      console.error("❌ 로그인 실패:", error);
    },
  });

  // 로그아웃
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // 실제로는 API 호출
      // await fetch('/api/auth/logout', { method: 'POST' });

      // 로컬 데이터 삭제
      await AsyncStorage.multiRemove(["authToken", "userData"]);
    },
    onSuccess: () => {
      // 쿼리 캐시 초기화
      queryClient.setQueryData(["user"], null);
      queryClient.invalidateQueries({ queryKey: ["user"] });

      console.log("✅ 로그아웃 성공");
    },
  });

  return {
    // 상태
    user,
    isLoggedIn: !!user,
    isLoading,
    error,

    // 액션
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,

    // 로딩 상태
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,

    // 에러
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
  };
};
