import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export type UserRole = "rescuer" | "victim";

const ROLE_STORAGE_KEY = "echolocate.role";

interface AppStoreState {
  role: UserRole;
  initialized: boolean;
  initialize: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
}

export const useAppStore = create<AppStoreState>((set) => ({
  role: "victim",
  initialized: false,

  initialize: async () => {
    try {
      const storedRole = await SecureStore.getItemAsync(ROLE_STORAGE_KEY);
      if (storedRole === "rescuer" || storedRole === "victim") {
        set({ role: storedRole, initialized: true });
        return;
      }
    } catch (err) {
      console.warn("[App Store] Failed to load role:", err);
    }

    set({ initialized: true });
  },

  setRole: async (role) => {
    set({ role });
    try {
      await SecureStore.setItemAsync(ROLE_STORAGE_KEY, role);
    } catch (err) {
      console.warn("[App Store] Failed to persist role:", err);
    }
  },
}));
