import { parseLanguageEnvironment, planningLanguageLabel, summarizeLanguageEnvironment } from "@/lib/language-planning";

export type LanguageOpportunity = {
  goalId: string;
  language: string;
  variety: string | null;
  state: "active" | "maintenance";
  people: { name: string; contact: "regular" | "occasional"; moments: string[] }[];
};
export type LanguageOpportunities = {
  status: "available" | "unavailable";
  opportunities: LanguageOpportunity[];
  hasSavedLanguages: boolean;
};

/** A view of explicit current parent reports, not reviewed activities, a
 * timetable, measured exposure or an AI inference. No names/text are rewritten.
 * Only call with authorized child rows and that family's caregiver IDs.
 */
export function projectLanguageOpportunities(goals: unknown, caregiverIds: readonly string[], childId: string): LanguageOpportunities {
  const unavailable: LanguageOpportunities = { status: "unavailable", opportunities: [], hasSavedLanguages: false };
  if (!Array.isArray(goals) || goals.length > 40) return unavailable;
  const caregivers = new Set(caregiverIds.map(id => id.toLowerCase()));
  const seen = new Set<string>();
  const opportunities: LanguageOpportunity[] = [];
  for (const goal of goals) {
    if (!goal || typeof goal !== "object" || typeof goal.id !== "string" || !goal.id
      || goal.child_id !== childId || seen.has(goal.id)
      || typeof goal.language_code !== "string" || !goal.language_code.trim()
      || Array.from(goal.language_code).length > 100) return unavailable;
    seen.add(goal.id);
    // Cleared/legacy details stay unknown, not an invented environment.
    if (goal.environment === null) continue;
    const environment = parseLanguageEnvironment(goal.environment);
    if (!environment) return unavailable;
    if (environment.support?.some(person => person.caregiverId !== null && !caregivers.has(person.caregiverId.toLowerCase()))) return unavailable;
    const summary = summarizeLanguageEnvironment(environment);
    if (summary.status !== "contexts_reported" || (environment.state !== "active" && environment.state !== "maintenance")) continue;
    const people: LanguageOpportunity["people"] = [];
    for (const [index, person] of (environment.support ?? []).entries()) {
      const contexts = summary.reportedContexts.filter(context => context.supportIndex === index);
      if (contexts.length) people.push({ name: person.label, contact: contexts[0].contact, moments: contexts.map(context => context.context) });
    }
    opportunities.push({ goalId: goal.id, language: planningLanguageLabel(goal.language_code), variety: environment.variety, state: environment.state, people });
  }
  return { status: "available", opportunities, hasSavedLanguages: goals.length > 0 };
}
