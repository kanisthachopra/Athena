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
    answer: { type: "string", minLength: 1, maxLength: 800 },
    try_next: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: { type: "string", minLength: 1, maxLength: 180 },
    },
    boundary: { type: "string", minLength: 1, maxLength: 220 },
  },
  required: ["answer", "try_next", "boundary"],
};

export async function askCopilot(args: { question: string; ageMonths: number; currentOpportunity: string | null }) {
  const system = [
    "You are MIRA, a calm learning copilot for a caregiver of a child aged zero to three.",
    "Offer reflective, practical, low-pressure guidance grounded in responsive relationships, play, ordinary routines, and child autonomy.",
    "Never diagnose, screen development, assign ability, score a child, or claim a learning style.",
    "Do not invent research citations. Do not recommend buying products unless the caregiver explicitly asks.",
    "If the question involves health, safety, development concerns, or loss of previously acquired skills, clearly route the caregiver to an appropriate qualified professional.",
    "Do not claim to have changed MIRA's plan or profile.",
    "Write the answer as three to five complete sentences totaling roughly 50 to 80 words.",
    "Finish every sentence with punctuation. Prefer fewer complete ideas over extra coverage, and do not put headings or bullet points inside the answer.",
    "Put the most useful actions in one or two short try_next items. Keep the boundary to one brief sentence.",
  ].join(" ");
  const user = [
    `Child age: ${args.ageMonths} months.`,
    args.currentOpportunity ? `Today's optional opportunity: ${args.currentOpportunity}.` : "No opportunity is planned today.",
    `Caregiver question: ${args.question}`,
  ].join("\n");
  let completion = await createStructuredCompletion({
    schemaName: "mira_copilot_answer",
    schema,
    system,
    user,
    maxTokens: 500,
  });

  let answer = parseAnswer(completion.content);
  let promptTokens = completion.promptTokens;
  let completionTokens = completion.completionTokens;
  let latencyMs = completion.latencyMs;

  if (!isCompleteAndBounded(answer)) {
    completion = await createStructuredCompletion({
      schemaName: "mira_copilot_answer_retry",
      schema,
      system,
      user: `${user}\nRewrite from scratch. The previous draft was too long or ended incompletely. Return no more than five complete sentences and finish the final sentence.`,
      maxTokens: 500,
    });
    answer = parseAnswer(completion.content);
    promptTokens += completion.promptTokens;
    completionTokens += completion.completionTokens;
    latencyMs += completion.latencyMs;
  }

  if (!isCompleteAndBounded(answer)) {
    throw new Error("The copilot answer was incomplete or exceeded MIRA's response limits.");
  }

  return {
    answer,
    model: completion.model,
    promptTokens,
    completionTokens,
    latencyMs,
  };
}

function parseAnswer(content: unknown): CopilotAnswer {
  const value = content as Record<string, unknown>;
  if (
    !value ||
    typeof value.answer !== "string" ||
    typeof value.boundary !== "string" ||
    !Array.isArray(value.try_next) ||
    value.try_next.some((item) => typeof item !== "string")
  ) throw new Error("The copilot answer did not match MIRA's schema.");

  const answer = value.answer.trim();
  const tryNext = (value.try_next as string[]).map((item) => item.trim()).filter(Boolean);
  const boundary = value.boundary.trim();

  return {
    answer,
    tryNext,
    boundary,
  };
}

function isCompleteAndBounded(answer: CopilotAnswer) {
  const wordCount = answer.answer.split(/\s+/).filter(Boolean).length;
  const endsWithPunctuation = /[.!?]["'’”)]?$/.test(answer.answer);

  return Boolean(
    answer.answer &&
    answer.answer.length <= 800 &&
    wordCount <= 120 &&
    endsWithPunctuation &&
    answer.tryNext.length >= 1 &&
    answer.tryNext.length <= 2 &&
    answer.tryNext.every((item) => item.length > 0 && item.length <= 180) &&
    answer.boundary &&
    answer.boundary.length <= 220
  );
}
