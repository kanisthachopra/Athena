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

  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id,family_id,nickname,birth_year,birth_month,created_at,updated_at,archived_at")
    .eq("id", childId)
    .maybeSingle();
  if (childError) return Response.json({ error: "Your profile could not be loaded. Please retry the export." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  if (!child) return Response.json({ error: "Child profile not found." }, { status: 404 });

  const [familyResult, preferencesResult, aspirationsResult, languagesResult, plansResult, activitiesResult, observationsResult, momentsResult, savedResult, versionsResult, contextResult, caregiversResult, calendarResult, directionsResult] = await Promise.all([
    supabase.from("families").select("id,display_name,created_at,updated_at").eq("id", child.family_id).single(),
    supabase.from("family_preferences").select("screen_policy,structure_level,weekday_minutes,weekend_minutes,prefer_embedded_learning,updated_at").eq("family_id", child.family_id).maybeSingle(),
    supabase.from("aspirations").select("id,title,created_at").eq("child_id", child.id).order("created_at"),
    supabase.from("child_language_goals").select("*").eq("child_id", child.id).order("created_at"),
    supabase.from("plans").select("id,week_start,status,generation_method,adaptation_summary,created_at").eq("child_id", child.id).order("week_start"),
    supabase.from("activity_instances").select("*").eq("child_id", child.id).order("scheduled_date"),
    supabase.from("observations").select("id,activity_instance_id,engagement,challenge_level,repeated,parent_note,created_at,updated_at").eq("child_id", child.id).order("created_at"),
    supabase.from("learning_moments").select("id,occurred_on,domain,title,note,created_at,updated_at").eq("child_id", child.id).order("occurred_on"),
    supabase.from("saved_activities").select("template_id,created_at,activity_templates(title,domain,duration_minutes,summary,safety_note)").eq("child_id", child.id).order("created_at"),
    supabase.from("activity_content_versions").select("*").eq("child_id", child.id).order("recorded_at"),
    supabase.from("activity_context_confirmations").select("*").eq("child_id", child.id).order("updated_at"),
    supabase.from("caregivers").select("id,display_name,relationship,created_at,caregiver_languages(id,language_code,proficiency,proficiency_reported)").eq("family_id", child.family_id).order("created_at"),
    supabase.from("family_calendar_settings").select("time_zone,revision,updated_at").eq("family_id", child.family_id).maybeSingle(),
    supabase.rpc("export_aspiration_directions", { p_child_id: child.id }),
  ]);

  if ([familyResult, preferencesResult, aspirationsResult, languagesResult, plansResult, activitiesResult, observationsResult, momentsResult, savedResult, versionsResult, contextResult, caregiversResult, calendarResult, directionsResult].some(result => result.error) || !familyResult.data || !Array.isArray(directionsResult.data)) {
    return Response.json({ error: "The export could not be completed. No partial file was created. Please try again." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }

  const exportData = {
    format: "mira-learning-record",
    version: 8,
    exported_at: new Date().toISOString(),
    family: familyResult.data,
    family_calendar: calendarResult.data ?? null,
    family_calendar_note: "Current shared setting, not historical location. No saved setting means UTC fallback. Existing plan dates and journal dates do not shift when the time zone changes.",
    child,
    learning_profile: preferencesResult.data,
    aspirations: aspirationsResult.data ?? [],
    learning_directions: directionsResult.data,
    learning_directions_note: "Current parent-chosen links, not inferred abilities or a history of all edits. Future and paused directions do not influence activity ranking. Clearing a link keeps its revision metadata; prior plan explanations are not rewritten.",
    language_goals: languagesResult.data ?? [],
    caregivers: caregiversResult.data ?? [],
    plans: plansResult.data ?? [],
    activities: activitiesResult.data ?? [],
    activity_content_versions: versionsResult.data ?? [],
    activity_context_confirmations: contextResult.data ?? [],
    content_history_note: "Snapshots begin when version preservation was introduced. A missing snapshot means the original template version is unknown, not that today's library wording was used. Saved bookmarks describe current library entries, not historical instructions.",
    observations: observationsResult.data ?? [],
    learning_moments: momentsResult.data ?? [],
    saved_activities: savedResult.data ?? [],
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
