export const places = [
  { name: "Language House", short: "Language", topic: "A little conversation, a lot of connection.", detail: "Discover resources about listening, sharing stories and exploring languages together.", color: "#297e78", position: [24, 34] },
  { name: "Discovery Workshop", short: "Discovery", topic: "Make room for a little wonder.", detail: "Explore resources about curiosity, noticing patterns and discovering the world together.", color: "#987226", position: [75, 33] },
  { name: "Movement Garden", short: "Movement", topic: "Room to move. Room to explore.", detail: "Find guidance for parents about movement and playful exploration appropriate to their child.", color: "#527050", position: [19, 69] },
  { name: "Connection Cottage", short: "Connection", topic: "Small moments of being together.", detail: "Explore parent resources about relationships, feelings and responsive care.", color: "#6b7250", position: [78, 77] },
  { name: "Creative Studio", short: "Creativity", topic: "Follow their imagination.", detail: "Browse ideas from existing resources about music, creativity and open-ended play.", color: "#9a6835", position: [49, 53] },
] as const;

export type DataMode = "demo" | "worst" | "empty" | "one";
export type ViewProps = { mode: DataMode };
export const modes: DataMode[] = ["demo", "worst", "empty", "one"];
export const modeNames = ["Demo data", "Worst case", "Empty", "One"];
export function greeting(mode: DataMode) { return mode === "worst" ? "Welcome, Aleksandra Wiśniewska-Kowalczyk" : "A little discovery, together."; }
