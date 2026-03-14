// src/ble/advertiser.ts — BLE payload broadcaster lifecycle
//
// react-native-ble-plx provides robust scanning/central mode but does not
// expose peripheral advertising on both platforms. We still keep a native
// ready payload publisher here so the app can hand off packets to platform
// specific advertising implementations without changing hooks/screens.

import { BLE } from "../constants";
import { encryptPayload } from "../crypto/payload";
import { Buffer } from "buffer";
import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import type { Permission } from "react-native";
import type { GeoPosition, PeerStatus } from "../types";

let advertisingInterval: ReturnType<typeof setInterval> | null = null;
let isAdvertising = false;
let currentPayload: string | null = null;
let nativeAdvertisingStarted = false;
let consecutiveStartFailures = 0;
let nextStartRetryAt = 0;
let startLoopBusy = false;

const COMPANY_ID = 0x09f1;

type NativeBleAdvertiser = {
  startAdvertising: (
    serviceUuid: string,
    manufacturerId: number,
    payloadBase64: string
  ) => Promise<boolean>;
  stopAdvertising: () => Promise<boolean>;
  isAdvertising: () => Promise<boolean>;
  getLastError: () => Promise<string>;
};

const bleAdvertiser: NativeBleAdvertiser | null =
  Platform.OS === "android"
    ? (NativeModules.BleAdvertiser as NativeBleAdvertiser | undefined) ?? null
    : null;

function encodeCompactPayload(
  deviceId: string,
  position: GeoPosition,
  status: PeerStatus,
  batteryLevel: number
): string {
  const payload = Buffer.alloc(25);
  payload.writeUInt8(BLE.PROTOCOL_VERSION, 0);

  const idBytes = Buffer.from(deviceId.padEnd(16, "0").slice(0, 16), "hex");
  idBytes.copy(payload, 1, 0, 8);

  payload.writeInt32LE(Math.round(position.latitude * 1e6), 9);
  payload.writeInt32LE(Math.round(position.longitude * 1e6), 13);
  payload.writeUInt8(status, 17);
  payload.writeUInt8(Math.max(0, Math.min(100, Math.round(batteryLevel))), 18);
  payload.writeUInt16LE(Math.max(0, Math.min(65535, Math.round(position.accuracy))), 19);
  payload.writeUInt32LE(Math.floor(Date.now() / 1000), 21);

  return payload.toString("base64");
}

async function ensureAdvertisePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return true;
  }

  const permissions: Permission[] = [];
  if (Platform.Version >= 31) {
    permissions.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
    );
  }

  if (permissions.length === 0) {
    return true;
  }

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(result).every(
    (value) => value === PermissionsAndroid.RESULTS.GRANTED
  );
}

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

  if (!bleAdvertiser) {
    console.warn("[BLE Advertiser] Native BleAdvertiser module unavailable");
    return false;
  }

  const permissionsGranted = await ensureAdvertisePermissions();
  if (!permissionsGranted) {
    console.warn("[BLE Advertiser] BLUETOOTH_ADVERTISE permission denied");
    return false;
  }

  isAdvertising = true;
  nativeAdvertisingStarted = false;
  consecutiveStartFailures = 0;
  nextStartRetryAt = 0;
  startLoopBusy = false;

  const broadcastOnce = async () => {
    if (startLoopBusy) return;
    startLoopBusy = true;

    const position = getPosition();
    if (!position) {
      startLoopBusy = false;
      return;
    }

    try {
      const payload = await encryptPayload(
        deviceId,
        position,
        getStatus(),
        getBattery(),
        getMessage()
      );
      currentPayload = payload;

      const compact = encodeCompactPayload(
        deviceId,
        position,
        getStatus(),
        getBattery()
      );

      // Keep payload fresh in JS every tick, but avoid hammering native start.
      const now = Date.now();

      if (nativeAdvertisingStarted) {
        const stillAdvertising = await bleAdvertiser.isAdvertising().catch(() => true);
        if (!stillAdvertising) {
          nativeAdvertisingStarted = false;
          nextStartRetryAt = now;
        }
      }

      if (!nativeAdvertisingStarted && now >= nextStartRetryAt) {
        const started = await bleAdvertiser.startAdvertising(
          BLE.SERVICE_UUID,
          COMPANY_ID,
          compact
        );

        if (started) {
          nativeAdvertisingStarted = true;
          consecutiveStartFailures = 0;
          nextStartRetryAt = 0;
        } else {
          consecutiveStartFailures += 1;
          const backoffMs = Math.min(
            60_000,
            5_000 * Math.pow(2, Math.max(0, consecutiveStartFailures - 1))
          );
          nextStartRetryAt = now + backoffMs;
          const reason = await bleAdvertiser
            .getLastError()
            .catch(() => "unknown");

          if (consecutiveStartFailures === 1 || consecutiveStartFailures % 3 === 0) {
            console.warn(
              `[BLE Advertiser] Failed to start native BLE advertising (${reason}) (retry in ${Math.round(
                backoffMs / 1000
              )}s)`
            );
          }
        }
      }
    } catch (err) {
      console.error("[BLE Advertiser] Payload encryption failed:", err);
    } finally {
      startLoopBusy = false;
    }
  };

  await broadcastOnce();
  advertisingInterval = setInterval(broadcastOnce, BLE.BROADCAST_INTERVAL_MS);

  console.log(
    `[BLE Advertiser] Native advertising active — interval ${BLE.BROADCAST_INTERVAL_MS}ms`
  );
  return true;
}

export function getCurrentPayload(): string | null {
  return currentPayload;
}

export function stopAdvertising(): void {
  void bleAdvertiser?.stopAdvertising().catch((err: unknown) => {
    console.warn("[BLE Advertiser] stopAdvertising failed:", err);
  });

  if (advertisingInterval) {
    clearInterval(advertisingInterval);
    advertisingInterval = null;
  }
  isAdvertising = false;
  currentPayload = null;
  nativeAdvertisingStarted = false;
  consecutiveStartFailures = 0;
  nextStartRetryAt = 0;
  startLoopBusy = false;
  console.log("[BLE Advertiser] Stopped");
}

export function getAdvertisingState(): boolean {
  return isAdvertising;
}

export function destroyBleManager(): void {
  stopAdvertising();
}
