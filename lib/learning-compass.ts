export const learningDomains = {
  language: {
    name: "Language & connection",
    shortName: "Language",
    description: "Sounds, gestures, conversation, stories, and shared meaning.",
    accent: "bg-[#dce4d6] text-[#52634e]",
  },
  movement: {
    name: "Movement & body",
    shortName: "Movement",
    description: "Coordination, body awareness, balance, and confident movement.",
    accent: "bg-[#d9e5e6] text-[#4e696c]",
  },
  sensory: {
    name: "Sensory discovery",
    shortName: "Sensory",
    description: "Touch, sound, sight, comparison, and comfortable exploration.",
    accent: "bg-[#eadff0] text-[#66516f]",
  },
  maths: {
    name: "Patterns & early maths",
    shortName: "Early maths",
    description: "Sorting, quantity, sequence, shape, space, and prediction.",
    accent: "bg-[#f2e4c7] text-[#80613f]",
  },
  creative: {
    name: "Creative expression",
    shortName: "Creative",
    description: "Imagination, imitation, mark-making, music, and open choices.",
    accent: "bg-[#f6d8cf] text-[#a9503b]",
  },
  life_skills: {
    name: "Everyday independence",
    shortName: "Life skills",
    description: "Participation, practical coordination, care, and family routines.",
    accent: "bg-[#ebe4d6] text-[#6d5c43]",
  },
  nature: {
    name: "Nature & inquiry",
    shortName: "Nature",
    description: "Noticing change, asking questions, testing ideas, and wonder.",
    accent: "bg-[#dfe9d7] text-[#4f6948]",
  },
  everyday: {
    name: "Everyday discoveries",
    shortName: "Everyday",
    description: "Learning that appeared naturally outside a planned invitation.",
    accent: "bg-[#eee7dc] text-[#6e6252]",
  },
} as const;

export type LearningDomain = keyof typeof learningDomains;

export type CompassEvidence = {
  domain: string;
  activity_signals: number;
  everyday_signals: number;
  high_interest: number;
  repeated_count: number;
  easy_count: number;
  stretch_count: number;
  signal_score: number;
  last_signal_at: string | null;
};

export type CompassState = "quiet" | "noticed" | "returning" | "strong";

export function isLearningDomain(value: string): value is LearningDomain {
  return value in learningDomains;
}

export function interpretCompassSignal(item: CompassEvidence) {
  const evidenceCount = Number(item.activity_signals) + Number(item.everyday_signals);
  const score = Number(item.signal_score);
  let state: CompassState = "quiet";

  if (evidenceCount > 0) state = "noticed";
  if (evidenceCount >= 2 || score >= 3) state = "returning";
  if (evidenceCount >= 4 && (Number(item.high_interest) + Number(item.repeated_count) >= 2 || score >= 8)) state = "strong";

  const label = {
    quiet: "Open to explore",
    noticed: "First signal",
    returning: "Returning interest",
    strong: "Strong current pull",
  }[state];

  let nextMove = "Offer one low-pressure invitation and simply notice the response.";
  if (Number(item.stretch_count) > Number(item.easy_count)) nextMove = "Keep the setup familiar and remove one demand next time.";
  else if (state === "strong" && Number(item.easy_count) > 0) nextMove = "Keep the familiar core and add one small, optional twist.";
  else if (Number(item.everyday_signals) > Number(item.activity_signals)) nextMove = "Bring this natural interest into one short planned invitation.";
  else if (state === "returning" || state === "strong") nextMove = "Repeat a familiar invitation and watch what changes.";
  else if (state === "noticed") nextMove = "Offer another gentle chance before drawing a conclusion.";

  return { evidenceCount, score, state, label, nextMove };
}
