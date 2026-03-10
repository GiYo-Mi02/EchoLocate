// src/hooks/useBLE.ts — React hook for BLE advertising + scanning
//
// Combines the advertiser and scanner modules into a single hook
// that screens can consume. Manages the full BLE lifecycle:
//   1. Start advertising (broadcast own position)
//   2. Start scanning (discover peers)
//   3. Track peers in state
//   4. Clean up on unmount

import { useState, useEffect, useCallback, useRef } from "react";
import * as Crypto from "expo-crypto";
import { Buffer } from "buffer";
import { startAdvertising, stopAdvertising } from "../ble/advertiser";
import {
  startScanning,
  stopScanning,
  onPeersUpdated,
  getActivePeers,
} from "../ble/scanner";
import type { GeoPosition, Peer, PeerStatus } from "../types";

interface UseBLEResult {
  peers: Peer[];
  isAdvertising: boolean;
  isScanning: boolean;
  deviceId: string;
  startBLE: () => Promise<void>;
  stopBLE: () => void;
  peerCount: number;
}

/**
 * Generate a stable device identifier.
 * Uses expo-crypto for random bytes, stored for session duration.
 */
async function generateDeviceId(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(8);
  return Buffer.from(bytes).toString("hex");
}

export function useBLE(
  position: GeoPosition | null,
  status: PeerStatus,
  message: string,
  batteryLevel: number
): UseBLEResult {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isAdvertisingState, setIsAdvertising] = useState(false);
  const [isScanningState, setIsScanning] = useState(false);
  const [deviceId, setDeviceId] = useState("");

  // Refs to give closures access to latest values
  const posRef = useRef(position);
  const statusRef = useRef(status);
  const msgRef = useRef(message);
  const batteryRef = useRef(batteryLevel);

  posRef.current = position;
  statusRef.current = status;
  msgRef.current = message;
  batteryRef.current = batteryLevel;

  // Generate device ID on mount
  useEffect(() => {
    generateDeviceId().then(setDeviceId);
  }, []);

  // Subscribe to peer updates from scanner
  useEffect(() => {
    const unsubscribe = onPeersUpdated((updatedPeers) => {
      setPeers(updatedPeers);
    });
    return unsubscribe;
  }, []);

  const startBLE = useCallback(async () => {
    if (!deviceId) return;

    // Start advertising
    const advStarted = await startAdvertising(
      deviceId,
      () => posRef.current,
      () => statusRef.current,
      () => batteryRef.current,
      () => msgRef.current
    );
    setIsAdvertising(advStarted);

    // Start scanning
    const scanStarted = await startScanning();
    setIsScanning(scanStarted);
  }, [deviceId]);

  const stopBLE = useCallback(() => {
    stopAdvertising();
    stopScanning();
    setIsAdvertising(false);
    setIsScanning(false);
  }, []);

  // Auto-start once device ID is ready and position is available
  useEffect(() => {
    if (deviceId && position) {
      startBLE();
    }
    return () => stopBLE();
  }, [deviceId, !!position, startBLE, stopBLE]);

  return {
    peers,
    isAdvertising: isAdvertisingState,
    isScanning: isScanningState,
    deviceId,
    startBLE,
    stopBLE,
    peerCount: peers.length,
  };
}
