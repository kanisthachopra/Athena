"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isProfileVersion } from "@/lib/learning-profile";

export type ProfileState = { error: string | null; success: string | null; version?: string; refreshRequired?: boolean; profileSaved?: boolean };

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
  const expectedVersion = formData.get("profileVersion");
  if (!isProfileVersion(expectedVersion)) return { error: "This form is out of date. Keep your entries and reload the saved profile before making changes.", success: null, refreshRequired: true };
  const context = await requireFamilyContext().catch(() => null);
  if (!context) return { error: "Your session could not be checked. Your entries are still here. Open the saved profile in a new tab before trying again.", success: null, refreshRequired: true };
  const { supabase, membership, activeChild: child } = context;

  if (formData.get("childId") !== child.id) return { error: "The selected child changed, or this form is out of date. Reload the profile before saving; nothing was changed.", success: null, refreshRequired: true };
  if (membership.role === "viewer") return { error: "Caregiver access is required.", success: null, refreshRequired: true };
  if (!["weekdayMinutes", "weekendMinutes"].every(key => typeof formData.get(key) === "string" && /^\d+$/.test(String(formData.get(key))))) {
    return { error: "Enter whole numbers for weekday and weekend minutes. Zero is fine.", success: null };
  }

  const weekdayMinutes = Number(formData.get("weekdayMinutes"));
  const weekendMinutes = Number(formData.get("weekendMinutes"));
  if (!Number.isInteger(weekdayMinutes) || weekdayMinutes < 0 || weekdayMinutes > 180) return { error: "Weekday time must be between 0 and 180 minutes.", success: null };
  if (!Number.isInteger(weekendMinutes) || weekendMinutes < 0 || weekendMinutes > 240) return { error: "Weekend time must be between 0 and 240 minutes.", success: null };

  const aspirations = [...formData.getAll("aspirations").map(String), ...commaList(formData.get("customAspiration"))];
  const uniqueAspirations = [...new Map(aspirations.map((item) => [item.toLowerCase(), item])).values()];
  if (uniqueAspirations.length > 8) return { error: "Choose up to eight hopes so your profile stays focused.", success: null };
  if (uniqueAspirations.length === 0) return { error: "Choose at least one hope for your child.", success: null };
  if (uniqueAspirations.some((item) => item.length > 80)) return { error: "Keep each hope under 80 characters.", success: null };
  const caregiverLanguages = commaList(formData.get("caregiverLanguages"));
  const languageGoals = commaList(formData.get("languageGoals"));
  if (caregiverLanguages.length > 8) return { error: "Use up to eight languages for this caregiver.", success: null };
  if (languageGoals.length > 40) return { error: "The language list can hold up to 40 entries.", success: null };
  if ([...caregiverLanguages, ...languageGoals].some((item) => item.length > 60)) return { error: "Keep each language under 60 characters.", success: null };

  const caregiverName = String(formData.get("caregiverName") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "").trim();
  if (caregiverName.length > 60 || relationship.length > 60) return { error: "Keep caregiver names and relationships under 60 characters.", success: null };
  if (!caregiverName && caregiverLanguages.length) return { error: "Add the caregiver's name for these languages, or leave both fields empty.", success: null };
  const screenPolicy = String(formData.get("screenPolicy") ?? "");
  const structureLevel = String(formData.get("structureLevel") ?? "");
  if (!["minimal_child_screen", "selective", "no_preference"].includes(screenPolicy) || !["light", "balanced", "structured"].includes(structureLevel)) {
    return { error: "Choose a screen preference and a level of structure.", success: null };
  }

  let createdProfile = false;
  let savedVersion: string | undefined;
  try {
  const { data: saved, error: profileError } = await supabase.rpc("configure_learning_profile_checked", {
    p_family_id: membership.family_id,
    p_child_id: child.id,
    p_expected_version: expectedVersion,
    p_screen_policy: screenPolicy,
    p_structure_level: structureLevel,
    p_weekday_minutes: weekdayMinutes,
    p_weekend_minutes: weekendMinutes,
    p_prefer_embedded: formData.get("preferEmbedded") === "on",
    p_caregiver_name: caregiverName,
    p_relationship: relationship,
    p_caregiver_languages: caregiverLanguages,
    p_aspirations: uniqueAspirations,
    p_language_goals: languageGoals,
  });
  if (profileError) return { error: profileError.message?.includes("MIRA_PROFILE_STALE")
    ? "The saved profile changed after you opened this form. Nothing was overwritten. Your entries are still here; compare the saved profile before reloading."
    : profileError.message?.includes("Removing a caregiver requires a separate action")
    ? "Keep a name for this caregiver. Clearing the name does not remove their profile."
    : profileError.message === "MIRA_LANGUAGE_CLEAR_CONTEXT_FIRST"
    ? "This language has saved details in Family. Clear those details there before removing the language here. Your profile has not changed."
    : "We could not confirm the profile save. Your entries are still here. Check the saved profile before trying again.", success: null, refreshRequired: !profileError.message?.includes("Removing a caregiver requires a separate action") };
  if (!saved || !isProfileVersion(saved.version) || typeof saved.createdProfile !== "boolean") return { error: "The profile save could not be confirmed. Your entries are still here; compare the saved profile before trying again.", success: null, refreshRequired: true };
  createdProfile = saved.createdProfile;
  savedVersion = saved.version;

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/setup");
  revalidatePath("/family");
  revalidatePath("/memory");
  if (createdProfile) {
    const { data: planId, error: planError } = await supabase.rpc("generate_weekly_plan", { p_child_id: child.id });
    if (planError || typeof planId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId)) {
      return { error: "Your profile was saved. We could not confirm the first week. Open Week to check it; you do not need to re-enter your profile.", success: null, version: savedVersion, profileSaved: true, refreshRequired: true };
    }
  }

  } catch {
    return { error: "The connection ended before we could confirm the result. Your entries are still here. Check the saved profile before trying again.", success: null, version: savedVersion, profileSaved: Boolean(savedVersion), refreshRequired: true };
  }
  // Redirect is a framework control-flow exception, never catch it as a failure.
  if (createdProfile) redirect("/week");
  return { error: null, success: "Learning profile updated. Your current week stays unchanged.", version: savedVersion };
}
