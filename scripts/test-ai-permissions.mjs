import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, deps = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {}; new Function("require", "exports", js)(id => id === "server-only" ? {} : deps[id] ?? require(id), exports); return exports;
}
const prefs = load("../lib/ai-preferences.ts");
const permissions = load("../lib/ai/permission.ts", { "@/lib/ai-preferences": prefs });
for (const feature of ["guide", "profile", "journal"]) {
  assert.equal(prefs.isAiAllowed(null, feature), false);
  assert.equal(prefs.isAiAllowed(prefs.AI_OFF, feature), false);
  assert.equal(prefs.isAiAllowed({ ...prefs.AI_OFF, policy_version: "old", [`${feature}_enabled`]: true }, feature), false);
  assert.equal(prefs.isAiAllowed({ ...prefs.AI_OFF, policy_version: prefs.AI_POLICY_VERSION, [`${feature}_enabled`]: true }, feature), true);
}
let data = null, error = null;
const queryKeys = [];
const client = { from(table) { assert.equal(table, "family_ai_preferences"); return { select() { return this; }, eq(key, value) { queryKeys.push([key, value]); return this; }, async maybeSingle() { return { data, error }; } }; } };
const authorize = permissions.familyAiAuthorizer(client, "synthetic-family", "guide");
await assert.rejects(authorize, permissions.AiPermissionError);
data = { ...prefs.AI_OFF, policy_version: prefs.AI_POLICY_VERSION, guide_enabled: true };
await authorize();
error = { message: "private database detail" };
await assert.rejects(authorize, e => e instanceof permissions.AiPermissionError && !e.message.includes("private"));
assert.ok(queryKeys.every(([key, value]) => key === "family_id" && value === "synthetic-family"));

// Actual provider adapter, synthetic fetch: no network or credentials loaded.
const previousFetch = globalThis.fetch, previousKey = process.env.NEBIUS_API_KEY;
process.env.NEBIUS_API_KEY = "synthetic-test-only";
const provider = load("../lib/ai/nebius.ts");
let requests = 0, checks = 0;
const request = { system: "fixture", user: "fixture", schemaName: "fixture", schema: { type: "object" } };
try {
  globalThis.fetch = async () => { requests++; return new Response("{}", { status: 503 }); };
  await assert.rejects(provider.createStructuredCompletion({ ...request, beforeRequest: async () => { throw new permissions.AiPermissionError("off"); } }), permissions.AiPermissionError);
  assert.equal(requests, 0);
  await assert.rejects(provider.createStructuredCompletion({ ...request, beforeRequest: async () => { if (++checks === 2) throw new permissions.AiPermissionError("withdrawn"); } }), permissions.AiPermissionError);
  assert.equal(requests, 1, "Withdrawal must prevent provider retry"); assert.equal(checks, 2);
  globalThis.fetch = async () => { requests++; return Response.json({ model: "synthetic", choices: [{ finish_reason: "stop", message: { content: "{}" } }] }); };
  const completion = await provider.createStructuredCompletion({ ...request, beforeRequest: async () => { checks++; } });
  assert.equal(completion.usageKnown,false,'Missing provider usage must not be represented as measured zero');
  assert.equal(requests, 2); assert.equal(checks, 3);
} finally {
  globalThis.fetch = previousFetch;
  if (previousKey === undefined) delete process.env.NEBIUS_API_KEY; else process.env.NEBIUS_API_KEY = previousKey;
}
console.log("AI permission checks pass: default off, stale-policy/failure denial, family binding and withdrawal before retry. Provider requests are mocked; no credits used.");

let role = "owner", rpcCalls = 0, rpcError = null, rpcData = 1;
const settings = load("../app/settings/actions.ts", {
  "@/lib/ai-preferences": prefs,
  "@/lib/family-context": { requireFamilyContext: async () => ({ membership: { role, family_id: "synthetic-family" }, supabase: {
    rpc: async (name, args) => { rpcCalls++; assert.equal(name, "set_family_ai_preferences"); assert.equal(args.p_family_id, "synthetic-family"); return { data: rpcData, error: rpcError }; },
  } }) },
  "next/cache": { revalidatePath: () => {} },
});
const form = (overrides = {}) => {
  const f = new FormData();
  for (const [key, value] of Object.entries({ familyId: "synthetic-family", revision: "0", policyVersion: prefs.AI_POLICY_VERSION, ...overrides })) f.set(key, value);
  return f;
};
for (const r of ["caregiver", "viewer"]) {
  role = r; assert.ok((await settings.saveAiSettings({}, form())).error);
}
role = "owner";
for (const input of [{ familyId: "other-family" }, { revision: "-1" }, { revision: "NaN" }, { revision: "9007199254740992" }, { guide: "on" }, { guide: "on", acknowledge: "on", policyVersion: "old" }]) {
  assert.ok((await settings.saveAiSettings({}, form(input))).error);
}
assert.equal(rpcCalls, 0);
const enabled = await settings.saveAiSettings({}, form({ guide: "on", acknowledge: "on" }));
assert.ok(enabled.success && enabled.saved.guide_enabled); assert.equal(enabled.saved.revision, 1);
rpcError = { message: "MIRA_STALE_AI_PREFERENCES" };
const stale = await settings.saveAiSettings({}, form());
assert.ok(stale.error.includes("another session")); assert.equal(stale.saved, null); assert.equal(stale.success, null);
rpcError = { message: "private database details" };
assert.ok(!(await settings.saveAiSettings({}, form())).error.includes("private"));
rpcError = null; rpcData = 0;
assert.equal((await settings.saveAiSettings({}, form())).success, null);
rpcData = 2;
const off = await settings.saveAiSettings({}, form({ revision: "1" }));
assert.ok(off.success && !off.saved.guide_enabled && off.saved.policy_version === null);
console.log("AI Settings action checks pass: roles, family binding, revision, disclosure, confirmed save and failure states.");
