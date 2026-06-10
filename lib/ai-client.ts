/**
 * Client-side helper for /api/ai.
 * Returns the AI recommendation only — caller must keep human confirmation
 * before applying anything to app state (last-mile principle).
 */

export type AiTask = 'score' | 'gate' | 'draft';

export async function requestAI<T = unknown>(task: AiTask, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `AI request failed (${res.status})`);
  }
  return data.recommendation as T;
}
