// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Add asset extensions for better asset handling
config.resolver.assetExts.push("ttf", "otf", "woff", "woff2");

// Ensure proper node modules resolution
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

// Add alias resolution for @/ paths to match tsconfig.json
config.resolver.alias = {
  "@": path.resolve(__dirname, "./"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
