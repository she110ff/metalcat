import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/auth/api";

export interface CalculationStandard {
  id: string;
  metal_type: string;
  category: string;
  lme_type: string; // LME 계산용 금속 타입 (구리, 알루미늄, 아연, 납, 주석, 니켈)
  calculation_type: "lme_based" | "fixed_price";
  lme_ratio?: number;
  fixed_price?: number;
  deviation: number;
  created_at: string;
  updated_at: string;
}

// 모든 계산 기준 조회 (LME 가격 정보 포함)
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

// 계산 기준을 metal_type + category로 그룹화하여 조회
export const useCalculationStandardsWithPrices = () => {
  return useQuery({
    queryKey: ["calculation-standards-with-prices"],
    queryFn: async (): Promise<CalculationStandard[]> => {
      const { data, error } = await supabase
        .from("calculation_standards")
        .select("*")
        .order("metal_type", { ascending: true })
        .order("category", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

// 특정 금속의 카테고리 목록 조회
export const useCategoriesByMetal = (metalType: string) => {
  return useQuery({
    queryKey: ["categories-by-metal", metalType],
    queryFn: async (): Promise<CalculationStandard[]> => {
      const { data, error } = await supabase
        .from("calculation_standards")
        .select("*")
        .eq("metal_type", metalType)
        .order("category");

      if (error) throw error;
      return data || [];
    },
    enabled: !!metalType,
  });
};

// LME 타입별 계산 기준 조회 (계산기용)
export const useCalculationStandardsByLmeType = (lmeType: string) => {
  return useQuery({
    queryKey: ["calculation-standards-by-lme-type", lmeType],
    queryFn: async (): Promise<CalculationStandard[]> => {
      const { data, error } = await supabase.rpc(
        "get_calculation_standards_by_lme_type",
        {
          p_lme_type: lmeType,
        }
      );
      if (error) throw error;
      return data || [];
    },
    enabled: !!lmeType,
  });
};

// 특정 금속과 카테고리의 계산 기준 조회
export const useCalculationStandardByMetalAndCategory = (
  metalType: string,
  category: string
) => {
  return useQuery({
    queryKey: ["calculation-standard", metalType, category],
    queryFn: async (): Promise<CalculationStandard | null> => {
      const { data, error } = await supabase
        .from("calculation_standards")
        .select("*")
        .eq("metal_type", metalType)
        .eq("category", category)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // No rows found
        throw error;
      }
      return data;
    },
    enabled: !!metalType && !!category,
  });
};
