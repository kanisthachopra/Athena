export const AI_POLICY_VERSION = "2026-10-01-v2";
export type AiFeature = "guide" | "profile" | "journal";
export type AiPreferences = {
  guide_enabled: boolean; profile_enabled: boolean; journal_enabled: boolean;
  policy_version: string | null; revision: number;
};
export const AI_OFF: AiPreferences = { guide_enabled: false, profile_enabled: false, journal_enabled: false, policy_version: null, revision: 0 };
export function isAiAllowed(value: AiPreferences | null, feature: AiFeature) {
  return value?.policy_version === AI_POLICY_VERSION && value[`${feature}_enabled`] === true;
}
