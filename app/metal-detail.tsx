import { MetalDetailScreen } from "@/components/MetalDetailScreen";
import { nickelDetailData } from "@/data/dashboard/metal-prices";
import { useRouter } from "expo-router";

export default function MetalDetailPage() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return <MetalDetailScreen data={nickelDetailData} onBack={handleBack} />;
}
