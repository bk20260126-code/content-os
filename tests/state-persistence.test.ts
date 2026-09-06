import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseClient } from '@supabase/supabase-js';
import { ApiStore, emptyState } from '../lib/storage';
import { clearAppState, upsertAppState } from '../lib/state-persistence';
import { hasPersistedState, shouldSeedMockData } from '../lib/state-policy';

type Call = { table: string; operation: 'upsert' | 'delete-eq' | 'delete-not' };

function recordingClient() {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      return {
        async upsert() {
          calls.push({ table, operation: 'upsert' });
          return { error: null };
        },
        delete() {
          return {
            async eq() {
              calls.push({ table, operation: 'delete-eq' });
              return { error: null };
            },
            async not() {
              calls.push({ table, operation: 'delete-not' });
              return { error: null };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

test('cloud mode never seeds mock data, including in development', () => {
  assert.equal(shouldSeedMockData('development', 'supabase'), false);
  assert.equal(shouldSeedMockData('production', undefined), false);
  assert.equal(shouldSeedMockData('development', undefined), true);
});

test('loading an empty cloud never migrates localStorage implicitly', async () => {
  const originalFetch = globalThis.fetch;
  const hadWindow = 'window' in globalThis;
  const originalWindow = globalThis.window;
  const requests: string[] = [];
  const localState = JSON.stringify({ ...emptyState(), sources: [{ id: 'local-only' }] });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => key === 'content_os_state_v1' ? localState : null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    },
  });
  globalThis.fetch = (async (_input, init) => {
    requests.push(init?.method ?? 'GET');
    return new Response(JSON.stringify({ state: null, revision: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    assert.equal(await new ApiStore().load(), null);
    assert.deepEqual(requests, ['GET']);
  } finally {
    globalThis.fetch = originalFetch;
    if (hadWindow) Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    else delete (globalThis as { window?: Window }).window;
  }
});

test('empty detection includes proofs, runs, and profile', () => {
  assert.equal(hasPersistedState([], [], [], [], null), false);
  assert.equal(hasPersistedState([], [], [{}], [], null), true);
  assert.equal(hasPersistedState([], [], [], [{}], null), true);
  assert.equal(hasPersistedState([], [], [], [], {}), true);
});

test('a stale empty snapshot does not delete any persisted rows', async () => {
  const { client, calls } = recordingClient();
  await upsertAppState(client, emptyState());

  assert.deepEqual(calls, []);
});

test('explicit clear deletes every state slice, including profile', async () => {
  const { client, calls } = recordingClient();
  await clearAppState(client);

  assert.deepEqual(calls, [
    { table: 'runs', operation: 'delete-not' },
    { table: 'proofs', operation: 'delete-not' },
    { table: 'drafts', operation: 'delete-not' },
    { table: 'sources', operation: 'delete-not' },
    { table: 'creator_profile', operation: 'delete-eq' },
  ]);
});
