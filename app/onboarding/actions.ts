"use server";

import { createClient } from "@/lib/supabase/server";
import { birthContextError } from "@/lib/child-profile";
import { creationFailure, isCreationId, type CreationState } from "@/lib/profile-creation";
import { revalidatePath } from "next/cache";

export type OnboardingState = CreationState;

export async function createFamilyAndChild(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const familyName = String(formData.get("familyName") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const birthYear = Number(formData.get("birthYear"));
  const birthMonth = Number(formData.get("birthMonth"));
  const requestId = String(formData.get("requestId") ?? "");
  const failure = (error: string): CreationState => ({error,createdId:null,checkSaved:false});

  if (!isCreationId(requestId)) return failure("Reload this form before creating your family.");
  if (!familyName || familyName.length > 80) return failure("Enter a family name, up to 80 characters.");
  if (!nickname || nickname.length > 60) return failure("Enter a first name or nickname, up to 60 characters.");
  const birthError = birthContextError(birthYear, birthMonth, new Date().toISOString().slice(0,10));
  if (birthError) return failure(birthError);

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  if (authError) return failure("Your session could not be checked. Your details are still here; try again.");
  if (!authData?.claims?.sub || formData.get("userId") !== authData.claims.sub) return failure("Your signed-in account changed or expired. Sign in again and reload this form.");

  const { data, error } = await supabase.rpc("create_family_with_child_checked", {
    p_request_id: requestId,
    p_display_name: familyName,
    p_child_nickname: nickname,
    p_birth_year: birthYear,
    p_birth_month: birthMonth,
  });

  if (error || !isCreationId(data)) return creationFailure(error?.message);
  revalidatePath("/", "layout");
  return { error:null,createdId:data,checkSaved:false };
}
