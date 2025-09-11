import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/hooks/auth/api";
import { useAuth } from "@/hooks/useAuth";

export interface CalculationStandard {
  id: string;
  metal_type: string;
  category: string;
  lme_ratio: number;
  deviation: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCalculationStandardData {
  metal_type: string;
  category: string;
  lme_ratio: number;
  deviation: number;
}

export interface UpdateCalculationStandardData
  extends CreateCalculationStandardData {
  id: string;
}

// 계산 기준 목록 조회
export const useCalculationStandards = () => {
  return useQuery({
    queryKey: ["calculation-standards"],
    queryFn: async (): Promise<CalculationStandard[]> => {
      const { data, error } = await supabase.rpc("get_calculation_standards");
      if (error) throw error;
      return data || [];
    },
  });
};

// 계산 기준 생성
export const useCreateCalculationStandard = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (standard: CreateCalculationStandardData) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase.rpc(
        "create_calculation_standard",
        {
          p_user_id: user.id,
          p_metal_type: standard.metal_type,
          p_category: standard.category,
          p_lme_ratio: standard.lme_ratio,
          p_deviation: standard.deviation,
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculation-standards"] });
    },
  });
};

// 계산 기준 수정
export const useUpdateCalculationStandard = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (standard: UpdateCalculationStandardData) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase.rpc(
        "update_calculation_standard",
        {
          p_user_id: user.id,
          p_id: standard.id,
          p_metal_type: standard.metal_type,
          p_category: standard.category,
          p_lme_ratio: standard.lme_ratio,
          p_deviation: standard.deviation,
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculation-standards"] });
    },
  });
};

// 계산 기준 삭제
export const useDeleteCalculationStandard = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase.rpc(
        "delete_calculation_standard",
        {
          p_user_id: user.id,
          p_id: id,
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculation-standards"] });
    },
  });
};

// 특정 금속의 계산 기준 조회 (향후 계산기 연동용)
export const useCalculationStandardByMetal = (
  metalType: string,
  category: string
) => {
  return useQuery({
    queryKey: ["calculation-standard", metalType, category],
    queryFn: async (): Promise<CalculationStandard | null> => {
      const { data, error } = await supabase.rpc(
        "get_calculation_standard_by_metal",
        {
          p_metal_type: metalType,
          p_category: category,
        }
      );
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!metalType && !!category,
  });
};

// 금속 종류별 구분 목록 조회
export const useCategoriesByMetal = (metalType: string) => {
  return useQuery({
    queryKey: ["categories-by-metal", metalType],
    queryFn: async (): Promise<
      Array<{ category: string; lme_ratio: number; deviation: number }>
    > => {
      const { data, error } = await supabase.rpc("get_categories_by_metal", {
        p_metal_type: metalType,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!metalType,
  });
};
