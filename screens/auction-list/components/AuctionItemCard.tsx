import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Clock, Users, MapPin } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useAuctionResult } from "@/hooks/useAuctions";

import { formatAuctionPrice } from "@/data";
import { AuctionItem } from "@/data/types/auction";
import {
  adaptAuctionItemForUI,
  LegacyAuctionItemFormat,
} from "@/utils/auctionItemAdapter";

interface AuctionItemProps {
  item: AuctionItem;
  onPress: (id: string) => void;
}

export const AuctionItemCard: React.FC<AuctionItemProps> = ({
  item,
  onPress,
}) => {
  const { user } = useAuth();
  const { data: result } = useAuctionResult(item.id);

  // AuctionItem을 기존 UI 형태로 변환
  const adaptedItem = adaptAuctionItemForUI(item);

  // 현재 사용자가 낙찰자인지 확인
  const isWinner =
    result?.result === "successful" && result?.winningUserId === user?.id;

  // 경매가 종료되었는지 확인
  const isEnded = adaptedItem.status === "ended";

  return (
    <TouchableOpacity
      key={item.id}
      onPress={() => onPress(item.id)}
      activeOpacity={isEnded ? 0.5 : 0.7}
      style={{
        opacity: isEnded ? 0.6 : 1,
      }}
    >
      <View
        style={{
          backgroundColor: isEnded
            ? "rgba(255, 255, 255, 0.02)"
            : "rgba(255, 255, 255, 0.04)",
          borderWidth: 1,
          borderColor: isEnded
            ? "rgba(255, 255, 255, 0.04)"
            : "rgba(255, 255, 255, 0.08)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <View style={{ gap: 8 }}>
          {/* 헤더 (제목과 상태) */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: isEnded ? "rgba(255,255,255,0.4)" : "white",
                  fontWeight: "600",
                  fontSize: 16,
                  marginBottom: 2,
                }}
              >
                {adaptedItem.title}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text
                  style={{
                    color: isEnded
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,255,255,0.6)",
                    fontSize: 13,
                  }}
                >
                  {adaptedItem.metalType} • {adaptedItem.weight}
                </Text>
                {adaptedItem.address && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <MapPin
                      size={11}
                      color={
                        isEnded
                          ? "rgba(255,255,255,0.25)"
                          : "rgba(255,255,255,0.5)"
                      }
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        color: isEnded
                          ? "rgba(255,255,255,0.25)"
                          : "rgba(255,255,255,0.5)",
                        fontSize: 12,
                      }}
                    >
                      {adaptedItem.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 상태 표시 */}
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor:
                  adaptedItem.status === "active"
                    ? "rgba(34, 197, 94, 0.2)"
                    : adaptedItem.status === "ending"
                    ? "rgba(251, 191, 36, 0.2)"
                    : result?.result === "successful"
                    ? "rgba(34, 197, 94, 0.2)"
                    : result?.result === "failed"
                    ? "rgba(239, 68, 68, 0.2)"
                    : "rgba(107, 114, 128, 0.2)",
              }}
            >
              <Text
                style={{
                  color:
                    adaptedItem.status === "active"
                      ? "#22C55E"
                      : adaptedItem.status === "ending"
                      ? "#FBBF24"
                      : result?.result === "successful"
                      ? "#22C55E"
                      : result?.result === "failed"
                      ? "#EF4444"
                      : "#6B7280",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {adaptedItem.status === "active"
                  ? "진행중"
                  : adaptedItem.status === "ending"
                  ? "마감임박"
                  : result?.result === "successful"
                  ? "낙찰"
                  : result?.result === "failed"
                  ? "유찰"
                  : "종료"}
              </Text>
            </View>
          </View>

          {/* 가격과 메타 정보 */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* 현재가 */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: isEnded
                    ? "rgba(255,255,255,0.3)"
                    : "rgba(255,255,255,0.6)",
                  fontSize: 13,
                }}
              >
                현재가:
              </Text>
              <Text
                style={{
                  color: isEnded ? "rgba(0,229,184,0.6)" : "#00E5B8",
                  fontWeight: "700",
                  fontSize: 16,
                  marginLeft: 6,
                }}
              >
                {adaptedItem.status === "ended" &&
                result?.result === "successful"
                  ? formatAuctionPrice(result.winningAmount || 0)
                  : adaptedItem.currentBid}
              </Text>
            </View>

            {/* 메타 정보들 (입찰자수, 시간) */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              {/* 입찰자 수 */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Users
                  size={13}
                  color={
                    isEnded ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.5)"
                  }
                  strokeWidth={2}
                />
                <Text
                  style={{
                    color: isEnded
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    marginLeft: 3,
                  }}
                >
                  {adaptedItem.bidders}
                </Text>
              </View>

              {/* 시간 정보 */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Clock
                  size={13}
                  color={
                    isEnded ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.5)"
                  }
                  strokeWidth={2}
                />
                <Text
                  style={{
                    color: isEnded
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    marginLeft: 3,
                  }}
                >
                  {adaptedItem.status === "ended"
                    ? "종료됨"
                    : adaptedItem.endTime || "시간 미정"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
