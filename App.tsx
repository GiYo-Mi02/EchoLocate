// App.tsx — Root entry point.
// Wraps the app in navigation + providers. Dark theme by default for
// visibility with cracked/dim screens (constraint).

import "react-native-get-random-values"; // Must be first — polyfills crypto.getRandomValues
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { BLEBackgroundService } from "./src/ble/background";
import { useAppStore } from "./src/state/appStore";

export default function App() {
  const role = useAppStore((state) => state.role);
  const initialize = useAppStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (role === "rescuer") {
      void activateKeepAwakeAsync("echolocate-active");
    } else {
      deactivateKeepAwake("echolocate-active");
    }

    return () => {
      deactivateKeepAwake("echolocate-active");
    };
  }, [role]);

  useEffect(() => {
    void BLEBackgroundService.register();
    return () => {
      void BLEBackgroundService.unregister();
    };
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
