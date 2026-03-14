# EchoLocate Application Documentation

Version: 1.0.0
Last updated: 2026-03-14

## 1. Purpose and Scope

EchoLocate is an offline-first emergency coordination app designed for low-connectivity and no-connectivity conditions.

Core mission:
- Discover nearby people and responders using BLE scanning
- Broadcast local emergency status in compact encrypted payloads
- Visualize nearby peers on offline-capable maps
- Keep critical behavior active in background (location backbone)
- Support local-only operation with optional cloud-sync queueing

This document describes the current implementation in this repository, not a future target architecture.

## 2. High-Level Architecture

EchoLocate is organized as a modular Expo application using a custom development client for native modules.

Runtime layers:
- UI Layer: screens and reusable components
- Hook Layer: orchestration of location, BLE, and AI runtime state
- Service Layer: BLE advertiser/scanner, background location task, tile download/cache, sync queue, inference runtime
- State Layer: lightweight stores for app role and peer list
- Data Contracts: shared TypeScript types and constants

Data flow summary:
1. Location updates are obtained from foreground watch and pushed into background service state.
2. BLE advertiser periodically encrypts and publishes local state payloads.
3. BLE scanner receives advertisements, decrypts payloads, estimates distance from RSSI, and upserts peers in store.
4. Screens subscribe to store/hook state and render status, map markers, and peer lists.
5. Sync module periodically snapshots state into a local queue (mock cloud path in current build).

## 3. Tech Stack and Runtime Constraints

Framework and runtime:
- Expo SDK 54 with custom dev client
- React 19.1 and React Native 0.81.5
- TypeScript

Key libraries:
- react-native-ble-plx for BLE scan lifecycle
- react-native-fast-tflite for native-first local model inference
- react-native-maps for map view and local/URL tile overlays
- expo-location and expo-task-manager for background location tasks
- zustand for state store
- expo-secure-store for persisted role selection

Important constraints in current codebase:
- BLE peripheral advertising is prepared as payload publisher, but actual platform peripheral broadcast requires additional native module wiring.
- Cloud sync module is currently a local mock queue designed to preserve API shape until full Firebase runtime integration is swapped in.
- AI module is native-first but includes a fallback path that returns mock predictions if model is unavailable.

## 4. Repository Structure

Top-level:
- App.tsx: app root, keep-awake policy, background register/unregister
- app.json: Expo config, permissions, plugin configuration
- eas.json: EAS build profiles
- src/: feature modules

Source layout:
- src/ble/
  - advertiser.ts: payload generation timer and advertising lifecycle
  - scanner.ts: BLE scan, packet parse/decrypt, peer upsert, stale pruning
  - background.ts: background location task definition and registration
- src/hooks/
  - useLocation.ts: foreground location watch and background state updates
  - useBLE.ts: orchestration of advertiser+scanner lifecycle
  - useAI.ts: model loading and classify wrapper
- src/state/
  - appStore.ts: role persistence and initialization
  - bleStore.ts: peer list upsert/sort/prune
- src/maps/
  - tileManager.ts: OSM tile download and local caching
  - OfflineMap.tsx: map rendering with local tiles + peer markers
- src/crypto/
  - payload.ts: compact packet encoding, keystream XOR encryption, HMAC check
- src/firebase/
  - sync.ts: periodic sync queue (mock implementation)
- src/screens/
  - HomeScreen.tsx
  - MapScreen.tsx
  - PeersScreen.tsx
  - SettingsScreen.tsx
- src/components/
  - StatusBar.tsx, BigButton.tsx, PeerCard.tsx
- src/constants/index.ts: protocol, UI, task, map, AI constants
- src/types/index.ts: shared data contracts

## 5. Core Modules

### 5.1 App Boot and Role Policy

Boot sequence (App.tsx):
- Initializes persisted role from secure storage
- Applies role-based keep-awake policy:
  - rescuer: keep awake enabled
  - victim: keep awake disabled to preserve battery
- Registers background location service on mount and unregisters on unmount

Role persistence (appStore.ts):
- Uses secure storage key echolocate.role
- Valid values: rescuer or victim

### 5.2 BLE Pipeline

Advertiser (advertiser.ts):
- Builds encrypted payload from latest position/status/battery/message
- Refreshes payload every BLE.BROADCAST_INTERVAL_MS
- Stores current packet for handoff to native peripheral implementation
- Logs warning that full peripheral advertising needs platform-specific module support

