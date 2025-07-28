module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@": "./",
          },
          extensions: [
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
            ".android.js",
            ".android.tsx",
            ".ios.js",
            ".ios.tsx",
            ".web.js",
            ".web.tsx",
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
          ],
        },
      ],
      // ❌ @unitools 사용 중단으로 babel 플러그인 제거
      // "@unitools/babel-plugin-universal-image",
      "react-native-reanimated/plugin",
    ],
  };
};
