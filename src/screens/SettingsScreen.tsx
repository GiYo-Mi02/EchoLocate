// src/screens/SettingsScreen.tsx — Settings and tile download management

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BigButton } from "../components/BigButton";
import {
  downloadRegion,
  clearCache,
  estimateTileCount,
  type DownloadProgress,
} from "../maps/tileManager";
import { useLocation } from "../hooks/useLocation";
import { useAI } from "../hooks/useAI";
import { BLEBackgroundService } from "../ble/background";
import { UI } from "../constants";
import { useAppStore } from "../state/appStore";

export const SettingsScreen: React.FC = () => {
  const { position } = useLocation();
  const { isModelLoaded, error: aiError } = useAI(false);
  const role = useAppStore((state) => state.role);
  const setRole = useAppStore((state) => state.setRole);

  // Tile download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [regionName, setRegionName] = useState("My Area");
  const [radiusKm, setRadiusKm] = useState("5");

  // Download offline tiles for current area
  const handleDownloadTiles = useCallback(async () => {
    if (!position) {
      Alert.alert("No GPS", "Need a GPS fix before downloading map tiles.");
      return;
    }

    const radius = parseFloat(radiusKm) || 5;
    // Convert km to degrees (rough approximation)
    const degreeOffset = radius / 111;

    const bounds = {
      north: position.latitude + degreeOffset,
      south: position.latitude - degreeOffset,
      east: position.longitude + degreeOffset,
      west: position.longitude - degreeOffset,
    };

    const tileCount = estimateTileCount(bounds, 10, 16);

    Alert.alert(
      "Download Tiles",
      `This will download ~${tileCount} tiles for a ${radius}km radius around your position. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Download",
          onPress: async () => {
            setIsDownloading(true);
            try {
              await downloadRegion(
                {
                  id: `region-${Date.now()}`,
                  name: regionName,
                  minZoom: 10,
                  maxZoom: 16,
                  bounds,
                },
                (progress) => setDownloadProgress(progress)
              );
              Alert.alert("Done", "Map tiles downloaded for offline use!");
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Download failed"
              );
            } finally {
              setIsDownloading(false);
              setDownloadProgress(null);
            }
          },
        },
      ]
    );
  }, [position, radiusKm, regionName]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      "Clear Tile Cache",
      "Delete all downloaded map tiles?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await clearCache();
            Alert.alert("Done", "Tile cache cleared.");
          },
        },
      ]
    );
  }, []);

  const handleStopBackground = useCallback(async () => {
    await BLEBackgroundService.unregister();
    Alert.alert("Background Stopped", "BLE broadcasting will stop when the app is minimized.");
  }, []);

  const handleSetRole = useCallback(
    async (nextRole: "rescuer" | "victim") => {
      await setRole(nextRole);
      if (nextRole === "rescuer") {
        Alert.alert(
          "Rescuer Mode",
          "Screen stay-awake is enabled to keep map and peer updates visible during active search."
        );
      } else {
        Alert.alert(
          "Victim Mode",
          "Screen stay-awake is disabled to preserve battery while background services continue."
        );
      }
    },
    [setRole]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Offline Maps Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧭 Operating Role</Text>
          <Text style={styles.sectionDesc}>
            Rescuer keeps the display awake for active searching. Victim mode allows the
            screen to sleep to conserve battery.
          </Text>
          <View style={styles.buttonRow}>
            <BigButton
              title={role === "rescuer" ? "Rescuer (Active)" : "Set Rescuer"}
              icon="🛟"
              variant="primary"
              onPress={() => {
                void handleSetRole("rescuer");
              }}
              style={styles.halfButton}
            />
            <BigButton
              title={role === "victim" ? "Victim (Active)" : "Set Victim"}
              icon="🧍"
              variant="warning"
              onPress={() => {
                void handleSetRole("victim");
              }}
              style={styles.halfButton}
            />
          </View>
        </View>

        {/* Offline Maps Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Offline Map Tiles</Text>
          <Text style={styles.sectionDesc}>
            Download map tiles before going into the field. Requires internet.
          </Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Region name</Text>
            <TextInput
              style={styles.input}
              value={regionName}
              onChangeText={setRegionName}
              placeholder="My Area"
              placeholderTextColor={UI.COLORS.textDim}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Radius (km)</Text>
            <TextInput
              style={styles.input}
              value={radiusKm}
              onChangeText={setRadiusKm}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor={UI.COLORS.textDim}
            />
          </View>

          {downloadProgress && (
            <View style={styles.progressBox}>
              <Text style={styles.progressText}>
                Downloading: {downloadProgress.downloaded} /{" "}
                {downloadProgress.total} ({downloadProgress.percent}%)
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${downloadProgress.percent}%` },
                  ]}
                />
              </View>
            </View>
          )}

          <View style={styles.buttonRow}>
            <BigButton
              title={isDownloading ? "Downloading..." : "Download Tiles"}
              icon="⬇️"
              variant="primary"
              onPress={handleDownloadTiles}
              disabled={isDownloading || !position}
              style={styles.halfButton}
            />
            <BigButton
              title="Clear Cache"
              icon="🗑️"
              variant="warning"
              onPress={handleClearCache}
              style={styles.halfButton}
            />
          </View>
        </View>

        {/* AI Model Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧠 AI Model</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Terrain Classifier</Text>
            <Text
              style={[
                styles.statusValue,
                { color: isModelLoaded ? UI.COLORS.success : UI.COLORS.danger },
              ]}
            >
              {isModelLoaded ? "Loaded" : "Not Available"}
            </Text>
          </View>
          {aiError && <Text style={styles.errorText}>{aiError}</Text>}
          <Text style={styles.hint}>
            Place terrain_classifier.tflite in assets/models/ and rebuild.
          </Text>
        </View>

        {/* Background Service Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 Background BLE</Text>
          <Text style={styles.sectionDesc}>
            BLE broadcasting continues when the app is in the background.
          </Text>
          <View style={styles.buttonRow}>
            <BigButton
              title="Restart Background"
              icon="🔄"
              variant="success"
              onPress={() => BLEBackgroundService.register()}
              style={styles.halfButton}
            />
            <BigButton
              title="Stop Background"
              icon="⏹️"
              variant="danger"
              onPress={handleStopBackground}
              style={styles.halfButton}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>
          <Text style={styles.aboutText}>
            EchoLocate v1.0.0{"\n"}
            Offline-first emergency peer location{"\n"}
            BLE mesh • Local AI • Offline maps
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
    marginBottom: 20,
  },
  section: {
    backgroundColor: UI.COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI.COLORS.text,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: UI.COLORS.textDim,
    marginBottom: 12,
    lineHeight: 20,
  },
  inputRow: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: UI.COLORS.textDim,
    marginBottom: 4,
    fontWeight: "600",
  },
  input: {
    backgroundColor: UI.COLORS.background,
    color: UI.COLORS.text,
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: UI.COLORS.primary,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  halfButton: {
    flex: 1,
  },
  progressBox: {
    marginVertical: 12,
  },
  progressText: {
    fontSize: 13,
    color: UI.COLORS.text,
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    backgroundColor: UI.COLORS.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: UI.COLORS.success,
    borderRadius: 4,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 15,
    color: UI.COLORS.text,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 13,
    color: UI.COLORS.danger,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: UI.COLORS.textDim,
    marginTop: 8,
    fontStyle: "italic",
  },
  aboutText: {
    fontSize: 14,
    color: UI.COLORS.textDim,
    lineHeight: 22,
  },
});
