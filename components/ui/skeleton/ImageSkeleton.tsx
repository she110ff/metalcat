import React from "react";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get("window");

interface ImageSkeletonProps {
  height?: number;
  showText?: boolean;
  className?: string;
}

/**
 * 🎨 이미지 로딩을 위한 매력적인 스켈레톤 컴포넌트
 */
export const ImageSkeleton: React.FC<ImageSkeletonProps> = ({
  height = 256,
  showText = true,
  className = "",
}) => {
  return (
    <Box
      style={{ width: screenWidth, height }}
      className={`bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-purple-900/20 border border-white/10 items-center justify-center relative overflow-hidden ${className}`}
    >
      {/* 🌊 애니메이션 배경 웨이브 */}
      <Box className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      
      {/* 📸 메인 콘텐츠 */}
      <VStack space="md" className="items-center z-10">
        {/* 로딩 아이콘 애니메이션 */}
        <Box className="relative">
          <Box className="w-16 h-16 border-4 border-purple-500/30 rounded-full" />
          <Box className="absolute inset-2 w-12 h-12 border-4 border-t-purple-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        </Box>
        
        {showText && (
          <VStack space="xs" className="items-center">
            <Text className="text-white/60 text-sm font-medium">
              고품질 이미지 로딩 중
            </Text>
            <Text className="text-white/40 text-xs">
              잠시만 기다려주세요...
            </Text>
          </VStack>
        )}
      </VStack>
      
      {/* ✨ 반짝이는 효과 */}
      <Box className="absolute top-4 right-4 w-2 h-2 bg-white/40 rounded-full animate-ping" />
      <Box className="absolute bottom-6 left-6 w-1 h-1 bg-purple-400/60 rounded-full animate-ping" 
           style={{ animationDelay: "0.5s" }} />
    </Box>
  );
};
