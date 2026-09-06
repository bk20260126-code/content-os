import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiStore, LocalStorageStore, emptyState, STORAGE_KEY, CLOUD_KEY } from '../lib/storage';
import { parseBackup, parseState, serializeBackup } from '../lib/state-validation';
import { mockSources } from '../lib/mock-data';
const state = () => ({ ...emptyState(), sources: [structuredClone(mockSources[0])] });
async function browser(run: (data: Map<string, string>) => Promise<void>) {
  const hadWindow = 'window' in globalThis, originalWindow = globalThis.window, originalFetch = globalThis.fetch;
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) } } });
  try { await run(data); } finally { globalThis.fetch = originalFetch; if (hadWindow) Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow }); else delete (globalThis as { window?: Window }).window; }
}
test('backup preserves all slices and optional creator and source context', () => {
  const s = state(); s.sources[0].brief = { claim: '관찰', author: '나', observedAt: '2026-09-06', excerpt: '원문', unknowns: '미확인' };
  const data = { ...s, profile: { name: '회원', positioning: '경험', voice: ['존댓말'], avoid: [], primaryCta: '직접 해보세요', audience: '초보자', goal: '학습' } };
  assert.deepEqual(parseBackup(serializeBackup(data)), data);
  assert.deepEqual(parseBackup(JSON.stringify(data)), data);
});
test('corrupt, future, malformed, and duplicate backup records are rejected before replacement', () => {
  assert.throws(() => parseBackup('{'));
  assert.throws(() => parseState({ ...emptyState(), schemaVersion: 2 }));
  assert.throws(() => parseState({ ...emptyState(), sources: null }));
  const s = state(); assert.throws(() => parseState({ ...s, sources: [s.sources[0], s.sources[0]] }));
  assert.throws(() => parseState({ ...emptyState(), profile: { name: 'incomplete' } }));
});
test('corrupt local storage remains unchanged and raises a recoverable error', async () => browser(async data => {
  data.set(STORAGE_KEY, '{broken'); const store = new LocalStorageStore(); await assert.rejects(() => store.load()); assert.equal(data.get(STORAGE_KEY), '{broken');
}));
test('a stale local tab cannot overwrite another tab', async () => browser(async data => {
  const a = new LocalStorageStore(), b = new LocalStorageStore(); await a.load(); await b.load();
  const next = state(); await a.save(next); await assert.rejects(() => b.save(emptyState())); assert.deepEqual(JSON.parse(data.get(STORAGE_KEY)!), next);
}));
test('unsynced offline edits survive reopening even if the server is older', async () => browser(async data => {
  const original = state(), edited = state(); edited.sources[0].title = '오프라인 새 내용';
  data.set(CLOUD_KEY, JSON.stringify({ state: edited, pending: true, baseRevision: 3 }));
  let called = false; globalThis.fetch = async () => { called = true; return Response.json({ state: original, revision: 3 }); };
  assert.deepEqual(await new ApiStore().load(), edited); assert.equal(called, false);
}));
test('failed cloud writes stay pending and are not overwritten on reload', async () => browser(async data => {
  globalThis.fetch = async (_input, init) => init?.method === 'PUT' ? Response.json({ error: 'offline' }, { status: 503 }) : Response.json({ state: state(), revision: 2 });
  const store = new ApiStore(); await store.load(); const edited = state(); edited.sources[0].title = 'new'; await store.save(edited);
  assert.equal(JSON.parse(data.get(CLOUD_KEY)!).pending, true); assert.deepEqual(await new ApiStore().load(), edited);
}));
test('server version conflicts preserve the local candidate', async () => browser(async data => {
  let expected: number | undefined;
  globalThis.fetch = async (_input, init) => { if (init?.method === 'PUT') { expected = JSON.parse(init.body as string).expectedRevision; return Response.json({ error: 'conflict' }, { status: 409 }); } return Response.json({ state: state(), revision: 4 }); };
  const store = new ApiStore(); await store.load(); const edited = state(); edited.sources[0].title = 'candidate'; await store.save(edited);
  assert.equal(expected, 4); assert.equal(JSON.parse(data.get(CLOUD_KEY)!).pending, true); assert.deepEqual(await store.load(), edited);
}));
test('a successful upload cannot clear edits typed while the upload is pending', async () => browser(async data => {
  let release!: () => void; let uploads = 0;
  globalThis.fetch = async (_input, init) => {
    if (init?.method !== 'PUT') return Response.json({ state: state(), revision: 0 });
    uploads++; if (uploads === 1) await new Promise<void>(resolve => { release = resolve; });
    return Response.json({ revision: uploads });
  };
  const store = new ApiStore(); await store.load(); const a = state(), b = state(); a.sources[0].title = 'a'; b.sources[0].title = 'b';
  const first = store.save(a); while (!release) await new Promise(resolve => setImmediate(resolve));
  const second = store.save(b); release(); await Promise.all([first, second]);
  const mirror = JSON.parse(data.get(CLOUD_KEY)!); assert.equal(mirror.state.sources[0].title, 'b'); assert.equal(mirror.pending, false); assert.equal(mirror.baseRevision, 2);
}));
test('backup restore in cloud mode requires explicit comparison before any upload', async () => browser(async data => {
  let puts = 0; globalThis.fetch = async (_i, init) => { if (init?.method === 'PUT') puts++; return Response.json({ state: state(), revision: 1 }); };
  const store = new ApiStore(); await store.load(); const restored = state(); restored.sources[0].title = 'restored'; await store.replaceLocal(restored);
  assert.equal(puts, 0); assert.equal(JSON.parse(data.get(CLOUD_KEY)!).pending, true);
}));

test('an unmigrated cloud stays readable and preserves new changes locally', async () => browser(async data => {
  let puts = 0;
  globalThis.fetch = async (_i, init) => { if (init?.method === 'PUT') puts++; return Response.json({ state: state(), revision: 0, migrationRequired: true }); };
  const store = new ApiStore(); assert.deepEqual(await store.load(), state());
  await store.save(emptyState()); assert.equal(puts, 0); assert.equal(JSON.parse(data.get(CLOUD_KEY)!).pending, true);
}));

test('a stale cloud tab cannot overwrite another tab’s pending local edits', async () => browser(async data => {
  globalThis.fetch = async () => Response.json({ state: state(), revision: 0, migrationRequired: true });
  const a = new ApiStore(), b = new ApiStore(); await a.load(); await b.load();
  const edited = state(); edited.sources[0].title = 'preserve pending'; await a.save(edited);
  await assert.rejects(() => b.save(emptyState())); assert.equal(JSON.parse(data.get(CLOUD_KEY)!).state.sources[0].title, 'preserve pending');
}));


test('concurrent hydration shares one request so a late first load cannot overwrite edits', async () => browser(async () => {
  let gets = 0;
  globalThis.fetch = async () => { gets++; return Response.json({ state: state(), revision: 0 }); };
  const store = new ApiStore(); const [a, b] = await Promise.all([store.load(), store.load()]);
  assert.equal(gets, 1); assert.deepEqual(a, b);
}));
