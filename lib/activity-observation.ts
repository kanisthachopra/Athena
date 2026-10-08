export type ActivityObservation = {
  engagement: "low" | "medium" | "high" | null;
  challenge_level: "easy" | "just_right" | "stretch" | null;
  repeated: boolean | null;
  parent_note: string | null;
  revision: number;
};
export const engagementLabels = { low: "Little interest", medium: "Some interest", high: "Very engaged" };
export const challengeLabels = { easy: "Felt easy", just_right: "Just right", stretch: "A stretch" };
export function parseActivityObservation(form: FormData) {
  const instanceId = String(form.get("instanceId") ?? "");
  const templateId = String(form.get("templateId") ?? "");
  const revision = String(form.get("revision") ?? "");
  const engagement = String(form.get("engagement") ?? "");
  const challenge = String(form.get("challenge") ?? "");
  const repeated = String(form.get("repeated") ?? "");
  const note = String(form.get("note") ?? "");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(instanceId) || (templateId && !uuid.test(templateId)) || !/^\d+$/.test(revision) || !Number.isSafeInteger(Number(revision))) throw new Error("Reload this activity before saving.");
  if (!["", "low", "medium", "high"].includes(engagement) || !["", "easy", "just_right", "stretch"].includes(challenge) || !["", "yes", "no"].includes(repeated)) throw new Error("Choose one of the available answers, or leave it unrecorded.");
  if (note.length > 1000) throw new Error("Keep your note to 1,000 characters or fewer.");
  if (!engagement && !challenge && !repeated && !note.trim()) throw new Error("Add a note or one observation before saving. You can also leave without recording anything.");
  return { instanceId, p_instance_id: instanceId, p_expected_template_id: templateId || null, p_expected_revision: Number(revision), p_engagement: engagement || null, p_challenge_level: challenge || null, p_repeated: repeated === "" ? null : repeated === "yes", p_parent_note: note.trim() ? note : null };
}
