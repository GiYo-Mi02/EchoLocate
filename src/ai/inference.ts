// src/ai/inference.ts — AI inference runtime
//
// Native-first path: react-native-fast-tflite in custom dev client.
// Fallback path: mock predictions to keep app usable during integration.

import { AI } from "../constants";
import type { TerrainPrediction } from "../types";

let isModelLoaded = false;
let nativeModel: {
  runSync?: (inputs: unknown[]) => unknown[];
  run?: (inputs: unknown[]) => Promise<unknown[]>;
} | null = null;

async function tryLoadNativeModel(): Promise<boolean> {
  try {
    const tflite = require("react-native-fast-tflite") as {
      loadTensorflowModel?: (args: { url: string }) => Promise<unknown>;
    };

    if (!tflite.loadTensorflowModel) {
      return false;
    }

    // Keep this URL configurable so teams can point at their signed model file.
    nativeModel = (await tflite.loadTensorflowModel({
      url: AI.MODEL_ASSET_PATH,
    })) as typeof nativeModel;

    return !!nativeModel;
  } catch {
    return false;
  }
}

export async function loadModel(): Promise<boolean> {
  const nativeLoaded = await tryLoadNativeModel();
  if (nativeLoaded) {
    isModelLoaded = true;
    console.log("[AI] Native TFLite model loaded");
    return true;
  }

  // Fallback until model asset path + runtime wiring are finalized.
  await new Promise((resolve) => setTimeout(resolve, 300));
  isModelLoaded = true;
  console.warn("[AI] Native model unavailable - using mock fallback");
  return true;
}

export function getModelPath(): string | null {
  return isModelLoaded ? "mock://terrain_classifier" : null;
}

export function preprocessImage(
  pixelData: Uint8Array,
  width: number,
  height: number
): Float32Array {
  const inputSize = AI.INPUT_SIZE;
  const output = new Float32Array(inputSize * inputSize * 3);

  const xRatio = width / inputSize;
  const yRatio = height / inputSize;

  for (let y = 0; y < inputSize; y++) {
    for (let x = 0; x < inputSize; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * inputSize + x) * 3;

      output[dstIdx] = pixelData[srcIdx] / 255.0;
      output[dstIdx + 1] = pixelData[srcIdx + 1] / 255.0;
      output[dstIdx + 2] = pixelData[srcIdx + 2] / 255.0;
    }
  }

  return output;
}

export async function classifyTerrain(
  inputData: Float32Array
): Promise<TerrainPrediction[]> {
  if (!isModelLoaded) {
    console.warn("[AI] Model not loaded — call loadModel() first");
    return [];
  }

  if (nativeModel) {
    const outputs = nativeModel.runSync
      ? nativeModel.runSync([inputData])
      : nativeModel.run
        ? await nativeModel.run([inputData])
        : [];

    const logits = (outputs?.[0] ?? []) as ArrayLike<number>;
    if (logits.length > 0) {
      const predictions = AI.LABELS.map((label, index) => ({
        label,
        confidence: Number(logits[index] ?? 0),
      }));
      return predictions
        .filter((item) => item.confidence >= AI.CONFIDENCE_THRESHOLD)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock predictions — pick 1-2 random labels above threshold
  const primaryIdx = Math.floor(Math.random() * AI.NUM_CLASSES);
  const primaryConf = 0.7 + Math.random() * 0.25;

  const predictions: TerrainPrediction[] = [
    { label: AI.LABELS[primaryIdx], confidence: primaryConf },
  ];

  // Sometimes add a secondary prediction
  if (Math.random() > 0.5) {
    const secondIdx =
      (primaryIdx +
        1 +
        Math.floor(Math.random() * (AI.NUM_CLASSES - 1))) %
      AI.NUM_CLASSES;
    const secondConf = 0.6 + Math.random() * 0.15;
    predictions.push({ label: AI.LABELS[secondIdx], confidence: secondConf });
  }

  return predictions.filter((p) => p.confidence >= AI.CONFIDENCE_THRESHOLD);
}

export async function classifyFromPixels(
  pixelData: Uint8Array,
  width: number,
  height: number
): Promise<TerrainPrediction[]> {
  const input = preprocessImage(pixelData, width, height);
  return classifyTerrain(input);
}

export function isReady(): boolean {
  return isModelLoaded;
}
