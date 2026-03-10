// src/screens/HomeScreen.tsx — Main dashboard
//
// Shows current status, BLE activity, quick-action buttons.
// All tap targets are >= 64dp for cracked/dim screen usability.

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocation } from "../hooks/useLocation";
import { useBLE } from "../hooks/useBLE";
import { AppStatusBar } from "../components/StatusBar";
import { BigButton } from "../components/BigButton";
import { PeerStatus } from "../types";
import { UI } from "../constants";
import { startPeriodicSync, getPendingSyncCount } from "../firebase/sync";

export const HomeScreen: React.FC = () => {
  const [currentStatus, setCurrentStatus] = useState<PeerStatus>(PeerStatus.OK);
  const [message, setMessage] = useState("");
  const [batteryLevel] = useState(85); // Would use a battery API in production

  const { position, error: locationError } = useLocation();
  const {
    peers,
    isAdvertising,
    isScanning,
    deviceId,
    peerCount,
  } = useBLE(position, currentStatus, message, batteryLevel);

  // Start Firebase periodic sync
  useEffect(() => {
    if (!deviceId || !position) return;

    const stopSync = startPeriodicSync(
      deviceId,
      () => position,
      () => currentStatus,
      () => peers
    );

    return stopSync;
  }, [deviceId, !!position]);

  const cycleStatus = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setCurrentStatus((prev) => {
      const next = (prev + 1) % (Object.keys(PeerStatus).length / 2);
      return next as PeerStatus;
    });
  }, []);

  const sendSOS = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setCurrentStatus(PeerStatus.CRITICAL);
    setMessage("SOS - NEED IMMEDIATE HELP");
    Alert.alert("SOS Activated", "Broadcasting emergency status to all peers");
  }, []);

  const statusLabels: Record<PeerStatus, string> = {
    [PeerStatus.OK]: "I'm OK",
    [PeerStatus.NEED_HELP]: "Need Help",
    [PeerStatus.INJURED]: "Injured",
    [PeerStatus.CRITICAL]: "CRITICAL",
    [PeerStatus.SHELTER]: "In Shelter",
    [PeerStatus.MOVING]: "Moving",
  };

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <Text style={styles.title}>EchoLocate</Text>
        <Text style={styles.subtitle}>
          {deviceId ? `Device: ${deviceId.slice(0, 8)}...` : "Initializing..."}
        </Text>

        {/* Location info */}
        {position ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>📍 Your Position</Text>
            <Text style={styles.infoValue}>
              {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
            </Text>
            <Text style={styles.infoDetail}>
              Accuracy: ±{Math.round(position.accuracy)}m
              {position.altitude
                ? ` • Alt: ${Math.round(position.altitude)}m`
                : ""}
            </Text>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>📍 Acquiring GPS...</Text>
            {locationError && (
              <Text style={styles.errorText}>{locationError}</Text>
            )}
          </View>
        )}

        {/* Current status display */}
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Your Status</Text>
          <Text style={styles.statusValue}>
            {statusLabels[currentStatus]}
          </Text>
        </View>

        {/* Action buttons — large targets */}
        <View style={styles.actions}>
          <BigButton
            title="Change Status"
            icon="🔄"
            variant="primary"
            onPress={cycleStatus}
            style={styles.actionButton}
          />

          <BigButton
            title="SOS EMERGENCY"
            icon="🚨"
            variant="danger"
            onPress={sendSOS}
            style={styles.actionButton}
          />

          <BigButton
            title={`${peerCount} Peers Nearby`}
            icon="👥"
            variant="success"
            onPress={() => {}} // Navigate to Peers tab
            style={styles.actionButton}
          />
        </View>

        {/* BLE Status */}
        <View style={styles.bleBox}>
          <Text style={styles.bleTitle}>BLE Radio</Text>
          <Text style={styles.bleDetail}>
            📡 Advertising: {isAdvertising ? "Active" : "Off"}
          </Text>
          <Text style={styles.bleDetail}>
            🔍 Scanning: {isScanning ? "Active" : "Off"}
          </Text>
          <Text style={styles.bleDetail}>
            ☁️ Pending syncs: {getPendingSyncCount()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: UI.COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: UI.COLORS.textDim,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: UI.COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: UI.COLORS.text,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.accent,
    marginTop: 6,
    fontVariant: ["tabular-nums"],
  },
  infoDetail: {
    fontSize: 13,
    color: UI.COLORS.textDim,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: UI.COLORS.danger,
    marginTop: 4,
  },
  statusBox: {
    backgroundColor: UI.COLORS.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 14,
    color: UI.COLORS.textDim,
    fontWeight: "600",
  },
  statusValue: {
    fontSize: 28,
    fontWeight: "900",
    color: UI.COLORS.text,
    marginTop: 6,
  },
  actions: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    width: "100%",
  },
  bleBox: {
    backgroundColor: UI.COLORS.surface,
    padding: 16,
    borderRadius: 12,
  },
  bleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: UI.COLORS.text,
    marginBottom: 8,
  },
  bleDetail: {
    fontSize: 14,
    color: UI.COLORS.textDim,
    marginBottom: 4,
  },
});
