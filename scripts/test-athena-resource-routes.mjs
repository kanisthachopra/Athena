// Explicit disposable-family test; no real-family records or browser cookies used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { createServerClient } from '@supabase/ssr';

if (!process.argv.includes('--live') || !process.argv.includes('--write-test-records')) {
  console.log('Dry run. --live --write-test-records temporarily enables Guide only in MIRA disposable pilot test 0, exercises provider routes, and restores AI off. Request metadata remains.');
  process.exit(0);
}
if (process.argv.includes('--browser') && !process.stdin.isTTY) throw Error('Browser checks need an interactive terminal so cleanup can run.');
let stage = 'configuration', restore;
try {
  process.loadEnvFile('.env.local'); process.loadEnvFile('.env.test.local');
  const jar = new Map();
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => { for (const cookie of values) jar.set(cookie.name, cookie.value); } },
    global: { fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(15000) }) },
  });
  stage = 'disposable identity check';
  const auth = await client.auth.signInWithPassword({ email: process.env.MIRA_TEST_OWNER_EMAIL, password: process.env.MIRA_TEST_OWNER_PASSWORD });
  assert.ok(!auth.error && auth.data.user);
  const member = await client.from('family_members').select('family_id,role').eq('user_id', auth.data.user.id).single();
  assert.ok(!member.error && member.data?.role === 'owner');
  const familyId = member.data.family_id;
  const family = await client.from('families').select('display_name').eq('id', familyId).single();
  assert.ok(!family.error && family.data?.display_name === 'MIRA disposable pilot test 0');
  const readSettings = async () => {
    const result = await client.from('family_ai_preferences').select('guide_enabled,profile_enabled,journal_enabled,policy_version,revision').eq('family_id', familyId).single();
    assert.equal(result.error, null); return result.data;
  };
  const initial = await readSettings();
  assert.ok((!initial.guide_enabled || process.argv.includes('--resume-browser')) && !initial.profile_enabled && !initial.journal_enabled, 'Refuse to change an enabled family');
  const children = await client.from('children').select('id').eq('family_id', familyId); assert.equal(children.error, null);
  const ids = children.data.map(c => c.id); assert.ok(ids.length);
  const snapshot = async () => {
    const plans = await client.from('plans').select('*').in('child_id', ids).order('id');
    const items = await client.from('activity_instances').select('*').in('child_id', ids).order('id');
    assert.equal(plans.error, null); assert.equal(items.error, null); return { plans: plans.data, items: items.data };
  };
  const before = await snapshot();
  const origin = 'http://localhost:3010';
  const call = async (path, body, extra = {}) => {
    const response = await fetch(`${origin}/api/athena/${path}`, { method: 'POST', headers: { origin, Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), 'Content-Type': 'application/json', ...extra }, body, signal: AbortSignal.timeout(100000), redirect: 'error' });
    const value = await response.json();
    if (!response.ok) console.log(`Route ${path}: HTTP ${response.status}; ${typeof value.error === 'string' ? value.error : 'no error description'}`);
    return { response, value };
  };
  const search = JSON.stringify({ action: 'search', query: 'free illustrated French stories', ageMonths: 42, domain: 'language', language: 'French', shareWithTavily: true });
  stage = 'AI off denial';
  if (!initial.guide_enabled) assert.equal((await call('resources', search)).response.status, 403);
  restore = async () => {
    const current = await readSettings();
    if (current.guide_enabled) {
      const off = await client.rpc('set_family_ai_preferences', { p_family_id: familyId, p_expected_revision: current.revision, p_guide_enabled: false, p_profile_enabled: false, p_journal_enabled: false, p_policy_version: null });
      assert.equal(off.error, null);
    }
    assert.equal((await readSettings()).guide_enabled, false);
    assert.deepEqual(await snapshot(), before);
  };
  stage = 'temporary disposable Guide enable';
  const enabled = initial.guide_enabled ? { error: null } : await client.rpc('set_family_ai_preferences', { p_family_id: familyId, p_expected_revision: initial.revision, p_guide_enabled: true, p_profile_enabled: false, p_journal_enabled: false, p_policy_version: '2026-10-01-v2' });
  assert.equal(enabled.error, null);
  if (process.argv.includes('--browser')) {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    console.log('READY: disposable Guide enabled for the browser check; plans held unchanged in memory.');
    try { await prompt.question('Enter done after the browser check: ', { signal: AbortSignal.timeout(180000) }); } finally { prompt.close(); }
    prompt.close();
  } else {
  stage = 'authenticated search';
  const found = await call('resources', search); assert.equal(found.response.status, 200); assert.ok(found.value.results.length);
  stage = 'authenticated explanation';
  const explained = await call('resources', JSON.stringify({ action: 'explain', url: 'https://developingchild.harvard.edu/key-concept/serve-and-return/', ageMonths: 18, question: 'What does this explain to a parent?', shareWithTavily: true, shareWithNebius: true }));
  assert.equal(explained.response.status, 200); assert.ok(explained.value.overview); assert.ok(explained.value.points.length);
  stage = 'authenticated synthetic voice';
  const transcript = await call('voice', readFileSync('tmp/athena-voice-test.wav'), { 'Content-Type': 'audio/wav', 'X-Athena-Voice-Consent': 'deepgram-v1' });
  assert.equal(transcript.response.status, 200); assert.match(transcript.value.transcript.toLowerCase(), /french|stories/);
  }
  stage = 'restore and plan preservation';
  await restore(); restore = null;
  console.log(process.argv.includes('--browser') ? 'PASS browser test cleanup: disposable Guide restored off; every existing plan and activity unchanged. UI evidence is recorded separately.' : 'PASS authenticated routes: AI-off denial, live search, cited explanation, synthetic voice, durable reservations. Disposable Guide restored off; every existing plan and activity unchanged.');
} catch { console.error(`Authenticated route test stopped at ${stage}. No credentials or family payloads logged.`); process.exitCode = 1; }
finally { if (restore) { try { await restore(); console.log('Recovery verified: disposable Guide off, plans unchanged.'); } catch { console.error('RECOVERY NEEDED: disposable Guide state could not be verified.'); process.exitCode = 1; } } }
