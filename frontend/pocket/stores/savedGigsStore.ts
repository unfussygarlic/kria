/**
 * SavedGigsStore — client-side bookmark set for the Jobs tab.
 *
 * Persisted to SecureStore so a bookmark survives restarts. Small enough
 * (just gig IDs) that we don't need a backend endpoint yet — when we
 * eventually build a "Saved" tab on the Space screen it'll graduate to
 * server storage. For MVP this is fine.
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const KEY = "saved_gig_ids_v1";

interface SavedGigsState {
  ids: Set<string>;
  hydrated: boolean;
  toggle: (gigId: string) => Promise<void>;
  isSaved: (gigId: string) => boolean;
  hydrate: () => Promise<void>;
}

async function persist(ids: Set<string>) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // SecureStore failure — bookmarks will simply not survive a restart. Non-fatal.
  }
}

export const useSavedGigsStore = create<SavedGigsState>((set, get) => ({
  ids: new Set(),
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          set({ ids: new Set(arr), hydrated: true });
          return;
        }
      }
    } catch {
      // ignore, fall through
    }
    set({ hydrated: true });
  },

  toggle: async (gigId: string) => {
    const next = new Set(get().ids);
    if (next.has(gigId)) next.delete(gigId);
    else next.add(gigId);
    set({ ids: next });
    await persist(next);
  },

  isSaved: (gigId: string) => get().ids.has(gigId),
}));
