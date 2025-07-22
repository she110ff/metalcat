import { MetalDetailScreen } from "@/components/MetalDetailScreen";
import {
  aluminumDetailData,
  leadDetailData,
  zincDetailData,
  copperDetailData,
  tinDetailData,
  nickelDetailData,
} from "@/data/dashboard/collected-metal-prices";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function MetalDetailPage() {
  const router = useRouter();
  const { metal } = useLocalSearchParams<{ metal: string }>();

  const handleBack = () => {
    router.back();
  };

  // 금속별 데이터 매핑
  const getMetalData = (metalName: string) => {
    switch (metalName) {
      case "copper":
      case "구리":
        return copperDetailData;
      case "nickel":
      case "니켈":
        return nickelDetailData;
      case "aluminum":
      case "알루미늄":
        return aluminumDetailData;
      case "lead":
      case "납":
        return leadDetailData;
      case "zinc":
      case "아연":
        return zincDetailData;
      case "tin":
      case "주석":
        return tinDetailData;
      default:
        return nickelDetailData; // 기본값
    }
  };

  const metalData = getMetalData(metal || "nickel");

  return <MetalDetailScreen data={metalData} onBack={handleBack} />;
}
