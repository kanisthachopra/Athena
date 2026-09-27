"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AddChildState = { error: string | null };
export type InviteState = { error: string | null; invitePath: string | null };

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

export async function createFamilyInvitation(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", invitePath: null };
  }
  if (role !== "caregiver" && role !== "viewer") {
    return { error: "Choose caregiver or viewer access.", invitePath: null };
  }

  const { supabase, membership } = await requireFamilyContext();
  if (membership.role !== "owner") {
    return { error: "Only the family owner can invite members.", invitePath: null };
  }
  const { data: token, error } = await supabase.rpc("create_family_invitation", {
    p_family_id: membership.family_id,
    p_email: email,
    p_role: role,
  });
  if (error || !token) return { error: error?.message ?? "Could not create the invitation.", invitePath: null };
  revalidatePath("/family");
  return { error: null, invitePath: `/join?token=${token}` };
}

export async function revokeFamilyInvitation(formData: FormData) {
  const invitationId = String(formData.get("invitationId") ?? "");
  const { supabase, membership } = await requireFamilyContext();
  if (membership.role !== "owner") throw new Error("Only the family owner can revoke invitations.");
  const { error } = await supabase.rpc("revoke_family_invitation", { p_invitation_id: invitationId });
  if (error) throw new Error(error.message);
  revalidatePath("/family");
  redirect("/family");
}

export async function removeFamilyMember(formData: FormData) {
  const memberId = String(formData.get("memberId") ?? "");
  const { supabase, membership } = await requireFamilyContext();
  if (membership.role !== "owner") throw new Error("Only the family owner can remove members.");
  const { error } = await supabase.rpc("remove_family_member", {
    p_family_id: membership.family_id,
    p_user_id: memberId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/family");
}
