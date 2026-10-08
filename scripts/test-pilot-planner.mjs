// Public-wrapper smoke test after private-helper privilege repair.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
if (!process.argv.includes("--live") || !process.argv.includes("--write-test-records")) {
  console.log("Dry run. --live --write-test-records generates a new current-week plan only for the disposable owner child, and refuses any existing current-week plan.");
  process.exit(0);
}
let stage = "configuration";
try {
  process.loadEnvFile(".env.local"); process.loadEnvFile(".env.test.local");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (i, o) => fetch(i, { ...o, signal: AbortSignal.timeout(12000) }) },
  });
  stage = "disposable account safeguards";
  const auth = await client.auth.signInWithPassword({ email: process.env.MIRA_TEST_OWNER_EMAIL, password: process.env.MIRA_TEST_OWNER_PASSWORD });
  assert.ok(!auth.error && auth.data.user);
  const member = await client.from("family_members").select("family_id,role").eq("user_id", auth.data.user.id).single();
  assert.ok(!member.error && member.data?.role === "owner");
  const family = await client.from("families").select("display_name").eq("id", member.data.family_id).single();
  assert.ok(!family.error && family.data?.display_name === "MIRA disposable pilot test 0");
  const children = await client.from("children").select("id").eq("family_id", member.data.family_id).eq("nickname", "Synthetic test child").is("archived_at", null);
  assert.ok(!children.error && children.data?.length === 1);
  const child = children.data[0].id;
  const monday = new Date(); monday.setUTCHours(12, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const week = monday.toISOString().slice(0, 10);
  stage = "refuse pre-existing current-week plan";
  const existing = await client.from("plans").select("id").eq("child_id", child).eq("week_start", week);
  assert.ok(!existing.error && existing.data.length === 0);
  stage = "public generation wrapper";
  const generated = await client.rpc("generate_weekly_plan", { p_child_id: child });
  assert.ok(!generated.error && generated.data);
  const plan = await client.from("plans").select("id,child_id,week_start").eq("id", generated.data).single();
  assert.equal(plan.error, null); assert.equal(plan.data.child_id, child); assert.equal(plan.data.week_start, week);
  const first = await client.from("activity_instances").select("id,child_id,plan_id,scheduled_date").eq("plan_id", generated.data).order("id");
  assert.equal(first.error, null); assert.ok(first.data.length > 0);
  assert.ok(first.data.every(row => row.child_id === child && row.plan_id === generated.data));
  stage = "retry without duplicate plan/instances";
  const retry = await client.rpc("generate_weekly_plan", { p_child_id: child });
  assert.equal(retry.error, null); assert.equal(retry.data, generated.data);
  const second = await client.from("activity_instances").select("id,child_id,plan_id,scheduled_date").eq("plan_id", generated.data).order("id");
  assert.equal(second.error, null); assert.deepEqual(second.data, first.data);
  console.log("PASS: public owner generation still calls restricted helpers, persists a new disposable plan and retries without duplicate instances. Retained synthetic test plan; content quality/eligibility NOT certified.");
} catch {
  console.error(`Public planner check stopped at ${stage}. Existing plans are not reused; any newly created test fixture is retained. No private data logged.`);
  process.exitCode = 1;
}
