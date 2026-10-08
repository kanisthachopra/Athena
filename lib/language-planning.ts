// Family-reported communication context, not translated content, proficiency
// assessment or permission to create activities. Pure deterministic helpers.
export const planningLanguages = [
  ["en", "English"], ["hi", "Hindi"], ["bn", "Bengali"], ["ta", "Tamil"],
  ["te", "Telugu"], ["mr", "Marathi"], ["gu", "Gujarati"], ["kn", "Kannada"],
  ["ml", "Malayalam"], ["pa", "Punjabi"], ["ur", "Urdu"], ["or", "Odia"],
  ["as", "Assamese"], ["ne", "Nepali"], ["si", "Sinhala"], ["kok", "Konkani"],
  ["mai", "Maithili"], ["sd", "Sindhi"], ["sa", "Sanskrit"], ["ks", "Kashmiri"],
  ["ar", "Arabic"], ["zh", "Chinese"], ["fa", "Persian"], ["es", "Spanish"],
  ["fr", "French"], ["de", "German"], ["it", "Italian"], ["pt", "Portuguese"],
  ["ru", "Russian"], ["ja", "Japanese"], ["ko", "Korean"], ["vi", "Vietnamese"],
  ["th", "Thai"], ["id", "Indonesian"], ["ms", "Malay"], ["tr", "Turkish"],
  ["sw", "Swahili"], ["nl", "Dutch"], ["pl", "Polish"], ["he", "Hebrew"],
] as const;

export const languageRoles = ["family", "heritage", "community", "additional", "future"] as const;
export const languageStates = ["active", "maintenance", "future", "paused"] as const;
export const speakerComforts = ["comfortable", "learning", "not_comfortable"] as const;
export const contactPatterns = ["regular", "occasional", "unavailable"] as const;
export type LanguageEnvironment = {
  schemaVersion: 1;
  role: typeof languageRoles[number] | null;
  state: typeof languageStates[number] | null;
  variety: string | null;
  oralGoal: string | null;
  literacyGoal: string | null;
  support: {
    caregiverId: string | null;
    label: string;
    comfort: typeof speakerComforts[number] | null;
    contact: typeof contactPatterns[number] | null;
    contexts: string[];
  }[] | null;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x);
const keys = (x: Record<string, unknown>, fields: string[]) => Object.keys(x).sort().join() === [...fields].sort().join();
// Count Unicode code points, matching PostgreSQL char_length (not UTF-16 units).
const text = (x: unknown, max: number) => typeof x === "string" && x.trim().length > 0 && Array.from(x).length <= max;
const optionalText = (x: unknown, max: number) => x === null || text(x, max);
const choice = (x: unknown, values: readonly string[]) => x === null || (typeof x === "string" && values.includes(x));

/** No name/script/location-based identity inference or automatic alias merge. */
export function planningLanguageLabel(value: string): string {
  const known = planningLanguages.find(([code]) => code === value);
  return known?.[1] ?? value;
}

/** Duplicate guard only; never converts or merges an existing parent entry. */
export function hasPlanningLanguage(values: readonly string[], code: string): boolean {
  const match = planningLanguages.find(([key]) => key === code);
  if (!match) return false;
  return values.some(value => [code, match[1].toLowerCase()].includes(value.trim().toLowerCase()));
}

export function emptyLanguageEnvironment(): LanguageEnvironment {
  return { schemaVersion: 1, role: null, state: null, variety: null, oralGoal: null, literacyGoal: null, support: null };
}

/** Helpful field errors supplement, but never replace, the strict parser. */
export function languageEnvironmentFieldErrors(value: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!object(value)) return errors;
  for (const [field, max] of [["variety", 100], ["oralGoal", 400], ["literacyGoal", 400]] as const) {
    const answer = value[field];
    if (typeof answer === "string" && !answer.trim()) errors[field] = "Leave this empty, or add a few words; spaces alone cannot be saved.";
    else if (typeof answer === "string" && Array.from(answer).length > max) errors[field] = `Keep this to ${max} characters or fewer. Your text is still here to edit.`;
  }
  if (Array.isArray(value.support)) {
    const caregivers = new Set<string>();
    value.support.forEach((person, index) => {
      if (!object(person)) return;
      const key = `support.${index}`;
      if (typeof person.label !== "string" || !person.label.trim()) errors[`${key}.label`] = "Add a name or description for this person.";
      else if (Array.from(person.label).length > 100) errors[`${key}.label`] = "Keep this person's name or description to 100 characters or fewer.";
      if (typeof person.caregiverId === "string") {
        const id = person.caregiverId.toLowerCase();
        if (caregivers.has(id)) errors[`${key}.caregiverId`] = "This caregiver is already linked above. Add their other moments to that entry.";
        caregivers.add(id);
      }
      if (Array.isArray(person.contexts)) {
        const lines = person.contexts;
        if (lines.length > 8) errors[`${key}.contexts`] = "Keep up to eight moments, one per line.";
        else if (lines.some(line => typeof line === "string" && Array.from(line).length > 120)) errors[`${key}.contexts`] = "Keep each moment to 120 characters or fewer.";
        else if (lines.every(line => typeof line === "string") && new Set(lines.map(line => String(line).trim().toLocaleLowerCase("en"))).size !== lines.length) errors[`${key}.contexts`] = "One of these moments is repeated. Keep one copy of each.";
      }
    });
  }
  return errors;
}

