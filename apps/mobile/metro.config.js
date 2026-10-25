const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// inlineRem 16 is what React Native Reusables components are sized for.
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
