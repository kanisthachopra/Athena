"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AcceptInviteState = { error: string | null };

export async function acceptInvitation(
  _previous: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return { error: "This invitation link is invalid." };
  }
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect(`/auth/login?next=${encodeURIComponent(`/join?token=${token}`)}`);
  const { error } = await supabase.rpc("accept_family_invitation", { p_token: token });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect("/family");
}
