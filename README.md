# EchoLocate

**Offline-first emergency peer location via BLE mesh, local AI, and offline maps.**

Built with Expo SDK 52 — runs in **Expo Go** (no Android Studio needed).

---

## Features

- **Simulated BLE Mesh** — Mock peer discovery based on GPS (real BLE requires a custom dev build)
- **Encrypted Payloads** — All BLE data is encrypted with HMAC integrity checks (< 512 bytes)
- **Offline Maps** — Download OpenStreetMap tiles before going into the field
- **Mock AI** — Simulated terrain/hazard classification (real TFLite requires a custom dev build)
- **Firebase Sync** — Queued locally (real Firestore requires a custom dev build)
- **Accessibility** — Large 64dp+ touch targets, haptic feedback, high-contrast dark theme

---

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- **Expo Go** app installed on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))
- A physical device (GPS and maps don't work well in emulators)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npx expo start

# 3. Scan the QR code with Expo Go on your phone
```

---

## Project Structure

```
EchoLocate/
├── App.tsx                          # Entry point
├── app.json                         # Expo config
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── src/
│   ├── types/index.ts               # Shared TypeScript types
│   ├── constants/index.ts           # App-wide constants
│   ├── crypto/payload.ts            # BLE payload encryption/decryption
│   ├── ble/
│   │   ├── advertiser.ts            # BLE advertising (simulated in Expo Go)
│   │   ├── scanner.ts               # BLE scanning + mock peer discovery
│   │   └── background.ts            # Foreground location tracking
│   ├── ai/inference.ts              # Mock terrain classification
│   ├── maps/
│   │   ├── tileManager.ts           # Offline tile download + caching
│   │   └── OfflineMap.tsx           # Map component with offline tiles
│   ├── firebase/sync.ts             # Mock Firebase sync (queued locally)
│   ├── hooks/
│   │   ├── useLocation.ts           # GPS tracking hook
│   │   ├── useBLE.ts                # BLE advertise + scan hook
│   │   └── useAI.ts                 # AI inference hook
│   ├── components/
│   │   ├── BigButton.tsx            # Large accessible button with haptics
│   │   ├── PeerCard.tsx             # Peer info display card
│   │   └── StatusBar.tsx            # Top status strip
│   ├── screens/
│   │   ├── HomeScreen.tsx           # Main dashboard
│   │   ├── MapScreen.tsx            # Offline map view
│   │   ├── PeersScreen.tsx          # Discovered peers list
│   │   └── SettingsScreen.tsx       # Settings + tile download
│   └── navigation/
│       └── AppNavigator.tsx         # Bottom tab navigation
├── scripts/
│   └── train_model.py              # Python: train terrain classifier
└── README.md
```

---

## Expo Go Limitations

These features are **simulated** in Expo Go and require a custom development build for real functionality:

| Feature | Expo Go (current) | Custom Dev Build |
|---|---|---|
| BLE advertising/scanning | Simulated mock peers | Real BLE via `react-native-ble-plx` |
| Background BLE | Foreground only | Background via `expo-task-manager` |
| AI inference | Mock predictions | Real TFLite via `react-native-tensor-flow-lite` |
| Firebase sync | Queued locally | Real Firestore via `@react-native-firebase` |

---

## Upgrading to a Custom Dev Build

When you're ready for real BLE, AI, and Firebase:

```bash
# Install EAS CLI
npm install -g eas-cli

# Build a custom dev client (cloud build — no Android Studio)
eas build --platform android --profile development
```

Then swap the mock modules in `src/ble/`, `src/ai/`, and `src/firebase/` with the real implementations.
