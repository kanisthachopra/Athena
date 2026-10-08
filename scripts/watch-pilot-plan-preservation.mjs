// Read-only before/after guard for an authorized disposable UI test.
// Snapshots remain in memory, never in a log or file. No database writes.
import assert from 'node:assert/strict';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

let stage = 'configuration';
let prompt;
try {
  process.loadEnvFile('.env.local'); process.loadEnvFile('.env.test.local');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(12000) }) },
  });
  stage = 'disposable owner safeguards';
  const signed = await client.auth.signInWithPassword({ email: process.env.MIRA_TEST_OWNER_EMAIL, password: process.env.MIRA_TEST_OWNER_PASSWORD });
  assert.ok(!signed.error && signed.data.user);
  const member = await client.from('family_members').select('family_id,role').eq('user_id', signed.data.user.id).single();
  assert.ok(!member.error && member.data?.role === 'owner');
  const family = await client.from('families').select('display_name').eq('id', member.data.family_id).single();
  assert.ok(!family.error && family.data?.display_name === 'MIRA disposable pilot test 0');
  const children = await client.from('children').select('id').eq('family_id', member.data.family_id);
  assert.equal(children.error, null);
  const ids = children.data.map(row => row.id); assert.ok(ids.length);
  const read = async () => {
    const plans = await client.from('plans').select('*').in('child_id', ids).order('id');
    const items = await client.from('activity_instances').select('*').in('child_id', ids).order('id');
    assert.equal(plans.error, null); assert.equal(items.error, null);
    return { plans: plans.data, items: items.data };
  };
  stage = 'before snapshot';
  const before = await read(); assert.ok(before.plans.length);
  prompt = createInterface({ input: process.stdin, output: process.stdout });
  console.log('READY: existing disposable-family plans and items held in memory. No records written.');
  const answer = await prompt.question('After the UI check, enter verify: ');
  assert.equal(answer.trim(), 'verify');
  stage = 'after snapshot';
  assert.deepEqual(await read(), before);
  console.log('PASS: all existing disposable-family plan and activity rows are exactly unchanged.');
} catch {
  console.error(`Plan-preservation check stopped at ${stage}; no private values printed and no writes performed.`);
  process.exitCode = 1;
} finally { prompt?.close(); }
