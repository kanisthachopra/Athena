"use server";

import { requireFamilyContext } from "@/lib/family-context";
import { loadFamilyCalendar } from "@/lib/family-calendar";
import { birthContextError, isProfileVersion } from "@/lib/child-profile";
import { creationFailure, isCreationId, type CreationState } from "@/lib/profile-creation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AddChildState = CreationState;
export type InviteState = { error: string | null; invitePath: string | null };
export type ProfileState = { error: string | null; success: string | null };
export type ChildProfileState = ProfileState & { updatedAt: string | null; refreshRequired: boolean };

export async function addChild(_previous: AddChildState, formData: FormData): Promise<AddChildState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const birthYear = Number(formData.get("birthYear"));
  const birthMonth = Number(formData.get("birthMonth"));
  const requestId = String(formData.get("requestId") ?? "");
  const failure = (error: string): CreationState => ({error,createdId:null,checkSaved:false});
  if (!isCreationId(requestId)) return failure("Reload this form before adding a child.");
  if (!nickname || nickname.length > 60) return failure("Enter a first name or nickname, up to 60 characters.");

  const { supabase, membership } = await requireFamilyContext();
  if (membership.role === "viewer") return failure("Caregiver access is required.");
  if (formData.get("familyId") !== membership.family_id) return failure("Your family context changed. Reload before adding a child.");
  let today: string;
  try { today = (await loadFamilyCalendar(supabase, membership.family_id)).today; }
  catch { return failure("Your family’s calendar could not be checked. Your details are still here; try again."); }
  const birthError = birthContextError(birthYear,birthMonth,today);
  if (birthError) return failure(birthError);
  const { data, error } = await supabase.rpc("add_child_to_family_checked", {
    p_request_id: requestId,
    p_family_id: membership.family_id,
    p_nickname: nickname,
    p_birth_year: birthYear,
    p_birth_month: birthMonth,
  });
  if (error || !isCreationId(data)) return creationFailure(error?.message);
  revalidatePath("/", "layout");
  return { error:null,createdId:data,checkSaved:false };
}

export async function switchChild(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/today");
  const { supabase } = await requireFamilyContext();
  const { error } = await supabase.rpc("set_active_child", { p_child_id: childId });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect(["/today", "/setup", "/family", "/week", "/library", "/insights"].includes(returnTo) ? returnTo : "/today");
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

export async function updateFamilyName(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName || displayName.length > 80) return { error: "Enter a family name between 1 and 80 characters.", success: null };
  const { supabase, membership } = await requireFamilyContext();
  if (membership.role !== "owner") return { error: "Only the family owner can rename the family.", success: null };
  const { error } = await supabase.rpc("update_family_name", { p_family_id: membership.family_id, p_display_name: displayName });
  if (error) return { error: error.message, success: null };
  revalidatePath("/", "layout");
  return { error: null, success: "Family name updated." };
}

export async function updateChildProfile(
  _previous: ChildProfileState,
  formData: FormData,
): Promise<ChildProfileState> {
  const failure = (error: string, refreshRequired = false): ChildProfileState => ({ error, success: null, updatedAt: null, refreshRequired });
  const childId = String(formData.get("childId") ?? "");
  const expectedUpdatedAt = String(formData.get("updatedAt") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const birthYear = Number(formData.get("birthYear"));
  const birthMonth = Number(formData.get("birthMonth"));
  if (!nickname || nickname.length > 60) return failure("Enter a first name or nickname, up to 60 characters.");
  if (!isProfileVersion(expectedUpdatedAt)) return failure("Reload the saved profile before making changes.", true);
  const { supabase, membership, children } = await requireFamilyContext();
  if (membership.role === "viewer") return failure("Caregiver access is required.");
  if (!children.some(child => child.id === childId)) return failure("This profile is no longer available to edit. Return to Family.", true);
  let today: string;
  try { today = (await loadFamilyCalendar(supabase, membership.family_id)).today; }
  catch { return failure("Your family’s calendar could not be checked. Your edits are still here; try saving again."); }
  const birthError = birthContextError(birthYear, birthMonth, today);
  if (birthError) return failure(birthError);
  const { data, error } = await supabase.rpc("update_child_profile_checked", {
    p_child_id: childId,
    p_expected_updated_at: expectedUpdatedAt,
    p_nickname: nickname,
    p_birth_year: birthYear,
    p_birth_month: birthMonth,
  });
  if (error?.message.includes("MIRA_STALE_CHILD_PROFILE")) return failure("This profile changed in another session. Open the saved profile to compare before editing again.", true);
  if (error?.message.includes("MIRA_FUTURE_BIRTH_MONTH")) return failure("The birth month is in the future. Check the month and year.");
  if (error?.message.includes("MIRA_INVALID_BIRTH_CONTEXT")) return failure("Check the birth month and year, then try again.");
  if (error || !data || typeof data.updatedAt !== "string" || !isProfileVersion(data.updatedAt)) return failure("The save could not be confirmed. Open the saved profile to check it before trying again.", true);
  revalidatePath("/", "layout");
  return { error: null, success: "Profile saved.", updatedAt: data.updatedAt, refreshRequired: false };
}

export async function archiveChildProfile(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { supabase, membership } = await requireFamilyContext();
  if (membership.role !== "owner") throw new Error("Only the family owner can archive a child profile.");
  const { error } = await supabase.rpc("archive_child_profile", { p_child_id: childId });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/family");
}

export async function restoreChildProfile(formData: FormData) {
  const childId = String(formData.get("childId") ?? "");
  const { supabase, membership } = await requireFamilyContext();
  if (membership.role !== "owner") throw new Error("Only the family owner can restore a child profile.");
  const { error } = await supabase.rpc("restore_child_profile", { p_child_id: childId });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect(`/family/child/${childId}`);
}
