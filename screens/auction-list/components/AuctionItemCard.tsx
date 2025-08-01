import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Clock, Users } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useAuctionResult } from "@/hooks/useAuctions";
import { ResultBadge } from "@/components/auction/ui/ResultBadge";
import { formatAuctionPrice } from "@/data";

interface AuctionItemProps {
  item: {
    id: string;
    title: string;
    metalType: string;
    weight: string;
    currentBid: string;
    endTime: string;
    status: "active" | "ending" | "ended";
    bidders: number;
  };
  onPress: (id: string) => void;
}

export const AuctionItemCard: React.FC<AuctionItemProps> = ({
  item,
  onPress,
}) => {
  const { user } = useAuth();
  const { data: result } = useAuctionResult(item.id);

  // 현재 사용자가 낙찰자인지 확인
  const isWinner =
    result?.result === "successful" && result?.winningUserId === user?.id;

  return (
    <TouchableOpacity
      key={item.id}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <View style={{ gap: 12 }}>
          {/* 헤더 (제목과 결과 배지) */}
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
                  color: "white",
                  fontWeight: "600",
                  fontSize: 16,
                  marginBottom: 4,
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 14,
                }}
              >
                {item.metalType} • {item.weight}
              </Text>
            </View>

            {/* 결과 배지 (종료된 경매만) */}
            {item.status === "ended" && result && (
              <View style={{ marginTop: 2 }}>
                <ResultBadge
                  result={result.result}
                  winningAmount={result.winningAmount}
                  isWinner={isWinner}
                  size="sm"
                />
              </View>
            )}
          </View>

          {/* 가격과 상태 정보 */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 14,
                  }}
                >
                  현재가:
                </Text>
                <Text
                  style={{
                    color: "#00E5B8",
                    fontWeight: "700",
                    fontSize: 16,
                    marginLeft: 8,
                  }}
                >
                  {item.status === "ended" && result?.result === "successful"
                    ? formatAuctionPrice(result.winningAmount || 0)
                    : item.currentBid}
                </Text>
              </View>

              {/* 추가 결과 정보 (종료된 경매) */}
              {item.status === "ended" && result && (
                <View style={{ marginTop: 4 }}>
                  {result.result === "successful" && (
                    <Text
                      style={{
                        color: isWinner ? "#FCD34D" : "rgba(255,255,255,0.7)",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {isWinner ? "축하합니다! 낙찰받으셨습니다" : `낙찰 완료`}
                    </Text>
                  )}
                  {result.result === "failed" && (
                    <Text
                      style={{
                        color: "rgba(239, 68, 68, 0.8)",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      유찰됨 - 입찰자 없음
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={{ alignItems: "flex-end", gap: 8 }}>
              {/* 상태 표시 */}
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor:
                    item.status === "active"
                      ? "rgba(34, 197, 94, 0.2)"
                      : item.status === "ending"
                      ? "rgba(251, 191, 36, 0.2)"
                      : "rgba(107, 114, 128, 0.2)",
                }}
              >
                <Text
                  style={{
                    color:
                      item.status === "active"
                        ? "#22C55E"
                        : item.status === "ending"
                        ? "#FBBF24"
                        : "#6B7280",
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {item.status === "active"
                    ? "진행중"
                    : item.status === "ending"
                    ? "마감임박"
                    : "종료됨"}
                </Text>
              </View>

              {/* 입찰자 수 */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Users
                  size={14}
                  color="rgba(255,255,255,0.6)"
                  strokeWidth={2}
                />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    marginLeft: 4,
                  }}
                >
                  {item.bidders}
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
                  size={14}
                  color="rgba(255,255,255,0.6)"
                  strokeWidth={2}
                />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    marginLeft: 4,
                  }}
                >
                  {item.status === "ended" ? "종료됨" : item.endTime}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
