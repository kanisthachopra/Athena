export const profileFields = {
  weekdayMinutes: "Weekday minutes",
  weekendMinutes: "Weekend minutes",
  screenPolicy: "Screen preference",
  structureLevel: "Structure",
  preferEmbedded: "Learning inside everyday life",
  customAspiration: "Hopes for your child",
  caregiverLanguages: "Languages you can use",
  languageGoals: "Languages to grow with",
} as const;

export type ProfileField = keyof typeof profileFields;
export type ProfileSuggestion = { field: ProfileField; value: string; evidence: string };

const choices: Partial<Record<ProfileField, readonly string[]>> = {
  screenPolicy: ["minimal_child_screen", "selective", "no_preference"],
  structureLevel: ["light", "balanced", "structured"],
  preferEmbedded: ["true", "false"],
};

export function parseProfileSuggestions(content: unknown, source: string): ProfileSuggestion[] {
  if (!content || typeof content !== "object" || !("suggestions" in content) || !Array.isArray(content.suggestions)) {
    throw new Error("Invalid profile proposal.");
  }
  if (content.suggestions.length > 8) throw new Error("Too many profile suggestions.");
  const seen = new Set<string>();
  const normalizedSource = source.replace(/\s+/g, " ").trim().toLowerCase();
  return content.suggestions.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid suggestion.");
    const row = item as Record<string, unknown>;
    if (typeof row.field !== "string" || !Object.hasOwn(profileFields, row.field) || seen.has(row.field)) {
      throw new Error("Unknown or repeated profile field.");
    }
    if (typeof row.value !== "string" || typeof row.evidence !== "string") throw new Error("Invalid suggestion text.");
    const field = row.field as ProfileField;
    const value = row.value.trim();
    const evidence = row.evidence.replace(/\s+/g, " ").trim();
    if (!value || value.length > 480 || evidence.length < 3 || evidence.length > 240 || !normalizedSource.includes(evidence.toLowerCase())) {
      throw new Error("Suggestion is missing source evidence.");
    }
    if (choices[field] && !choices[field]!.includes(value)) throw new Error("Invalid profile choice.");
    if (field === "weekdayMinutes" || field === "weekendMinutes") {
      if (!/^\d+$/.test(value) || Number(value) > (field === "weekdayMinutes" ? 180 : 240)) throw new Error("Invalid time allowance.");
    }
    if (["customAspiration", "caregiverLanguages", "languageGoals"].includes(field)) {
      const entries = value.split(",").map((entry) => entry.trim());
      if (entries.length > 8 || entries.some((entry) => !entry || entry.length > (field === "customAspiration" ? 80 : 60))) {
        throw new Error("Invalid profile list.");
      }
    }
    seen.add(field);
    return { field, value, evidence };
  });
}

export function profileSuggestionLabel(suggestion: ProfileSuggestion) {
  const labels: Record<string, string> = {
    minimal_child_screen: "Minimal child screen time", selective: "Selective, purposeful use",
    no_preference: "No strong preference", light: "Light and spontaneous", balanced: "A balanced rhythm",
    structured: "More predictable structure", true: "Prefer everyday routines", false: "No preference for everyday routines",
  };
  if (suggestion.field.endsWith("Minutes")) return `${suggestion.value} minutes`;
  return choices[suggestion.field] ? labels[suggestion.value] : suggestion.value;
}
