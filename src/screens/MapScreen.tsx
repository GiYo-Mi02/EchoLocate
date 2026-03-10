// src/screens/MapScreen.tsx — Offline map view with peer markers

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OfflineMap } from "../maps/OfflineMap";
import { useLocation } from "../hooks/useLocation";
import { useBLE } from "../hooks/useBLE";
import { AppStatusBar } from "../components/StatusBar";
import { PeerStatus } from "../types";
import { UI } from "../constants";
import { getPendingSyncCount } from "../firebase/sync";

export const MapScreen: React.FC = () => {
  const [currentStatus] = useState<PeerStatus>(PeerStatus.OK);
  const [batteryLevel] = useState(85);

  const { position } = useLocation();
  const { peers, isAdvertising, isScanning, peerCount } = useBLE(
    position,
    currentStatus,
    "",
    batteryLevel
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppStatusBar
        isAdvertising={isAdvertising}
        isScanning={isScanning}
        gpsAccuracy={position?.accuracy ?? null}
        peerCount={peerCount}
        batteryLevel={batteryLevel}
        currentStatus={currentStatus}
        isSyncing={getPendingSyncCount() > 0}
      />

      <View style={styles.mapContainer}>
        <OfflineMap userPosition={position} peers={peers} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.background,
  },
  mapContainer: {
    flex: 1,
  },
});
