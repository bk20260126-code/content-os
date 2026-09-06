import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { emptyState } from '../lib/storage';

test('snapshot SQL preserves legacy rows, enforces atomic revisions, and denies public access', async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create table sources(id text); insert into sources values ('legacy');");
    const sql = await readFile(new URL('../supabase/migrations/20260906000000_versioned_snapshots.sql', import.meta.url), 'utf8');
    await db.exec(sql); await db.exec(sql);
    assert.deepEqual((await db.query('select * from sources')).rows, [{ id: 'legacy' }]);
    await db.exec('set role service_role');
    const save = () => db.query('select save_content_os_snapshot($1, $2::jsonb) as revision', [0, JSON.stringify(emptyState())]);
    const results = await Promise.allSettled([save(), save()]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    assert.equal(failed.reason.code, '40001');
    assert.deepEqual((await db.query('select revision, state from content_os_snapshot')).rows, [{ revision: 1, state: emptyState() }]);
    await db.exec('reset role; set role anon');
    await assert.rejects(() => db.query('select * from content_os_snapshot'), /permission denied/);
    await assert.rejects(() => db.query('select save_content_os_snapshot(1, null)'), /permission denied/);
    await db.exec('reset role; set role authenticated');
    await assert.rejects(() => db.query('select * from content_os_snapshot'), /permission denied/);
  } finally { await db.close(); }
});
