// src/maps/OfflineMap.tsx — Offline-capable map component
//
// Uses react-native-maps (MapView) with a custom tile overlay that
// reads from the local tile cache populated by tileManager.ts.
//
// When offline, tiles come from expo-file-system's document directory.
// When online (e.g. during tile download prep), falls back to the
// standard OSM tile server.
//
// Expo gotcha: react-native-maps requires Google Maps API key on Android
// ONLY if using Google Maps provider. We use the default Apple Maps on iOS
// and the built-in OSM URL tile overlay for cross-platform offline support.

import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import MapView, {
  Marker,
  UrlTile,
  Region,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import * as FileSystem from "expo-file-system/legacy";
import { MAP, UI } from "../constants";
import type { Peer, GeoPosition } from "../types";
import { PeerStatus } from "../types";

interface OfflineMapProps {
  userPosition: GeoPosition | null;
  peers: Peer[];
  onRegionChange?: (region: Region) => void;
}

/** Map PeerStatus to marker color */
function statusColor(status: PeerStatus): string {
  switch (status) {
    case PeerStatus.OK:
      return UI.COLORS.success;
    case PeerStatus.NEED_HELP:
      return UI.COLORS.warning;
    case PeerStatus.INJURED:
      return UI.COLORS.accent;
    case PeerStatus.CRITICAL:
      return UI.COLORS.danger;
    case PeerStatus.SHELTER:
      return UI.COLORS.primary;
    case PeerStatus.MOVING:
      return UI.COLORS.text;
    default:
      return UI.COLORS.textDim;
  }
}

export const OfflineMap: React.FC<OfflineMapProps> = ({
  userPosition,
  peers,
  onRegionChange,
}) => {
  const mapRef = useRef<MapView>(null);
  const [hasOfflineTiles, setHasOfflineTiles] = useState(false);

  // Check if we have offline tiles available
  useEffect(() => {
    const checkTiles = async () => {
      const tileDir = `${FileSystem.documentDirectory}${MAP.TILE_CACHE_DIR}/`;
      const info = await FileSystem.getInfoAsync(tileDir);
      setHasOfflineTiles(info.exists);
    };
    checkTiles();
  }, []);

  const initialRegion: Region = userPosition
    ? {
        latitude: userPosition.latitude,
        longitude: userPosition.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        // Default: center of US
        latitude: 39.8283,
        longitude: -98.5795,
        latitudeDelta: 30,
        longitudeDelta: 30,
      };

  // Build the tile URL — use local cache if available, else OSM
  const tileUrl = hasOfflineTiles
    ? `${FileSystem.documentDirectory}${MAP.TILE_CACHE_DIR}/{z}/{x}/{y}.png`
    : MAP.TILE_URL_TEMPLATE;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={!!userPosition}
        showsMyLocationButton={true}
        showsCompass={true}
        rotateEnabled={false}
        onRegionChangeComplete={onRegionChange}
        mapType="none" // We provide our own tiles
      >
        {/* Tile overlay — offline or online */}
        <UrlTile
          urlTemplate={tileUrl}
          maximumZ={MAP.MAX_ZOOM}
          minimumZ={MAP.MIN_ZOOM}
          flipY={false}
          tileSize={256}
        />

        {/* User position marker */}
        {userPosition && (
          <Marker
            coordinate={{
              latitude: userPosition.latitude,
              longitude: userPosition.longitude,
            }}
            title="You"
            description={`Accuracy: ${userPosition.accuracy}m`}
            pinColor={UI.COLORS.accent}
          />
        )}

        {/* Peer markers */}
        {peers.map((peer) => (
          <Marker
            key={peer.deviceId}
            coordinate={{
              latitude: peer.position.latitude,
              longitude: peer.position.longitude,
            }}
            title={peer.name}
            description={`${PeerStatus[peer.status]} • ${peer.estimatedDistance}m away • Battery: ${peer.batteryLevel}%${peer.message ? ` • "${peer.message}"` : ""}`}
            pinColor={statusColor(peer.status)}
          />
        ))}
      </MapView>

      {/* Offline indicator */}
      {hasOfflineTiles && (
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>OFFLINE MAP</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
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
