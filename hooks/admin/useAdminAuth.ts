import { supabase } from "../service-request/supabaseClient";

export interface AdminUser {
  id: string;
  phoneNumber: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
}

/**
 * 모든 관리자 사용자 조회
 */
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, phone_number, name, is_admin, created_at")
      .eq("is_admin", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("관리자 사용자 목록 조회 실패:", error);
      return [];
    }

    return (data || []).map((user: any) => ({
      id: user.id,
      phoneNumber: user.phone_number,
      name: user.name,
      isAdmin: user.is_admin,
      createdAt: user.created_at,
    }));
  } catch (error) {
    console.error("관리자 사용자 조회 중 오류:", error);
    return [];
  }
}

/**
 * 사용자에게 관리자 권한 부여
 */
export async function grantAdminRole(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("users")
      .update({ is_admin: true })
      .eq("id", userId);

    if (error) {
      console.error("관리자 권한 부여 실패:", error);
      return false;
    }

    console.log("✅ 관리자 권한 부여 성공:", userId);
    return true;
  } catch (error) {
    console.error("관리자 권한 부여 중 오류:", error);
    return false;
  }
}

/**
 * 사용자의 관리자 권한 해제
 */
export async function revokeAdminRole(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("users")
      .update({ is_admin: false })
      .eq("id", userId);

    if (error) {
      console.error("관리자 권한 해제 실패:", error);
      return false;
    }

    console.log("✅ 관리자 권한 해제 성공:", userId);
    return true;
  } catch (error) {
    console.error("관리자 권한 해제 중 오류:", error);
    return false;
  }
}

/**
 * 전화번호로 사용자 검색
 */
export async function searchUserByPhone(
  phoneNumber: string
): Promise<AdminUser | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, phone_number, name, is_admin, created_at")
      .eq("phone_number", phoneNumber)
      .single();

    if (error || !data) {
      console.log("사용자를 찾을 수 없음:", phoneNumber);
      return null;
    }

    return {
      id: data.id,
      phoneNumber: data.phone_number,
      name: data.name,
      isAdmin: data.is_admin,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error("사용자 검색 중 오류:", error);
    return null;
  }
}
