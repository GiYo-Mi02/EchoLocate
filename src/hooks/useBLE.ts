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
} from "../ble/scanner";
import { useBLEStore } from "../state/bleStore";
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

// Shared BLE session across all hook consumers/screens.
let sharedDeviceId = "";
let sharedDeviceIdPromise: Promise<string> | null = null;
let sharedIsAdvertising = false;
let sharedIsScanning = false;
let sharedConsumers = 0;

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
  const peers = useBLEStore((state) => state.peers);
  const [isAdvertisingState, setIsAdvertising] = useState(false);
  const [isScanningState, setIsScanning] = useState(false);
  const [deviceId, setDeviceId] = useState(sharedDeviceId);

  // Refs to give closures access to latest values
  const posRef = useRef(position);
  const statusRef = useRef(status);
  const msgRef = useRef(message);
  const batteryRef = useRef(batteryLevel);

  posRef.current = position;
  statusRef.current = status;
  msgRef.current = message;
  batteryRef.current = batteryLevel;

  // Generate one shared device ID for the whole app session.
  useEffect(() => {
    let cancelled = false;

    const ensureDeviceId = async () => {
      if (sharedDeviceId) {
        if (!cancelled) {
          setDeviceId(sharedDeviceId);
        }
        return;
      }

      if (!sharedDeviceIdPromise) {
        sharedDeviceIdPromise = generateDeviceId();
      }

      const id = await sharedDeviceIdPromise;
      sharedDeviceId = id;
      sharedDeviceIdPromise = null;

      if (!cancelled) {
        setDeviceId(id);
      }
    };

    void ensureDeviceId();
    return () => {
      cancelled = true;
    };
  }, []);

  const startBLE = useCallback(async () => {
    const activeDeviceId = sharedDeviceId || deviceId;
    if (!activeDeviceId) return;

    // Start advertising once for all consumers.
    if (!sharedIsAdvertising) {
      sharedIsAdvertising = await startAdvertising(
        activeDeviceId,
        () => posRef.current,
        () => statusRef.current,
        () => batteryRef.current,
        () => msgRef.current
      );
    }

    // Start scanning once for all consumers.
    if (!sharedIsScanning) {
      sharedIsScanning = await startScanning();
    }

    setIsAdvertising(sharedIsAdvertising);
    setIsScanning(sharedIsScanning);
  }, [deviceId]);

  const stopBLE = useCallback(() => {
    // Manual hard stop.
    stopAdvertising();
    stopScanning();
    sharedIsAdvertising = false;
    sharedIsScanning = false;
    setIsAdvertising(false);
    setIsScanning(false);
  }, []);

  // Track hook consumers to avoid tearing down BLE when switching screens.
  useEffect(() => {
    sharedConsumers += 1;
    return () => {
      sharedConsumers = Math.max(0, sharedConsumers - 1);
      if (sharedConsumers === 0) {
        stopAdvertising();
        stopScanning();
        sharedIsAdvertising = false;
        sharedIsScanning = false;
      }
    };
  }, []);

  // Auto-start once shared device ID is ready and position is available.
  useEffect(() => {
    if (deviceId && position) {
      void startBLE();
    }
  }, [deviceId, !!position, startBLE]);

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
