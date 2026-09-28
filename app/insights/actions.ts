"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { revalidatePath } from "next/cache";

export type LearningMomentState = { error: string | null; success: string | null };

const domains = new Set(["everyday", "language", "movement", "sensory", "maths", "creative", "life_skills", "nature"]);

export async function saveLearningMoment(
  _previousState: LearningMomentState,
  formData: FormData,
): Promise<LearningMomentState> {
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const domain = String(formData.get("domain") ?? "everyday");
  const occurredOn = String(formData.get("occurredOn") ?? "");

  if (!title || title.length > 100) return { error: "Add a short title of up to 100 characters.", success: null };
  if (!note || note.length > 1200) return { error: "Describe the moment in up to 1,200 characters.", success: null };
  if (!domains.has(domain)) return { error: "Choose a valid learning area.", success: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Choose when this happened.", success: null };

  const { supabase, membership, activeChild } = await requireFamilyContext();
  if (membership.role === "viewer") return { error: "Caregiver access is required.", success: null };

  const { error } = await supabase.rpc("create_learning_moment", {
    p_child_id: activeChild.id,
    p_occurred_on: occurredOn,
    p_domain: domain,
    p_title: title,
    p_note: note,
  });
  if (error) return { error: error.message, success: null };

  revalidatePath("/insights");
  return { error: null, success: "Moment added to the journal." };
}

export async function deleteLearningMoment(formData: FormData) {
  const momentId = String(formData.get("momentId") ?? "");
  if (!momentId) throw new Error("Learning moment not found.");

  const { supabase, membership } = await requireFamilyContext();
  if (membership.role === "viewer") throw new Error("Caregiver access is required.");
  const { error } = await supabase.rpc("delete_learning_moment", { p_moment_id: momentId });
  if (error) throw new Error(error.message);
  revalidatePath("/insights");
}
