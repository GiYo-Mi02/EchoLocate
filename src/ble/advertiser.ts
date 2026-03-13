// src/ble/advertiser.ts — BLE payload broadcaster lifecycle
//
// react-native-ble-plx provides robust scanning/central mode but does not
// expose peripheral advertising on both platforms. We still keep a native
// ready payload publisher here so the app can hand off packets to platform
// specific advertising implementations without changing hooks/screens.

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
    console.log("[BLE Advertiser] Already advertising");
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
    `[BLE Advertiser] Payload publisher active — interval ${BLE.BROADCAST_INTERVAL_MS}ms`
  );
  console.warn(
    "[BLE Advertiser] Native BLE peripheral advertising requires a platform-specific module in the custom dev client"
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
