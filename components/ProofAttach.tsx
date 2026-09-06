'use client';

import { useState } from 'react';
import { safeWebUrl } from '@/lib/workflow';
import { Draft, ProofAsset, ProofType } from '@/lib/types';

const PROOF_TYPES: ProofType[] = [
  'screenshot', 'workflow map', 'system diagram', 'customer quote',
  'before/after metric', 'source document', 'demo clip',
  'validation loop', 'operating checklist',
];

interface ProofAttachProps {
  draft: Draft;
  proofs: ProofAsset[];
  onRegister: (proof: ProofAsset) => void;
  /** `justRegistered` carries a proof created this turn, before state has flushed. */
  onAttach: (proofId: string, justRegistered?: ProofAsset) => void;
  onDetach: () => void;
}

/**
 * Evidence attachment for a draft.
 *
 * This replaces the boolean toggle that used to sit here. A draft cannot claim
 * proof without pointing at a ProofAsset that carries a title, a type, and a
 * description of what it actually shows — the product promise is that a post
 * without evidence never reaches publish, and a checkbox cannot enforce that.
 */
export function ProofAttach({ draft, proofs, onRegister, onAttach, onDetach }: ProofAttachProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ProofType>(draft.proof.type ?? 'screenshot');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  const attached = draft.proof.proofId
    ? proofs.find(p => p.id === draft.proof.proofId)
    : undefined;

  // Reusing one artifact across several drafts is normal — a single workflow map
  // can back a LinkedIn post and a Threads post. So the whole registry is offered,
  // with same-source evidence surfaced first.
  const candidates = [...proofs].sort((a, b) => {
    const aMatch = a.sourceId === draft.sourceId ? 0 : 1;
    const bMatch = b.sourceId === draft.sourceId ? 0 : 1;
    return aMatch - bMatch;
  });

  const submit = () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) return;

    const proof: ProofAsset = {
      id: `proof-${Date.now()}`,
      sourceId: draft.sourceId,
      type,
      title: trimmedTitle,
      description: trimmedDescription,
      url: url.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    onRegister(proof);
    onAttach(proof.id, proof);
    setTitle(''); setDescription(''); setUrl('');
    setShowForm(false);
  };

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  return (
    <div className="p-4 border border-nf-border bg-[#fafafa] mt-8">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <span className="text-[10px] text-nf-muted uppercase tracking-widest block mb-1">필요한 증명</span>
          <span className="text-[13px] font-semibold text-nf-ink">
            {draft.content.proofArtifactNeeded || '아직 지정되지 않음'}
          </span>
        </div>
        <span
          className={`shrink-0 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest border ${
            attached
              ? 'bg-nf-primary text-white border-nf-primary'
              : 'bg-transparent text-nf-muted border-nf-border'
          }`}
        >
          {attached ? '자료 등록됨' : '증명 없음'}
        </span>
      </div>

      {attached ? (
        <div className="bg-white border border-nf-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-nf-ink">{attached.title}</p>
              <p className="text-[11px] text-nf-muted uppercase tracking-widest mt-1">{attached.type}</p>
              <p className="text-[13px] text-nf-ink mt-2 leading-relaxed">{attached.description}</p>
              {attached.url && !safeWebUrl(attached.url) && <p className="text-sm mt-2 break-all">보관 위치: {attached.url} (파일은 직접 열어 확인하세요)</p>}
              {safeWebUrl(attached.url) && (
                <a
                  href={safeWebUrl(attached.url) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] text-nf-primary underline break-all mt-2 inline-block"
                >
                  {attached.url}
                </a>
              )}
            </div>
            <button
              onClick={onDetach}
              className="shrink-0 text-[11px] text-nf-muted underline hover:text-nf-ink transition-colors"
            >
              떼어내기
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.length > 0 && (
            <div>
              <label className="block text-[10px] text-nf-muted uppercase tracking-widest mb-2">
                등록된 증명에서 고르기
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {candidates.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onAttach(p.id)}
                    className="w-full text-left bg-white border border-nf-border p-3 hover:border-nf-ink transition-colors"
                  >
                    <span className="text-[13px] font-semibold text-nf-ink">{p.title}</span>
                    <span className="text-[10px] text-nf-muted uppercase tracking-widest ml-2">{p.type}</span>
                    {p.sourceId === draft.sourceId && (
                      <span className="text-[10px] text-nf-primary uppercase tracking-widest ml-2">같은 소스</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showForm ? (
            <div className="bg-white border border-nf-border p-4 space-y-3">
              <div>
                <label className="block text-[10px] text-nf-muted uppercase tracking-widest mb-1">제목</label>
                <input
                  aria-label="증명 제목"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="예: 3주간 문의 응답 시간 로그"
                  className="w-full border border-nf-border px-3 py-2 text-[13px] text-nf-ink bg-white focus:outline-none focus:border-nf-ink"
                />
              </div>
              <div>
                <label className="block text-[10px] text-nf-muted uppercase tracking-widest mb-1">유형</label>
                <select
                  aria-label="증명 유형"
                  value={type}
                  onChange={e => setType(e.target.value as ProofType)}
                  className="w-full border border-nf-border px-3 py-2 text-[13px] text-nf-ink bg-white focus:outline-none focus:border-nf-ink"
                >
                  {PROOF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-nf-muted uppercase tracking-widest mb-1">
                  이 자료가 실제로 보여주는 것
                </label>
                <textarea
                  aria-label="이 자료가 실제로 보여주는 것"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="무엇을 증명하는지 한두 문장으로. 여기가 비면 증명이 아니라 주장이다."
                  className="w-full border border-nf-border px-3 py-2 text-[13px] text-nf-ink bg-white focus:outline-none focus:border-nf-ink resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-nf-muted uppercase tracking-widest mb-1">
                  원문 링크 또는 보관 위치 (선택)
                </label>
                <input
                  aria-label="원문 링크 또는 보관 위치"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://… 또는 자료를 보관한 위치"
                  className="w-full border border-nf-border px-3 py-2 text-[13px] text-nf-ink bg-white focus:outline-none focus:border-nf-ink"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-widest bg-nf-primary text-white border border-nf-primary transition-colors disabled:bg-transparent disabled:text-nf-muted disabled:border-nf-border disabled:cursor-not-allowed"
                >
                  등록하고 첨부
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-[11px] text-nf-muted underline hover:text-nf-ink transition-colors"
                >
                  취소
                </button>
                {!canSubmit && (
                  <span className="text-[11px] text-nf-muted">제목과 설명은 필수입니다</span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2 border border-nf-ink text-nf-ink text-[11px] font-semibold uppercase tracking-widest hover:bg-nf-ink hover:text-white transition-colors"
            >
              + 새 증명 등록
            </button>
          )}
        </div>
      )}
    </div>
  );
}