Scanner (scanner.ts):
- Requests Android BLE/location permissions where needed
- Ensures BLE power state before scan
- Starts scan with allowDuplicates true on configured service UUID
- Parses manufacturerData packet payload
- Decrypts and validates packet
- Builds Peer object with estimatedDistance from RSSI path-loss model
- Upserts into store and periodically prunes stale peers

Store behavior (bleStore.ts):
- upsertPeer replaces by deviceId and keeps peers sorted by estimatedDistance
- pruneStalePeers removes peers older than configured timeout
- clearPeers empties list

### 5.3 Payload Format and Security

Security module (crypto/payload.ts) responsibilities:
- Generates nonce
- Derives keystream using SHA-256 rounds over PSK and nonce
- Encrypts compact JSON body using XOR stream
- Appends SHA-256 digest style signature over packetData key-material pattern
- Enforces BLE max payload size

Payload design notes:
- Body fields are compact (short keys) to remain within packet budget
- Coordinates are rounded to keep packet small and stable
- Message is truncated to 64 chars
- Protocol version is checked at decrypt time

Current security posture:
- Suitable for prototype constrained payload use
- Not equivalent to modern authenticated encryption schemes
- Production hardening should migrate to stronger, standardized crypto primitives and proper key management lifecycle

### 5.4 Location and Background Services

Foreground location (useLocation.ts):
- Requests foreground permission
- Captures initial high-accuracy fix
- Starts watchPosition updates every ~2 seconds or 1 meter movement
- Pushes latest position into background state adapter

Background location task (background.ts):
- Defines task id from constants
- Requests foreground and background permissions on register
- Starts background location updates with notification options
- Maintains in-memory latest position/status/message/battery context

### 5.5 Offline Maps

Tile cache manager (tileManager.ts):
- Computes slippy-map x/y coordinates for bounds and zoom range
- Downloads tiles from OpenStreetMap URL template
- Stores cache under documentDirectory/offline-tiles
- Exposes progress callback during download
- Can estimate tile count before download and clear cache

Offline map renderer (OfflineMap.tsx):
- Uses LocalTile when offline cache exists
- Falls back to UrlTile when cache not available
- Displays local user marker and peer markers with status-dependent colors

### 5.6 AI Inference Runtime

Inference service (ai/inference.ts):
- Attempts native model load via react-native-fast-tflite using configured asset path
- Exposes image preprocessing to fixed input size
- Runs sync or async model method depending on runtime support
- Applies threshold and top-k selection
- Falls back to mock predictions when native model is unavailable

Hook wrapper (useAI.ts):
- Loads model optionally on mount
- Exposes classify method and errors/loading state

## 6. User-Facing Behavior by Screen

Home screen:
- Shows current GPS, status, BLE state, peer count, pending sync count
- Supports status cycling and emergency SOS status/message set

Map screen:
- Renders offline-capable map and markers for peers

Peers screen:
- Shows peer list cards with status, estimated distance, battery, RSSI, and message
- Includes clear peers action

Settings screen:
- Role switcher (rescuer/victim)
- Offline tile download controls and progress
- AI model availability status
- Background service controls

## 7. Configuration and Environment

### 7.1 App Configuration

app.json includes:
- Location and Bluetooth permission descriptions
- Background modes (iOS)
- Android permission list including BLE and background location
- Plugin entries for expo-location and react-native-ble-plx

Note:
- Android Google Maps key in config appears placeholder-oriented and should be replaced for production distribution.

### 7.2 Build Profiles

eas.json profiles:
- development: custom dev client internal APK
- preview: internal APK
- production: autoIncrement enabled

### 7.3 Scripts

Primary package scripts:
- start
- start:dev-client
- prebuild
- android
- ios
- typecheck

## 8. Operational Flow

Normal operation sequence:
1. App starts and initializes role.
2. Foreground location hook requests permission and begins tracking.
3. BLE hook generates session deviceId.
4. BLE advertiser starts periodic payload generation once position is available.
5. BLE scanner starts discovery and peer parsing.
6. Peer store updates drive UI components.
7. Sync queue periodically snapshots data for eventual cloud handoff.

