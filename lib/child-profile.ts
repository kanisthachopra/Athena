// Month/year is parent-reported context, never an invented exact birthday.
export const birthMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function birthContextError(year: number, month: number, today: string): string | null {
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  if (!Number.isInteger(month) || month < 1 || month > 12) return "Choose a valid birth month.";
  if (!Number.isInteger(year) || year < currentYear - 18 || year > currentYear) return "Choose a valid birth year.";
  if (year === currentYear && month > currentMonth) return "The birth month is in the future. Check the month and year.";
  return null;
}

export function isProfileVersion(value: string): boolean {
  // Keep database microseconds intact: converting to Date would lose precision.
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}

export function birthMonthLabel(year: number, month: number): string {
  return `${birthMonths[month - 1]} ${year}`;
}
