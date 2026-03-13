// src/ble/scanner.ts — BLE scanning via react-native-ble-plx
//
// Reads encrypted broadcast payloads from BLE advertisements and writes
// peer state into a centralized Zustand store.

import { Buffer } from "buffer";
import { PermissionsAndroid, Platform } from "react-native";
import type { Permission } from "react-native";
import { BleManager, type Device, type Subscription } from "react-native-ble-plx";
import { BLE } from "../constants";
import { decryptPayload, estimateDistance } from "../crypto/payload";
import { useBLEStore } from "../state/bleStore";
import type { Peer } from "../types";

let isScanning = false;
let pruneInterval: ReturnType<typeof setInterval> | null = null;
let stateSubscription: Subscription | null = null;
let bleManager: BleManager | null = null;

type PeerUpdateCallback = (peers: Peer[]) => void;

function getBleManager(): BleManager {
  if (!bleManager) {
    bleManager = new BleManager();
  }
  return bleManager;
}

export function onPeersUpdated(callback: PeerUpdateCallback): () => void {
  callback(getActivePeers());
  return useBLEStore.subscribe((state) => {
    callback(state.peers);
  });
}

export function getActivePeers(): Peer[] {
  useBLEStore.getState().pruneStalePeers();
  return useBLEStore.getState().peers;
}

async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }

  const basePermissions: Permission[] = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ];
  if (Platform.Version >= 31) {
    basePermissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
    );
  }

  const result = await PermissionsAndroid.requestMultiple(basePermissions);
  return Object.values(result).every(
    (value) => value === PermissionsAndroid.RESULTS.GRANTED
  );
}

async function handleScannedDevice(device: Device): Promise<void> {
  if (!device.manufacturerData || !device.rssi) {
    return;
  }

  try {
    const packet = Buffer.from(device.manufacturerData, "base64").toString("utf-8");
    const payload = await decryptPayload(packet);
    if (!payload) {
      return;
    }

    const peer: Peer = {
      deviceId: payload.deviceId,
      name: device.name ?? `Peer-${payload.deviceId.slice(0, 4)}`,
      position: payload.position,
      status: payload.status,
      batteryLevel: payload.batteryLevel,
      message: payload.message,
      rssi: device.rssi,
      estimatedDistance: estimateDistance(device.rssi),
      lastSeen: Date.now(),
    };

    useBLEStore.getState().upsertPeer(peer);
  } catch (err) {
    console.warn("[BLE Scanner] Failed to parse advertisement packet:", err);
  }
}

export async function startScanning(): Promise<boolean> {
  if (isScanning) return true;

  const permissionsGranted = await ensurePermissions();
  if (!permissionsGranted) {
    console.warn("[BLE Scanner] BLE scan permissions denied");
    return false;
  }

  const manager = getBleManager();
  if ((await manager.state()) !== "PoweredOn") {
    await new Promise<void>((resolve) => {
      stateSubscription = manager.onStateChange((state) => {
        if (state === "PoweredOn") {
          stateSubscription?.remove();
          stateSubscription = null;
          resolve();
        }
      }, true);
    });
  }

  manager.startDeviceScan([BLE.SERVICE_UUID], { allowDuplicates: true }, (error, device) => {
    if (error) {
      console.warn("[BLE Scanner] Scan error:", error.message);
      return;
    }
    if (!device) {
      return;
    }
    void handleScannedDevice(device);
  });

  pruneInterval = setInterval(() => {
    useBLEStore.getState().pruneStalePeers();
  }, BLE.SCAN_INTERVAL_MS);

  isScanning = true;

  console.log(
    `[BLE Scanner] Started native scanning — interval ${BLE.SCAN_INTERVAL_MS}ms`
  );
  return true;
}

export function stopScanning(): void {
  if (pruneInterval) {
    clearInterval(pruneInterval);
    pruneInterval = null;
  }
  stateSubscription?.remove();
  stateSubscription = null;

  if (bleManager) {
    bleManager.stopDeviceScan();
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
  useBLEStore.getState().clearPeers();
}
