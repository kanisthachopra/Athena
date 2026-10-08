export const capabilityOptions = [
  ["relationships_attachment", "Relationships and attachment"],
  ["emotional_regulation", "Emotional regulation"],
  ["communication_language", "Communication and language"],
  ["physical_motor", "Physical and motor development"],
  ["cognition_problem_solving", "Cognition and problem-solving"],
  ["executive_function", "Executive function"],
  ["curiosity_play_creativity", "Curiosity, play, and creativity"],
  ["independence_practical", "Independence and practical capability"],
  ["social_participation", "Social participation"],
] as const;
export const trackOptions = [
  ["languages", "Languages"], ["literacy_literature", "Literacy and literature"],
  ["mathematics", "Mathematics"], ["science_nature", "Science and nature"],
  ["general_knowledge", "General knowledge"], ["history_culture", "History and culture"],
  ["geography", "Geography"], ["art_design", "Art and design"], ["music", "Music"],
  ["physical_pursuits", "Physical pursuits"], ["making_practical", "Making and practical life"],
  ["technology_computation", "Technology and computation"], ["ethics_philosophy", "Ethics and philosophy"],
  ["leadership_biographies", "Leadership and biographies"],
] as const;
export const directionHorizons = { now: "For now", future: "For later", paused: "Paused" };
export type LearningDirection = { horizon: keyof typeof directionHorizons; capabilities: string[]; tracks: string[] };
export type DirectionHope = { id: string; title: string; direction: LearningDirection | null };
export type DirectionsSnapshot = { childId: string; version: string; hopes: DirectionHope[] };
export const directionId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
export function parseLearningDirection(value: unknown): LearningDirection | null {
  if (!object(value) || Object.keys(value).sort().join() !== "capabilities,horizon,tracks"
    || typeof value.horizon !== "string" || !Object.hasOwn(directionHorizons, value.horizon)) return null;
  const validList = (v: unknown, options: readonly (readonly [string, string])[]): v is string[] => Array.isArray(v)
    && v.length <= options.length && new Set(v).size === v.length && v.every(code => options.some(([id]) => id === code));
  if (!validList(value.capabilities, capabilityOptions) || !validList(value.tracks, trackOptions)
    || (value.horizon === "now" && !value.capabilities.length && !value.tracks.length)) return null;
  return { horizon: value.horizon as LearningDirection["horizon"], capabilities: value.capabilities, tracks: value.tracks };
}
export function parseDirectionsSnapshot(value: unknown, childId: string): DirectionsSnapshot | null {
  if (!object(value) || value.childId !== childId || typeof value.version !== "string" || !/^[a-f0-9]{64}$/.test(value.version)
    || !Array.isArray(value.hopes) || value.hopes.length > 8) return null;
  const hopes: DirectionHope[] = [];
  for (const row of value.hopes) {
    if (!object(row) || !directionId(row.id) || hopes.some(item => item.id === row.id)
      || typeof row.title !== "string" || !row.title.trim() || row.title.length > 80) return null;
    const direction = row.direction === null ? null : parseLearningDirection(row.direction);
    if (row.direction !== null && !direction) return null;
    hopes.push({ id: row.id, title: row.title, direction });
  }
  return { childId, version: value.version, hopes };
}
export function directionLabels(direction: LearningDirection) {
  return [...capabilityOptions.filter(([code]) => direction.capabilities.includes(code)), ...trackOptions.filter(([code]) => direction.tracks.includes(code))].map(([, label]) => label);
}
