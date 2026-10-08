export type PublicationContext = {
  schema_version: 1; language_variety: string; readiness: string; exclusions: string;
  associations: {
    capabilities: { code: string; emphasis: "primary" | "supporting"; rationale: string }[];
    tracks: { code: string; rationale: string }[];
  };
};
export function parsePublicationContext(value: unknown): PublicationContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const c = value as PublicationContext;
  const text = (v: unknown) => typeof v === "string" && v.trim().length > 0 && v.length <= 4000;
  if (c.schema_version !== 1 || typeof c.language_variety !== "string" || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(c.language_variety)
    || !text(c.readiness) || !text(c.exclusions) || !c.associations || typeof c.associations !== "object") return null;
  if (!Array.isArray(c.associations.capabilities) || c.associations.capabilities.length < 1 || c.associations.capabilities.length > 9
    || !Array.isArray(c.associations.tracks) || c.associations.tracks.length > 14) return null;
  for (const list of [c.associations.capabilities, c.associations.tracks]) {
    if (list.some(item => !item || typeof item.code !== "string" || !/^[a-z_]{1,60}$/.test(item.code) || !text(item.rationale))
      || new Set(list.map(item => item.code)).size !== list.length) return null;
  }
  if (c.associations.capabilities.some(item => item.emphasis !== "primary" && item.emphasis !== "supporting")) return null;
  return c;
}
