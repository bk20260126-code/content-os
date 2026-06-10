import { NextRequest, NextResponse } from 'next/server';
import { scoreSource, evaluateGate, generateDraft } from '@/lib/ai';

/**
 * POST /api/ai
 * Body: { task: 'score' | 'gate' | 'draft', source?, draft?, platform? }
 *
 * Returns AI recommendation only — the client must require explicit
 * human confirmation before applying any result (last-mile principle).
 */
export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'AI backend not configured. Set GEMINI_API_KEY in .env.local.' },
      { status: 501 },
    );
  }

  try {
    const body = await req.json();
    switch (body.task) {
      case 'score':
        return NextResponse.json({ recommendation: await scoreSource(body.source) });
      case 'gate':
        return NextResponse.json({ recommendation: await evaluateGate(body.draft) });
      case 'draft':
        return NextResponse.json({ recommendation: await generateDraft(body.source, body.platform) });
      default:
        return NextResponse.json({ error: `Unknown task: ${body.task}` }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
