"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProfileState = { error: string | null; success: string | null };

function commaList(value: FormDataEntryValue | null) {
  const seen = new Set<string>();
  return String(value ?? "").split(",").map((item) => item.trim()).filter((item) => {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function saveLearningProfile(
  _previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { supabase, membership, activeChild: child } = await requireFamilyContext();

  const weekdayMinutes = Number(formData.get("weekdayMinutes"));
  const weekendMinutes = Number(formData.get("weekendMinutes"));
  if (membership.role === "viewer") return { error: "Caregiver access is required.", success: null };
  if (!Number.isInteger(weekdayMinutes) || weekdayMinutes < 0 || weekdayMinutes > 180) return { error: "Weekday time must be between 0 and 180 minutes.", success: null };
  if (!Number.isInteger(weekendMinutes) || weekendMinutes < 0 || weekendMinutes > 240) return { error: "Weekend time must be between 0 and 240 minutes.", success: null };

  const aspirations = [...formData.getAll("aspirations").map(String), ...commaList(formData.get("customAspiration"))];
  const uniqueAspirations = [...new Map(aspirations.map((item) => [item.toLowerCase(), item])).values()];
  if (uniqueAspirations.length > 8) return { error: "Choose up to eight hopes so your profile stays focused.", success: null };
  if (uniqueAspirations.length === 0) return { error: "Choose at least one hope for your child.", success: null };
  if (uniqueAspirations.some((item) => item.length > 80)) return { error: "Keep each hope under 80 characters.", success: null };
  const caregiverLanguages = commaList(formData.get("caregiverLanguages"));
  const languageGoals = commaList(formData.get("languageGoals"));
  if (caregiverLanguages.length > 8 || languageGoals.length > 8) return { error: "Use up to eight languages in each language field.", success: null };
  if ([...caregiverLanguages, ...languageGoals].some((item) => item.length > 60)) return { error: "Keep each language under 60 characters.", success: null };

  const { data: existingPreference } = await supabase
    .from("family_preferences")
    .select("family_id")
    .eq("family_id", membership.family_id)
    .maybeSingle();

  const { error: profileError } = await supabase.rpc("configure_learning_profile", {
    p_family_id: membership.family_id,
    p_child_id: child.id,
    p_screen_policy: String(formData.get("screenPolicy") ?? "minimal_child_screen"),
    p_structure_level: String(formData.get("structureLevel") ?? "balanced"),
    p_weekday_minutes: weekdayMinutes,
    p_weekend_minutes: weekendMinutes,
    p_prefer_embedded: formData.get("preferEmbedded") === "on",
    p_caregiver_name: String(formData.get("caregiverName") ?? "").trim(),
    p_relationship: String(formData.get("relationship") ?? "").trim(),
    p_caregiver_languages: caregiverLanguages,
    p_aspirations: uniqueAspirations,
    p_language_goals: languageGoals,
  });
  if (profileError) return { error: profileError.message, success: null };

  if (!existingPreference) {
    const { error: planError } = await supabase.rpc("generate_weekly_plan", { p_child_id: child.id });
    if (planError) return { error: planError.message, success: null };
  }

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/setup");
  if (!existingPreference) redirect("/week");
  return { error: null, success: "Learning profile updated. Your current week stays unchanged." };
}
