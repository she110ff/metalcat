import { AuctionDetail } from "@/screens/auction-detail";
import { useLocalSearchParams } from "expo-router";

export default function AuctionDetailPage() {
  const { id } = useLocalSearchParams();

  // ID를 key로 사용하여 ID가 변경될 때 컴포넌트가 완전히 새로 마운트되도록 함
  return <AuctionDetail key={id as string} />;
}
