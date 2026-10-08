import type { SupabaseClient } from "@supabase/supabase-js";
import { isContextDate } from "@/lib/activity-context";

export type FamilyCalendar = { timeZone: string | null; revision: number; today: string };
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100 || (value !== "UTC" && !value.includes("/"))) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return !/^(posix|right)\//.test(value); } catch { return false; }
}
export async function loadFamilyCalendar(client: SupabaseClient, familyId: string): Promise<FamilyCalendar> {
  const { data, error } = await client.rpc("get_family_calendar", { p_family_id: familyId });
  if (error || !data || !isContextDate(data.today) || !Number.isSafeInteger(data.revision) || data.revision < 0
    || (data.timeZone !== null && !isTimeZone(data.timeZone)) || (data.revision === 0) !== (data.timeZone === null)) {
    throw new Error("Your family’s calendar could not be loaded. Reload to try again; saved dates have not changed.");
  }
  return { timeZone: data.timeZone, revision: data.revision, today: data.today };
}
export function calendarLabel(calendar: FamilyCalendar) {
  return calendar.timeZone ? `Family time zone: ${calendar.timeZone.replaceAll("_", " ")}` : "Using UTC until your family owner chooses a time zone in Settings";
}
// A date-only value is not an instant. UTC here prevents display shifts; it does
// not choose the family's day, which comes from the authorized database read.
export function shortCalendarDate(date: string) {
  if (!isContextDate(date)) throw new Error("Invalid calendar date");
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
export function calendarDayOfInstant(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).formatToParts(new Date(instant));
  const field = (type: string) => parts.find(part => part.type === type)?.value;
  return `${field("year")}-${field("month")}-${field("day")}`;
}
