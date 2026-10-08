import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', js)(id => {
    if (id === 'server-only') return {};
    if (id in dependencies) return dependencies[id];
    throw Error(`Unexpected dependency: ${id}`);
  }, exports);
  return exports;
}

const provider = load('../lib/athena/tavily.ts');
if (process.argv.includes('--live')) {
  // Public synthetic request, same exported integration functions used by the route.
  if (process.argv.includes('--keyless')) process.env.TAVILY_ALLOW_KEYLESS = 'true';
  const found = await provider.searchResources('UNICEF learning through play early childhood parents');
  assert.ok(found.results.length > 0);
  const extracted = await provider.extractResource('https://www.unicef.org/parenting/child-development');
  assert.equal(extracted.status, 'extracted_unreviewed');
  assert.ok(extracted.content.length > 100);
  console.log(`Live application provider verified: ${found.results.length} discoveries; source text extracted. No private data submitted.`);
} else {
  const originalFetch = globalThis.fetch;
  const originalEnv = { key: process.env.TAVILY_API_KEY, keyless: process.env.TAVILY_ALLOW_KEYLESS, enabled: process.env.ATHENA_DISCOVERY_ENABLED };
  let calls = 0;
  try {
    delete process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_ALLOW_KEYLESS;
    await assert.rejects(provider.searchResources('books'), { code: 'not_configured' });
    process.env.TAVILY_ALLOW_KEYLESS = 'true';
    globalThis.fetch = async (url, init) => {
      calls++;
      assert.equal(init.headers['X-Tavily-Access-Mode'], 'keyless');
      assert.equal(init.headers.Authorization, undefined);
      assert.equal(init.cache, 'no-store');
      return Response.json({ results: [{ url: 'https://example.org/a', title: 'A', content: 'snippet', raw_content: 'text' },
        { url: 'https://example.org/a#duplicate', title: 'Duplicate', content: 'other' },
        { url: 'https://127.0.0.1/private', title: 'Bad', content: 'bad' }] });
    };
    const found = await provider.searchResources('books');
    assert.equal(found.results.length, 1);
    assert.equal(found.results[0].access, 'unknown');
    assert.equal(found.results[0].status, 'unverified_discovery');
    assert.equal((await provider.extractResource('https://example.org/a')).content, 'text');
    assert.equal((await provider.extractResource('https://example.org/different')).status, 'unavailable');
    const before = calls;
    for (const bad of ['http://example.org', 'https://localhost', 'https://169.254.169.254', 'https://[::1]', 'https://user:password@example.org']) {
      await assert.rejects(provider.extractResource(bad), { code: 'invalid_input' });
    }
    await assert.rejects(provider.searchResources('x'.repeat(401)), { code: 'invalid_input' });
    assert.equal(calls, before);
    globalThis.fetch = async () => new Response('private provider error', { status: 429 });
    await assert.rejects(provider.searchResources('books'), error => error.code === 'limit' && !error.message.includes('private'));
    globalThis.fetch = async () => Response.json({ results: 'wrong' });
    await assert.rejects(provider.searchResources('books'), { code: 'invalid_response' });

    let authenticated = false, role = 'caregiver', providerCalls = 0;
    const chain = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { role }, error: null }; } };
    const route = load('../app/api/athena/discovery/route.ts', {
      '@/lib/supabase/server': { createClient: async () => ({ auth: { getClaims: async () => ({ data: authenticated ? { claims: { sub: 'synthetic-user' } } : null, error: null }) }, from: () => chain }) },
      '@/lib/athena/tavily': { ...provider, searchResources: async query => { providerCalls++; return { results: [], query }; } },
    });
    const request = (body, origin = 'https://athena.example') => new Request('https://athena.example/api/athena/discovery', {
      method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const input = { action: 'search', query: 'books', shareWithTavily: true };
    delete process.env.ATHENA_DISCOVERY_ENABLED;
    assert.equal((await route.POST(request(input))).status, 503);
    process.env.ATHENA_DISCOVERY_ENABLED = 'true';
    assert.equal((await route.POST(request(input, 'https://other.example'))).status, 403);
    assert.equal((await route.POST(request(input))).status, 401);
    authenticated = true; role = 'viewer';
    assert.equal((await route.POST(request(input))).status, 403);
    role = 'caregiver';
    assert.equal((await route.POST(request({ ...input, shareWithTavily: false }))).status, 400);
    assert.equal((await route.POST(request({ ...input, query: 'x'.repeat(5000) }))).status, 413);
    assert.equal(providerCalls, 0);
    assert.equal((await route.POST(request(input))).status, 200);
    assert.equal(providerCalls, 1);
    console.log('Athena discovery: provider validation, source binding, failures, and route access/disclosure tests passed.');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries({ TAVILY_API_KEY: originalEnv.key, TAVILY_ALLOW_KEYLESS: originalEnv.keyless, ATHENA_DISCOVERY_ENABLED: originalEnv.enabled })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}
