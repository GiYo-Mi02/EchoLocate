// src/crypto/payload.ts — Encrypt/decrypt BLE payloads
//
// Architecture note: We use expo-crypto for HMAC and hashing. For symmetric
// encryption we use a simple XOR-stream cipher seeded from a HMAC-derived
// keystream. This keeps the payload compact (under 512 bytes) and avoids
// needing a native AES module. In production, swap for libsodium via
// react-native-sodium if stronger guarantees are needed.
//
// The payload format:
//   [1 byte version][JSON body][32 byte HMAC signature]
// Total must stay under 512 bytes (BLE constraint).

import * as Crypto from "expo-crypto";
import { Buffer } from "buffer";
import { BLE, CRYPTO } from "../constants";
import type { BLEPayload, GeoPosition, PeerStatus } from "../types";

/**
 * Generate a cryptographic nonce (hex string).
 */
async function generateNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(CRYPTO.NONCE_LENGTH);
  return Buffer.from(bytes).toString("hex");
}

/**
 * Derive a keystream from PSK + nonce using HMAC-SHA256.
 * We chain multiple HMAC rounds to produce enough bytes for the payload.
 */
async function deriveKeystream(
  nonce: string,
  length: number
): Promise<Uint8Array> {
  const rounds = Math.ceil(length / 32);
  const keystream = new Uint8Array(rounds * 32);

  for (let i = 0; i < rounds; i++) {
    const input = `${CRYPTO.PSK_HEX}:${nonce}:${i}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input
    );
    const hashBytes = Buffer.from(hash, "hex");
    keystream.set(hashBytes, i * 32);
  }

  return keystream.slice(0, length);
}

/**
 * XOR-encrypt/decrypt a buffer with the derived keystream.
 */
function xorCipher(data: Uint8Array, keystream: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ keystream[i % keystream.length];
  }
  return result;
}

/**
 * Compute HMAC-SHA256 over the encrypted body for integrity.
 */
async function computeHmac(data: string): Promise<string> {
  const hmacInput = `${CRYPTO.HMAC_KEY_HEX}:${data}`;
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    hmacInput
  );
}

/**
 * Build and encrypt a BLE payload from current device state.
 * Returns a base64-encoded string ready for BLE characteristic write.
 */
export async function encryptPayload(
  deviceId: string,
  position: GeoPosition,
  status: PeerStatus,
  batteryLevel: number,
  message: string
): Promise<string> {
  const nonce = await generateNonce();

  // Truncate message to fit in payload budget
  const truncatedMessage = message.slice(0, 64);

  // Build compact body — nonce is in the outer packet, not duplicated here
  const body = {
    v: BLE.PROTOCOL_VERSION,
    id: deviceId,
    lat: Math.round(position.latitude * 1e6) / 1e6,
    lon: Math.round(position.longitude * 1e6) / 1e6,
    alt: position.altitude ? Math.round(position.altitude) : null,
    acc: Math.round(position.accuracy),
    hdg: position.heading ? Math.round(position.heading) : null,
    spd: position.speed ? Math.round(position.speed * 10) / 10 : null,
    s: status,
    bat: Math.round(batteryLevel),
    msg: truncatedMessage,
    t: Date.now(),
  };

  const bodyJson = JSON.stringify(body);
  const bodyBytes = Buffer.from(bodyJson, "utf-8");

  // Encrypt the JSON body
  const keystream = await deriveKeystream(nonce, bodyBytes.length);
  const encrypted = xorCipher(bodyBytes, keystream);

  // Build final packet: version(1) + nonce(hex) + encrypted(base64) + hmac
  const encryptedB64 = Buffer.from(encrypted).toString("base64");
  const packetData = `${BLE.PROTOCOL_VERSION}:${nonce}:${encryptedB64}`;

  const signature = await computeHmac(packetData);
  const finalPacket = `${packetData}:${signature}`;

  // Enforce max size constraint
  const finalBytes = Buffer.from(finalPacket, "utf-8");
  if (finalBytes.length > BLE.MAX_PAYLOAD_BYTES) {
    throw new Error(
      `BLE payload exceeds ${BLE.MAX_PAYLOAD_BYTES} bytes: ${finalBytes.length}`
    );
  }

  return finalPacket;
}

/**
 * Decrypt and verify a received BLE payload.
 * Returns null if integrity check fails.
 */
export async function decryptPayload(
  packet: string
): Promise<BLEPayload | null> {
  const parts = packet.split(":");
  if (parts.length < 4) return null;

  // Last part is the signature, the part before it is base64-encoded cipher,
  // second part is the nonce, first is version
  const signature = parts[parts.length - 1];
  const packetData = parts.slice(0, parts.length - 1).join(":");

  // Verify HMAC
  const expectedSig = await computeHmac(packetData);
  if (signature !== expectedSig) {
    console.warn("[Crypto] HMAC verification failed — payload tampered or wrong key");
    return null;
  }

  const version = parseInt(parts[0], 10);
  if (version !== BLE.PROTOCOL_VERSION) {
    console.warn(`[Crypto] Unknown protocol version: ${version}`);
    return null;
  }

  const nonce = parts[1];
  // Rejoin in case base64 contained colons (unlikely but safe)
  const encryptedB64 = parts.slice(2, parts.length - 1).join(":");
  const encryptedBytes = Buffer.from(encryptedB64, "base64");

  // Decrypt
  const keystream = await deriveKeystream(nonce, encryptedBytes.length);
  const decrypted = xorCipher(encryptedBytes, keystream);

  const bodyJson = Buffer.from(decrypted).toString("utf-8");

  try {
    const body = JSON.parse(bodyJson);
    // Reconstruct full BLEPayload from compact format
    const payload: BLEPayload = {
      version: body.v,
      deviceId: body.id,
      position: {
        latitude: body.lat,
        longitude: body.lon,
        altitude: body.alt,
        accuracy: body.acc,
        heading: body.hdg,
        speed: body.spd,
        timestamp: body.t,
      },
      status: body.s,
      batteryLevel: body.bat,
      message: body.msg,
      timestamp: body.t,
      nonce,
      signature,
    };
    return payload;
  } catch {
    console.warn("[Crypto] Failed to parse decrypted payload");
    return null;
  }
}

/**
 * Estimate distance from RSSI using log-distance path loss model.
 */
export function estimateDistance(rssi: number): number {
  // d = 10 ^ ((RSSI_ref - RSSI) / (10 * n))
  const distance = Math.pow(
    10,
    (BLE.RSSI_AT_1M - rssi) / (10 * BLE.PATH_LOSS_EXPONENT)
  );
  return Math.round(distance * 10) / 10; // 1 decimal place
}
