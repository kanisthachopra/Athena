export type InitialLearningProfile = {
  screen_policy?: string; structure_level?: string; weekday_minutes?: number; weekend_minutes?: number;
  prefer_embedded_learning?: boolean;
  aspirations: string[]; languageGoals: string[]; caregiverName: string; relationship: string; caregiverLanguages: string[];
};
export type LearningProfileSnapshot = { version: string; configured: boolean; initial: InitialLearningProfile };
export const isProfileVersion = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

/** Reject partial or cross-child reads rather than mixing defaults with saved facts. */
export function parseLearningProfileSnapshot(value: unknown, childId: string, familyId: string): LearningProfileSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.childId !== childId || data.familyId !== familyId || !isProfileVersion(data.version) || typeof data.configured !== "boolean" || !data.initial || typeof data.initial !== "object") return null;
  const profile = data.initial as Record<string, unknown>;
  const list = (items: unknown, max: number, length: number): items is string[] => Array.isArray(items) && items.length <= max && items.every(item => typeof item === "string" && item.trim().length > 0 && item.length <= length);
  if (!list(profile.aspirations, 8, 80) || !list(profile.languageGoals, 40, 100) || !list(profile.caregiverLanguages, 8, 60)
    || typeof profile.caregiverName !== "string" || profile.caregiverName.length > 60 || typeof profile.relationship !== "string" || profile.relationship.length > 60) return null;
  const initial: InitialLearningProfile = { aspirations: profile.aspirations, languageGoals: profile.languageGoals, caregiverName: profile.caregiverName, relationship: profile.relationship, caregiverLanguages: profile.caregiverLanguages };
  if (data.configured) {
    if (typeof profile.screen_policy !== "string" || !["minimal_child_screen", "selective", "no_preference"].includes(profile.screen_policy)
      || typeof profile.structure_level !== "string" || !["light", "balanced", "structured"].includes(profile.structure_level)
      || typeof profile.weekday_minutes !== "number" || !Number.isInteger(profile.weekday_minutes) || profile.weekday_minutes < 0 || profile.weekday_minutes > 180
      || typeof profile.weekend_minutes !== "number" || !Number.isInteger(profile.weekend_minutes) || profile.weekend_minutes < 0 || profile.weekend_minutes > 240
      || typeof profile.prefer_embedded_learning !== "boolean") return null;
    Object.assign(initial, { screen_policy: profile.screen_policy, structure_level: profile.structure_level, weekday_minutes: profile.weekday_minutes, weekend_minutes: profile.weekend_minutes, prefer_embedded_learning: profile.prefer_embedded_learning });
  } else if (["screen_policy", "structure_level", "weekday_minutes", "weekend_minutes", "prefer_embedded_learning"].some(key => profile[key] != null)) return null;
  return { version: data.version, configured: data.configured, initial };
}
