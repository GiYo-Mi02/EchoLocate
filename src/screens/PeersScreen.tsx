// src/screens/PeersScreen.tsx — List of discovered BLE peers

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocation } from "../hooks/useLocation";
import { useBLE } from "../hooks/useBLE";
import { AppStatusBar } from "../components/StatusBar";
import { PeerCard } from "../components/PeerCard";
import { BigButton } from "../components/BigButton";
import { PeerStatus } from "../types";
import type { Peer } from "../types";
import { UI } from "../constants";
import { clearPeers } from "../ble/scanner";
import { getPendingSyncCount } from "../firebase/sync";

export const PeersScreen: React.FC = () => {
  const [currentStatus] = useState<PeerStatus>(PeerStatus.OK);
  const [batteryLevel] = useState(85);

  const { position } = useLocation();
  const { peers, isAdvertising, isScanning, peerCount } = useBLE(
    position,
    currentStatus,
    "",
    batteryLevel
  );

  const renderPeer = ({ item }: { item: Peer }) => (
    <PeerCard peer={item} />
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

      <View style={styles.header}>
        <Text style={styles.title}>Nearby Peers</Text>
        <Text style={styles.subtitle}>
          {peers.length === 0
            ? "Scanning for EchoLocate peers..."
            : `${peers.length} peer${peers.length !== 1 ? "s" : ""} detected`}
        </Text>
      </View>

      {peers.length > 0 ? (
        <FlatList
          data={peers}
          keyExtractor={(item) => item.deviceId}
          renderItem={renderPeer}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>No Peers Found</Text>
          <Text style={styles.emptyText}>
            Other EchoLocate devices within BLE range will appear here
            automatically. Make sure Bluetooth is enabled.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <BigButton
          title="Clear Peers"
          icon="🗑️"
          variant="warning"
          onPress={clearPeers}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.background,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: UI.HEADER_FONT,
    fontWeight: "900",
    color: UI.COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: UI.COLORS.textDim,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: UI.COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: UI.COLORS.textDim,
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    padding: 20,
  },
});