Field deployment sequence:
1. Pre-download offline map tiles from Settings screen while internet is available.
2. Verify BLE permissions accepted on each device.
3. Switch user role according to mission need.
4. Validate at least two nearby devices detect each other in Peers screen.
5. Keep rescuer devices in active mode for continuous situational awareness.

## 9. Data Contracts and Protocol Notes

Primary entities:
- GeoPosition: location + accuracy metadata
- BLEPayload: encrypted packet schema with protocol version and signature
- Peer: discovered device + RSSI and estimated distance
- TerrainPrediction: AI classifier output
- SyncRecord: cloud snapshot payload shape

Protocol parameters (from constants):
- Broadcast interval: 3000 ms
- Scan prune cadence: 5000 ms
- Peer timeout: 120000 ms
- Payload budget: 512 bytes max

Distance estimate model:
- Path loss formula using RSSI_AT_1M and PATH_LOSS_EXPONENT constants
- Result is heuristic and environment-sensitive

## 10. Security, Privacy, and Safety Notes

Current implementation protections:
- Encrypted payload transport pattern with integrity check
- Compact payload to minimize exposed data and BLE overhead

Privacy considerations:
- Location and status are safety-critical, sensitive data
- Operational policies should define who can run rescuer mode and key distribution practices

Safety considerations:
- This app is an aid tool and should not be treated as sole rescue source of truth
- BLE ranging and background behavior vary by handset and OS state
- Real-world drills are required before deployment in disaster scenarios

## 11. Known Limitations and Risks

Current technical limitations:
- Scanner path is production-leaning, but peripheral advertising remains integration-dependent on platform-specific implementation.
- AI inference fallback may return mock predictions when model asset/runtime is not present.
- Firebase path in current code is mock queue only.
- getCacheSize in tile manager is not a full recursive size accounting strategy.
- Distance estimation from RSSI is approximate and noisy in dense or obstructed environments.

Operational risks:
- Permission denial or OS battery optimizations can degrade background behavior.
- Large map download regions can consume storage quickly.
- Placeholder keys/config values can break release builds if not replaced.

## 12. Testing and Validation Checklist

Manual functional checks:
- App boots and role persists after restart
- GPS lock acquired and accuracy shown in status bar
- BLE scanner starts and peer appears between two test devices
- Peer timeout pruning removes offline peers
- SOS action changes status/message correctly
- Offline tiles download completes and map reads LocalTile cache
- Background service registers/unregisters from Settings controls
- TypeScript typecheck passes

Integration checks before release:
- Replace mock sync with production Firebase implementation and validate network transitions
- Validate native BLE peripheral advertiser behavior on target Android/iOS versions
- Validate AI model asset packaging and inference outputs against expected classes

## 13. Release Readiness Recommendations

Priority 1:
- Complete peripheral advertising native integration path
- Replace placeholder/unsafe key and configuration material
- Wire production cloud sync implementation

Priority 2:
- Introduce telemetry for crash/error diagnostics in field test deployments
- Add end-to-end test plan and repeatable drill scenario scripts

Priority 3:
- Strengthen cryptography and key lifecycle policies for responder operations
- Add richer conflict resolution for delayed sync reconciliation

## 14. Quick Onboarding for Contributors

1. Install dependencies.
2. Run prebuild and custom dev client flow.
3. Run typecheck.
4. Review constants and types first, then hooks, then screens.
5. Validate BLE and location permissions on physical devices.
6. Use Settings to preload tiles before testing offline scenarios.

## 15. File Reference Index

Architecture and root:
- App.tsx
- app.json
- package.json
- eas.json

State and hooks:
- src/state/appStore.ts
- src/state/bleStore.ts
- src/hooks/useLocation.ts
- src/hooks/useBLE.ts
- src/hooks/useAI.ts

BLE and security:
- src/ble/advertiser.ts
- src/ble/scanner.ts
- src/ble/background.ts
- src/crypto/payload.ts

Maps and sync:
- src/maps/tileManager.ts
- src/maps/OfflineMap.tsx
- src/firebase/sync.ts

UI:
- src/screens/HomeScreen.tsx
- src/screens/MapScreen.tsx
- src/screens/PeersScreen.tsx
- src/screens/SettingsScreen.tsx
- src/components/StatusBar.tsx
- src/components/PeerCard.tsx
- src/components/BigButton.tsx

Contracts:
- src/constants/index.ts
- src/types/index.ts
