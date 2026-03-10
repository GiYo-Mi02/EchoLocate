// src/firebase/sync.ts — Firebase sync (Expo Go mock)
//
// Expo Go does not support @react-native-firebase (requires custom dev build).
// This module provides the same API surface with a local-only mock that
// queues sync operations and logs them. When you migrate to a dev build,
// swap this file for the real Firebase implementation.

import { FIREBASE } from "../constants";
import type { GeoPosition, PeerStatus, SyncRecord, Peer } from "../types";

interface QueuedSync {
  record: SyncRecord;
  attempts: number;
  createdAt: number;
}

const syncQueue: QueuedSync[] = [];
const MAX_QUEUE_SIZE = 100;

export async function syncToCloud(
  deviceId: string,
  position: GeoPosition,
  status: PeerStatus,
  peers: Peer[]
): Promise<boolean> {
  const record: SyncRecord = {
    deviceId,
    position,
    status,
    peers: peers.map((p) => p.deviceId),
    syncedAt: Date.now(),
  };

  // Queue locally — no real Firebase in Expo Go
  if (syncQueue.length >= MAX_QUEUE_SIZE) {
    syncQueue.shift();
  }
  syncQueue.push({ record, attempts: 0, createdAt: Date.now() });

  console.log(
    `[Firebase] Sync queued (mock) — ${peers.length} peers, queue size: ${syncQueue.length}`
  );
  return false;
}

export function startPeriodicSync(
  deviceId: string,
  getPosition: () => GeoPosition | null,
  getStatus: () => PeerStatus,
  getPeers: () => Peer[]
): () => void {
  const interval = setInterval(async () => {
    const pos = getPosition();
    if (!pos) return;
    await syncToCloud(deviceId, pos, getStatus(), getPeers());
  }, FIREBASE.SYNC_INTERVAL_MS);

  return () => clearInterval(interval);
}

export function getPendingSyncCount(): number {
  return syncQueue.length;
}

export function isCloudAvailable(): boolean {
  return false;
}
