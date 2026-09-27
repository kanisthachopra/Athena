"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AddChildState = { error: string | null };

export async function addChild(_previous: AddChildState, formData: FormData): Promise<AddChildState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const birthYear = Number(formData.get("birthYear"));
  const birthMonth = Number(formData.get("birthMonth"));
  const currentYear = new Date().getFullYear();
  if (!nickname || nickname.length > 60) return { error: "Enter a first name or nickname." };
  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) return { error: "Choose a valid birth month." };
  if (!Number.isInteger(birthYear) || birthYear < currentYear - 18 || birthYear > currentYear) return { error: "Choose a valid birth year." };

  const { supabase, membership } = await requireFamilyContext();
  const { error } = await supabase.rpc("add_child_to_family", {
    p_family_id: membership.family_id,
    p_nickname: nickname,
    p_birth_year: birthYear,
    p_birth_month: birthMonth,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/setup");
}

export async function switchChild(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/today");
  const { supabase } = await requireFamilyContext();
  const { error } = await supabase.rpc("set_active_child", { p_child_id: childId });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect(returnTo.startsWith("/") ? returnTo : "/today");
}
