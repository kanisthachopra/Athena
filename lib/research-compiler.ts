import "server-only";
import { catalog, COMPILER_VERSION, draftPrompt, draftSchema, validateDrafts, type ActivityDraft } from "@/lib/research-content";
import { fingerprint, validateResearchBundle } from "@/lib/research-bundle";
import type { StructuredCompletion } from "@/lib/ai/nebius";

type Generator = (args: { system: string; user: string; schemaName: string; schema: Record<string, unknown>; maxTokens: number }) => Promise<StructuredCompletion>;
type Stack = {
  primitiveId: string; status: string; schedulable: false; generatedAt: string;
  model: string; promptHash: string; promptTokens: number; completionTokens: number;
  latencyMs: number; drafts: ActivityDraft[]; validationIssue: string | null; rejectedOutput: unknown;
};
type Failure = { primitiveId: string; code: string };
export type ResearchCheckpoint = {
  compilerVersion: string; catalogVersion: string; catalogHash: string; familyDataSent: false;
  stacks: Stack[]; failures: Failure[]; pendingPrimitiveIds: string[];
  compilationComplete: boolean; publicationAllowed: false;
};
const errorCodes = new Set(["timeout", "not_configured", "provider_error", "invalid_response"]);

// A checkpoint records completed calls, including rejected output. Completion is
// not content acceptance. This code has no database, publication or family access.
export async function compileResearchCheckpoint(args: {
  generate: Generator; previous?: unknown; maxCalls?: number;
  onCheckpoint?: (checkpoint: ResearchCheckpoint) => Promise<void>;
  now?: () => string;
}): Promise<ResearchCheckpoint> {
  const maxCalls = args.maxCalls ?? 1;
  if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > catalog.primitives.length) throw new Error("Invalid compilation budget");
  const stacks: Stack[] = [];
  if (args.previous !== undefined) {
    validateResearchBundle(args.previous, { allowPartial: true });
    stacks.push(...structuredClone((args.previous as { stacks: Stack[] }).stacks));
  }
  const failures: Failure[] = [];
  function checkpoint(): ResearchCheckpoint {
    const pendingPrimitiveIds = catalog.primitives.filter(p => !stacks.some(s => s.primitiveId === p.id)).map(p => p.id);
    return structuredClone({
      compilerVersion: COMPILER_VERSION, catalogVersion: catalog.version, catalogHash: fingerprint(catalog),
      familyDataSent: false, stacks, failures, pendingPrimitiveIds,
      compilationComplete: pendingPrimitiveIds.length === 0, publicationAllowed: false,
    });
  }
  const missing = catalog.primitives.filter(p => !stacks.some(s => s.primitiveId === p.id)).slice(0, maxCalls);
  for (const primitive of missing) {
    const prompt = draftPrompt(primitive);
    try {
      const result = await args.generate({ ...prompt, schemaName: "mira_editorial_drafts", schema: draftSchema(primitive), maxTokens: 1000 });
      let drafts: ActivityDraft[] = [];
      let validationIssue: string | null = null;
      try { drafts = validateDrafts(result.content, primitive); }
      catch { validationIssue = "Draft failed the local content contract; editorial review required."; }
      const stack: Stack = {
        primitiveId: primitive.id, status: validationIssue ? "rejected_ai_draft" : "unreviewed_ai_draft",
        schedulable: false, generatedAt: args.now?.() ?? new Date().toISOString(), model: result.model,
        promptHash: fingerprint(prompt), promptTokens: result.promptTokens, completionTokens: result.completionTokens,
        latencyMs: result.latencyMs, drafts, validationIssue, rejectedOutput: validationIssue ? result.content : null,
      };
      // Invalid usage/provenance cannot enter the reusable checkpoint.
      validateResearchBundle({ ...checkpoint(), stacks: [...stacks, stack] }, { allowPartial: true });
      stacks.push(stack);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      failures.push({ primitiveId: primitive.id, code: errorCodes.has(code) ? code : "validation_error" });
    }
    await args.onCheckpoint?.(checkpoint());
    // Stop on provider/configuration failure rather than spending on further calls.
    if (failures.length) break;
  }
  return checkpoint();
}
