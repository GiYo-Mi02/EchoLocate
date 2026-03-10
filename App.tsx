// App.tsx — Root entry point.
// Wraps the app in navigation + providers. Dark theme by default for
// visibility with cracked/dim screens (constraint).

import "react-native-get-random-values"; // Must be first — polyfills crypto.getRandomValues
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { activateKeepAwakeAsync } from "expo-keep-awake";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { BLEBackgroundService } from "./src/ble/background";

export default function App() {
  useEffect(() => {
    // Keep screen on during active rescue operations
    activateKeepAwakeAsync("echolocate-active");

    // Register background BLE tasks on mount
    BLEBackgroundService.register();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
});
