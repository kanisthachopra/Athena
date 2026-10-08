export const observationDomains = ["everyday", "language", "movement", "sensory", "maths", "creative", "life_skills", "nature"] as const;
export type ObservationDomain = (typeof observationDomains)[number];
export type ObservationSuggestion = { title: string; domain: ObservationDomain };

export type JournalCorrectionState = { error: string | null; success: string | null; updatedAt: string | null; refreshRequired: boolean; removed: boolean };
export const emptyJournalCorrection: JournalCorrectionState = { error: null, success: null, updatedAt: null, refreshRequired: false, removed: false };
export function isJournalVersion(value: string) {
  // Preserve database microseconds; Date is used only for validation, not conversion.
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}
export function journalCorrectionFailure(message?: string): JournalCorrectionState {
  let error = "The change could not be confirmed. Your words are still here. Compare the saved journal before trying again.";
  let refreshRequired = true;
  if (message?.includes("MIRA_STALE_MOMENT")) error = "This note changed after you opened it. Your edits have not overwritten it. Compare the saved journal, then reload before editing again.";
  else if (message?.includes("MIRA_MOMENT_NOT_FOUND")) error = "This note is no longer available for this child. Check the saved journal; nothing else was changed.";
  else if (message?.includes("Caregiver access required")) error = "Your access changed. An owner or caregiver can edit this journal. Your words have not been cleared.";
  else if (message?.includes("MIRA_MOMENT_DATE_INVALID")) { error = "Keep the note’s original date, or choose a new date within the past year, no later than today in your family’s time zone."; refreshRequired = false; }
  return { ...emptyJournalCorrection, error, refreshRequired };
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function journalTitle(note: string) {
  const firstLine = note.trim().split(/\r?\n/)[0] || "A moment worth remembering";
  // Truncate by code point, never split a surrogate pair.
  const characters = Array.from(firstLine);
  return characters.length > 70 ? characters.slice(0, 69).join("") + "…" : firstLine;
}

export function parseObservationSuggestion(value: unknown): ObservationSuggestion {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid observation suggestion");
  const item = value as Record<string, unknown>;
  if (Object.keys(item).length !== 2 || typeof item.title !== "string" || !item.title.trim() || item.title.length > 100 || typeof item.domain !== "string" || !observationDomains.includes(item.domain as ObservationDomain)) throw new Error("Invalid observation suggestion");
  return { title: item.title.trim(), domain: item.domain as ObservationDomain };
}

export function validateJournalEntry(input: { title: string; note: string; domain: string; occurredOn: string; childId: string }) {
  if (input.note.includes("\u0000") || input.title.includes("\u0000")) return "The text contains an unsupported hidden character. Remove it before saving; your words have not been changed.";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.childId)) return "Choose a child before saving.";
  if (!input.note.trim() || input.note.length > 1200) return "Describe the moment in up to 1,200 characters.";
  if (input.title.length > 100) return "Use a title of up to 100 characters.";
  if (!observationDomains.includes(input.domain as ObservationDomain)) return "Choose a valid learning area.";
  if (!isCalendarDate(input.occurredOn)) return "Choose a valid date for this moment.";
  return null;
}
