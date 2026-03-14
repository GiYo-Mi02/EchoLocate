const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Register .tflite as a bundled asset extension so expo-asset can resolve it
config.resolver.assetExts.push("tflite");

// Ignore transient Android native folders in node_modules that may appear/disappear
// while Gradle runs, which can crash Metro's Windows file watcher.
config.resolver.blockList = [
	/.*[\\/]node_modules[\\/]react-native-fast-tflite[\\/]android[\\/]src[\\/]main[\\/]cpp[\\/]lib[\\/]headers[\\/]external[\\/]org_tensorflow[\\/]tensorflow[\\/]compiler[\\/]mlir[\\/].*/,
	/.*[\\/]node_modules[\\/][^\\/]+[\\/]android[\\/]build[\\/].*/,
];

module.exports = config;
