import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import {
  Calculator as CalculatorIcon,
  RotateCcw,
  TrendingUp,
} from "lucide-react-native";

interface CalculationResult {
  metalType: string;
  weight: number;
  purity: number;
  pricePerUnit: number;
  totalValue: number;
}

export const Calculator = () => {
  console.log(
    "🧮 Calculator component rendering - 순수 React Native 스타일 버전"
  );

  const [selectedMetal, setSelectedMetal] = useState("구리");
  const [weight, setWeight] = useState("");
  const [purity, setPurity] = useState("99");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showMetalPicker, setShowMetalPicker] = useState(false);

  const router = useRouter();

  const metalPrices: { [key: string]: { price: number; unit: string } } = {
    구리: { price: 9.25, unit: "$/kg" },
    알루미늄: { price: 2.34, unit: "$/kg" },
    아연: { price: 2.89, unit: "$/kg" },
    납: { price: 2.16, unit: "$/kg" },
    금: { price: 65.8, unit: "$/g" },
    은: { price: 0.8, unit: "$/g" },
    백금: { price: 32.9, unit: "$/g" },
  };

  const calculate = () => {
    if (!weight || !purity) return;

    const metalPrice = metalPrices[selectedMetal];
    const weightNum = parseFloat(weight);
    const purityNum = parseFloat(purity);

    if (isNaN(weightNum) || isNaN(purityNum)) return;

    const adjustedPrice = metalPrice.price * (purityNum / 100);
    const totalValue =
      selectedMetal === "금" ||
      selectedMetal === "은" ||
      selectedMetal === "백금"
        ? adjustedPrice * weightNum // 귀금속은 그램 단위
        : adjustedPrice * weightNum; // 기본 금속은 킬로그램 단위

    setResult({
      metalType: selectedMetal,
      weight: weightNum,
      purity: purityNum,
      pricePerUnit: adjustedPrice,
      totalValue,
    });
  };

  const reset = () => {
    setWeight("");
    setPurity("99");
    setResult(null);
  };

  // 금속 선택 핸들러
  const handleMetalSelect = (metal: string) => {
    setSelectedMetal(metal);
    setShowMetalPicker(false);
  };

  return (
    <LinearGradient
      colors={["#0F0A1A", "#1A0F2A", "#2A1A3A", "#1A0F2A"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
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
            {/* Metal Selection */}
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
              <Text
                style={{
                  color: "#FCD34D",
                  fontSize: 20,
                  fontWeight: "bold",
                  letterSpacing: 2,
                  marginBottom: 16,
                }}
              >
                금속 종류
              </Text>

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
                onPress={() => setShowMetalPicker(!showMetalPicker)}
              >
                <Text style={{ color: "white", fontSize: 16 }}>
                  {selectedMetal}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>
                  ▼
                </Text>
              </TouchableOpacity>

              {/* Metal Picker */}
              {showMetalPicker && (
                <View
                  style={{
                    backgroundColor: "rgba(26, 26, 26, 0.95)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 16,
                    marginTop: 8,
                    overflow: "hidden",
                  }}
                >
                  {Object.keys(metalPrices).map((metal) => (
                    <TouchableOpacity
                      key={metal}
                      style={{
                        padding: 16,
                        borderBottomWidth:
                          metal !== Object.keys(metalPrices).slice(-1)[0]
                            ? 1
                            : 0,
                        borderBottomColor: "rgba(255,255,255,0.05)",
                      }}
                      onPress={() => handleMetalSelect(metal)}
                    >
                      <Text style={{ color: "white", fontSize: 16 }}>
                        {metal} ({metalPrices[metal].price}{" "}
                        {metalPrices[metal].unit})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Input Fields */}
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
              <Text
                style={{
                  color: "#FCD34D",
                  fontSize: 20,
                  fontWeight: "bold",
                  letterSpacing: 2,
                  marginBottom: 24,
                }}
              >
                계산 정보
              </Text>

              {/* Weight Input */}
              <View style={{ marginBottom: 20 }}>
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
                  placeholder={
                    selectedMetal === "금" ||
                    selectedMetal === "은" ||
                    selectedMetal === "백금"
                      ? "그램 단위로 입력"
                      : "킬로그램 단위로 입력"
                  }
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
              </View>

              {/* Purity Input */}
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
                  순도 (%)
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
                  placeholder="순도를 입력하세요 (예: 99)"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={purity}
                  onChangeText={setPurity}
                  keyboardType="numeric"
                />
              </View>

              {/* Buttons */}
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
                  }}
                  onPress={calculate}
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
                      금속 종류:
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      {result.metalType}
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
                      {result.weight}{" "}
                      {result.metalType === "금" ||
                      result.metalType === "은" ||
                      result.metalType === "백금"
                        ? "g"
                        : "kg"}
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
                      순도:
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      {result.purity}%
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
                      단가:
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      ${result.pricePerUnit.toFixed(2)}{" "}
                      {metalPrices[result.metalType].unit}
                    </Text>
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
                        ${result.totalValue.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};
