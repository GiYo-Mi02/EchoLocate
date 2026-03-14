// src/maps/OfflineMap.tsx

import React, { useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import Mapbox from "@rnmapbox/maps";
import { UI } from "../constants";
import type { Peer, GeoPosition } from "../types";
import { PeerStatus } from "../types";

// Grab the public key from the .env variables where it's safe and won't get committed
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || "");

interface OfflineMapProps {
  userPosition: GeoPosition | null;
  peers: Peer[];
  onRegionChange?: (region: any) => void;
}

function statusColor(status: PeerStatus): string {
  switch (status) {
    case PeerStatus.OK: return UI.COLORS.success;
    case PeerStatus.NEED_HELP: return UI.COLORS.warning;
    case PeerStatus.INJURED: return UI.COLORS.accent;
    case PeerStatus.CRITICAL: return UI.COLORS.danger;
    case PeerStatus.SHELTER: return UI.COLORS.primary;
    case PeerStatus.MOVING: return UI.COLORS.text;
    default: return UI.COLORS.textDim;
  }
}

export const OfflineMap: React.FC<OfflineMapProps> = ({ userPosition, peers }) => {
  // Mapbox handles offline map packs natively if configured
  const [offline] = useState(false);

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map}>
        <Mapbox.Camera
          zoomLevel={14}
          centerCoordinate={
            userPosition
              ? [userPosition.longitude, userPosition.latitude]
              : [-98.5795, 39.8283] // Default to center of US
          }
        />

        {/* User position marker */}
        {userPosition && (
          <Mapbox.PointAnnotation
            id="userLocation"
            coordinate={[userPosition.longitude, userPosition.latitude]}
          >
            <View style={styles.userMarker} />
          </Mapbox.PointAnnotation>
        )}

        {/* Peer markers */}
        {peers.map((peer) => (
          <Mapbox.PointAnnotation
            key={peer.deviceId}
            id={peer.deviceId}
            coordinate={[peer.position.longitude, peer.position.latitude]}
          >
            <View style={[styles.peerMarker, { backgroundColor: statusColor(peer.status) }]} />
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      {offline && (
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>OFFLINE MAP</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: UI.COLORS.accent,
    borderWidth: 3,
    borderColor: "white",
  },
  peerMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "white",
  },
  offlineBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: UI.COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
});

