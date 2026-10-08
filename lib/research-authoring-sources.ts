import "server-only";
import { fingerprint } from "@/lib/research-bundle";
import type { ResearchReviewPackage } from "@/lib/research-review";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exact(value: unknown, keys: string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
const sourceKeys = ["id", "title", "publisher", "year", "url", "type", "location", "access", "summary", "limit", "rights"];
const identifier = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,99}$/.test(value);

// Sources inform final material/context review, never retroactively become model
// inputs or evidence of developmental efficacy. No network, approvals or writes.
export function addAuthoringSources(base: ResearchReviewPackage, input: unknown): ResearchReviewPackage {
  if (!exact(input, ["format", "version", "basePackageFingerprint", "sources", "bindings"])
    || input.format !== "mira-authoring-sources" || input.version !== 1
    || input.basePackageFingerprint !== fingerprint(base)
    || !Array.isArray(input.sources) || !input.sources.length || input.sources.length > 20
    || !Array.isArray(input.bindings) || !input.bindings.length || input.bindings.length > base.primitives.length
    || base.primitives.some(item => item.authoringSourceIds !== undefined)) throw new Error("Invalid authoring source supplement");
  const ids = new Set(base.sources.map(source => source.id));
  const added = new Set<string>();
  for (const source of input.sources) {
    if (!exact(source, sourceKeys) || !identifier(source.id) || ids.has(source.id)
      || !Number.isInteger(source.year) || Number(source.year) < 1900 || Number(source.year) > 2100
      || sourceKeys.filter(key => key !== "year").some(key => typeof source[key] !== "string" || !(source[key] as string).trim() || (source[key] as string).length > 4000)) throw new Error("Invalid supplemental source");
    const url = new URL(source.url as string);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) throw new Error("Invalid source URL");
    ids.add(source.id); added.add(source.id);
  }
  if (ids.size > 40) throw new Error("Too many sources");
  const bindings = new Map<string, string[]>(); const used = new Set<string>();
  for (const binding of input.bindings) {
    if (!exact(binding, ["primitiveId", "sourceIds"]) || !identifier(binding.primitiveId) || bindings.has(binding.primitiveId)
      || !base.primitives.some(item => item.primitive.id === binding.primitiveId && item.generation?.status === "unreviewed_ai_draft")
      || !Array.isArray(binding.sourceIds) || !binding.sourceIds.length || binding.sourceIds.length > 20
      || new Set(binding.sourceIds).size !== binding.sourceIds.length
      || binding.sourceIds.some(id => typeof id !== "string" || !added.has(id))) throw new Error("Invalid source binding");
    bindings.set(binding.primitiveId, [...binding.sourceIds] as string[]);
    for (const id of binding.sourceIds) used.add(id as string);
  }
  if (used.size !== added.size) throw new Error("Unbound source");
  const result = structuredClone(base);
  result.sources.push(...structuredClone(input.sources) as typeof result.sources);
  result.primitives = result.primitives.map(item => bindings.has(item.primitive.id)
    ? { ...item, authoringSourceIds: bindings.get(item.primitive.id)! } : item);
  return result;
}
