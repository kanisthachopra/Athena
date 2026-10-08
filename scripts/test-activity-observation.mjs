import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, deps = {}) {
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {}; new Function("require", "exports", js)(id => deps[id] ?? require(id), exports); return exports;
}
const contract = load("../lib/activity-observation.ts");
const instanceId = "11111111-1111-4111-8111-111111111111";
const note = "  She said 再一次.\n Then مرحبا.  ";
const form = (values = {}) => {
  const data = new FormData(); for (const [key, value] of Object.entries({ instanceId, revision: "0", note, ...values })) data.set(key, value); return data;
};
const parsed = contract.parseActivityObservation(form());
assert.equal(parsed.p_engagement, null); assert.equal(parsed.p_challenge_level, null); assert.equal(parsed.p_repeated, null); assert.equal(parsed.p_parent_note, note);
assert.equal(contract.parseActivityObservation(form({ repeated: "no" })).p_repeated, false);
assert.equal(contract.parseActivityObservation(form({ repeated: "yes", note: "" })).p_repeated, true);
for (const patch of [{ note: " " }, { note: "x".repeat(1001) }, { engagement: "unknown" }, { repeated: "on" }, { challenge: "advanced" }, { revision: "-1" }, { revision: "9007199254740992" }, { templateId: "not-uuid" }, { instanceId: "x" }]) assert.throws(() => contract.parseActivityObservation(form(patch)));
let calls = 0, failure = null, revision = 1;
const actions = load("../app/activity/actions.ts", {
  "@/lib/activity-observation": contract,
  "@/lib/supabase/server": { createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: "synthetic" } } }) }, rpc: async (name,args) => {
    calls++; assert.equal(name,"record_activity_observation_checked"); assert.equal(args.p_parent_note,note); return { data: revision, error: failure };
  } }) },
  "next/cache": { revalidatePath: () => {} }, "next/navigation": { redirect: target => { throw new Error("redirect:"+target); } },
});
await assert.rejects(actions.saveFeedback({},form({returnTo:"https://untrusted.test"})),/redirect:\/today/);
await assert.rejects(actions.saveFeedback({},form({returnTo:`/activity/${instanceId}`})),new RegExp(`redirect:/activity/${instanceId}`));
failure={message:"MIRA_STALE_OBSERVATION"};
assert.ok((await actions.saveFeedback({},form())).error.includes("another session"));
failure={message:"private database detail"};
assert.ok(!(await actions.saveFeedback({},form())).error.includes("private"));
failure=null; revision=0;
assert.ok((await actions.saveFeedback({},form())).error.includes("could not confirm"));
const before=calls;
await actions.saveFeedback({},form({note:""})); assert.equal(calls,before);
console.log("Observation checks pass: note-only, unknown vs explicit no, original multilingual text, validation, stale/failed/unconfirmed saves and safe return routes. Database is mocked.");
