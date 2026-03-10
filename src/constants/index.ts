// src/constants/index.ts — App-wide constants
// Centralizes magic values so BLE protocol, AI, and map modules stay in sync.

/** BLE protocol constants */
export const BLE = {
  // Custom service UUID for EchoLocate peer discovery
  SERVICE_UUID: "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  // Characteristic for broadcasting encrypted location payload
  LOCATION_CHAR_UUID: "bef8d6c9-9c21-4969-95f3-3e8d7f1a9b2c",
  // Characteristic for receiving peer acknowledgements
  ACK_CHAR_UUID: "bef8d6c9-9c21-4969-95f3-3e8d7f1a9b2d",
  // Max payload size in bytes (constraint: under 512)
  MAX_PAYLOAD_BYTES: 512,
  // How often to broadcast (ms)
  BROADCAST_INTERVAL_MS: 3000,
  // How often to scan for peers (ms)
  SCAN_INTERVAL_MS: 5000,
  // Peer timeout — remove if not seen for this long (ms)
  PEER_TIMEOUT_MS: 120_000, // 2 minutes
  // Protocol version for forward compat
  PROTOCOL_VERSION: 1,
  // RSSI reference at 1 meter (calibrated per device ideally)
  RSSI_AT_1M: -59,
  // Path loss exponent (2 = free space, 3-4 = indoor)
  PATH_LOSS_EXPONENT: 2.5,
} as const;

/** Background task identifiers — must match BGTaskSchedulerPermittedIdentifiers in app.json */
export const TASKS = {
  BLE_BROADCAST: "com.echolocate.ble-broadcast",
  BLE_SCAN: "com.echolocate.ble-scan",
} as const;

/** Encryption constants */
export const CRYPTO = {
  // Pre-shared key for the mesh (in production, use key exchange)
  // This is a 256-bit hex key — users should replace with their team's key
  PSK_HEX: "a]0b1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f",
  NONCE_LENGTH: 24, // bytes
  HMAC_KEY_HEX: "f0e1d2c3b4a59687706152433425160708192a3b4c5d6e7f8091a2b3c4d5e6f7",
} as const;

/** AI / TFLite constants */
export const AI = {
  MODEL_ASSET_PATH: "models/terrain_classifier.tflite",
  INPUT_SIZE: 224, // model expects 224x224 RGB
  NUM_CLASSES: 6,
  LABELS: [
    "clear_path",
    "debris",
    "flood_zone",
    "fire_hazard",
    "structural_damage",
    "safe_shelter",
  ],
  CONFIDENCE_THRESHOLD: 0.6,
} as const;

/** Offline map defaults */
export const MAP = {
  // Directory under FileSystem.documentDirectory for cached tiles
  TILE_CACHE_DIR: "offline-tiles",
  DEFAULT_ZOOM: 15,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,
  // OpenStreetMap tile URL template (download tiles before going offline)
  TILE_URL_TEMPLATE:
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
} as const;

/** UI constants — large tap targets for cracked/dim screen usability (constraint) */
export const UI = {
  MIN_TAP_TARGET: 64, // minimum touch target in dp
  LARGE_FONT: 18,
  HEADER_FONT: 28,
  COLORS: {
    background: "#1a1a2e",
    surface: "#16213e",
    primary: "#0f3460",
    accent: "#e94560",
    success: "#00b894",
    warning: "#fdcb6e",
    danger: "#d63031",
    text: "#eaeaea",
    textDim: "#888888",
  },
} as const;

/** Firebase collection names */
export const FIREBASE = {
  COLLECTION_DEVICES: "devices",
  COLLECTION_SIGHTINGS: "sightings",
  SYNC_INTERVAL_MS: 30_000, // try sync every 30s when online
} as const;
