// src/ble/background.ts — Background BLE service (Expo Go mock)
//
// Expo Go does not support expo-task-manager background tasks.
// This module provides the same API surface using foreground-only
// location updates via expo-location. BLE will only work while
// the app is in the foreground.

import * as Location from "expo-location";
import { BLE as BLE_CONST } from "../constants";
import type { GeoPosition, PeerStatus } from "../types";

let lastKnownPosition: GeoPosition | null = null;
let currentStatus: PeerStatus = 0;
let currentMessage = "";
let batteryLevel = 100;
let locationSubscription: Location.LocationSubscription | null = null;

export function updateBackgroundState(state: {
  position?: GeoPosition | null;
  status?: PeerStatus;
  message?: string;
  battery?: number;
}): void {
  if (state.position !== undefined) lastKnownPosition = state.position;
  if (state.status !== undefined) currentStatus = state.status;
  if (state.message !== undefined) currentMessage = state.message;
  if (state.battery !== undefined) batteryLevel = state.battery;
}

export const BLEBackgroundService = {
  async register(): Promise<void> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("[BG Service] Location permission denied");
        return;
      }

      // Use foreground location watching instead of background tasks
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: BLE_CONST.BROADCAST_INTERVAL_MS,
          distanceInterval: 1,
        },
        (loc) => {
          lastKnownPosition = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            altitude: loc.coords.altitude,
            accuracy: loc.coords.accuracy ?? 10,
            heading: loc.coords.heading,
            speed: loc.coords.speed,
            timestamp: loc.timestamp,
          };
        }
      );

      console.log("[BG Service] Foreground location tracking started (Expo Go mode)");
    } catch (err) {
      console.error("[BG Service] Registration failed:", err);
    }
  },

  async unregister(): Promise<void> {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
    console.log("[BG Service] Location tracking stopped");
  },

  getLastKnownPosition(): GeoPosition | null {
    return lastKnownPosition;
  },
};
