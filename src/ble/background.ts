// src/ble/background.ts — Background location backbone for BLE operations
//
// Uses expo-task-manager + expo-location background updates to keep the
// latest coordinates available while the app is backgrounded.

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { BLE as BLE_CONST, TASKS } from "../constants";
import type { GeoPosition, PeerStatus } from "../types";

let lastKnownPosition: GeoPosition | null = null;
let currentStatus: PeerStatus = 0;
let currentMessage = "";
let batteryLevel = 100;

if (!TaskManager.isTaskDefined(TASKS.BLE_BROADCAST)) {
  TaskManager.defineTask(
    TASKS.BLE_BROADCAST,
    async ({
      data,
      error,
    }: TaskManager.TaskManagerTaskBody<{
      locations: Location.LocationObject[];
    }>) => {
    if (error) {
      console.warn("[BG Service] Background task error:", error.message);
      return;
    }

    const locations = data?.locations;
    if (!locations || locations.length === 0) {
      return;
    }

    const latest = locations[locations.length - 1];
    lastKnownPosition = {
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
      altitude: latest.coords.altitude,
      accuracy: latest.coords.accuracy ?? 10,
      heading: latest.coords.heading,
      speed: latest.coords.speed,
      timestamp: latest.timestamp,
    };
    }
  );
}

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
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== "granted") {
        console.warn("[BG Service] Foreground location permission denied");
        return;
      }

      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.status !== "granted") {
        console.warn("[BG Service] Background location permission denied");
        return;
      }

      const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
        TASKS.BLE_BROADCAST
      );
      if (alreadyStarted) {
        return;
      }

      await Location.startLocationUpdatesAsync(TASKS.BLE_BROADCAST, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: BLE_CONST.BROADCAST_INTERVAL_MS,
        distanceInterval: 1,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "EchoLocate background rescue mode",
          notificationBody: "Tracking location for BLE rescue broadcasts",
          notificationColor: "#1a1a2e",
        },
      });

      console.log("[BG Service] Background location updates started");
    } catch (err) {
      console.error("[BG Service] Registration failed:", err);
    }
  },

  async unregister(): Promise<void> {
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
      TASKS.BLE_BROADCAST
    );
    if (alreadyStarted) {
      await Location.stopLocationUpdatesAsync(TASKS.BLE_BROADCAST);
    }
    console.log("[BG Service] Background location updates stopped");
  },

  getLastKnownPosition(): GeoPosition | null {
    return lastKnownPosition;
  },
};
