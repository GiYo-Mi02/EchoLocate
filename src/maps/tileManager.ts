// src/maps/tileManager.ts — Offline map tile download and caching
//
// Downloads OSM raster tiles for a geographic region and stores them
// in expo-file-system's documentDirectory. At runtime, the map component
// loads tiles from this local cache — zero internet required (constraint).
//
// Tile math uses the standard slippy map convention:
//   x = floor((lon + 180) / 360 * 2^z)
//   y = floor((1 - ln(tan(lat*π/180) + 1/cos(lat*π/180)) / π) / 2 * 2^z)

import * as FileSystem from "expo-file-system/legacy";
import { MAP } from "../constants";
import type { TileRegion } from "../types";

const TILE_DIR = `${FileSystem.documentDirectory}${MAP.TILE_CACHE_DIR}/`;

// ──────────────────────────────────────────────────────────────
// Tile coordinate math
// ──────────────────────────────────────────────────────────────

function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

/**
 * Count total tiles in a region across all zoom levels.
 */
function countTiles(
  bounds: TileRegion["bounds"],
  minZoom: number,
  maxZoom: number
): number {
  let count = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = lonToTileX(bounds.west, z);
    const xMax = lonToTileX(bounds.east, z);
    const yMin = latToTileY(bounds.north, z); // Note: y is inverted
    const yMax = latToTileY(bounds.south, z);
    count += (xMax - xMin + 1) * (yMax - yMin + 1);
  }
  return count;
}

// ──────────────────────────────────────────────────────────────
// Tile storage
// ──────────────────────────────────────────────────────────────

/**
 * Ensure the tile cache directory exists.
 */
async function ensureTileDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(TILE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(TILE_DIR, { intermediates: true });
  }
}

/**
 * Get the local file path for a tile.
 */
function tilePath(z: number, x: number, y: number): string {
  return `${TILE_DIR}${z}/${x}/${y}.png`;
}

/**
 * Check if a tile is already cached.
 */
async function isTileCached(z: number, x: number, y: number): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(tilePath(z, x, y));
  return info.exists;
}

/**
 * Get the local URI for a cached tile (for use in map component).
 * Returns null if not cached.
 */
export async function getCachedTileUri(
  z: number,
  x: number,
  y: number
): Promise<string | null> {
  const path = tilePath(z, x, y);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
}

// ──────────────────────────────────────────────────────────────
// Download
// ──────────────────────────────────────────────────────────────

export type DownloadProgress = {
  downloaded: number;
  total: number;
  percent: number;
};

/**
 * Download all tiles for a geographic region.
 * Call this while the user has internet — before going into the field.
 *
 * @param region — The region definition
 * @param onProgress — Progress callback
 * @returns The region metadata with tile count and download timestamp
 */
export async function downloadRegion(
  region: Omit<TileRegion, "tileCount" | "sizeBytes" | "downloadedAt">,
  onProgress?: (progress: DownloadProgress) => void
): Promise<TileRegion> {
  await ensureTileDir();

  const { bounds, minZoom, maxZoom } = region;
  const totalTiles = countTiles(bounds, minZoom, maxZoom);
  let downloaded = 0;
  let totalBytes = 0;

  for (let z = minZoom; z <= maxZoom; z++) {
    const xMin = lonToTileX(bounds.west, z);
    const xMax = lonToTileX(bounds.east, z);
    const yMin = latToTileY(bounds.north, z);
    const yMax = latToTileY(bounds.south, z);

    for (let x = xMin; x <= xMax; x++) {
      // Ensure z/x directory exists
      const dirPath = `${TILE_DIR}${z}/${x}/`;
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }

      for (let y = yMin; y <= yMax; y++) {
        const cached = await isTileCached(z, x, y);
        if (!cached) {
          const url = MAP.TILE_URL_TEMPLATE.replace("{z}", String(z))
            .replace("{x}", String(x))
            .replace("{y}", String(y));

          try {
            const result = await FileSystem.downloadAsync(
              url,
              tilePath(z, x, y)
            );
            if (result.uri) {
              const fileInfo = await FileSystem.getInfoAsync(result.uri);
              if (fileInfo.exists && fileInfo.size) {
                totalBytes += fileInfo.size;
              }
            }
          } catch (err) {
            console.warn(`[TileManager] Failed to download tile ${z}/${x}/${y}:`, err);
            // Continue with other tiles — partial coverage is better than none
          }
        }

        downloaded++;
        onProgress?.({
          downloaded,
          total: totalTiles,
          percent: Math.round((downloaded / totalTiles) * 100),
        });
      }
    }
  }

  return {
    ...region,
    tileCount: totalTiles,
    sizeBytes: totalBytes,
    downloadedAt: Date.now(),
  };
}

/**
 * Get info about currently cached tile regions.
 */
export async function getCachedRegions(): Promise<string[]> {
  await ensureTileDir();
  const contents = await FileSystem.readDirectoryAsync(TILE_DIR);
  return contents;
}

/**
 * Calculate how many tiles a region would require.
 */
export function estimateTileCount(
  bounds: TileRegion["bounds"],
  minZoom: number,
  maxZoom: number
): number {
  return countTiles(bounds, minZoom, maxZoom);
}

/**
 * Delete all cached tiles.
 */
export async function clearCache(): Promise<void> {
  const info = await FileSystem.getInfoAsync(TILE_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(TILE_DIR, { idempotent: true });
  }
  await ensureTileDir();
}

/**
 * Get total cache size in bytes.
 */
export async function getCacheSize(): Promise<number> {
  const info = await FileSystem.getInfoAsync(TILE_DIR);
  if (!info.exists) return 0;
  // FileSystem doesn't directly support recursive size — estimate from region metadata
  return info.size ?? 0;
}
