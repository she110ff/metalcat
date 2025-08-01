import React, { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

// 관리자 전화번호 목록 (환경 변수로 관리 권장)
const ADMIN_PHONE_NUMBERS = [
  "01012345678", // 테스트용 관리자 번호
  "01087654321", // 추가 관리자 번호
];

export interface AdminUser {
  isAdmin: boolean | undefined; // undefined = 확인 중, true/false = 확인 완료
  phoneNumber?: string;
  adminLevel?: "super" | "basic"; // 향후 확장용
}

/**
 * 관리자 권한 확인 훅
 */
export const useAdminAuth = (): AdminUser => {
  const { user, isLoggedIn } = useAuth();
  const [adminInfo, setAdminInfo] = useState<AdminUser>({
    isAdmin: undefined, // 초기 상태는 확인 중
  });

  useEffect(() => {
    // 로그인 상태가 명확히 결정되지 않았으면 대기
    if (isLoggedIn === undefined) {
      return;
    }

    // 로그인하지 않았거나 사용자 정보가 없으면 관리자 아님
    if (!isLoggedIn || !user?.phoneNumber) {
      setAdminInfo({ isAdmin: false });
      return;
    }

    // 전화번호에서 하이픈 제거하고 비교
    const cleanPhoneNumber = user.phoneNumber.replace(/\D/g, "");
    const isAdmin = ADMIN_PHONE_NUMBERS.some(
      (adminPhone) => adminPhone.replace(/\D/g, "") === cleanPhoneNumber
    );

    setAdminInfo({
      isAdmin,
      phoneNumber: user.phoneNumber,
      adminLevel: isAdmin ? "super" : undefined, // 향후 확장용
    });

    // 디버그 로그
    console.log("🔐 관리자 권한 확인:", {
      userPhone: cleanPhoneNumber,
      isAdmin,
      adminPhones: ADMIN_PHONE_NUMBERS,
    });
  }, [user, isLoggedIn]);

  return adminInfo;
};

/**
 * 관리자 권한이 필요한 컴포넌트를 위한 HOC
 */
export const withAdminAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> => {
  const Component = (props: P) => {
    const { isAdmin } = useAdminAuth();

    if (!isAdmin) {
      return null; // 또는 접근 거부 화면
    }

    return <WrappedComponent {...props} />;
  };

  return Component;
};
