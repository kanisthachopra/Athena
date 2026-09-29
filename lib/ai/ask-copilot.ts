import "server-only";

import { createStructuredCompletion } from "@/lib/ai/nebius";

export type CopilotAnswer = {
  answer: string;
  tryNext: string[];
  boundary: string;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string", minLength: 1, maxLength: 1200 },
    try_next: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 180 },
    },
    boundary: { type: "string", minLength: 1, maxLength: 280 },
  },
  required: ["answer", "try_next", "boundary"],
};

export async function askCopilot(args: { question: string; ageMonths: number; currentOpportunity: string | null }) {
  const completion = await createStructuredCompletion({
    schemaName: "mira_copilot_answer",
    schema,
    system: [
      "You are MIRA, a calm learning copilot for a caregiver of a child aged zero to three.",
      "Offer reflective, practical, low-pressure guidance grounded in responsive relationships, play, ordinary routines, and child autonomy.",
      "Never diagnose, screen development, assign ability, score a child, or claim a learning style.",
      "Do not invent research citations. Do not recommend buying products unless the caregiver explicitly asks.",
      "If the question involves health, safety, development concerns, or loss of previously acquired skills, clearly route the caregiver to an appropriate qualified professional.",
      "Do not claim to have changed MIRA's plan or profile. Keep the answer concise and specific.",
    ].join(" "),
    user: [
      `Child age: ${args.ageMonths} months.`,
      args.currentOpportunity ? `Today's optional opportunity: ${args.currentOpportunity}.` : "No opportunity is planned today.",
      `Caregiver question: ${args.question}`,
    ].join("\n"),
  });

  const value = completion.content as Record<string, unknown>;
  if (
    !value ||
    typeof value.answer !== "string" ||
    typeof value.boundary !== "string" ||
    !Array.isArray(value.try_next) ||
    value.try_next.some((item) => typeof item !== "string")
  ) throw new Error("The copilot answer did not match MIRA's schema.");

  return {
    answer: {
      answer: value.answer.trim(),
      tryNext: (value.try_next as string[]).map((item) => item.trim()).filter(Boolean).slice(0, 3),
      boundary: value.boundary.trim(),
    },
    model: completion.model,
    promptTokens: completion.promptTokens,
    completionTokens: completion.completionTokens,
    latencyMs: completion.latencyMs,
  };
}
