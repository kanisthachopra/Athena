// Creates only explicitly synthetic records in the designated disposable owner family.
// Existing plans are read only to avoid collisions, never reused or modified.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
if (!process.argv.includes("--live") || !process.argv.includes("--write-test-records")) {
  console.log("Dry run. --live --write-test-records creates a new synthetic Week fixture in the disposable owner family. Existing plans are untouched; fixtures are retained.");
  process.exit(0);
}
let stage = "configuration";
try {
  process.loadEnvFile(".env.local"); process.loadEnvFile(".env.test.local");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) },
  });
  stage = "owner sign-in and disposable-family safeguards";
  const auth = await client.auth.signInWithPassword({ email: process.env.MIRA_TEST_OWNER_EMAIL, password: process.env.MIRA_TEST_OWNER_PASSWORD });
  assert.ok(!auth.error && auth.data.user);
  const membership = await client.from("family_members").select("family_id,role").eq("user_id", auth.data.user.id).single();
  assert.ok(!membership.error && membership.data?.role === "owner");
  const family = await client.from("families").select("display_name").eq("id", membership.data.family_id).single();
  assert.ok(!family.error && family.data?.display_name === "MIRA disposable pilot test 0");
  const children = await client.from("children").select("id").eq("family_id", membership.data.family_id).eq("nickname", "Synthetic test child").is("archived_at", null);
  assert.ok(!children.error && children.data?.length === 1);
  const childId = children.data[0].id;
  const date = new Date(); date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + 70);
  let weekStart;
  for (let index = 0; index < 10; index++) {
    const candidate = date.toISOString().slice(0, 10);
    const existing = await client.from("plans").select("id").eq("child_id", childId).eq("week_start", candidate);
    assert.equal(existing.error, null);
    if (existing.data.length === 0) { weekStart = candidate; break; }
    date.setUTCDate(date.getUTCDate() + 7);
  }
  assert.ok(weekStart, "No unused synthetic fixture week");
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(weekStart + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + index); return d.toISOString().slice(0, 10);
  });
  stage = "new synthetic Week fixture";
  const plan = await client.from("plans").insert({ child_id: childId, week_start: weekStart, generation_method: "synthetic_pilot_verification" }).select("id").single();
  assert.equal(plan.error, null);
  const planId = plan.data.id;
  const created = await client.from("activity_instances").insert([0, 1, 2].map(index => ({
    plan_id: planId, child_id: childId, template_id: null, scheduled_date: days[index],
    opportunity_type: "open", personalized_title: `Synthetic Week fixture ${index + 1}`,
    personalized_instructions: "Test record only. Not an activity recommendation.", status: "planned",
  }))).select("id,scheduled_date");
  assert.equal(created.error, null);
  const ids = [0, 1, 2].map(index => created.data.find(row => row.scheduled_date === days[index]).id);
  async function snapshot() {
    const result = await client.from("activity_instances").select("id,scheduled_date,status,template_id").eq("plan_id", planId).order("id");
    assert.equal(result.error, null); assert.equal(result.data.length, 3); return result.data;
  }
  async function move(id, targetDate, expected) {
    return client.rpc("move_week_activity_checked", { p_instance_id: id, p_target_date: targetDate, p_expected: expected });
  }
  function checkPosition(rows, id, expectedDate) { assert.equal(rows.find(row => row.id === id)?.scheduled_date, expectedDate); }
  const initial = await snapshot();
  stage = "empty-day move and reload";
  const moved = await move(ids[0], days[3], initial);
  assert.equal(moved.error, null);
  assert.deepEqual(await snapshot(), moved.data); checkPosition(moved.data, ids[0], days[3]);
  stage = "stale save denial and no partial write";
  const stale = await move(ids[1], days[4], initial);
  assert.ok(stale.error?.message.includes("MIRA_STALE_PLAN"));
  assert.deepEqual(await snapshot(), moved.data);
  stage = "undo and reload";
  const undo = await move(ids[0], days[0], moved.data);
  assert.equal(undo.error, null); assert.deepEqual(await snapshot(), initial);
  stage = "occupied-day swap and undo";
  const swap = await move(ids[0], days[1], initial);
  assert.equal(swap.error, null); checkPosition(swap.data, ids[0], days[1]); checkPosition(swap.data, ids[1], days[0]);
  assert.deepEqual(await snapshot(), swap.data);
  const unswap = await move(ids[0], days[0], swap.data);
  assert.equal(unswap.error, null); assert.deepEqual(await snapshot(), initial);
  stage = "recorded-day and outside-week denial";
  const skipped = await client.from("activity_instances").update({ status: "skipped" }).eq("id", ids[2]).eq("plan_id", planId);
  assert.equal(skipped.error, null);
  const protectedSnapshot = await snapshot();
  const blocked = await move(ids[0], days[2], protectedSnapshot);
  assert.equal(blocked.error?.message, "Completed or skipped days cannot be rearranged"); assert.deepEqual(await snapshot(), protectedSnapshot);
  const outside = await move(ids[0], "2000-01-01", protectedSnapshot);
  assert.equal(outside.error?.message, "Choose a day inside this weekly plan"); assert.deepEqual(await snapshot(), protectedSnapshot);
  stage = "concurrent requests from the same snapshot";
  const concurrent = await Promise.all([move(ids[0], days[4], protectedSnapshot), move(ids[1], days[5], protectedSnapshot)]);
  assert.equal(concurrent.filter(result => !result.error).length, 1);
  assert.equal(concurrent.filter(result => result.error?.message.includes("MIRA_STALE_PLAN")).length, 1);
  const winner = concurrent.findIndex(result => !result.error);
  assert.deepEqual(await snapshot(), concurrent[winner].data);
  stage = "restore successful concurrent move";
  const restored = await move(ids[winner], days[winner], concurrent[winner].data);
  assert.equal(restored.error, null); assert.deepEqual(await snapshot(), protectedSnapshot);
  console.log("PASS: new disposable Week fixture; empty-day move, reload, undo, swap, protected-day/out-of-week denial, stale-write rejection and one-winner concurrency. Fixture retained. Existing plans unchanged. Viewer/cross-family checks are separate.");
} catch {
  console.error(`Week integration checks stopped at ${stage}. Synthetic fixtures, if created, are retained; no existing plan was reused. No credentials or private rows logged.`);
  process.exitCode = 1;
}