export function parseLanguageEnvironment(value: unknown): LanguageEnvironment | null {
  if (!object(value) || !keys(value, ["schemaVersion", "role", "state", "variety", "oralGoal", "literacyGoal", "support"])
    || value.schemaVersion !== 1 || !choice(value.role, languageRoles) || !choice(value.state, languageStates)
    || !optionalText(value.variety, 100) || !optionalText(value.oralGoal, 400) || !optionalText(value.literacyGoal, 400)) return null;
  if (value.support !== null) {
    if (!Array.isArray(value.support) || value.support.length > 12) return null;
    const ids = new Set<string>();
    for (const item of value.support) {
      if (!object(item) || !keys(item, ["caregiverId", "label", "comfort", "contact", "contexts"])
        || !(item.caregiverId === null || (typeof item.caregiverId === "string" && uuid.test(item.caregiverId)))
        || !text(item.label, 100) || !choice(item.comfort, speakerComforts) || !choice(item.contact, contactPatterns)
        || !Array.isArray(item.contexts) || item.contexts.length > 8 || item.contexts.some(context => !text(context, 120))) return null;
      if (item.caregiverId !== null) {
        const id = String(item.caregiverId).toLowerCase();
        if (ids.has(id)) return null;
        ids.add(id);
      }
      const normalized = item.contexts.map(context => String(context).trim().toLocaleLowerCase("en"));
      if (new Set(normalized).size !== normalized.length) return null;
    }
  }
  // Preserve the parent's original Unicode text and explicit unknowns.
  return value as LanguageEnvironment;
}

export type LanguagePlanningSummary = {
  status: "invalid" | "unknown" | "future" | "paused" | "support_needed" | "clarify" | "contexts_reported";
  explanation: string;
  questions: string[];
  reportedContexts: { supportIndex: number; caregiverId: string | null; speaker: string; context: string; contact: "regular" | "occasional" }[];
  createsActivities: false;
};

/** Summarizes what was reported. It never schedules, changes state, estimates
 * exposure, infers child ability or treats a desired context as reviewed care.
 * A database caller must separately authorize every caregiverId reference.
 */
export function summarizeLanguageEnvironment(input: unknown): LanguagePlanningSummary {
  const environment = parseLanguageEnvironment(input);
  const result = (status: LanguagePlanningSummary["status"], explanation: string, questions: string[] = [], reportedContexts: LanguagePlanningSummary["reportedContexts"] = []): LanguagePlanningSummary =>
    ({ status, explanation, questions, reportedContexts, createsActivities: false });
  if (!environment) return result("invalid", "This language context could not be read. No language plan was created.");
  if (environment.state === "paused") return result("paused", "This language is paused. It adds nothing to the plan.");
  if (environment.state === "future") return result("future", "Kept as a future hope, without adding a task now.");
  if (environment.state === null) return result("unknown", "You have not chosen how this language fits right now.", ["Is this active, being maintained, for later, or paused?"]);
  if (environment.role === "future") return result("clarify", "This is marked both for the future and for use now.", ["Should we keep it for later, or change its role?"]);
  const questions: string[] = [];
  if (environment.role === null) questions.push("What place does this language have in your family?");
  if (environment.oralGoal === null && environment.literacyGoal === null) questions.push("What would you like this language to make possible? Oral and reading or writing hopes can differ.");
  if (environment.support === null) return result("unknown", "Speaker support has not been described. A language goal alone is not a communication environment.", [...questions, "Who can comfortably use this language with your child, and when?"]);
  if (!environment.support.length) return result("support_needed", "You have not identified a person who can provide this language context. No daily language task has been added.", [...questions, "Would you like to look for support, learn alongside your child, or keep this goal for later?"]);
  const reportedContexts: LanguagePlanningSummary["reportedContexts"] = [];
  let uncertain = false;
  environment.support.forEach((person, supportIndex) => {
    if (person.comfort === null || person.contact === null) uncertain = true;
    if (person.comfort !== "comfortable" || !["regular", "occasional"].includes(person.contact ?? "")) return;
    if (!person.contexts.length) questions.push(`When does using this language with ${person.label} already fit?`);
    for (const context of person.contexts) reportedContexts.push({ supportIndex, caregiverId: person.caregiverId, speaker: person.label, context, contact: person.contact as "regular" | "occasional" });
  });
  if (!reportedContexts.length) {
    if (uncertain) questions.push("Which people's language comfort and availability still need checking?");
    return result(uncertain || questions.length ? "clarify" : "support_needed", "There is not yet a confirmed comfortable speaker and context to work with. Nobody's fluency or availability has been assumed.", questions.length ? questions : ["Would outside support, parent learning or postponing this goal fit better?"]);
  }
  if (uncertain) questions.push("Some speaker details are still unknown; those people were not included below.");
  return result("contexts_reported", "These are the contexts you reported, not scheduled lessons or measured language exposure. Existing plans stay unchanged.", questions, reportedContexts);
}
