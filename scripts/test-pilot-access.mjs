// Permission probes against designated synthetic family only; no normal mutation RPCs.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { assertNoRowsOrPermissionDenied } from "./pilot-test-assertions.mjs";
if (!process.argv.includes("--live")) {
  console.log("Dry run. --live checks anonymous private-table access and private RPC execute privileges using the disposable owner. No family records are intentionally changed.");
  process.exit(0);
}
let stage = "configuration";
try {
  process.loadEnvFile(".env.local"); process.loadEnvFile(".env.test.local");
  const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (i, o) => fetch(i, { ...o, signal: AbortSignal.timeout(12000) }) } };
  const owner = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
  const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
  stage = "disposable owner verification";
  const signed = await owner.auth.signInWithPassword({ email: process.env.MIRA_TEST_OWNER_EMAIL, password: process.env.MIRA_TEST_OWNER_PASSWORD });
  assert.ok(!signed.error && signed.data.user);
  const member = await owner.from("family_members").select("family_id,role").eq("user_id", signed.data.user.id).single();
  assert.ok(!member.error && member.data?.role === "owner");
  const family = await owner.from("families").select("display_name").eq("id", member.data.family_id).single();
  assert.ok(!family.error && family.data?.display_name === "MIRA disposable pilot test 0");
  const children = await owner.from("children").select("id").eq("family_id", member.data.family_id).eq("nickname", "Synthetic test child").is("archived_at", null);
  assert.ok(!children.error && children.data?.length === 1);
  const child = children.data[0].id;
  const familyId = member.data.family_id;
  const tables = [
    ["families", "id", familyId], ["family_members", "family_id", familyId],
    ["children", "id", child], ["family_preferences", "family_id", familyId],
    ["family_education_constitutions", "family_id", familyId], ["caregivers", "family_id", familyId],
    ["aspirations", "child_id", child], ["child_language_goals", "child_id", child],
    ["plans", "child_id", child], ["activity_instances", "child_id", child],
    ["observations", "child_id", child], ["learning_moments", "child_id", child],
    ["saved_activities", "child_id", child], ["family_invitations", "family_id", familyId],
  ];
  for (const [table, key, value] of tables) {
    stage = `anonymous access: ${table}`;
    assertNoRowsOrPermissionDenied(await anonymous.from(table).select(key).eq(key, value).limit(1));
  }
  const nil = "00000000-0000-4000-8000-000000000000";
  const probes = [
    ["configure_learning_profile_internal", { p_family_id: nil, p_child_id: nil, p_screen_policy: "minimal_child_screen", p_structure_level: "light", p_weekday_minutes: 0, p_weekend_minutes: 0, p_prefer_embedded: true, p_caregiver_name: "Synthetic", p_relationship: "caregiver", p_caregiver_languages: [], p_aspirations: [], p_language_goals: [] }],
    ["generate_weekly_plan_internal", { p_child_id: nil }],
    ["generate_next_week_plan_internal", { p_child_id: nil }],
    ["skip_activity_internal", { p_instance_id: nil }],
    ["replace_planned_activity_internal", { p_instance_id: nil, p_template_id: nil }],
    ["record_activity_feedback_internal", { p_instance_id: nil, p_engagement: "low", p_challenge_level: "easy", p_repeated: false, p_parent_note: null }],
    ["populate_weekly_portfolio_internal", { p_plan_id: nil, p_child_id: nil, p_week_start: "2000-01-03", p_previous_plan_id: null }],
  ];
  console.log(`PASS: ${tables.length} scoped anonymous private-table reads returned no rows or explicit permission denial.`);
  let exposed = 0;
  for (const [role, client] of [["owner", owner], ["anonymous", anonymous]]) for (const [name, args] of probes) {
    stage = `private RPC privilege: ${name}`;
    const result = await client.rpc(name, args);
    if (result.error?.code !== "42501") {
      exposed++;
      console.error(JSON.stringify({ role, function: name, status: result.status, code: ["PGRST202", "PGRST203", "P0001", "42883", "23503", "42501"].includes(result.error?.code) ? result.error.code : "other" }));
    }
    // We require privilege denial, not a domain validation error after execution.
  }
  assert.equal(exposed, 0, "Internal RPC privilege checks failed");
  console.log(`PASS: anonymous denial/no rows for ${tables.length} scoped private-table reads; execute privilege denied for ${probes.length} internal RPCs as owner and anonymous. This is not a full RLS/viewer/cross-family audit.`);
} catch {
  console.error(`Access checks stopped at ${stage}. Network/schema errors are not passes. No credentials or private row contents logged.`);
  process.exitCode = 1;
}
