// Opt-in integration checks, using only explicitly designated disposable accounts.
// Never uses service-role credentials, the browser session, AI or existing family plans.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { assertPermissionDenied, assertNoRowsOrPermissionDenied } from "./pilot-test-assertions.mjs";

if (!process.argv.includes("--live")) {
  console.log("Dry run. Supply two disposable accounts in .env.test.local, then use --live --write-test-records to test persistence and cross-family denial. Test records are retained for inspection; nothing is deleted.");
  process.exit(0);
}
if (!process.argv.includes("--write-test-records")) {
  console.error("Explicit --write-test-records required. This test creates synthetic families/observations only in designated disposable accounts.");
  process.exit(1);
}
let stage = "configuration";
try {
  process.loadEnvFile(".env.local");
  process.loadEnvFile(".env.test.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.ok(url && key, "Supabase configuration missing");
  const pairs = ["OWNER", "OTHER"].map(role => ({
    email: process.env["MIRA_TEST_" + role + "_EMAIL"],
    password: process.env["MIRA_TEST_" + role + "_PASSWORD"],
  }));
  assert.ok(pairs.every(pair => pair.email && pair.password), "Both disposable accounts are required");
  assert.notEqual(pairs[0].email.toLowerCase(), pairs[1].email.toLowerCase(), "Accounts must be distinct");
  const clients = pairs.map(() => createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) },
  }));
  const ownerOnly = process.argv.includes("--owner-only");
  const signedUsers = [];
  // Finish authentication preflight before creating any new test records.
  for (let index = 0; index < (ownerOnly ? 1 : clients.length); index++) {
    stage = `account ${index + 1}: sign-in`;
    const signed = await clients[index].auth.signInWithPassword(pairs[index]);
    if (signed.error) {
      const codes = new Set(["invalid_credentials", "email_not_confirmed", "over_request_rate_limit", "user_banned"]);
      console.error(JSON.stringify({ stage, status: signed.error.status ?? null, code: codes.has(signed.error.code) ? signed.error.code : "unavailable" }));
    }
    assert.ok(!signed.error && signed.data.user, "Disposable account sign-in failed");
    signedUsers.push(signed.data.user.id);
  }
  const contexts = [];
  for (let index = 0; index < signedUsers.length; index++) {
    const client = clients[index];
    const userId = signedUsers[index];
    stage = `account ${index + 1}: membership read`;
    const membership = await client.from("family_members").select("family_id,role").eq("user_id", userId).maybeSingle();
    assert.equal(membership.error, null, "Membership read failed");
    if (!membership.data) {
      stage = `account ${index + 1}: synthetic family creation`;
      const created = await client.rpc("create_family_with_child_checked", {
        p_request_id: randomUUID(),
        p_display_name: "MIRA disposable pilot test " + index,
        p_child_nickname: "Synthetic test child",
        p_birth_year: new Date().getUTCFullYear() - 1, p_birth_month: 1,
      });
      assert.equal(created.error, null, "Synthetic family creation failed");
    }
    stage = `account ${index + 1}: test-family safeguards`;
    const own = await client.from("family_members").select("family_id,role").eq("user_id", userId).single();
    assert.equal(own.error, null, "Own membership unavailable");
    assert.equal(own.data.role, "owner", "Only disposable owner accounts may run this test");
    const family = await client.from("families").select("display_name").eq("id", own.data.family_id).single();
    assert.equal(family.error, null, "Family read failed");
    assert.equal(family.data.display_name, "MIRA disposable pilot test " + index, "Refusing to modify an existing non-test family");
    const children = await client.from("children").select("id").eq("family_id", own.data.family_id).eq("nickname", "Synthetic test child").is("archived_at", null);
    assert.equal(children.error, null, "Test child read failed");
    assert.equal(children.data.length, 1, "Expected exactly one synthetic child");
    contexts.push({ client, familyId: own.data.family_id, childId: children.data[0].id });
  }
  const [a, b] = contexts;
  if (b) {
    assert.notEqual(a.familyId, b.familyId, "Accounts must be in separate test families");
    stage = "cross-family child read denial";
    const deniedRead = await b.client.from("children").select("id").eq("id", a.childId);
    assert.equal(deniedRead.error, null, "Cross-family read check failed unexpectedly");
    assert.deepEqual(deniedRead.data, [], "Cross-family child was exposed");
  }
  const title = "Synthetic persistence check " + new Date().toISOString();
  const note = "  Synthetic test only. 再来一次\nمرحبا — exact original wording.  ";
  const args = { p_request_id: randomUUID(), p_child_id: a.childId, p_occurred_on: new Date().toISOString().slice(0, 10), p_domain: "everyday", p_title: title, p_note: note };
  const readPlans = async () => {
    const plans = await a.client.from("plans").select("*").eq("child_id", a.childId).order("id");
    const items = await a.client.from("activity_instances").select("*").eq("child_id", a.childId).order("id");
    assert.equal(plans.error, null); assert.equal(items.error, null);
    return { plans: plans.data, items: items.data };
  };
  const before = await readPlans();
  stage = "Insights relationship read";
  const insights = await a.client.from("observations").select("id,engagement,challenge_level,repeated,parent_note,created_at,activity_instances!observations_instance_child_fk(personalized_title,activity_templates(domain))").eq("child_id", a.childId);
  assert.equal(insights.error, null, "Insights relationship query failed");
  stage = "own-family observation save and reload";
  const created = await a.client.rpc("create_learning_moment_checked", args);
  assert.equal(created.error, null, "Own-family observation write failed");
  const loaded = await a.client.from("learning_moments").select("id,note").eq("id", created.data).single();
  assert.equal(loaded.error, null, "Saved observation reload failed");
  assert.equal(loaded.data.note, note, "Original observation changed in storage");
  stage = "same-request replay and changed-payload denial";
  const repeats = await Promise.all([a.client.rpc("create_learning_moment_checked", args), a.client.rpc("create_learning_moment_checked", args)]);
  for (const result of repeats) { assert.equal(result.error, null); assert.equal(result.data, created.data); }
  const changed = await a.client.rpc("create_learning_moment_checked", { ...args, p_note: note + " changed" });
  assert.ok(changed.error?.message.includes("MIRA_MOMENT_REQUEST_CHANGED"));
  const matches = await a.client.from("learning_moments").select("id,note").eq("child_id", a.childId).eq("title", title);
  assert.equal(matches.error, null); assert.equal(matches.data.length, 1); assert.equal(matches.data[0].note, note);
  const { p_request_id: ignoredRequest, ...legacyArgs } = args;
  assert.ok(ignoredRequest);
  assertPermissionDenied(await a.client.rpc("create_learning_moment", legacyArgs));
  assertPermissionDenied(await a.client.from("learning_moment_requests").select("request_id").eq("request_id", args.p_request_id));
  if (b) {
    stage = "cross-family observation write/read denial";
    const deniedWrite = await b.client.rpc("create_learning_moment_checked", args);
    assertPermissionDenied(deniedWrite, "Caregiver access required");
    const deniedMoment = await b.client.from("learning_moments").select("id").eq("id", created.data);
    assert.equal(deniedMoment.error, null, "Observation isolation query failed");
    assert.deepEqual(deniedMoment.data, [], "Cross-family observation was exposed");
  }
  stage = "anonymous read denial";
  const anonymous = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) },
  });
  const anonymousRead = await anonymous.from("learning_moments").select("id").eq("id", created.data);
  assertNoRowsOrPermissionDenied(anonymousRead);
  assertPermissionDenied(await anonymous.rpc("create_learning_moment_checked", args));
  assert.deepEqual(await readPlans(), before, "Existing plans or activities changed");
  console.log(ownerOnly
    ? "PASS (owner-only scope): persistence, exact multilingual whitespace, duplicate-request replay, changed-payload denial, private receipts, old/anonymous RPC denial and unchanged existing plans. Cross-family checks NOT RUN. One synthetic observation retained. Concurrent replays exercised; independent first-write races remain unverified."
    : "PASS: two-account persistence, exact original text, cross-family read/write denial and anonymous denial. Synthetic records retained. Viewer/concurrency/Week mutation checks remain separate.");
} catch {
  // Never log SDK errors, tokens, emails, passwords or family rows.
  console.error(`Pilot database checks stopped at ${stage}. No cleanup or automatic retry was performed. Credentials and private rows are not logged.`);
  process.exitCode = 1;
}
