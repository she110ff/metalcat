import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import {
  Calculator as CalculatorIcon,
  RotateCcw,
  TrendingUp,
} from "lucide-react-native";
import { useLatestLmePricesCompatible } from "@/hooks/lme";
import { useCalculationStandardsWithPrices } from "@/hooks/calculator/useCalculationStandards";
import type { CalculationStandard } from "@/hooks/calculator/useCalculationStandards";
import {
  useRelatedAuctionsByMetalType,
  formatAuctionPrice,
  getAuctionStatusText,
} from "@/hooks/calculator/useRelatedAuctions";

interface CalculationResult {
  standard: CalculationStandard;
  weight: number;
  basePrice: number;
  totalValue: number;
  priceRange: {
    min: number;
    max: number;
  };
}

export const Calculator = () => {
  console.log(
    "🧮 Calculator component rendering - 순수 React Native 스타일 버전"
  );

  const [selectedStandard, setSelectedStandard] =
    useState<CalculationStandard | null>(null);
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showStandardPicker, setShowStandardPicker] = useState(false);

  const router = useRouter();

  // LME 실시간 데이터 Hook
  const {
    data: realTimeLmeData,
    isLoading: isLmeLoading,
    error: lmeError,
  } = useLatestLmePricesCompatible();

  // 모든 계산 기준 조회
  const { data: calculationStandards, isLoading: isStandardsLoading } =
    useCalculationStandardsWithPrices();

  // 관련 경매 목록 조회 (선택된 계산 기준의 metal_type 기준)
  const { data: relatedAuctions, isLoading: isRelatedAuctionsLoading } =
    useRelatedAuctionsByMetalType(selectedStandard?.metal_type || "");

  // 경매 데이터 디버깅 로그
  useEffect(() => {
    if (selectedStandard?.metal_type && relatedAuctions) {
      console.log("🔍 검색된 metal_type:", selectedStandard.metal_type);
      console.log("📊 가져온 경매 개수:", relatedAuctions.length);
      console.log(
        "💰 관련 경매 목록:",
        relatedAuctions.map((auction, index) => ({
          순번: index + 1,
          제목: auction.title,
          현재가: `${auction.current_bid.toLocaleString()}원`,
          시작가: `${auction.starting_price.toLocaleString()}원`,
          상태: auction.status,
          판매자: auction.seller_name,
          종료시간: auction.end_time,
        }))
      );
    } else if (selectedStandard?.metal_type && !isRelatedAuctionsLoading) {
      console.log(
        "⚠️ 검색 결과 없음 - metal_type:",
        selectedStandard.metal_type
      );
    }
  }, [selectedStandard?.metal_type, relatedAuctions, isRelatedAuctionsLoading]);

  // 금속 가격 데이터 (실시간 LME 데이터 또는 기본값)
  const getMetalPrices = () => {
    if (realTimeLmeData && realTimeLmeData.length > 0) {
      const prices: {
        [key: string]: { price: number; unit: string; priceKRW: number };
      } = {};

      realTimeLmeData.forEach((item) => {
        // LME 가격을 원/kg으로 변환 (1달러 = 약 1300원 가정)
        const priceInKRW = item.price;
        const priceInUSD = priceInKRW / 1300; // 원화를 달러로 변환

        prices[item.metalName] = {
          price: priceInUSD,
          unit: "원/kg",
          priceKRW: priceInKRW,
        };
      });

      return prices;
    }

    // 기본 가격 (LME 데이터가 없을 때)
    return {
      구리: { price: 9.25, unit: "원/kg", priceKRW: 12025 },
      알루미늄: { price: 2.34, unit: "원/kg", priceKRW: 3042 },
      아연: { price: 2.89, unit: "원/kg", priceKRW: 3757 },
      납: { price: 2.16, unit: "원/kg", priceKRW: 2808 },
      주석: { price: 35.15, unit: "원/kg", priceKRW: 45695 },
      니켈: { price: 15.91, unit: "원/kg", priceKRW: 20683 },
      특수금속: { price: 25.0, unit: "원/kg", priceKRW: 32500 }, // 특수금속 기본가
    };
  };

  const metalPrices = getMetalPrices();

  // 텍스트 처리 함수: 중복 단어 제거 및 '없음' 단어 숨기기
  const processDisplayText = (
    lmeType: string,
    metalType: string,
    category: string
  ): string => {
    // 모든 단어를 배열로 분리
    const allWords = [lmeType, metalType, category]
      .join(" ")
      .split(" ")
      .filter((word) => word.trim() !== "" && word !== "없음"); // 빈 문자열과 '없음' 제거

    // 중복 제거 (첫 번째 등장하는 단어만 유지)
    const uniqueWords = [];
    const seenWords = new Set();

    for (const word of allWords) {
      if (!seenWords.has(word)) {
        uniqueWords.push(word);
        seenWords.add(word);
      }
    }

    return uniqueWords.join(" ");
  };

  // 계산 기준 선택 핸들러
  const handleStandardSelect = (standard: CalculationStandard) => {
    setSelectedStandard(standard);
    setResult(null);
    setShowStandardPicker(false);
  };

  // 계산된 가격 정보 가져오기
  const getCalculatedPrice = (standard: CalculationStandard): string => {
    const lmePrice = metalPrices[standard.lme_type];
    if (!lmePrice) return "가격 정보 없음";

    if (standard.calculation_type === "fixed_price") {
      return `고정 ${standard.fixed_price?.toLocaleString()}원/kg`;
    } else {
      const calculatedPrice = Math.round(
        lmePrice.priceKRW * ((standard.lme_ratio || 0) / 100)
      );
      return `LME ${
        standard.lme_ratio
      }% = ${calculatedPrice.toLocaleString()}원/kg`;
    }
  };

  const calculate = () => {
    if (
      !weight ||
      !selectedStandard ||
      selectedStandard.lme_type === "특수금속"
    )
      return;

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum)) return;

    let basePrice: number;

    if (selectedStandard.calculation_type === "fixed_price") {
      // 고정가격 타입: fixed_price 사용
      basePrice = selectedStandard.fixed_price || 0;
    } else {
      // LME 기반 타입: LME 시세 × LME 비율 (lme_type 기준으로 가격 조회)
      const metalPrice = metalPrices[selectedStandard.lme_type];
      if (!metalPrice) return;

      const lmeRatio = selectedStandard.lme_ratio || 100;
      basePrice = metalPrice.priceKRW * (lmeRatio / 100);
    }

    const totalValue = basePrice * weightNum;

    // 계산 결과 디버깅
    console.log("🧮 계산 결과:", {
      basePrice,
      weightNum,
      totalValue,
      totalValueType: typeof totalValue,
    });

    // 편차 계산
    const deviationAmount = basePrice * (selectedStandard.deviation / 100);
    const priceRange = {
      min: basePrice - deviationAmount,
      max: basePrice + deviationAmount,
    };

    setResult({
      standard: selectedStandard,
      weight: weightNum,
      basePrice,
      totalValue,
      priceRange,
    });
  };

  const reset = () => {
    setWeight("");
    setSelectedStandard(null);
    setResult(null);
  };

  // LME 가격 정보를 포함한 가격 표시 함수 (lme_type 기준)
  const getPriceDisplay = (standard: CalculationStandard) => {
    if (standard.calculation_type === "fixed_price") {
      return `고정가격: ${standard.fixed_price?.toLocaleString()}원/kg`;
    } else {
      const metalPrice = metalPrices[standard.lme_type];
      if (metalPrice) {
        const calculatedPrice =
          metalPrice.priceKRW * ((standard.lme_ratio || 100) / 100);
        return `${
          standard.lme_type
        } LME: ${calculatedPrice.toLocaleString()}원/kg (${
          standard.lme_ratio
        }%)`;
      }
      return `${standard.lme_type} LME 비율: ${standard.lme_ratio}%`;
    }
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={20}
        >
          <View style={{ flex: 1, padding: 24 }}>
            {/* Header */}
            <View
              style={{ alignItems: "center", marginTop: 20, marginBottom: 40 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <CalculatorIcon size={32} color="#FCD34D" strokeWidth={2.5} />
                <Text
                  style={{
                    fontFamily: "SpaceMono",
                    fontSize: 28,
                    fontWeight: "900",
                    color: "#F8FAFC",
                    letterSpacing: 6,
                    marginLeft: 12,
                    textShadowColor: "rgba(255, 255, 255, 0.4)",
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 4,
                  }}
                >
                  CALCULATOR
                </Text>
              </View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 16,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                금속 가격 계산기
              </Text>
            </View>

            {/* Metal Standard Selection */}
            <View
              style={{
                borderRadius: 24,
                padding: 24,
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: "#FCD34D",
                    fontSize: 20,
                    fontWeight: "bold",
                    letterSpacing: 2,
                  }}
                >
                  금속 구분
                </Text>
                {(isLmeLoading || isStandardsLoading) && (
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 12,
                      fontStyle: "italic",
                    }}
                  >
                    데이터 로딩중...
                  </Text>
                )}
              </View>

              {/* 계산 기준 선택 */}
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onPress={() => setShowStandardPicker(!showStandardPicker)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "white", fontSize: 16 }}>
                    {selectedStandard
                      ? processDisplayText(
                          selectedStandard.lme_type,
                          selectedStandard.metal_type,
                          selectedStandard.category
                        )
                      : "계산 기준을 선택하세요"}
                  </Text>
                  {selectedStandard && (
                    <Text
                      style={{
                        color:
                          selectedStandard.lme_type === "특수금속"
                            ? "rgba(255, 165, 0, 0.8)"
                            : "rgba(255,255,255,0.6)",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {selectedStandard.lme_type === "특수금속"
                        ? "⚠️ 특수금속은 계산 기능이 제한됩니다"
                        : getCalculatedPrice(selectedStandard)}
                    </Text>
                  )}
                </View>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>
                  ▼
                </Text>
              </TouchableOpacity>

              {/* 계산 기준 선택 피커 */}
              {showStandardPicker && calculationStandards && (
                <ScrollView
                  style={{
                    backgroundColor: "rgba(26, 26, 26, 0.95)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 16,
                    marginTop: 8,
                    maxHeight: 400,
                  }}
                  nestedScrollEnabled={true}
                >
                  {calculationStandards.map((standard, index) => {
                    const lmePrice = metalPrices[standard.lme_type];

                    return (
                      <TouchableOpacity
                        key={standard.id}
                        style={{
                          padding: 16,
                          borderBottomWidth:
                            index !== calculationStandards.length - 1 ? 1 : 0,
                          borderBottomColor: "rgba(255,255,255,0.05)",
                        }}
                        onPress={() => handleStandardSelect(standard)}
                      >
                        <View>
                          {/* 첫 번째 줄: LME 타입 + 경매 종류 + 구분 */}
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <Text
                              style={{
                                color: "white",
                                fontSize: 16,
                                fontWeight:
                                  selectedStandard?.id === standard.id
                                    ? "bold"
                                    : "normal",
                              }}
                            >
                              {processDisplayText(
                                standard.lme_type,
                                standard.metal_type,
                                standard.category
                              )}
                            </Text>
                            {selectedStandard?.id === standard.id && (
                              <Text style={{ color: "#FCD34D", fontSize: 16 }}>
                                ✓
                              </Text>
                            )}
                          </View>

                          {/* 두 번째 줄: 계산된 가격 정보 */}
                          {standard.lme_type === "특수금속" ? (
                            <Text
                              style={{
                                color: "rgba(255, 165, 0, 0.8)",
                                fontSize: 12,
                              }}
                            >
                              ⚠️ 계산 기능 제한 - 경매 정보만 제공
                            </Text>
                          ) : (
                            <View style={{ gap: 4 }}>
                              <Text
                                style={{
                                  color: "rgba(255,255,255,0.6)",
                                  fontSize: 12,
                                }}
                              >
                                {getCalculatedPrice(standard)}
                              </Text>
                              {lmePrice && (
                                <Text
                                  style={{
                                    color: "rgba(255, 211, 77, 0.8)",
                                    fontSize: 11,
                                  }}
                                >
                                  현재 LME: {lmePrice.priceKRW.toLocaleString()}
                                  원/kg
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Input Fields */}
            <View
              style={{
                borderRadius: 24,
                padding: 24,
                backgroundColor:
                  selectedStandard?.lme_type === "특수금속"
                    ? "rgba(255, 255, 255, 0.02)"
                    : "rgba(255, 255, 255, 0.04)",
                borderWidth: 1,
                borderColor:
                  selectedStandard?.lme_type === "특수금속"
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(255, 255, 255, 0.08)",
                marginBottom: 24,
                opacity: selectedStandard?.lme_type === "특수금속" ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  color:
                    selectedStandard?.lme_type === "특수금속"
                      ? "rgba(252, 211, 77, 0.5)"
                      : "#FCD34D",
                  fontSize: 20,
                  fontWeight: "bold",
                  letterSpacing: 2,
                  marginBottom: 24,
                }}
              >
                계산 정보
              </Text>

              {selectedStandard?.lme_type === "특수금속" && (
                <View
                  style={{
                    backgroundColor: "rgba(255, 165, 0, 0.1)",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                    borderWidth: 1,
                    borderColor: "rgba(255, 165, 0, 0.2)",
                  }}
                >
                  <Text
                    style={{
                      color: "rgba(255, 165, 0, 0.9)",
                      fontSize: 14,
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                  >
                    ⚠️ 특수금속은 시세 변동이 크고 복잡하여 자동 계산을 지원하지
                    않습니다.
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255, 165, 0, 0.7)",
                      fontSize: 12,
                      textAlign: "center",
                      marginTop: 4,
                    }}
                  >
                    관련 경매 정보를 참고하여 직접 문의해 주세요.
                  </Text>
                </View>
              )}

              {/* Weight Input */}
              {selectedStandard?.lme_type !== "특수금속" && (
                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: 14,
                      fontWeight: "600",
                      marginBottom: 8,
                      letterSpacing: 1,
                    }}
                  >
                    중량
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 16,
                      color: "white",
                      fontSize: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                    placeholder="킬로그램 단위로 입력"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* Buttons */}
              {selectedStandard?.lme_type !== "특수금속" && (
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(34, 197, 94, 0.15)",
                      borderColor: "rgba(34, 197, 94, 0.3)",
                      borderRadius: 18,
                      borderWidth: 1.5,
                      minHeight: 56,
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "row",
                      opacity: !weight || !selectedStandard ? 0.5 : 1,
                    }}
                    onPress={calculate}
                    disabled={!weight || !selectedStandard}
                  >
                    <TrendingUp size={20} color="#22C55E" strokeWidth={2.5} />
                    <Text
                      style={{
                        color: "#22C55E",
                        fontWeight: "bold",
                        fontSize: 16,
                        marginLeft: 8,
                      }}
                    >
                      계산하기
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      borderRadius: 16,
                      borderWidth: 1,
                      minHeight: 56,
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "row",
                    }}
                    onPress={reset}
                  >
                    <RotateCcw
                      size={18}
                      color="rgba(255,255,255,0.7)"
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontWeight: "600",
                        fontSize: 14,
                        marginLeft: 8,
                      }}
                    >
                      초기화
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Result */}
            {result && (
              <View
                style={{
                  borderRadius: 24,
                  padding: 24,
                  backgroundColor: "rgba(147, 51, 234, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(147, 51, 234, 0.15)",
                }}
              >
                <Text
                  style={{
                    color: "#C084FC",
                    fontSize: 20,
                    fontWeight: "bold",
                    letterSpacing: 2,
                    marginBottom: 20,
                  }}
                >
                  계산 결과
                </Text>

                <View style={{ gap: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}
                    >
                      금속 구분:
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      {String(result.standard.metal_type)}{" "}
                      {String(result.standard.category)}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}
                    >
                      중량:
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      {String(result.weight)} kg
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}
                    >
                      계산 방식:
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      {result.standard.calculation_type === "fixed_price"
                        ? "고정가격"
                        : "LME 기반"}
                    </Text>
                  </View>

                  {result.standard.calculation_type === "lme_based" && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}
                      >
                        LME 비율:
                      </Text>
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "600",
                          fontSize: 16,
                        }}
                      >
                        {String(result.standard.lme_ratio)}%
                      </Text>
                    </View>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}
                    >
                      기준 단가:
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      {typeof result.basePrice === "number"
                        ? result.basePrice.toLocaleString()
                        : "0"}
                      원/kg
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}
                    >
                      가격 범위 (±{String(result.standard.deviation)}%):
                    </Text>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          color: "#FCD34D",
                          fontWeight: "600",
                          fontSize: 14,
                        }}
                      >
                        {typeof result.priceRange.min === "number"
                          ? result.priceRange.min.toLocaleString()
                          : "0"}{" "}
                        ~{" "}
                        {typeof result.priceRange.max === "number"
                          ? result.priceRange.max.toLocaleString()
                          : "0"}
                        원/kg
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: "rgba(255,255,255,0.2)",
                      paddingTop: 16,
                      marginTop: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "bold",
                          color: "white",
                        }}
                      >
                        총 가치:
                      </Text>
                      <Text
                        style={{
                          fontSize: 24,
                          fontWeight: "900",
                          color: "#22C55E",
                        }}
                      >
                        {typeof result.totalValue === "number"
                          ? result.totalValue.toLocaleString()
                          : "0"}
                        원
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 관련 경매 목록 */}
            {selectedStandard &&
              relatedAuctions &&
              relatedAuctions.length > 0 && (
                <View
                  style={{
                    borderRadius: 24,
                    padding: 24,
                    backgroundColor: "rgba(59, 130, 246, 0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(59, 130, 246, 0.15)",
                    marginTop: 24,
                  }}
                >
                  <Text
                    style={{
                      color: "#60A5FA",
                      fontSize: 20,
                      fontWeight: "bold",
                      letterSpacing: 2,
                      marginBottom: 20,
                    }}
                  >
                    {selectedStandard.metal_type} 관련 경매 (최고가 3개)
                  </Text>

                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 14,
                      marginBottom: 16,
                    }}
                  >
                    "{selectedStandard.metal_type}" 경매 종류 관련 경매 목록
                  </Text>

                  {isRelatedAuctionsLoading ? (
                    <View style={{ alignItems: "center", padding: 20 }}>
                      <ActivityIndicator size="small" color="#60A5FA" />
                      <Text
                        style={{ color: "rgba(255,255,255,0.6)", marginTop: 8 }}
                      >
                        관련 경매를 찾는 중...
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      {relatedAuctions.slice(0, 3).map((auction, index) => (
                        <View
                          key={auction.id}
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.04)",
                            borderRadius: 16,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: "rgba(255, 255, 255, 0.08)",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: 8,
                            }}
                          >
                            <View style={{ flex: 1, marginRight: 12 }}>
                              <Text
                                style={{
                                  color: "white",
                                  fontSize: 16,
                                  fontWeight: "600",
                                  marginBottom: 4,
                                }}
                                numberOfLines={2}
                              >
                                {auction.title}
                              </Text>
                              <Text
                                style={{
                                  color: "rgba(255,255,255,0.6)",
                                  fontSize: 13,
                                }}
                              >
                                {auction.seller_name} •{" "}
                                {typeof auction.address_info === "object" &&
                                auction.address_info?.address
                                  ? auction.address_info.address
                                  : typeof auction.address_info === "string"
                                  ? auction.address_info
                                  : "주소 정보 없음"}
                              </Text>
                            </View>

                            <View style={{ alignItems: "flex-end" }}>
                              <View
                                style={{
                                  backgroundColor:
                                    getAuctionStatusText(auction.status) ===
                                    "진행중"
                                      ? "rgba(34, 197, 94, 0.2)"
                                      : "rgba(156, 163, 175, 0.2)",
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 8,
                                  marginBottom: 4,
                                }}
                              >
                                <Text
                                  style={{
                                    color:
                                      getAuctionStatusText(auction.status) ===
                                      "진행중"
                                        ? "#22C55E"
                                        : "#9CA3AF",
                                    fontSize: 12,
                                    fontWeight: "600",
                                  }}
                                >
                                  {getAuctionStatusText(auction.status)}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: "rgba(255,255,255,0.8)",
                                fontSize: 14,
                              }}
                            >
                              현재가:
                            </Text>
                            <Text
                              style={{
                                color: "#FCD34D",
                                fontSize: 16,
                                fontWeight: "bold",
                              }}
                            >
                              {formatAuctionPrice(
                                auction.current_bid || auction.starting_price
                              )}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
