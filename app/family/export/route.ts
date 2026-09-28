import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const childId = request.nextUrl.searchParams.get("child") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(childId)) {
    return Response.json({ error: "Invalid child profile." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) return Response.json({ error: "Authentication required." }, { status: 401 });

  const { data: child } = await supabase
    .from("children")
    .select("id,family_id,nickname,birth_year,birth_month,created_at,updated_at,archived_at")
    .eq("id", childId)
    .maybeSingle();
  if (!child) return Response.json({ error: "Child profile not found." }, { status: 404 });

  const [familyResult, preferencesResult, aspirationsResult, languagesResult, plansResult, activitiesResult, observationsResult, momentsResult] = await Promise.all([
    supabase.from("families").select("id,display_name,created_at,updated_at").eq("id", child.family_id).single(),
    supabase.from("family_preferences").select("screen_policy,structure_level,weekday_minutes,weekend_minutes,prefer_embedded_learning,updated_at").eq("family_id", child.family_id).maybeSingle(),
    supabase.from("aspirations").select("id,title,created_at").eq("child_id", child.id).order("created_at"),
    supabase.from("child_language_goals").select("id,language_code,created_at").eq("child_id", child.id).order("created_at"),
    supabase.from("plans").select("id,week_start,status,generation_method,adaptation_summary,created_at").eq("child_id", child.id).order("week_start"),
    supabase.from("activity_instances").select("id,plan_id,template_id,scheduled_date,status,personalized_title,personalized_instructions,selection_reason,created_at,activity_templates(title,domain,duration_minutes,summary,safety_note)").eq("child_id", child.id).order("scheduled_date"),
    supabase.from("observations").select("id,activity_instance_id,engagement,challenge_level,repeated,parent_note,created_at,updated_at").eq("child_id", child.id).order("created_at"),
    supabase.from("learning_moments").select("id,occurred_on,domain,title,note,created_at,updated_at").eq("child_id", child.id).order("occurred_on"),
  ]);

  const exportData = {
    format: "mira-learning-record",
    version: 2,
    exported_at: new Date().toISOString(),
    family: familyResult.data,
    child,
    learning_profile: preferencesResult.data,
    aspirations: aspirationsResult.data ?? [],
    language_goals: languagesResult.data ?? [],
    plans: plansResult.data ?? [],
    activities: activitiesResult.data ?? [],
    observations: observationsResult.data ?? [],
    learning_moments: momentsResult.data ?? [],
  };
  const safeName = child.nickname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "child";

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mira-${safeName}-learning-record.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
