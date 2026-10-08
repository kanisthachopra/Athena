"use server";
import { revalidatePath } from "next/cache";
import { requireFamilyContext } from "@/lib/family-context";
import { directionId, parseDirectionsSnapshot, parseLearningDirection, type DirectionsSnapshot } from "@/lib/learning-directions";
export type DirectionState = { status: "idle" | "saved" | "invalid" | "stale" | "error"; message?: string; snapshot?: DirectionsSnapshot };
export async function saveLearningDirection(_previous: DirectionState, data: FormData): Promise<DirectionState> {
  try {
    const { supabase, membership, activeChild } = await requireFamilyContext();
    if (membership.role === "viewer" || data.get("childId") !== activeChild.id) return { status: "stale", message: "Your access or selected child changed. Keep your draft and reload Family before saving." };
    const hopeId = data.get("hopeId"), version = data.get("version"), operation = data.get("operation");
    if (!directionId(hopeId) || typeof version !== "string" || !/^[a-f0-9]{64}$/.test(version) || !["save", "clear"].includes(String(operation))) return { status: "stale", message: "This form is out of date. Compare the saved choices before reloading." };
    let direction = null;
    if (operation === "save") {
      const raw = data.get("direction");
      if (typeof raw !== "string" || raw.length > 5000) return { status: "invalid", message: "Choose when this hope matters and the opportunities you want it to guide." };
      try { direction = parseLearningDirection(JSON.parse(raw)); } catch { /* Never interpret a broken payload as clear. */ }
      if (!direction) return { status: "invalid", message: "Choose when this hope matters. For a current direction, choose at least one opportunity." };
    }
    const result = await supabase.rpc("save_aspiration_direction", { p_child_id: activeChild.id, p_aspiration_id: hopeId, p_expected_version: version, p_direction: direction });
    if (result.error) return { status: result.error.message === "MIRA_DIRECTION_STALE" ? "stale" : "error", message: result.error.message === "MIRA_DIRECTION_STALE"
      ? "These hopes or choices changed after you opened the form. Nothing was overwritten. Your draft is still here; compare the saved choices before reloading."
      : "We could not confirm this save. Your draft is still here. Check Family before trying again." };
    const snapshot = parseDirectionsSnapshot(result.data, activeChild.id);
    if (!snapshot) return { status: "error", message: "The save could not be confirmed. Keep your draft and check the saved choices in Family." };
    try { for (const path of ["/family", "/memory", "/setup", "/week"]) revalidatePath(path); } catch { /* A confirmed save remains confirmed. */ }
    return { status: "saved", snapshot, message: operation === "clear"
      ? "Planning link removed. The hope and saved weeks are unchanged."
      : direction?.horizon === "now"
        ? "Direction saved for new weeks. Saved weeks are unchanged."
        : "Direction saved in your profile. It will not influence new weeks while it is for later or paused." };
  } catch { return { status: "error", message: "The connection or session could not be checked. Your draft is still here. Check Family before trying again." }; }
}
