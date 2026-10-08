export type ReplacementState = { error: string | null; refreshRequired: boolean };
export const initialReplacementState: ReplacementState = { error: null, refreshRequired: false };

export function parseReplacement(formData: FormData) {
  const instanceId = String(formData.get("instanceId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const revisionText = String(formData.get("revision") ?? "");
  const revision = Number(revisionText);
  const encoded = String(formData.get("templateSnapshot") ?? "");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(instanceId) || !uuid.test(templateId) || !/^[1-9][0-9]*$/.test(revisionText)
    || !Number.isSafeInteger(revision) || revision > 2147483647 || !encoded || encoded.length > 100_000) return null;
  try {
    const templateSnapshot: unknown = JSON.parse(encoded);
    if (!templateSnapshot || typeof templateSnapshot !== "object" || Array.isArray(templateSnapshot)
      || !("id" in templateSnapshot) || templateSnapshot.id !== templateId) return null;
    return { instanceId, templateId, revision, templateSnapshot };
  } catch { return null; }
}

export function replacementFailure(message: string | undefined, code?: string): ReplacementState | null {
  if (message?.includes("MIRA_STALE_ACTIVITY")) return { error: "This activity changed while you were choosing. Refresh the alternatives before replacing it.", refreshRequired: true };
  if (message?.includes("MIRA_STALE_REPLACEMENT")) return { error: "These instructions changed while you were reading. Refresh and review the updated preparation before choosing it.", refreshRequired: true };
  if (message?.includes("MIRA_ACTIVITY_HAS_OBSERVATION") || message?.includes("MIRA_ACTIVITY_NOT_REPLACEABLE")) return { error: "This activity can no longer be replaced. Refresh to see its current state; recorded observations are kept.", refreshRequired: true };
  if (message?.includes("MIRA_REPLACEMENT_UNCHANGED")) return { error: "This idea is already in this slot. Refresh to see your current week.", refreshRequired: true };
  if (code === "PGRST202" || code === "42703") return { error: "Replacement needs the latest database update. Your plan has not changed.", refreshRequired: true };
  return null;
}
