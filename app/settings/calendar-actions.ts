"use server";
import { requireFamilyContext } from "@/lib/family-context";
import { isTimeZone } from "@/lib/family-calendar";
import { revalidatePath } from "next/cache";
export type CalendarSaveState = { error: string | null; success: string | null; saved: { timeZone: string | null; revision: number } | null; refreshRequired: boolean };
export async function saveFamilyTimeZone(_previous: CalendarSaveState, form: FormData): Promise<CalendarSaveState> {
  const fail = (error: string, refreshRequired = false): CalendarSaveState => ({ error, success: null, saved: null, refreshRequired });
  const { supabase, membership } = await requireFamilyContext();
  if (membership.role !== "owner") return fail("Only the family owner can change the shared time zone.");
  if (form.get("familyId") !== membership.family_id) return fail("Your family changed. Reload Settings before saving.", true);
  const rawRevision = String(form.get("revision") ?? ""), timeZone = form.get("timeZone");
  if (!/^\d+$/.test(rawRevision) || !Number.isSafeInteger(Number(rawRevision))) return fail("Reload Settings before saving.", true);
  if (!isTimeZone(timeZone)) return fail("Choose a time zone from the list.");
  const { data, error } = await supabase.rpc("set_family_time_zone", { p_family_id: membership.family_id, p_expected_revision: Number(rawRevision), p_time_zone: timeZone });
  if (error) return fail(error.message.includes("MIRA_STALE_FAMILY_CALENDAR")
    ? "The time zone changed in another session. Reload Settings to compare before saving."
    : "The change could not be confirmed. Reload Settings to check the saved time zone before trying again.", true);
  if (!Number.isInteger(data) || data !== Number(rawRevision) + 1) return fail("The save was not confirmed. Reload Settings to check before trying again.", true);
  for (const path of ["/settings", "/today", "/week", "/insights", "/library", "/guide"]) revalidatePath(path);
  return { error: null, success: "Family time zone saved. Existing activities and notes keep their dates.", saved: { timeZone, revision: data }, refreshRequired: false };
}
