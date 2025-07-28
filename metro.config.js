// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Enhanced asset and module resolution
config.resolver.alias = {
  "@": path.resolve(__dirname, "./"),
};

// Asset extensions (PNG is most important for our logo)
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
];

// Source extensions
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  "jsx",
  "ts",
  "tsx",
];

// Platform-specific resolutions
config.resolver.platforms = ["ios", "android", "native", "web"];

// Module resolution order
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

// Asset registry optimization
config.transformer = {
  ...config.transformer,
  assetRegistryPath: "react-native/Libraries/Image/AssetRegistry",
};

// Cache settings for better performance
config.resetCache = true;

module.exports = withNativeWind(config, { input: "./global.css" });
