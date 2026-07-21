/**
 * Persistence layer — repository pattern.
 *
 * Backends:
 *  - LocalStorageStore: browser-only fallback.
 *  - ApiStore (default when NEXT_PUBLIC_STORE_BACKEND=supabase): talks to /api/state,
 *    which persists to Supabase server-side. Includes one-time migration of existing
 *    localStorage data, and falls back to localStorage if the server is unreachable.
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

class ApiStore implements ContentStore {
  private local = new LocalStorageStore();

  async load(): Promise<AppState | null> {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`state load failed (${res.status})`);
      const { state } = (await res.json()) as { state: AppState | null };
      if (state) {
        await this.local.save(state); // keep local mirror as offline backup
        return state;
      }
      // DB empty (first run): one-time migration from localStorage if present
      const localState = await this.local.load();
      if (localState) {
        await this.save(localState);
        return localState;
      }
      return null;
    } catch {
      // Server/DB unreachable — degrade to local mirror so the app still opens
      return this.local.load();
    }
  }

  async save(state: AppState): Promise<void> {
    await this.local.save(state); // local mirror first (never lose work)
    try {
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn('[storage] cloud save failed:', data.error || res.status);
      }
    } catch (e) {
      console.warn('[storage] cloud save failed (offline?):', e);
    }
  }

  async clear(): Promise<void> {
    await this.local.clear();
    await this.save(emptyState());
  }
}

// Backend selection — NEXT_PUBLIC_STORE_BACKEND=supabase enables cloud persistence via /api/state.
export const store: ContentStore =
  process.env.NEXT_PUBLIC_STORE_BACKEND === 'supabase' ? new ApiStore() : new LocalStorageStore();
