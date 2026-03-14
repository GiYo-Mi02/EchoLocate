// src/maps/OfflineMap.tsx

import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import Mapbox from "@rnmapbox/maps";
import * as FileSystem from "expo-file-system/legacy";
import { MAP, UI } from "../constants";
import type { Peer, GeoPosition } from "../types";
import { PeerStatus } from "../types";

const mapboxPublicToken = process.env.EXPO_PUBLIC_MAPBOX_KEY ?? "";
if (mapboxPublicToken) {
  Mapbox.setAccessToken(mapboxPublicToken);
}

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
  const [hasOfflineTiles, setHasOfflineTiles] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const showFallbackPanel = !hasOfflineTiles && !!mapError;

  useEffect(() => {
    let mounted = true;

    const checkTiles = async () => {
      try {
        const baseDir = FileSystem.documentDirectory;
        if (!baseDir) {
          if (mounted) setHasOfflineTiles(false);
          return;
        }

        const tileDir = `${baseDir}${MAP.TILE_CACHE_DIR}/`;
        const info = await FileSystem.getInfoAsync(tileDir);
        if (mounted) {
          setHasOfflineTiles(info.exists);
        }
      } catch (err) {
        if (mounted) setHasOfflineTiles(false);
        console.warn("[OfflineMap] Failed to check local tile cache:", err);
      }
    };

    void checkTiles();

    return () => {
      mounted = false;
    };
  }, []);

  const styleJSON = useMemo(() => {
    const baseDir = FileSystem.documentDirectory;
    const localTiles = baseDir
      ? `${baseDir}${MAP.TILE_CACHE_DIR}/{z}/{x}/{y}.png`
      : "";

    if (!hasOfflineTiles || !localTiles) {
      return null;
    }

    return JSON.stringify({
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: [localTiles],
          tileSize: 256,
          minzoom: MAP.MIN_ZOOM,
          maxzoom: MAP.MAX_ZOOM,
        },
      },
      layers: [
        {
          id: "osm-raster",
          type: "raster",
          source: "osm",
        },
      ],
    });
  }, [hasOfflineTiles]);

  return (
    <View style={styles.container}>
      {!showFallbackPanel ? (
        <Mapbox.MapView
          style={styles.map}
          styleJSON={styleJSON ?? undefined}
          styleURL={styleJSON ? undefined : Mapbox.StyleURL.Street}
          onDidFailLoadingMap={() => {
            setMapError(
              "Map failed to load. Check internet for Mapbox online mode or download offline tiles in Settings."
            );
          }}
          onDidFinishLoadingStyle={() => setMapError(null)}
        >
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
      ) : (
        <View style={styles.fallbackPanel}>
          <Text style={styles.fallbackTitle}>Map Unavailable Offline</Text>
          <Text style={styles.fallbackText}>No offline tiles detected and internet map style could not load.</Text>
          <Text style={styles.fallbackText}>Open Settings and download offline map tiles for your area.</Text>
          {userPosition && (
            <Text style={styles.fallbackMeta}>
              Current location: {userPosition.latitude.toFixed(5)}, {userPosition.longitude.toFixed(5)}
            </Text>
          )}
          <Text style={styles.fallbackMeta}>Detected peers: {peers.length}</Text>
        </View>
      )}

      {hasOfflineTiles && (
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>OFFLINE MAP</Text>
        </View>
      )}

      {!hasOfflineTiles && (
        <View style={styles.infoBadge}>
          <Text style={styles.infoText}>
            Offline tiles not found. Showing Mapbox online style.
          </Text>
        </View>
      )}

      {!mapboxPublicToken && (
        <View style={styles.errorBadge}>
          <Text style={styles.errorText}>
            Missing EXPO_PUBLIC_MAPBOX_KEY in .env
          </Text>
        </View>
      )}

      {mapError && (
        <View style={styles.errorBadge}>
          <Text style={styles.errorText}>{mapError}</Text>
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
  errorBadge: {
    position: "absolute",
    bottom: 58,
    left: 12,
    right: 12,
    backgroundColor: "rgba(180, 0, 0, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  infoBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  infoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  fallbackPanel: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#101822",
  },
  fallbackTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  fallbackText: {
    color: "#c8d2df",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  fallbackMeta: {
    color: "#8fb6ff",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});

