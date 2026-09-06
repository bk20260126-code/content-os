import React, { useState } from 'react';
import { AppState, CreatorProfile } from '@/lib/types';
import { parseBackup, serializeBackup } from '@/lib/state-validation';
import { ApiStore, CloudSnapshot, rawStorage, store } from '@/lib/storage';
export function downloadText(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const filename = (label: string) => `content-os-${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
function counts(state: AppState | null) { return state ? `소스 ${state.sources.length}개 · 초안/발행 기록 ${state.drafts.length}개 · 근거 ${state.proofs.length}개 · 저작 기록 ${state.runs.length}개` : '빈 사본'; }
interface Props { state: AppState; recovery?: boolean; setProfile: (profile: CreatorProfile) => void; restore: (state: AppState) => Promise<void>; acceptCloud: (snapshot: CloudSnapshot, choice: 'local' | 'cloud') => Promise<void> }
export function Settings({ state, recovery, setProfile, restore, acceptCloud }: Props) {
  const [preview, setPreview] = useState<AppState | null>(null), [cloud, setCloud] = useState<CloudSnapshot | null>(null);
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const p = state.profile ?? { name: '', positioning: '', voice: [], avoid: [], primaryCta: '', audience: '', goal: '' };
  const change = (field: keyof CreatorProfile, value: string | string[]) => setProfile({ ...p, [field]: value });
  async function inspect(file: File | undefined) {
    setPreview(null); setNotice(''); setBackupConfirmed(false);
    if (!file) return;
    try { if (file.size > 20 * 1024 * 1024) throw new Error('20MB 이하의 백업 파일을 선택하세요.'); setPreview(parseBackup(await file.text())); }
    catch (e) { setNotice(`복원하지 않았습니다: ${e instanceof Error ? e.message : '파일 오류'}`); }
  }
  function exportBefore() {
    try { downloadText(recovery ? rawStorage() : serializeBackup(state), filename('before-restore')); setBackupConfirmed(true); }
    catch { setNotice('기존 데이터 백업을 만들지 못했습니다. 브라우저 저장소 접근을 확인하세요.'); }
  }
  async function compare() {
    if (!(store instanceof ApiStore)) return;
    setBusy(true); setNotice(''); setBackupConfirmed(false);
    try { setCloud(await store.inspectCloud()); } catch (e) { setNotice(e instanceof Error ? e.message : '클라우드 확인 실패'); }
    finally { setBusy(false); }
  }
  async function apply(action: () => Promise<void>, message: string) {
    setBusy(true); setNotice('');
    try { await action(); setPreview(null); setCloud(null); setNotice(message); }
    catch (e) { setNotice(e instanceof Error ? e.message : '변경 실패'); }
    finally { setBusy(false); setBackupConfirmed(false); }
  }
  return <div className="space-y-6 max-w-3xl"><h2 className="text-2xl font-bold">작성자 설정 · 백업</h2>
    {notice && <p role="status" className="notice">{notice}</p>}
    {!recovery && <section className="panel space-y-4"><h3 className="text-xl font-semibold">내 글의 방향</h3><p>설정하지 않아도 직접 작성할 수 있습니다. AI 생성·채점·평가에 함께 사용합니다.</p>
      <label className="block">이름 또는 활동명<input className="field" value={p.name} onChange={e => change('name', e.target.value)} /></label>
      <label className="block">누구에게 쓰나요?<input className="field" placeholder="예: AI 도구를 처음 써보는 직장인" value={p.audience ?? ''} onChange={e => change('audience', e.target.value)} /></label>
      <label className="block">글을 쓰는 목적<input className="field" placeholder="예: 직접 해본 방법을 쉽게 알려주기" value={p.goal ?? ''} onChange={e => change('goal', e.target.value)} /></label>
      <label className="block">내 경험과 관점<input className="field" value={p.positioning} onChange={e => change('positioning', e.target.value)} /></label>
      <label className="block">말투 · 한 줄에 하나<textarea className="field" value={p.voice.join('\n')} onChange={e => change('voice', e.target.value.split('\n'))} placeholder="친근한 존댓말
짧고 구체적인 문장" /></label>
      <label className="block">피할 표현 · 한 줄에 하나<textarea className="field" value={p.avoid.join('\n')} onChange={e => change('avoid', e.target.value.split('\n'))} /></label>
      <label className="block">기본 마무리 문구<input className="field" value={p.primaryCta} onChange={e => change('primaryCta', e.target.value)} /></label>
    </section>}
    <section className="panel space-y-4"><h3 className="text-xl font-semibold">백업 · 복원</h3><p>{counts(state)}</p><p>백업에는 소스, 초안, 근거 설명과 링크, 작성자 설정, 검토·발행 기록이 포함됩니다. 링크가 가리키는 외부 파일 자체는 포함되지 않습니다.</p>
      <button className="action" onClick={() => downloadText(recovery ? rawStorage() : serializeBackup(state), filename(recovery ? 'original-recovery' : 'backup'))}>{recovery ? '손상된 원본 그대로 내려받기' : '전체 백업 내려받기'}</button>
      <label className="block">복원할 백업 파일<input className="field" type="file" accept=".json,application/json" onChange={e => { inspect(e.target.files?.[0]); e.target.value = ''; }} /></label>
      {preview && <div className="notice space-y-3"><p className="font-semibold">복원 미리보기</p><p>{counts(preview)}</p><p>작성자: {preview.profile?.name || '미설정'}</p><p>현재 작업 전체를 이 파일로 교체합니다. 기존 사본을 먼저 백업하세요.</p><button className="action-secondary" onClick={exportBefore}>현재 사본 백업하기</button><button className="action" disabled={!backupConfirmed || busy} onClick={() => apply(() => restore(preview), '백업을 복원했습니다. 클라우드 모드에서는 사본 비교 후 저장을 선택하세요.')}>이 백업으로 복원</button><button className="action-secondary" onClick={() => setPreview(null)}>취소</button></div>}
    </section>
    {!recovery && store instanceof ApiStore && <section className="panel space-y-4"><h3 className="text-xl font-semibold">클라우드 사본 비교</h3><p>자동 병합하지 않습니다. 양쪽 사본을 내려받아 확인하고 유지할 사본을 선택하세요.</p><button className="action-secondary" disabled={busy} onClick={compare}>클라우드 사본 확인·재시도</button>
      {cloud && <div className="space-y-4">{cloud.migrationRequired && <p className="notice">기존 데이터를 읽었습니다. 클라우드 저장을 활성화하려면 README의 새 마이그레이션을 적용하세요.</p>}<p>이 기기: {counts(state)}</p><p>클라우드: {counts(cloud.state)} · 버전 {cloud.revision}</p><div className="flex flex-wrap gap-3"><button className="action-secondary" onClick={exportBefore}>이 기기 사본 백업</button><button className="action-secondary" onClick={() => downloadText(serializeBackup(cloud.state ?? { schemaVersion: 1, sources: [], drafts: [], proofs: [], runs: [], profile: null }), filename('cloud-copy'))}>클라우드 사본 내려받기</button></div><p>선택하지 않은 사본의 변경은 합쳐지지 않습니다.</p><div className="flex flex-wrap gap-3"><button className="action" disabled={!backupConfirmed || busy} onClick={() => apply(() => acceptCloud(cloud, 'local'), '이 기기 사본으로 저장을 요청했습니다. 상단 저장 상태를 확인하세요.')}>이 기기 사본으로 클라우드 저장</button><button className="action-secondary" disabled={!backupConfirmed || busy} onClick={() => apply(() => acceptCloud(cloud, 'cloud'), '클라우드 사본을 선택했습니다.')}>클라우드 사본으로 교체</button></div></div>}
    </section>}
  </div>;
}
