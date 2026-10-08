import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FamilyChild = {
  id: string;
  nickname: string;
  birth_year: number;
  birth_month: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export async function requireFamilyContext() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  if (authError) throw new Error("Your session could not be checked. Please try again.");
  const userId = authData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership, error: membershipError } = await supabase.from("family_members").select("family_id,role").eq("user_id", userId).maybeSingle();
  if (membershipError) throw new Error("Your family access could not be loaded. Please try again.");
  if (!membership) redirect("/onboarding");

  const [familyResult, childResult, settingsResult] = await Promise.all([
    supabase.from("families").select("id,display_name").eq("id", membership.family_id).single(),
    supabase.from("children").select("id,nickname,birth_year,birth_month,created_at,updated_at,archived_at").eq("family_id", membership.family_id).order("created_at"),
    supabase.from("user_settings").select("active_child_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (familyResult.error || childResult.error || settingsResult.error || !familyResult.data) {
    throw new Error("Your family could not be loaded. Nothing has been changed. Please try again.");
  }
  const family = familyResult.data;
  const childData = childResult.data;
  const settings = settingsResult.data;
  const allChildren = (childData ?? []) as FamilyChild[];
  const children = allChildren.filter((child) => !child.archived_at);
  const archivedChildren = allChildren.filter((child) => Boolean(child.archived_at));
  const activeChild = children.find((child) => child.id === settings?.active_child_id) ?? children[0];
  if (!activeChild) redirect("/onboarding");

  return { supabase, userId, membership, family, children, archivedChildren, activeChild };
}
