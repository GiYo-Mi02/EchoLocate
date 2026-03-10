// src/ai/inference.ts — AI inference (Expo Go mock)
//
// Expo Go does not support react-native-tensor-flow-lite (requires custom
// dev build). This module simulates terrain classification by returning
// mock predictions. The same API surface is preserved.

import { AI } from "../constants";
import type { TerrainPrediction } from "../types";

let isModelLoaded = false;

export async function loadModel(): Promise<boolean> {
  // Simulate model loading delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  isModelLoaded = true;
  console.log("[AI] Mock model loaded (Expo Go mode)");
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

  // Simulate inference delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return mock predictions — pick 1-2 random labels above threshold
  const primaryIdx = Math.floor(Math.random() * AI.NUM_CLASSES);
  const primaryConf = 0.7 + Math.random() * 0.25;

  const predictions: TerrainPrediction[] = [
    { label: AI.LABELS[primaryIdx], confidence: primaryConf },
  ];

  // Sometimes add a secondary prediction
  if (Math.random() > 0.5) {
    let secondIdx = (primaryIdx + 1 + Math.floor(Math.random() * (AI.NUM_CLASSES - 1))) % AI.NUM_CLASSES;
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
