import "server-only";

const API_URL = "https://api.tokenfactory.nebius.com/v1/chat/completions";
const DEFAULT_MODEL = "Qwen/Qwen3-30B-A3B-Instruct-2507";
const REQUEST_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_TOKENS = 420;
const MIN_MAX_TOKENS = 64;
const MAX_MAX_TOKENS = 1_200;

type JsonSchema = Record<string, unknown>;

type NebiusUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type NebiusResponse = {
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: { content?: string };
  }>;
  usage?: NebiusUsage;
};

export type StructuredCompletion = {
  content: unknown;
  model: string;
  promptTokens: number;
  completionTokens: number;
  usageKnown: boolean;
  latencyMs: number;
};

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "timeout" | "provider_error" | "invalid_response",
  ) {
    super(message);
  }
}

async function requestOnce(args: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  schemaName: string;
  schema: JsonSchema;
  maxTokens: number;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(45_000, Math.max(REQUEST_TIMEOUT_MS, args.timeoutMs ?? REQUEST_TIMEOUT_MS)));

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: args.model,
        temperature: 0.1,
        max_tokens: args.maxTokens,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: args.schemaName,
            strict: true,
            schema: args.schema,
          },
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      return { retryable, error: new AiProviderError(`Nebius returned ${response.status}.`, "provider_error") } as const;
    }

    return { retryable: false, data: (await response.json()) as NebiusResponse } as const;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { retryable: false, error: new AiProviderError("Nebius timed out.", "timeout") } as const;
    }
    return { retryable: true, error: new AiProviderError("Nebius could not be reached.", "provider_error") } as const;
  } finally {
    clearTimeout(timer);
  }
}

export async function createStructuredCompletion(args: {
  system: string;
  user: string;
  schemaName: string;
  schema: JsonSchema;
  maxTokens?: number;
  allowRetry?: boolean;
  timeoutMs?: number;
  beforeRequest?: () => Promise<void>;
}): Promise<StructuredCompletion> {
  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) throw new AiProviderError("Nebius is not configured.", "not_configured");

  const model = process.env.NEBIUS_MODEL || DEFAULT_MODEL;
  const maxTokens = Math.min(
    MAX_MAX_TOKENS,
    Math.max(MIN_MAX_TOKENS, args.maxTokens ?? DEFAULT_MAX_TOKENS),
  );
  const startedAt = Date.now();
  await args.beforeRequest?.();
  let result = await requestOnce({ ...args, apiKey, model, maxTokens });
  if (result.error && result.retryable && args.allowRetry !== false) {
    await args.beforeRequest?.();
    result = await requestOnce({ ...args, apiKey, model, maxTokens });
  }
  if (result.error) throw result.error;

  const choice = result.data.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new AiProviderError("Nebius stopped before completing the response.", "invalid_response");
  }

  const content = choice?.message?.content;
  if (!content) throw new AiProviderError("Nebius returned no structured content.", "invalid_response");

  try {
    return {
      content: JSON.parse(content),
      model: result.data.model || model,
      promptTokens: result.data.usage?.prompt_tokens ?? 0,
      completionTokens: result.data.usage?.completion_tokens ?? 0,
      usageKnown: Number.isSafeInteger(result.data.usage?.prompt_tokens)
        && Number.isSafeInteger(result.data.usage?.completion_tokens)
        && (result.data.usage?.prompt_tokens ?? -1) >= 0
        && (result.data.usage?.completion_tokens ?? -1) >= 0,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    throw new AiProviderError("Nebius returned malformed JSON.", "invalid_response");
  }
}
