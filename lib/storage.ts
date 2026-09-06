import { AppState } from './types';
import { parseState, parseJson } from './state-validation';

export type SaveStatus = { kind: 'local' | 'cloud' | 'saving' | 'pending' | 'conflict' | 'error'; message: string };
export interface CloudSnapshot { state: AppState | null; revision: number; migrationRequired?: boolean }
export interface ContentStore {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
}
export const STORAGE_KEY = 'content_os_state_v1';
export const CLOUD_KEY = 'content_os_cloud_mirror_v2';
export const emptyState = (): AppState => ({ schemaVersion: 1, sources: [], drafts: [], proofs: [], runs: [], profile: null });
const listeners = new Set<(status: SaveStatus) => void>();
let lastStatus: SaveStatus = { kind: 'local', message: '이 기기에 저장합니다' };
export function subscribeStorage(fn: (status: SaveStatus) => void) { listeners.add(fn); fn(lastStatus); return () => { listeners.delete(fn); }; }
function report(kind: SaveStatus['kind'], message: string) { lastStatus = { kind, message }; listeners.forEach(fn => fn(lastStatus)); }
export function rawStorage(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(process.env.NEXT_PUBLIC_STORE_BACKEND === 'supabase' ? CLOUD_KEY : STORAGE_KEY) ?? window.localStorage.getItem(STORAGE_KEY) ?? '';
}
export class LocalStorageStore implements ContentStore {
  private baseline: string | null = null;
  async load(): Promise<AppState | null> {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const state = raw ? parseState(parseJson(raw)) : null;
    this.baseline = raw; return state;
  }
  async save(state: AppState): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== this.baseline) throw new Error('다른 탭에서 변경했습니다. 현재 작업을 백업하고 새로고침하세요.');
      const raw = JSON.stringify(state); window.localStorage.setItem(STORAGE_KEY, raw); this.baseline = raw; report('local', '이 기기에 저장됨');
    }
    catch (e) { report('error', '기기 저장 실패 · 지금 백업을 내려받으세요'); throw e; }
  }
  async replaceLocal(state: AppState) { this.baseline = window.localStorage.getItem(STORAGE_KEY); await this.save(state); }
  async clear() { window.localStorage.removeItem(STORAGE_KEY); this.baseline = null; }
}
interface Mirror { state: AppState; baseRevision: number | null; pending: boolean }
export class ApiStore implements ContentStore {
  private revision: number | null = null;
  private mirrorBaseline: string | null = null;
  private blocked = false;
  private queue: Promise<void> = Promise.resolve();
  private loading: Promise<AppState | null> | null = null;
  private mirror(): Mirror | null {
    const raw = window.localStorage.getItem(CLOUD_KEY);
    if (!raw) return null;
    const m = parseJson(raw) as Mirror;
    if (!m || typeof m !== 'object' || typeof m.pending !== 'boolean' || !(m.baseRevision === null || Number.isSafeInteger(m.baseRevision))) throw new Error('클라우드 사본의 버전 정보가 손상되었습니다.');
    return { ...m, state: parseState(m.state) };
  }
  private write(m: Mirror) {
    try {
      if (window.localStorage.getItem(CLOUD_KEY) !== this.mirrorBaseline) throw new Error('다른 탭에서 사본을 변경했습니다. 현재 작업을 백업하고 새로고침하세요.');
      const raw = JSON.stringify(m); window.localStorage.setItem(CLOUD_KEY, raw); this.mirrorBaseline = raw;
    }
    catch (e) { report('error', '기기 저장 실패 · 지금 백업을 내려받으세요'); throw e; }
  }
  async inspectCloud(): Promise<CloudSnapshot> {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) throw new Error('클라우드를 읽지 못했습니다. 연결과 데이터베이스 마이그레이션을 확인하세요.');
    const data = await res.json();
    if (!Number.isSafeInteger(data.revision) || data.revision < 0) throw new Error('클라우드 버전 정보를 확인할 수 없습니다. 앱과 데이터베이스를 함께 업데이트하세요.');
    return { state: data.state ? parseState(data.state) : null, revision: data.revision, migrationRequired: data.migrationRequired === true };
  }
  async load(): Promise<AppState | null> {
    if (this.loading) return this.loading;
    this.loading = this.loadSnapshot();
    try { return await this.loading; } finally { this.loading = null; }
  }
  private async loadSnapshot(): Promise<AppState | null> {
    this.mirrorBaseline = window.localStorage.getItem(CLOUD_KEY);
    const local = this.mirror(); // A corrupt mirror must never be silently replaced.
    if (local?.pending) {
      this.revision = local.baseRevision; this.blocked = true;
      report('pending', '이 기기에 저장됨 · 클라우드와 비교 후 선택하세요'); return local.state;
    }
    let remote: CloudSnapshot;
    try { remote = await this.inspectCloud(); }
    catch (e) {
      this.blocked = true; this.revision = local?.baseRevision ?? null;
      if (local) { report('pending', '오프라인 · 이 기기의 사본을 열었습니다'); return local.state; }
      throw e;
    }
    this.revision = remote.revision;
    if (remote.state) this.write({ state: remote.state, baseRevision: remote.revision, pending: false });
    if (remote.migrationRequired) { this.blocked = true; report('pending', '클라우드 업데이트 필요 · 새 변경은 이 기기에 보관합니다'); }
    else report('cloud', '클라우드에서 불러옴');
    return remote.state;
  }
  async save(state: AppState): Promise<void> {
    this.write({ state, baseRevision: this.revision, pending: true });
    if (this.blocked || this.revision === null) { report('pending', '이 기기에 저장됨 · 클라우드와 비교 후 선택하세요'); return; }
    this.queue = this.queue.catch(() => {}).then(async () => {
      if (this.blocked) return;
      // Coalesce typing, but never clear a newer pending local snapshot.
      const pending = this.mirror();
      if (!pending?.pending) return;
      report('saving', '이 기기에 저장됨 · 클라우드 저장 중');
      try {
        const res = await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: pending.state, expectedRevision: this.revision }) });
        const data = await res.json();
        if (!res.ok) { this.blocked = true; report(res.status === 409 ? 'conflict' : 'pending', res.status === 409 ? '다른 변경이 있습니다 · 비교 후 선택하세요' : '이 기기에 저장됨 · 클라우드 저장 실패'); return; }
        if (!Number.isSafeInteger(data.revision)) throw new Error('저장 응답의 버전이 없습니다.');
        this.revision = data.revision;
        const latest = this.mirror();
        if (latest && JSON.stringify(latest.state) === JSON.stringify(pending.state)) {
          this.write({ state: pending.state, baseRevision: this.revision, pending: false }); report('cloud', '이 기기와 클라우드에 저장됨');
        }
      } catch { this.blocked = true; report('pending', '이 기기에 저장됨 · 클라우드 저장 대기'); }
    });
    await this.queue;
  }
  async resolve(snapshot: CloudSnapshot, choice: 'local' | 'cloud', local: AppState): Promise<AppState> {
    if (snapshot.migrationRequired) throw new Error('README의 새 Supabase 마이그레이션을 적용한 뒤 다시 비교하세요.');
    await this.queue;
    this.revision = snapshot.revision; this.blocked = false;
    const selected = choice === 'local' ? local : snapshot.state ?? emptyState();
    if (choice === 'local') await this.save(selected);
    else { this.write({ state: selected, baseRevision: snapshot.revision, pending: false }); report('cloud', '선택한 클라우드 사본을 불러옴'); }
    return selected;
  }
  async replaceLocal(state: AppState) {
    await this.queue; this.blocked = true;
    this.mirrorBaseline = window.localStorage.getItem(CLOUD_KEY);
    this.write({ state, baseRevision: this.revision, pending: true });
    report('pending', '백업을 이 기기에 복원함 · 클라우드와 비교 후 선택하세요');
  }
  async clear(): Promise<void> { throw new Error('클라우드 초기화는 이 화면에서 지원하지 않습니다.'); }
}
export const store = process.env.NEXT_PUBLIC_STORE_BACKEND === 'supabase' ? new ApiStore() : new LocalStorageStore();
