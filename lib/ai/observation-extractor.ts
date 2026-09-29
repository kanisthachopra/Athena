import "server-only";

import { createStructuredCompletion } from "@/lib/ai/nebius";

export const observationDomains = [
  "everyday",
  "language",
  "movement",
  "sensory",
  "maths",
  "creative",
  "life_skills",
  "nature",
] as const;

export type ObservationDomain = (typeof observationDomains)[number];

export type ObservationProposal = {
  title: string;
  domain: ObservationDomain;
  note: string;
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 100 },
    domain: { type: "string", enum: observationDomains },
    note: { type: "string", minLength: 1, maxLength: 1200 },
  },
  required: ["title", "domain", "note"],
};

function isProposal(value: unknown): value is ObservationProposal {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    candidate.title.trim().length > 0 &&
    candidate.title.trim().length <= 100 &&
    typeof candidate.note === "string" &&
    candidate.note.trim().length > 0 &&
    candidate.note.trim().length <= 1200 &&
    typeof candidate.domain === "string" &&
    observationDomains.includes(candidate.domain as ObservationDomain)
  );
}

export function deterministicObservationFallback(rawNote: string): ObservationProposal {
  const cleaned = rawNote.replace(/\s+/g, " ").trim();
  const firstSentence = cleaned.split(/[.!?]/)[0]?.trim() || "A moment worth remembering";
  const title = firstSentence.length <= 72 ? firstSentence : `${firstSentence.slice(0, 69).trim()}…`;
  return { title, domain: "everyday", note: cleaned };
}

export async function extractObservation(rawNote: string) {
  const completion = await createStructuredCompletion({
    schemaName: "mira_observation_proposal",
    schema,
    system: [
      "You help a caregiver turn their own note into a neutral, editable journal entry about a child aged zero to three.",
      "Describe only observable behaviour. Do not diagnose, assess development, assign ability, infer a learning style, or add facts.",
      "Keep the caregiver's meaning and warm voice. Avoid educational jargon.",
      "Choose one broad domain. When uncertain, choose everyday.",
      "The title should be concrete and human. The note should be one or two concise sentences.",
    ].join(" "),
    user: `Caregiver note:\n${rawNote}`,
  });

  if (!isProposal(completion.content)) throw new Error("The observation proposal did not match MIRA's schema.");

  return {
    proposal: {
      title: completion.content.title.trim(),
      domain: completion.content.domain,
      note: completion.content.note.trim(),
    },
    model: completion.model,
    promptTokens: completion.promptTokens,
    completionTokens: completion.completionTokens,
    latencyMs: completion.latencyMs,
  };
}
