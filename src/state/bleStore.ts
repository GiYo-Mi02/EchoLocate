import { create } from "zustand";
import { BLE } from "../constants";
import type { Peer } from "../types";

interface BLEStoreState {
  peers: Peer[];
  upsertPeer: (peer: Peer) => void;
  pruneStalePeers: () => void;
  clearPeers: () => void;
}

function sortPeers(peers: Peer[]): Peer[] {
  return [...peers].sort((a, b) => a.estimatedDistance - b.estimatedDistance);
}

export const useBLEStore = create<BLEStoreState>((set, get) => ({
  peers: [],

  upsertPeer: (peer) => {
    const current = get().peers;
    const next = current.filter((item) => item.deviceId !== peer.deviceId);
    next.push(peer);
    set({ peers: sortPeers(next) });
  },

  pruneStalePeers: () => {
    const cutoff = Date.now() - BLE.PEER_TIMEOUT_MS;
    const active = get().peers.filter((peer) => peer.lastSeen >= cutoff);
    if (active.length !== get().peers.length) {
      set({ peers: sortPeers(active) });
    }
  },

  clearPeers: () => {
    set({ peers: [] });
  },
}));
