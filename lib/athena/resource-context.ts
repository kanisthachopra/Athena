export const ageBands = [
  { value: 3, label: "0–6 months" }, { value: 9, label: "6–12 months" },
  { value: 18, label: "1 year" }, { value: 30, label: "2 years" },
  { value: 42, label: "3 years" }, { value: 54, label: "4 years" },
  { value: 66, label: "5 years" }, { value: 72, label: "6 years" },
] as const;
export function ageBandLabel(value: unknown) { return ageBands.find(b => b.value === value)?.label ?? null; }
