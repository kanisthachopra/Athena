import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
if (!process.argv.includes("--live") || !process.argv.includes("--write-test-records")) {
  console.log("Dry run. Apply child-link migration first. --live --write-test-records uses the disposable owner family, adds a labelled second test child and NEW plan fixtures. No existing plans are reused; fixtures remain.");
  process.exit(0);
}
let stage = "configuration";
try {
  process.loadEnvFile(".env.local"); process.loadEnvFile(".env.test.local");
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (i, o) => fetch(i, { ...o, signal: AbortSignal.timeout(12000) }) },
  });
  stage = "disposable owner safeguards";
  const auth = await c.auth.signInWithPassword({ email: process.env.MIRA_TEST_OWNER_EMAIL, password: process.env.MIRA_TEST_OWNER_PASSWORD });
  assert.ok(!auth.error && auth.data.user);
  const member = await c.from("family_members").select("family_id,role").eq("user_id", auth.data.user.id).single();
  assert.ok(!member.error && member.data?.role === "owner");
  const familyId = member.data.family_id;
  const family = await c.from("families").select("display_name").eq("id", familyId).single();
  assert.ok(!family.error && family.data?.display_name === "MIRA disposable pilot test 0");
  const primary = await c.from("children").select("id").eq("family_id", familyId).eq("nickname", "Synthetic test child").is("archived_at", null).single();
  assert.equal(primary.error, null);
  let second = await c.from("children").select("id").eq("family_id", familyId).eq("nickname", "Synthetic child-link fixture").is("archived_at", null).maybeSingle();
  assert.equal(second.error, null);
  if (!second.data) second = await c.from("children").insert({ family_id: familyId, nickname: "Synthetic child-link fixture", birth_year: new Date().getUTCFullYear() - 1, birth_month: 1 }).select("id").single();
  assert.equal(second.error, null);
  const children = [primary.data.id, second.data.id];
  stage = "new isolated plan fixtures";
  const date = new Date(); date.setUTCHours(12, 0, 0, 0); date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + 210);
  let week;
  for (let i = 0; i < 10; i++) {
    const candidate = date.toISOString().slice(0, 10);
    const rows = await c.from("plans").select("id").in("child_id", children).eq("week_start", candidate);
    assert.equal(rows.error, null);
    if (!rows.data.length) { week = candidate; break; }
    date.setUTCDate(date.getUTCDate() + 7);
  }
  assert.ok(week);
  const plans = await c.from("plans").insert(children.map(child_id => ({ child_id, week_start: week, generation_method: "synthetic_child_link_test" }))).select("id,child_id");
  assert.equal(plans.error, null);
  const planIds = children.map(id => plans.data.find(p => p.child_id === id).id);
  function activity(childId, planId, day = week) {
    return { child_id: childId, plan_id: planId, scheduled_date: day, template_id: null, opportunity_type: "open", personalized_title: "Synthetic link-integrity check", personalized_instructions: "Test record only. Not an activity recommendation." };
  }
  stage = "same-child activity writes";
  const items = await c.from("activity_instances").insert(children.map((id, i) => activity(id, planIds[i]))).select("id,child_id");
  assert.equal(items.error, null);
  const itemIds = children.map(id => items.data.find(a => a.child_id === id).id);
  const anotherDay = new Date(week + "T12:00:00Z"); anotherDay.setUTCDate(anotherDay.getUTCDate() + 1);
  stage = "mismatched activity insert denial";
  const badItem = await c.from("activity_instances").insert(activity(children[1], planIds[0], anotherDay.toISOString().slice(0, 10)));
  assert.equal(badItem.error?.code, "23503");
  stage = "mismatched activity update denial";
  const badUpdate = await c.from("activity_instances").update({ child_id: children[1] }).eq("id", itemIds[0]);
  assert.equal(badUpdate.error?.code, "23503");
  const unchanged = await c.from("activity_instances").select("child_id").eq("id", itemIds[0]).single();
  assert.ok(!unchanged.error && unchanged.data.child_id === children[0]);
  stage = "mismatched observation insert denial";
  const note = { activity_instance_id: itemIds[0], child_id: children[1], engagement: "medium", challenge_level: "just_right", repeated: false, parent_note: "Synthetic test only" };
  const badNote = await c.from("observations").insert(note);
  assert.equal(badNote.error?.code, "23503");
  stage = "same-child observation persistence";
  const good = await c.from("observations").insert({ ...note, child_id: children[0] }).select("id,child_id").single();
  assert.equal(good.error, null);
  stage = "mismatched observation update denial";
  const badNoteUpdate = await c.from("observations").update({ child_id: children[1] }).eq("id", good.data.id);
  assert.equal(badNoteUpdate.error?.code, "23503");
  const reloaded = await c.from("observations").select("child_id").eq("id", good.data.id).single();
  assert.ok(!reloaded.error && reloaded.data.child_id === children[0]);
  stage = "parent reassignment denial";
  const changedParent = await c.from("plans").update({ child_id: children[1], week_start: "2040-01-02" }).eq("id", planIds[0]);
  assert.equal(changedParent.error?.code, "23503");
  console.log("PASS: same-child writes/reload, cross-child activity and observation insert/update denial, parent reassignment denial. New synthetic fixtures retained; existing plans untouched. Cross-family/viewer cases remain separate.");
} catch {
  console.error(`Child-link checks stopped at ${stage}. No cleanup/retry; newly created synthetic fixtures are retained. No private data logged.`);
  process.exitCode = 1;
}
