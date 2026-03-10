// src/components/PeerCard.tsx — Displays a discovered peer's info
//
// Large layout with high contrast for dim/cracked screen visibility.
// Shows: name, status, distance, battery, signal strength, last message.

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { UI } from "../constants";
import { PeerStatus } from "../types";
import type { Peer } from "../types";

interface PeerCardProps {
  peer: Peer;
}

const STATUS_LABELS: Record<PeerStatus, string> = {
  [PeerStatus.OK]: "OK",
  [PeerStatus.NEED_HELP]: "NEEDS HELP",
  [PeerStatus.INJURED]: "INJURED",
  [PeerStatus.CRITICAL]: "CRITICAL",
  [PeerStatus.SHELTER]: "IN SHELTER",
  [PeerStatus.MOVING]: "MOVING",
};

const STATUS_COLORS: Record<PeerStatus, string> = {
  [PeerStatus.OK]: UI.COLORS.success,
  [PeerStatus.NEED_HELP]: UI.COLORS.warning,
  [PeerStatus.INJURED]: UI.COLORS.accent,
  [PeerStatus.CRITICAL]: UI.COLORS.danger,
  [PeerStatus.SHELTER]: UI.COLORS.primary,
  [PeerStatus.MOVING]: UI.COLORS.text,
};

const STATUS_ICONS: Record<PeerStatus, string> = {
  [PeerStatus.OK]: "✅",
  [PeerStatus.NEED_HELP]: "🆘",
  [PeerStatus.INJURED]: "🩹",
  [PeerStatus.CRITICAL]: "🚨",
  [PeerStatus.SHELTER]: "🏠",
  [PeerStatus.MOVING]: "🚶",
};

/** Signal strength indicator based on RSSI */
function signalBars(rssi: number): string {
  if (rssi >= -50) return "▓▓▓▓";
  if (rssi >= -65) return "▓▓▓░";
  if (rssi >= -80) return "▓▓░░";
  if (rssi >= -90) return "▓░░░";
  return "░░░░";
}

/** Format distance for display */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** Time ago string */
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export const PeerCard: React.FC<PeerCardProps> = ({ peer }) => {
  const statusColor = STATUS_COLORS[peer.status];

  return (
    <View style={[styles.card, { borderLeftColor: statusColor }]}>
      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.icon}>{STATUS_ICONS[peer.status]}</Text>
        <View style={styles.headerText}>
          <Text style={styles.name}>{peer.name}</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {STATUS_LABELS[peer.status]}
          </Text>
        </View>
        <Text style={styles.distance}>{formatDistance(peer.estimatedDistance)}</Text>
      </View>

      {/* Details row */}
      <View style={styles.details}>
        <Text style={styles.detail}>
          🔋 {peer.batteryLevel}%
        </Text>
        <Text style={styles.detail}>
          📶 {signalBars(peer.rssi)} ({peer.rssi}dBm)
        </Text>
        <Text style={styles.detail}>
          🕐 {timeAgo(peer.lastSeen)}
        </Text>
      </View>

      {/* Message if present */}
      {peer.message ? (
        <View style={styles.messageBubble}>
          <Text style={styles.messageText}>"{peer.message}"</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI.COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    fontSize: 32,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: UI.LARGE_FONT,
    fontWeight: "700",
    color: UI.COLORS.text,
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  distance: {
    fontSize: 22,
    fontWeight: "800",
    color: UI.COLORS.accent,
  },
  details: {
    flexDirection: "row",
    marginTop: 10,
    gap: 16,
    flexWrap: "wrap",
  },
  detail: {
    fontSize: 14,
    color: UI.COLORS.textDim,
  },
  messageBubble: {
    marginTop: 10,
    backgroundColor: UI.COLORS.background,
    padding: 10,
    borderRadius: 8,
  },
  messageText: {
    fontSize: 15,
    color: UI.COLORS.text,
    fontStyle: "italic",
  },
});
