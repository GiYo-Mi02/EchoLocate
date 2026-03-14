# EchoLocate

**Offline-first emergency peer location via BLE mesh, local AI, and offline maps.**

Built with Expo SDK 54 and configured for an **Expo Custom Dev Client**.

---

## Features

- **Native BLE Scanning** — Uses `react-native-ble-plx` in custom dev client builds
- **Encrypted Payloads** — BLE packets are signed and encrypted under the payload budget
- **Offline Maps** — Download OpenStreetMap tiles before entering low-connectivity zones
- **AI Runtime Scaffold** — `react-native-fast-tflite` native-first path with fallback mode
- **Role-based Battery Policy** — Rescuer mode keeps screen awake, Victim mode preserves battery
- **Centralized Peer State** — Zustand store avoids manual emitter churn under high update rates

---

## Full Documentation

- Comprehensive technical documentation: [docs/APPLICATION_DOCUMENTATION.md](docs/APPLICATION_DOCUMENTATION.md)

---

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [EAS CLI](https://docs.expo.dev/eas/) (`npm install -g eas-cli`)
- A physical device (GPS/BLE behavior is not reliable in emulators)

---

## Quick Start (Custom Dev Client)

```bash
# 1) Install dependencies
npm install

# 2) Generate native projects for custom modules
npx expo prebuild

# 3) Build a development client in EAS
eas build --profile development --platform android

# 4) Start Metro for dev client
npx expo start --dev-client
```

---

## Project Structure

```
EchoLocate/
├── App.tsx                          # Entry point + role-aware keep-awake policy
├── app.json                         # Native permissions and background modes
├── package.json                     # Dependencies and scripts
├── src/
│   ├── ble/
│   │   ├── advertiser.ts            # Broadcast payload publisher lifecycle
│   │   ├── scanner.ts               # Native BLE scanning via ble-plx
│   │   └── background.ts            # TaskManager location backbone
│   ├── ai/inference.ts              # Native-first TFLite inference runtime
│   ├── state/
│   │   ├── appStore.ts              # Role state (rescuer/victim)
│   │   └── bleStore.ts              # Atomic peer state (Zustand)
│   ├── crypto/payload.ts            # Packet encryption/decryption
│   ├── hooks/                       # React hooks for BLE/AI/location
│   ├── screens/                     # Home, map, peers, settings
│   └── maps/                        # Offline map cache and renderer
└── README.md
```

---

## Native Architecture Notes

| Concern | Current status |
|---|---|
| BLE scanning | Native via `react-native-ble-plx` |
| BLE peripheral advertising | Requires platform-specific peripheral module wiring |
| Background execution | `expo-location` + `expo-task-manager` background updates |
| AI inference | Native-first via `react-native-fast-tflite`, fallback if model unavailable |
| Peer update fanout | Zustand store prevents custom emitter leaks |

---

## Security Direction

- Keep broadcast cleartext minimal (only routing UUID and protocol metadata).
- Encrypt sensitive victim profile payloads for authorized responders only.
- Store long-term private key material in secure storage and rotate responder keys via LGU/DRRMO issuance.

---

## Build Commands

```bash
# Refresh native projects
npx expo prebuild

# Android dev client build
eas build --platform android --profile development

# iOS dev client build
eas build --platform ios --profile development
```
