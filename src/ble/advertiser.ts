// src/ble/advertiser.ts — BLE advertising (Expo Go mock)
//
// Expo Go does not support react-native-ble-plx (requires custom dev build).
// This module simulates BLE advertising by maintaining an encrypted payload
// locally. The same API surface is preserved so all hooks/screens work.

import { BLE } from "../constants";
import { encryptPayload } from "../crypto/payload";
import type { GeoPosition, PeerStatus } from "../types";

let advertisingInterval: ReturnType<typeof setInterval> | null = null;
let isAdvertising = false;
let currentPayload: string | null = null;

export async function startAdvertising(
  deviceId: string,
  getPosition: () => GeoPosition | null,
  getStatus: () => PeerStatus,
  getBattery: () => number,
  getMessage: () => string
): Promise<boolean> {
  if (isAdvertising) {
    console.log("[BLE Advertiser] Already advertising (simulated)");
    return true;
  }

  isAdvertising = true;

  const broadcastOnce = async () => {
    const position = getPosition();
    if (!position) return;

    try {
      const payload = await encryptPayload(
        deviceId,
        position,
        getStatus(),
        getBattery(),
        getMessage()
      );
      currentPayload = payload;
    } catch (err) {
      console.error("[BLE Advertiser] Payload encryption failed:", err);
    }
  };

  await broadcastOnce();
  advertisingInterval = setInterval(broadcastOnce, BLE.BROADCAST_INTERVAL_MS);

  console.log(
    `[BLE Advertiser] Started (simulated) — interval ${BLE.BROADCAST_INTERVAL_MS}ms`
  );
  return true;
}

export function getCurrentPayload(): string | null {
  return currentPayload;
}

export function stopAdvertising(): void {
  if (advertisingInterval) {
    clearInterval(advertisingInterval);
    advertisingInterval = null;
  }
  isAdvertising = false;
  currentPayload = null;
  console.log("[BLE Advertiser] Stopped");
}

export function getAdvertisingState(): boolean {
  return isAdvertising;
}

export function destroyBleManager(): void {
  stopAdvertising();
}
