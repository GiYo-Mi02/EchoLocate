// src/types/index.ts — Shared type definitions for EchoLocate
// All BLE payloads, peer records, and AI outputs are strongly typed here.

/** GPS coordinates with accuracy metadata */
export interface GeoPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number; // meters
  heading: number | null; // degrees from north
  speed: number | null; // m/s
  timestamp: number; // epoch ms
}

/** Status codes transmitted via BLE */
export enum PeerStatus {
  OK = 0,
  NEED_HELP = 1,
  INJURED = 2,
  CRITICAL = 3,
  SHELTER = 4,
  MOVING = 5,
}

/** The encrypted BLE broadcast payload (must stay under 512 bytes) */
export interface BLEPayload {
  version: number; // protocol version (1 byte)
  deviceId: string; // 16-char hex device identifier
  position: GeoPosition;
  status: PeerStatus;
  batteryLevel: number; // 0-100
  message: string; // short freeform text (max 64 chars)
  timestamp: number; // epoch ms
  nonce: string; // 24-byte hex nonce for encryption
  signature: string; // HMAC-SHA256 integrity check
}

/** A discovered peer with signal metadata */
export interface Peer {
  deviceId: string;
  name: string;
  position: GeoPosition;
  status: PeerStatus;
  batteryLevel: number;
  message: string;
  rssi: number; // signal strength dBm
  estimatedDistance: number; // meters (from RSSI)
  lastSeen: number; // epoch ms
}

/** AI model prediction for terrain/hazard classification */
export interface TerrainPrediction {
  label: string; // e.g. "flood_zone", "clear_path", "debris"
  confidence: number; // 0.0–1.0
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/** Offline map tile metadata */
export interface TileRegion {
  id: string;
  name: string;
  minZoom: number;
  maxZoom: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  tileCount: number;
  sizeBytes: number;
  downloadedAt: number | null;
}

/** Firebase sync record */
export interface SyncRecord {
  deviceId: string;
  position: GeoPosition;
  status: PeerStatus;
  peers: string[]; // deviceIds of peers seen
  syncedAt: number;
}

/** Navigation routes */
export type RootTabParamList = {
  Home: undefined;
  Map: undefined;
  Peers: undefined;
  Settings: undefined;
};
