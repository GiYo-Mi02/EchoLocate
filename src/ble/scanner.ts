// src/ble/scanner.ts — BLE scanning (Expo Go mock)
//
// Expo Go does not support react-native-ble-plx. This module simulates
// peer discovery by generating mock peers near the user's GPS position.
// The same API surface is preserved so all hooks/screens work unchanged.

import { BLE } from "../constants";
import type { Peer, PeerStatus } from "../types";
import * as Location from "expo-location";

let isScanning = false;
let scanInterval: ReturnType<typeof setInterval> | null = null;

const peers: Map<string, Peer> = new Map();
type PeerUpdateCallback = (peers: Peer[]) => void;
const listeners: Set<PeerUpdateCallback> = new Set();

export function onPeersUpdated(callback: PeerUpdateCallback): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners(): void {
  const peerList = getActivePeers();
  listeners.forEach((cb) => cb(peerList));
}

export function getActivePeers(): Peer[] {
  const now = Date.now();
  const active: Peer[] = [];

  peers.forEach((peer, id) => {
    if (now - peer.lastSeen > BLE.PEER_TIMEOUT_MS) {
      peers.delete(id);
    } else {
      active.push(peer);
    }
  });

  return active.sort((a, b) => a.estimatedDistance - b.estimatedDistance);
}

// Generate simulated peers near a position
const MOCK_PEER_NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"];

async function generateMockPeers(): Promise<void> {
  try {
    const loc = await Location.getLastKnownPositionAsync();
    if (!loc) return;

    const baseLat = loc.coords.latitude;
    const baseLon = loc.coords.longitude;

    // Keep 2-3 simulated peers active with slight position drift
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const id = `mock-peer-${i}`;
      const offsetLat = (Math.random() - 0.5) * 0.002;
      const offsetLon = (Math.random() - 0.5) * 0.002;
      const rssi = -50 - Math.floor(Math.random() * 40);
      const distance = Math.pow(10, (-59 - rssi) / (10 * BLE.PATH_LOSS_EXPONENT));

      const peer: Peer = {
        deviceId: id,
        name: `Peer-${MOCK_PEER_NAMES[i % MOCK_PEER_NAMES.length]}`,
        position: {
          latitude: baseLat + offsetLat,
          longitude: baseLon + offsetLon,
          altitude: loc.coords.altitude,
          accuracy: 10 + Math.random() * 20,
          heading: Math.random() * 360,
          speed: Math.random() * 2,
          timestamp: Date.now(),
        },
        status: (Math.floor(Math.random() * 3)) as PeerStatus,
        batteryLevel: 40 + Math.floor(Math.random() * 60),
        message: "",
        rssi,
        estimatedDistance: Math.round(distance * 10) / 10,
        lastSeen: Date.now(),
      };

      peers.set(id, peer);
    }

    notifyListeners();
  } catch {
    // Location not available yet — skip this cycle
  }
}

export async function startScanning(): Promise<boolean> {
  if (isScanning) return true;
  isScanning = true;

  // Initial mock peers
  await generateMockPeers();

  // Refresh mock peers on interval
  scanInterval = setInterval(generateMockPeers, BLE.SCAN_INTERVAL_MS);

  console.log(
    `[BLE Scanner] Started (simulated) — interval ${BLE.SCAN_INTERVAL_MS}ms`
  );
  return true;
}

export function stopScanning(): void {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  isScanning = false;
  console.log("[BLE Scanner] Stopped");
}

export function getScanningState(): boolean {
  return isScanning;
}

export function getPeerCount(): number {
  return getActivePeers().length;
}

export function clearPeers(): void {
  peers.clear();
  notifyListeners();
}
