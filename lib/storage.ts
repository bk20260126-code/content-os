/**
 * Persistence layer — repository pattern.
 *
 * Phase 1 (now):   LocalStorageStore — survives refresh, single user.
 * Phase 1 (next):  SupabaseStore — drop-in replacement implementing ContentStore
 *                  once SUPABASE_URL / SUPABASE_ANON_KEY are provided.
 *
 * All UI code must depend on `ContentStore` only, never on localStorage directly.
 */

import { AppState } from './types';

export interface ContentStore {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = 'content_os_state_v1';

export const emptyState = (): AppState => ({
  schemaVersion: 1,
  sources: [],
  drafts: [],
  proofs: [],
  runs: [],
  profile: null,
});

class LocalStorageStore implements ContentStore {
  async load(): Promise<AppState | null> {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.schemaVersion !== 1) return null; // future: migrate
      return parsed;
    } catch {
      return null;
    }
  }

  async save(state: AppState): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

// Swap point: replace with SupabaseStore when credentials are available.
export const store: ContentStore = new LocalStorageStore();
