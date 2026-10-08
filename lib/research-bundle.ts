import "server-only";
import { createHash } from "node:crypto";
import { catalog, COMPILER_VERSION, draftPrompt, validateCatalog, validateDrafts } from "@/lib/research-content";

export const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const foundation = { catalog, COMPILER_VERSION, draftPrompt, validateCatalog, validateDrafts };
export type ResearchBatch = Omit<typeof foundation, "catalog"> & {
  catalog: Omit<typeof catalog, "scope"> & { scope?: string };
};

// Fail closed on missing, stale or changed provenance. This is integrity checking,
// not a substitute for human source, applicability, safety and rights review.
export function validateResearchBundle(input: unknown, options: { allowPartial?: boolean } = {}, source: ResearchBatch = foundation) {
  const { catalog, COMPILER_VERSION, draftPrompt, validateCatalog, validateDrafts } = source;
  validateCatalog();
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid research bundle");
  const bundle = input as Record<string, unknown>;
  if (bundle.compilerVersion !== COMPILER_VERSION || bundle.catalogVersion !== catalog.version || bundle.catalogHash !== fingerprint(catalog) || bundle.familyDataSent !== false) throw new Error("Stale or invalid research provenance");
  if (!Array.isArray(bundle.stacks) || bundle.stacks.length > catalog.primitives.length || (!options.allowPartial && bundle.stacks.length !== catalog.primitives.length)) throw new Error("Incomplete research bundle");
  const ids = new Set<string>();
  for (const stack of bundle.stacks) {
    if (!stack || typeof stack !== "object") throw new Error("Invalid stack");
    const primitive = catalog.primitives.find(p => p.id === stack.primitiveId);
    if (!primitive || ids.has(stack.primitiveId) || !["unreviewed_ai_draft", "rejected_ai_draft"].includes(stack.status) || stack.schedulable !== false || stack.promptHash !== fingerprint(draftPrompt(primitive))) throw new Error("Invalid draft provenance");
    ids.add(stack.primitiveId);
    if (typeof stack.model !== "string" || !stack.model.trim() || typeof stack.generatedAt !== "string" || !Number.isFinite(Date.parse(stack.generatedAt))) throw new Error("Missing generation record");
    for (const metric of ["promptTokens", "completionTokens", "latencyMs"]) if (!Number.isFinite(stack[metric]) || stack[metric] < 0) throw new Error("Invalid generation metric");
    if (stack.status === "rejected_ai_draft") {
      if (!Array.isArray(stack.drafts) || stack.drafts.length || typeof stack.validationIssue !== "string" || !stack.validationIssue || !stack.rejectedOutput) throw new Error("Invalid rejected draft record");
      let failedValidation = false;
      try { validateDrafts(stack.rejectedOutput, primitive); } catch { failedValidation = true; }
      if (!failedValidation) throw new Error("Rejection record does not reproduce");
    } else {
      if (stack.validationIssue !== null || stack.rejectedOutput !== null) throw new Error("Unexpected rejection metadata");
      validateDrafts({ drafts: stack.drafts }, primitive);
    }
  }
}
