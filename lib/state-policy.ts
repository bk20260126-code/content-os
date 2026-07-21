export function hasPersistedState(
  sources: unknown[] | null,
  drafts: unknown[] | null,
  proofs: unknown[] | null,
  runs: unknown[] | null,
  profile: unknown | null,
): boolean {
  return (sources?.length ?? 0) > 0
    || (drafts?.length ?? 0) > 0
    || (proofs?.length ?? 0) > 0
    || (runs?.length ?? 0) > 0
    || profile !== null;
}

export function shouldSeedMockData(nodeEnv: string | undefined, backend: string | undefined): boolean {
  return nodeEnv === 'development' && backend !== 'supabase';
}
