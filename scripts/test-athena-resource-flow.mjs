import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', js)(id => { if (id === 'server-only') return {}; if (id in dependencies) return dependencies[id]; throw Error(`Unexpected dependency: ${id}`); }, exports);
  return exports;
}
const voice = load('../lib/athena/deepgram.ts');
const nebius = load('../lib/ai/nebius.ts');
const guide = load('../lib/athena/resource-guide.ts', { '@/lib/ai/nebius': nebius });
const tavily = load('../lib/athena/tavily.ts');
const audio = new Uint8Array(200);

if (process.argv.includes('--live')) {
  process.loadEnvFile('.env.local');
  let stage = 'search';
  try {
    const found = await tavily.searchResources('free Sesame Workshop preschool movement parent resources');
    assert.ok(found.results.length);
    stage = 'source extraction';
    const source = await tavily.extractResource('https://developingchild.harvard.edu/key-concept/serve-and-return/');
    assert.ok(source.content?.length > 200);
    stage = 'grounded explanation';
    const explained = await guide.explainResource(source.content, 'Explain the idea to a parent without inventing activities.', async () => {});
    assert.ok(explained.explanation.overview);
    console.log(`PASS live search (${found.results.length} sources), extraction and validated Nebius explanation (${explained.explanation.points.length} cited points). Only public synthetic context sent.`);
    if (process.argv.includes('--audio')) {
      stage = 'voice transcription';
      const result = await voice.transcribeAudio(readFileSync('tmp/athena-voice-test.wav'), 'audio/wav');
      assert.match(result.transcript.toLowerCase(), /french|stories|parent/);
      console.log('PASS live Deepgram transcription of generated synthetic speech. No family audio used.');
    }
  } catch (error) { console.error(`Live provider check stopped at ${stage}: ${error?.code || (error?.message?.startsWith("Unverifiable") ? "evidence_mismatch" : "validation")}. No keys or response payloads logged.`); process.exitCode = 1; }
} else {
  const originalFetch = globalThis.fetch;
  process.env.DEEPGRAM_API_KEY = 'synthetic-test-key';
  let providerCalls = 0;
  globalThis.fetch = async (url, init) => {
    providerCalls++;
    assert.match(url, /mip_opt_out=true/);
    assert.equal(init.headers.Authorization, 'Token synthetic-test-key');
    return Response.json({ metadata: { duration: 3 }, results: { channels: [{ alternatives: [{ transcript: 'Free French stories.', confidence: 0.98 }] }] } });
  };
  assert.equal((await voice.transcribeAudio(audio, 'audio/webm;codecs=opus')).transcript, 'Free French stories.');
  await assert.rejects(voice.transcribeAudio(audio, 'text/html'));
  await assert.rejects(voice.transcribeAudio(new Uint8Array(3_000_001), 'audio/wav'));
  assert.equal(providerCalls, 1);
  globalThis.fetch = async () => Response.json({ results: { channels: [{ alternatives: [{ transcript: 'uncertain', confidence: 0.2 }] }] } });
  await assert.rejects(voice.transcribeAudio(audio, 'audio/wav'), { code: 'no_speech' });
  globalThis.fetch = async () => new Response('', { status: 429 });
  await assert.rejects(voice.transcribeAudio(audio, 'audio/wav'), { code: 'unavailable' });
  globalThis.fetch = originalFetch;

  assert.deepEqual(guide.validateExplanation({ overview: 'Brief', points: [{ text: 'Source-based', passageId: 1 }], limitation: 'Not a diagnosis' }, 'Serve and return interactions'), { overview: 'Brief', points: [{ text: 'Source-based', evidence: 'Serve and return interactions' }], limitation: 'Not a diagnosis' });
  assert.throws(() => guide.validateExplanation({ overview: 'Brief', points: [{ text: 'Invented', passageId: 99 }], limitation: '' }, 'actual source'));
  assert.throws(() => guide.validateExplanation({ overview: '', points: [], limitation: '' }, 'word '.repeat(30)));

  class AiPermissionError extends Error {}
  class GuideBudgetError extends Error {}
  let signedIn = true, role = 'caregiver', allowed = true, dispatches = 0;
  const client = { auth: { getClaims: async () => ({ data: { claims: signedIn ? { sub: 'synthetic' } : null }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role, family_id: 'family' }, error: null }) }) }) }) };
  const requestHelpers = load('../lib/athena/request.ts', {
    '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/ai/permission': { familyAiAuthorizer: () => async () => { if (!allowed) throw new AiPermissionError('AI is off'); } },
    '@/lib/ai/guide-budget': { guideRequestBudget: () => ({ beforeRequest: async () => { dispatches++; }, finish: async () => {} }) },
  });
  let searches = 0, summaries = 0;
  const route = load('../app/api/athena/resources/route.ts', {
    '@/lib/athena/request': requestHelpers,
    '@/lib/athena/resource-context': load('../lib/athena/resource-context.ts'),
    '@/lib/athena/resource-catalog': load('../lib/athena/resource-catalog.ts'),
    '@/lib/athena/tavily': { ...tavily, searchResources: async () => { searches++; return { results: [] }; }, extractResource: async url => ({ url, content: 'Real source words', checkedAt: 'today' }) },
    '@/lib/athena/resource-guide': { explainResource: async (_source, _question, before) => { await before(); summaries++; return { explanation: { overview: 'Valid', points: [] }, completion: {} }; } },
    '@/lib/ai/permission': { AiPermissionError }, '@/lib/ai/guide-budget': { GuideBudgetError },
  });
  const body = { action: 'search', query: 'stories', domain: 'language', language: 'French', ageMonths: 42, shareWithTavily: true };
  const request = (value, origin = 'http://localhost:3010') => new Request('http://localhost:3010/api/athena/resources', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
  assert.equal((await route.POST(request(body, 'https://other.example'))).status, 403);
  signedIn = false; assert.equal((await route.POST(request(body))).status, 401); signedIn = true;
  role = 'viewer'; assert.equal((await route.POST(request(body))).status, 403); role = 'caregiver';
  allowed = false; assert.equal((await route.POST(request(body))).status, 403); allowed = true;
  assert.equal((await route.POST(request({ ...body, shareWithTavily: false }))).status, 400);
  assert.equal((await route.POST(request({ ...body, ageMonths: -1 }))).status, 400);
  assert.equal((await route.POST(request({ ...body, query: 'x'.repeat(6500) }))).status, 413);
  assert.equal(searches, 0); assert.equal(dispatches, 0);
  assert.equal((await route.POST(request(body))).status, 200); assert.equal(searches, 1); assert.equal(dispatches, 1);
  const explain = { action: 'explain', url: 'https://example.org/resource', question: '', shareWithTavily: true, shareWithNebius: true };
  assert.equal((await route.POST(request({ ...explain, shareWithNebius: false }))).status, 400);
  assert.equal((await route.POST(request({ ...explain, url: 'http://localhost/secret' }))).status, 400);
  assert.equal((await route.POST(request(explain))).status, 200); assert.equal(summaries, 1); assert.equal(dispatches, 3);
  const voiceRoute = load('../app/api/athena/voice/route.ts', {
    '@/lib/athena/request': requestHelpers, '@/lib/athena/deepgram': { ...voice, transcribeAudio: async () => ({ transcript: 'Synthetic speech' }) },
    '@/lib/ai/permission': { AiPermissionError }, '@/lib/ai/guide-budget': { GuideBudgetError },
  });
  const voiceRequest = (consent, type = 'audio/wav', bytes = audio) => new Request('http://localhost:3010/api/athena/voice', { method: 'POST', headers: { origin: 'http://localhost:3010', 'Content-Type': type, 'X-Athena-Voice-Consent': consent }, body: bytes });
  assert.equal((await voiceRoute.POST(voiceRequest(''))).status, 400);
  assert.equal((await voiceRoute.POST(voiceRequest('deepgram-v1', 'text/html'))).status, 415);
  assert.equal((await voiceRoute.POST(voiceRequest('deepgram-v1', 'audio/wav', new Uint8Array(3_000_001)))).status, 413);
  assert.equal((await voiceRoute.POST(voiceRequest('deepgram-v1'))).status, 200);
  const statusRoute = load('../app/api/athena/status/route.ts', { '@/lib/athena/request': requestHelpers, '@/lib/ai/permission': { AiPermissionError } });
  const beforeStatus = dispatches;
  assert.equal((await statusRoute.POST(request({}))).status, 200);
  allowed = false; assert.equal((await statusRoute.POST(request({}))).status, 403); allowed = true;
  assert.equal(dispatches, beforeStatus, 'Readiness checks must not spend a provider allowance');
  const access = await requestHelpers.authorizeResourceRequest(request(body));
  role = 'viewer'; await assert.rejects(access.beforeRequest(), { status: 403 }); role = 'caregiver';
  allowed = false; await assert.rejects(access.verify(), AiPermissionError); allowed = true;
  console.log('PASS resource flow: disclosure, auth, roles, AI-off, byte limits, quota dispatch ordering, unsupported audio, uncertain transcription, source grounding and provider failures.');
}
