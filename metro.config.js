const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Register .tflite as a bundled asset extension so expo-asset can resolve it
config.resolver.assetExts.push("tflite");

module.exports = config;
