// A birth month/year cannot identify an exact birthday. This deliberately
// conservative envelope must fit a reviewed range in full before eligibility.
export type AgeContext = { minimumMonths: number; maximumMonths: number; precision: "month_year"; scope: "within_target" | "boundary_uncertain" | "outside_target" };
export function ageContext(birthYear: number, birthMonth: number, asOf: Date = new Date()): AgeContext | null {
  if (!Number.isInteger(birthYear) || birthYear < 1900 || !Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12 || !Number.isFinite(asOf.getTime())) return null;
  const maximumMonths = (asOf.getUTCFullYear() - birthYear) * 12 + asOf.getUTCMonth() + 1 - birthMonth;
  if (maximumMonths < 0) return null;
  const minimumMonths = Math.max(0, maximumMonths - 1);
  return { minimumMonths, maximumMonths, precision: "month_year", scope: maximumMonths < 84 ? "within_target" : minimumMonths >= 84 ? "outside_target" : "boundary_uncertain" };
}
export function ageRangeLabel(context: AgeContext) {
  return context.minimumMonths === context.maximumMonths ? `${context.maximumMonths} months (approximate)` : `${context.minimumMonths}–${context.maximumMonths} months (approximate)`;
}
export function fitsReviewedAgeRange(context: AgeContext | null, min: number, max: number) {
  return Boolean(context && context.precision === "month_year" && context.scope === "within_target" && Number.isInteger(context.minimumMonths) && Number.isInteger(context.maximumMonths) && context.minimumMonths >= 0 && context.maximumMonths >= context.minimumMonths && context.maximumMonths < 84 && Number.isInteger(min) && Number.isInteger(max) && min >= 0 && max >= min && context.minimumMonths >= min && context.maximumMonths <= max);
}
