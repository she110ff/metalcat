import { useState, useEffect } from "react";
import { supabase } from "@/hooks/auth/api";

export interface SlaveUser {
  id: string;
  name: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
  is_phone_verified: boolean;
}

export const useSlaveUsers = () => {
  const [slaveUsers, setSlaveUsers] = useState<SlaveUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlaveUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc("get_slave_users");

      if (fetchError) {
        throw fetchError;
      }

      setSlaveUsers(data || []);
    } catch (err) {
      console.error("슬레이브 유저 조회 오류:", err);
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const setUserSlaveStatus = async (userId: string, isSlaveStatus: boolean) => {
    try {
      const { data, error: updateError } = await supabase.rpc(
        "set_user_slave_status",
        {
          user_id: userId,
          is_slave_status: isSlaveStatus,
        }
      );

      if (updateError) {
        throw updateError;
      }

      // 성공 시 목록 새로고침
      await fetchSlaveUsers();
      return true;
    } catch (err) {
      console.error("슬레이브 상태 변경 오류:", err);
      setError(
        err instanceof Error ? err.message : "상태 변경에 실패했습니다."
      );
      return false;
    }
  };

  useEffect(() => {
    fetchSlaveUsers();
  }, []);

  return {
    slaveUsers,
    isLoading,
    error,
    refetch: fetchSlaveUsers,
    setUserSlaveStatus,
  };
};

export default useSlaveUsers;
