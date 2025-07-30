import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  signupWithPhone,
  signinWithPhone,
  getCurrentUser,
  signOut,
  updateUser,
  User,
  SignupRequest,
  LoginRequest,
} from "./auth/api";
import {
  sendVerificationCode,
  verifyCode,
  getVerificationStatus,
  SendCodeRequest,
  VerifyCodeRequest,
} from "./auth/verification";

// TanStack Query를 사용한 인증 상태 관리
export const useAuth = () => {
  const queryClient = useQueryClient();

  // 현재 사용자 정보 조회
  const {
    data: user,
    isLoading,
    error,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    retry: 1,
  });

  // 인증 상태 조회
  const { data: verificationStatus, refetch: refetchVerificationStatus } =
    useQuery({
      queryKey: ["auth", "verification"],
      queryFn: getVerificationStatus,
      staleTime: 30 * 1000, // 30초
      gcTime: 2 * 60 * 1000, // 2분
    });

  // 인증번호 발송
  const sendCodeMutation = useMutation({
    mutationFn: sendVerificationCode,
    onSuccess: (data) => {
      // 인증 상태 쿼리 갱신
      queryClient.invalidateQueries({ queryKey: ["auth", "verification"] });
      console.log("✅ 인증번호 발송 성공:", data.message);
    },
    onError: (error) => {
      console.error("❌ 인증번호 발송 실패:", error);
    },
  });

  // 인증번호 확인
  const verifyCodeMutation = useMutation({
    mutationFn: verifyCode,
    onSuccess: (data) => {
      // 인증 상태 쿼리 갱신
      queryClient.invalidateQueries({ queryKey: ["auth", "verification"] });
      console.log("✅ 인증번호 확인 성공:", data.message);
    },
    onError: (error) => {
      console.error("❌ 인증번호 확인 실패:", error);
    },
  });

  // 회원가입
  const signupMutation = useMutation({
    mutationFn: signupWithPhone,
    onSuccess: (data) => {
      // 쿼리 캐시 업데이트
      queryClient.setQueryData(["auth", "user"], data.user);
      // 인증 상태도 초기화
      queryClient.invalidateQueries({ queryKey: ["auth", "verification"] });
      console.log("✅ 회원가입 성공:", data.user);
    },
    onError: (error) => {
      console.error("❌ 회원가입 실패:", error);
    },
  });

  // 로그인 (기존 사용자)
  const loginMutation = useMutation({
    mutationFn: signinWithPhone,
    onSuccess: (data) => {
      // 쿼리 캐시 업데이트
      queryClient.setQueryData(["auth", "user"], data.user);
      console.log("✅ 로그인 성공:", data.user);
    },
    onError: (error) => {
      console.error("❌ 로그인 실패:", error);
    },
  });

  // 로그아웃
  const logoutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      // 쿼리 캐시 초기화
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.invalidateQueries({ queryKey: ["auth"] });

      // 다른 관련 쿼리들도 초기화 (새로운 키 패턴 사용)
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });

      console.log("✅ 로그아웃 성공");
    },
    onError: (error) => {
      console.error("❌ 로그아웃 실패:", error);
    },
  });

  // 사용자 정보 업데이트
  const updateUserMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      // 쿼리 캐시 업데이트
      queryClient.setQueryData(["auth", "user"], updatedUser);
      console.log("✅ 사용자 정보 업데이트 성공:", updatedUser);
    },
    onError: (error) => {
      console.error("❌ 사용자 정보 업데이트 실패:", error);
    },
  });

  return {
    // 상태
    user,
    isLoggedIn: !!user,
    isLoading,
    error,

    // 인증 상태
    verificationStatus,
    isPhoneVerified: verificationStatus?.isVerified || false,
    verifiedPhoneNumber: verificationStatus?.phoneNumber,

    // 액션
    sendCode: sendCodeMutation.mutate,
    verifyCode: verifyCodeMutation.mutate,
    signup: signupMutation.mutate,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    updateUser: updateUserMutation.mutate,
    refetchUser,
    refetchVerificationStatus,

    // 로딩 상태
    isSendingCode: sendCodeMutation.isPending,
    isVerifyingCode: verifyCodeMutation.isPending,
    isSigningUp: signupMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isUpdatingUser: updateUserMutation.isPending,

    // 에러
    sendCodeError: sendCodeMutation.error,
    verifyCodeError: verifyCodeMutation.error,
    signupError: signupMutation.error,
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
    updateUserError: updateUserMutation.error,

    // 성공 상태 (UI에서 피드백용)
    isSendCodeSuccess: sendCodeMutation.isSuccess,
    isVerifyCodeSuccess: verifyCodeMutation.isSuccess,
    isSignupSuccess: signupMutation.isSuccess,
    isLoginSuccess: loginMutation.isSuccess,
  };
};
