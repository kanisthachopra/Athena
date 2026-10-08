export const contextCategories = ["materials", "environment", "supervision", "readiness", "restrictions"] as const;
export type ContextCategory = typeof contextCategories[number];
export type ActivityContextContract = {
  schema_version: 1; max_valid_days: number;
  checks: { id: string; category: ContextCategory; statement: string }[];
  not_required: Partial<Record<ContextCategory, string>>;
};
export type ContextAnswers = Record<string, boolean | null>;
export type SavedFamilyContext = { contract: ActivityContextContract; answers: ContextAnswers; valid_from: string; valid_until: string };
export const isContextDate = (value: unknown): value is string => typeof value === "string"
  && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export function contextDatePlus(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`); result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
export function parseContextContract(value: unknown): ActivityContextContract | null {
  if (!object(value) || Object.keys(value).sort().join() !== "checks,max_valid_days,not_required,schema_version"
    || value.schema_version !== 1 || !Number.isInteger(value.max_valid_days) || Number(value.max_valid_days) < 1 || Number(value.max_valid_days) > 7
    || !Array.isArray(value.checks) || !value.checks.length || value.checks.length > 12 || !object(value.not_required)) return null;
  const ids = new Set<string>(); const categories = new Set<string>();
  for (const check of value.checks) {
    if (!object(check) || Object.keys(check).sort().join() !== "category,id,statement"
      || typeof check.id !== "string" || !/^[a-z][a-z0-9_]{0,59}$/.test(check.id) || ids.has(check.id)
      || !contextCategories.includes(check.category as ContextCategory)
      || typeof check.statement !== "string" || !check.statement.trim() || check.statement.length > 600) return null;
    ids.add(check.id); categories.add(String(check.category));
  }
  if (!categories.has("supervision")) return null;
  const notRequired = value.not_required;
  for (const [category, reason] of Object.entries(notRequired)) {
    if (!contextCategories.includes(category as ContextCategory) || categories.has(category) || typeof reason !== "string" || !reason.trim() || reason.length > 1200) return null;
  }
  if (contextCategories.some(category => !categories.has(category) && !Object.hasOwn(notRequired, category))) return null;
  return value as ActivityContextContract;
}
export function parseContextAnswers(value: unknown, contract: ActivityContextContract): ContextAnswers | null {
  if (!object(value) || Object.keys(value).length !== contract.checks.length) return null;
  if (contract.checks.some(check => !Object.hasOwn(value, check.id) || (value[check.id] !== null && typeof value[check.id] !== "boolean"))) return null;
  return value as ContextAnswers;
}
// Compare the exact reviewed questions independently of JSON object key order.
// Question order is retained: reordering a displayed contract needs fresh review.
export function sameContextContract(a: ActivityContextContract, b: ActivityContextContract): boolean {
  return a.schema_version === b.schema_version && a.max_valid_days === b.max_valid_days
    && a.checks.length === b.checks.length
    && a.checks.every((check, i) => check.id === b.checks[i].id
      && check.category === b.checks[i].category && check.statement === b.checks[i].statement)
    && contextCategories.every(category => a.not_required[category] === b.not_required[category]);
}
export type ActivityContextOption = {
  template_id: string; title: string; content_version: number; contract: ActivityContextContract;
  confirmation: { revision: number; content_version: number; answers: ContextAnswers; valid_from: string; valid_until: string } | null;
};
