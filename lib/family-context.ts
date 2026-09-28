import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FamilyChild = {
  id: string;
  nickname: string;
  birth_year: number;
  birth_month: number;
  created_at: string;
  archived_at: string | null;
};

export async function requireFamilyContext() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: membership } = await supabase.from("family_members").select("family_id,role").limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");

  const [{ data: family }, { data: childData }, { data: settings }] = await Promise.all([
    supabase.from("families").select("id,display_name").eq("id", membership.family_id).single(),
    supabase.from("children").select("id,nickname,birth_year,birth_month,created_at,archived_at").eq("family_id", membership.family_id).order("created_at"),
    supabase.from("user_settings").select("active_child_id").eq("user_id", userId).maybeSingle(),
  ]);
  const allChildren = (childData ?? []) as FamilyChild[];
  const children = allChildren.filter((child) => !child.archived_at);
  const archivedChildren = allChildren.filter((child) => Boolean(child.archived_at));
  const activeChild = children.find((child) => child.id === settings?.active_child_id) ?? children[0];
  if (!activeChild) redirect("/onboarding");

  return { supabase, userId, membership, family, children, archivedChildren, activeChild };
}
