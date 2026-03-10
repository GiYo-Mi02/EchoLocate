// src/components/StatusBar.tsx — Top status bar showing device state
//
// Displays: BLE status, GPS accuracy, peer count, battery, Firebase sync.
// High contrast, always-visible strip at the top of every screen.

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { UI } from "../constants";
import { PeerStatus } from "../types";

interface StatusBarProps {
  isAdvertising: boolean;
  isScanning: boolean;
  gpsAccuracy: number | null;
  peerCount: number;
  batteryLevel: number;
  currentStatus: PeerStatus;
  isSyncing: boolean;
}

const STATUS_EMOJI: Record<PeerStatus, string> = {
  [PeerStatus.OK]: "✅",
  [PeerStatus.NEED_HELP]: "🆘",
  [PeerStatus.INJURED]: "🩹",
  [PeerStatus.CRITICAL]: "🚨",
  [PeerStatus.SHELTER]: "🏠",
  [PeerStatus.MOVING]: "🚶",
};

export const AppStatusBar: React.FC<StatusBarProps> = ({
  isAdvertising,
  isScanning,
  gpsAccuracy,
  peerCount,
  batteryLevel,
  currentStatus,
  isSyncing,
}) => {
  return (
    <View style={styles.container}>
      {/* BLE status */}
      <View style={styles.item}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor:
                isAdvertising && isScanning
                  ? UI.COLORS.success
                  : isAdvertising || isScanning
                    ? UI.COLORS.warning
                    : UI.COLORS.danger,
            },
          ]}
        />
        <Text style={styles.label}>BLE</Text>
      </View>

      {/* GPS accuracy */}
      <View style={styles.item}>
        <Text style={styles.emoji}>📍</Text>
        <Text style={styles.value}>
          {gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : "—"}
        </Text>
      </View>

      {/* Peer count */}
      <View style={styles.item}>
        <Text style={styles.emoji}>👥</Text>
        <Text style={styles.value}>{peerCount}</Text>
      </View>

      {/* Current status */}
      <View style={styles.item}>
        <Text style={styles.emoji}>{STATUS_EMOJI[currentStatus]}</Text>
      </View>

      {/* Battery */}
      <View style={styles.item}>
        <Text style={styles.emoji}>🔋</Text>
        <Text
          style={[
            styles.value,
            { color: batteryLevel < 20 ? UI.COLORS.danger : UI.COLORS.text },
          ]}
        >
          {batteryLevel}%
        </Text>
      </View>

      {/* Sync indicator */}
      {isSyncing && (
        <View style={styles.item}>
          <Text style={styles.emoji}>☁️</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: UI.COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderBottomColor: UI.COLORS.primary,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 12,
    color: UI.COLORS.textDim,
    fontWeight: "600",
  },
  emoji: {
    fontSize: 16,
  },
  value: {
    fontSize: 13,
    color: UI.COLORS.text,
    fontWeight: "600",
  },
});
