export const domainNames: Record<string, string> = { language: "Language", movement: "Movement", sensory: "Sensory", maths: "Early maths", creative: "Creative", life_skills: "Life skills", nature: "Nature" };
export type LibraryFilters = { q: string; domain: string; saved: boolean; replace: string };
export function libraryFilters(params: Record<string, string | string[] | undefined>): LibraryFilters {
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  return { q: value("q").trim().slice(0, 100), domain: Object.hasOwn(domainNames, value("domain")) ? value("domain") : "", saved: value("saved") === "1", replace: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value("replace")) ? value("replace") : "" };
}
export function libraryUrl(filters: Partial<LibraryFilters> = {}) {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.domain) query.set("domain", filters.domain);
  if (filters.saved) query.set("saved", "1");
  if (filters.replace) query.set("replace", filters.replace);
  return `/library${query.size ? `?${query}` : ""}`;
}
export function matchesLibrarySearch(item: { title: string; summary: string; materials: string[] }, query: string) {
  const text = [item.title, item.summary, ...item.materials].join(" ").toLocaleLowerCase();
  return query.toLocaleLowerCase().split(/\s+/).filter(Boolean).every(word => text.includes(word));
}
export function contentStatus(status: string) {
  if (status === "internal_prototype") return "Prototype · not independently reviewed";
  return `Content status: ${status.replaceAll("_", " ") || "not recorded"}`;
}

export function activityEligibilityMessage(reason?: string) {
  if (reason?.includes("MIRA_CONTEXT_REQUIREMENTS_UNREVIEWED")) return "This activity’s material, setting and adult-support requirements still need review. A family answer cannot approve missing requirements.";
  if (reason?.includes("MIRA_CONTEXT_REQUIRED") || reason?.includes("MIRA_CONTEXT_NOT_CONFIRMED")) return "Check this activity’s materials and family context for that date in Library. A missing, unsure or no answer keeps it out of the plan; no activity has been changed.";
  if (reason?.includes("MIRA_EVIDENCE_REVIEW_MISSING_OR_STALE") || reason?.includes("MIRA_SOURCE_REVIEW_EXPIRED") || reason?.includes("MIRA_SOURCE_SCOPE_INCOMPLETE")) return "This activity’s source records need review. Choose another reviewed option or leave the day open; your saved history is kept.";
  if (reason?.includes("MIRA_SAVED_CONTENT_CHANGED") || reason?.includes("MIRA_LEGACY_CONTENT_VERSION_UNKNOWN")) return "The saved version cannot be offered on a new day. Keep it as history and choose a currently reviewed alternative.";
  if (reason?.includes("MIRA_TEMPLATE_NOT_REVIEWED") || reason?.includes("MIRA_REVIEW_MISSING_OR_STALE")) return "This activity has no current review for its exact version. Choose another reviewed option or leave the day open.";
  if (reason?.includes("MIRA_AGE_OUTSIDE_REVIEWED_RANGE")) return "The saved age range does not fit this activity’s reviewed range on that date. Choose another option.";
  if (reason?.includes("MIRA_TIME_BUDGET_EXCEEDED")) return "Preparation and activity time exceed the saved capacity for that day. Choose a shorter option or another day.";
  if (reason?.includes("MIRA_SCREEN_PREFERENCE")) return "This activity requires screens outside your saved preferences. Choose another option.";
  if (reason?.includes("MIRA_MISSING_PLANNING_CONTEXT")) return "MIRA needs the family’s time and screen preferences before choosing this activity.";
  return null;
}

export function safeLibraryReturn(value: string) {
  try {
    const url = new URL(value, "https://mira.invalid");
    if (url.origin !== "https://mira.invalid" || !/^\/library(?:\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i.test(url.pathname)) return "/library";
    const collection = libraryUrl(libraryFilters(Object.fromEntries(url.searchParams)));
    return url.pathname + (collection.includes("?") ? collection.slice(collection.indexOf("?")) : "");
  } catch { return "/library"; }
}
