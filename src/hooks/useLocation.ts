// src/hooks/useLocation.ts — GPS location tracking hook
//
// Wraps expo-location in a React hook that provides continuous position
// updates. Also feeds the BLE background service so the background task
// always has fresh coordinates.

import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import { updateBackgroundState } from "../ble/background";
import type { GeoPosition } from "../types";

interface UseLocationResult {
  position: GeoPosition | null;
  error: string | null;
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

export function useLocation(): UseLocationResult {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const startTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        return;
      }

      // Get initial position quickly
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const geo: GeoPosition = {
        latitude: initial.coords.latitude,
        longitude: initial.coords.longitude,
        altitude: initial.coords.altitude,
        accuracy: initial.coords.accuracy ?? 10,
        heading: initial.coords.heading,
        speed: initial.coords.speed,
        timestamp: initial.timestamp,
      };

      setPosition(geo);
      updateBackgroundState({ position: geo });

      // Start continuous tracking
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (loc) => {
          const updated: GeoPosition = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            altitude: loc.coords.altitude,
            accuracy: loc.coords.accuracy ?? 10,
            heading: loc.coords.heading,
            speed: loc.coords.speed,
            timestamp: loc.timestamp,
          };
          setPosition(updated);
          updateBackgroundState({ position: updated });
        }
      );

      watchRef.current = sub;
      setIsTracking(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Location tracking failed");
    }
  }, []);

  const stopTracking = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    setIsTracking(false);
  }, []);

  // Start on mount, clean up on unmount
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, [startTracking, stopTracking]);

  return { position, error, isTracking, startTracking, stopTracking };
}
