import { parseLearningProfileSnapshot, type LearningProfileSnapshot } from "@/lib/learning-profile";
import { directionId, parseDirectionsSnapshot, type DirectionsSnapshot } from "@/lib/learning-directions";
import { parseLanguageEnvironment, type LanguageEnvironment } from "@/lib/language-planning";
import { isTimeZone } from "@/lib/family-calendar";

type HopeDate = { id: string; createdAt: string; directionUpdatedAt: string | null };
type Person = { id: string; name: string; relationship: string | null; createdAt: string };
type Language = { id: string; childId: string; language: string; environment: LanguageEnvironment | null; createdAt: string; updatedAt: string | null };
export type FamilyUnderstanding = {
  profile: LearningProfileSnapshot; directions: DirectionsSnapshot;
  childUpdatedAt: string; preferencesUpdatedAt: string | null;
  calendar: { timeZone: string | null; updatedAt: string | null };
  hopeDates: HopeDate[]; people: Person[]; languages: Language[];
};
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const stamp = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));
const optionalStamp = (v: unknown): v is string | null => v === null || stamp(v);
const text = (v: unknown, max: number): v is string => typeof v === "string" && !!v.trim() && Array.from(v).length <= max;
const rows = (v: unknown): v is Record<string, unknown>[] => Array.isArray(v) && v.every(object)
  && v.every(row => directionId(row.id)) && new Set(v.map(row => row.id)).size === v.length;

/** The overview must not splice partial reads into a seemingly complete profile. */
export function parseFamilyUnderstanding(value: unknown, childId: string, familyId: string): FamilyUnderstanding | null {
  if (!object(value) || value.schemaVersion !== 1 || value.childId !== childId || value.familyId !== familyId) return null;
  const profile = parseLearningProfileSnapshot(value.profile, childId, familyId);
  const directions = parseDirectionsSnapshot(value.directions, childId);
  if (!profile || !directions || !stamp(value.childUpdatedAt) || !optionalStamp(value.preferencesUpdatedAt)
    || profile.configured !== (value.preferencesUpdatedAt !== null)
    || !object(value.calendar) || !optionalStamp(value.calendar.updatedAt)
    || (value.calendar.timeZone !== null && !isTimeZone(value.calendar.timeZone))
    || (value.calendar.timeZone === null) !== (value.calendar.updatedAt === null)) return null;
  const hopeDates = value.hopeDates;
  if (!rows(hopeDates) || hopeDates.length !== directions.hopes.length
    || hopeDates.some(row => !stamp(row.createdAt) || !optionalStamp(row.directionUpdatedAt))
    || directions.hopes.some(hope => !hopeDates.some(row => row.id === hope.id))
    || profile.initial.aspirations.length !== directions.hopes.length
    || profile.initial.aspirations.some((title, index) => title !== directions.hopes[index].title)) return null;
  if (!rows(value.people) || value.people.some(row => !text(row.name, 100) || !(row.relationship === null || typeof row.relationship === "string" && Array.from(row.relationship).length <= 100) || !stamp(row.createdAt))) return null;
  const people = value.people as Person[];
  if (!rows(value.languages) || value.languages.length > 40 || value.languages.some(row => row.childId !== childId || !text(row.language, 100) || !stamp(row.createdAt) || !optionalStamp(row.updatedAt))) return null;
  const languages: Language[] = [];
  for (const row of value.languages) {
    const environment = row.environment === null ? null : parseLanguageEnvironment(row.environment);
    if (row.environment !== null && (!environment || row.updatedAt === null)) return null;
    if (environment?.support?.some(person => person.caregiverId !== null && !people.some(p => p.id.toLowerCase() === person.caregiverId!.toLowerCase()))) return null;
    languages.push({ ...row, environment } as Language);
  }
  if (profile.initial.languageGoals.length !== languages.length || profile.initial.languageGoals.some((language, index) => language !== languages[index].language)) return null;
  return { profile, directions, childUpdatedAt: value.childUpdatedAt, preferencesUpdatedAt: value.preferencesUpdatedAt,
    calendar: value.calendar as FamilyUnderstanding["calendar"], hopeDates: hopeDates as HopeDate[], people, languages };
}

export function understandingDate(instant: string, timeZone: string | null) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timeZone ?? "UTC" }).format(new Date(instant));
}
