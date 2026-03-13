// src/hooks/useAI.ts — React hook for local TFLite inference
//
// Loads the terrain classifier model on mount and provides a
// classify function for screens to call. All inference is local
// — no API calls ever (constraint).

import { useState, useEffect, useCallback } from "react";
import {
  loadModel,
  classifyFromPixels,
  isReady,
} from "../ai/inference";
import type { TerrainPrediction } from "../types";

interface UseAIResult {
  isModelLoaded: boolean;
  isClassifying: boolean;
  predictions: TerrainPrediction[];
  classify: (
    pixelData: Uint8Array,
    width: number,
    height: number
  ) => Promise<void>;
  error: string | null;
}

export function useAI(autoLoad = true): UseAIResult {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [predictions, setPredictions] = useState<TerrainPrediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load model on mount when enabled by caller.
  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const loaded = await loadModel();
        if (!cancelled) {
          setIsModelLoaded(loaded);
          if (!loaded) {
            setError(
              "Failed to load terrain model. Ensure terrain_classifier.tflite is in assets/models/"
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Model loading failed"
          );
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [autoLoad]);

  const classify = useCallback(
    async (pixelData: Uint8Array, width: number, height: number) => {
      if (!isReady()) {
        setError("Model not loaded yet");
        return;
      }

      setIsClassifying(true);
      setError(null);

      try {
        const results = await classifyFromPixels(pixelData, width, height);
        setPredictions(results);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Classification failed"
        );
      } finally {
        setIsClassifying(false);
      }
    },
    []
  );

  return {
    isModelLoaded,
    isClassifying,
    predictions,
    classify,
    error,
  };
}
