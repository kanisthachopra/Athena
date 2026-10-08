import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
if (!process.argv.includes("--live") || !process.argv.includes("--write-test-records")) {
  console.log("Dry run. --live --write-test-records tests AI settings only in the named disposable family. No provider requests or plan changes. Leaves AI off.");
  process.exit(0);
}
let stage = "configuration", restore = null;
try {
  process.loadEnvFile(".env.local"); process.loadEnvFile(".env.test.local");
  const client = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (i, o) => fetch(i, { ...o, signal: AbortSignal.timeout(12000) }) },
  });
  const c = client();
  stage = "disposable owner safeguards";
  const auth = await c.auth.signInWithPassword({ email: process.env.MIRA_TEST_OWNER_EMAIL, password: process.env.MIRA_TEST_OWNER_PASSWORD });
  assert.ok(!auth.error && auth.data.user);
  const member = await c.from("family_members").select("family_id,role").eq("user_id", auth.data.user.id).single();
  assert.ok(!member.error && member.data?.role === "owner");
  const familyId = member.data.family_id;
  const family = await c.from("families").select("display_name").eq("id", familyId).single();
  assert.ok(!family.error && family.data?.display_name === "MIRA disposable pilot test 0");
  const read = async () => {
    const r = await c.from("family_ai_preferences").select("guide_enabled,profile_enabled,journal_enabled,policy_version,revision,updated_by").eq("family_id", familyId).maybeSingle();
    assert.equal(r.error, null); return r.data;
  };
  const initial = await read();
  assert.ok(!initial || (!initial.guide_enabled && !initial.profile_enabled && !initial.journal_enabled), "Refuse to change an enabled family");
  let revision = initial?.revision ?? 0;
  const args = (version, on) => ({ p_family_id: familyId, p_expected_revision: version, p_guide_enabled: on, p_profile_enabled: false, p_journal_enabled: false, p_policy_version: on ? "2026-10-01-v2" : null });
  stage = "anonymous RPC denial";
  const anon = await client().rpc("set_family_ai_preferences", args(revision, false));
  assert.equal(anon.error?.code, "42501");
  stage = "direct write denial";
  const direct = await c.from("family_ai_preferences").upsert({ family_id: familyId, guide_enabled: true });
  assert.equal(direct.error?.code, "42501");
  stage = "old disclosure denial";
  for (const policy of ["old", "2026-10-01-v1"]) {
    const old = await c.rpc("set_family_ai_preferences", { ...args(revision, true), p_policy_version: policy });
    assert.ok(old.error?.message.includes("Review the current AI information"));
    assert.deepEqual(await read(), initial);
  }
  stage = "save and reload";
  // Recovery is limited to this disposable family's preferences, never plans.
  restore = async () => {
    const saved = await read();
    if (saved?.guide_enabled || saved?.profile_enabled || saved?.journal_enabled) {
      const off = await c.rpc("set_family_ai_preferences", args(saved.revision, false));
      assert.equal(off.error, null);
    }
    const final = await read();
    assert.ok(final && !final.guide_enabled && !final.profile_enabled && !final.journal_enabled && final.policy_version === null);
  };
  const saved = await c.rpc("set_family_ai_preferences", args(revision, true));
  assert.equal(saved.error, null); assert.equal(saved.data, revision + 1);
  const row = await read();
  assert.ok(row.guide_enabled && !row.profile_enabled && !row.journal_enabled);
  assert.equal(row.policy_version, "2026-10-01-v2"); assert.equal(row.updated_by, auth.data.user.id);
  stage = "stale change rejection";
  const stale = await c.rpc("set_family_ai_preferences", args(revision, false));
  assert.ok(stale.error?.message.includes("MIRA_STALE_AI_PREFERENCES"));
  assert.equal((await read()).guide_enabled, true);
  revision = saved.data;
  stage = "concurrent revision protection";
  const concurrent = await Promise.all([c.rpc("set_family_ai_preferences", args(revision, false)), c.rpc("set_family_ai_preferences", args(revision, false))]);
  assert.equal(concurrent.filter(r => !r.error).length, 1);
  assert.equal(concurrent.filter(r => r.error?.message.includes("MIRA_STALE_AI_PREFERENCES")).length, 1);
  await restore(); restore = null;
  console.log("PASS: owner save/reload, feature isolation, direct/anonymous write denial, disclosure version, stale and concurrent changes. Disposable family AI is off. No provider calls or plan changes. Other-family/viewer cases are separate.");
} catch {
  console.error(`AI controls stopped at ${stage}. No private values logged.`);
  process.exitCode = 1;
} finally {
  if (restore) {
    try { await restore(); console.log("Disposable family AI confirmed off after interrupted test."); }
    catch { console.error("Could not confirm disposable family AI is off. Check that test family's Settings before further tests."); process.exitCode = 1; }
  }
}
