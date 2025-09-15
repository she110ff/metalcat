import { AuctionItem, ApprovalStatus } from "@/data/types/auction";
import { formatAuctionPrice, getCompactRemainingTime } from "@/data";
import { formatAddressForList } from "@/utils/addressFormatter";

/**
 * AuctionItem을 기존 UI 컴포넌트에서 사용하던 형태로 변환하는 어댑터
 */
export interface LegacyAuctionItemFormat {
  id: string;
  title: string;
  metalType: string;
  weight: string;
  currentBid: string;
  endTime: string;
  status: "active" | "ending" | "ended";
  bidders: number;
  address?: string;
  approvalStatus: ApprovalStatus;
}

export function adaptAuctionItemForUI(
  auction: AuctionItem
): LegacyAuctionItemFormat {
  return {
    id: auction.id,
    title: getAuctionTitle(auction),
    metalType: getMetalType(auction),
    weight: getWeight(auction),
    currentBid: formatAuctionPrice(auction.currentBid || 0),
    endTime: auction.endTime
      ? getCompactRemainingTime(auction.endTime)
      : "종료됨",
    status: auction.status as "active" | "ending" | "ended",
    bidders: auction.bidders || 0,
    address: auction.address?.address
      ? formatAddressForList(auction.address.address)
      : undefined,
    approvalStatus: auction.approvalStatus,
  };
}

function getAuctionTitle(auction: AuctionItem): string {
  if (auction.auctionCategory === "demolition") {
    return (auction as any).demolitionInfo?.demolitionTitle || auction.title;
  }
  if (auction.auctionCategory === "machinery") {
    return (auction as any).productName || auction.title;
  }
  return auction.title || "고철 경매";
}

function getMetalType(auction: AuctionItem): string {
  if (auction.auctionCategory === "demolition") {
    return "철거";
  }
  return auction.productType?.name || "고철";
}

function getWeight(auction: AuctionItem): string {
  if (auction.auctionCategory === "demolition") {
    const area =
      (auction as any)?.demolitionArea ||
      (auction as any)?.demolitionInfo?.demolitionArea;
    const areaUnit =
      (auction as any)?.areaUnit || (auction as any)?.demolitionInfo?.areaUnit;

    if (area && area > 0) {
      return `${area.toLocaleString()} ${areaUnit === "sqm" ? "㎡" : "평"}`;
    }
    return "미상";
  }

  if (auction.quantity?.quantity) {
    const unit = auction.auctionCategory === "machinery" ? "대" : "kg";
    return `${auction.quantity.quantity}${unit}`;
  }

  return "1건";
}
