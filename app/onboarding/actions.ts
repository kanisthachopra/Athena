"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type OnboardingState = { error: string | null };

export async function createFamilyAndChild(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const familyName = String(formData.get("familyName") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const birthYear = Number(formData.get("birthYear"));
  const birthMonth = Number(formData.get("birthMonth"));
  const currentYear = new Date().getFullYear();

  if (!familyName || familyName.length > 80) return { error: "Please enter a family name." };
  if (!nickname || nickname.length > 60) return { error: "Please enter your child’s first name or nickname." };
  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) return { error: "Please choose a birth month." };
  if (!Number.isInteger(birthYear) || birthYear < currentYear - 18 || birthYear > currentYear) return { error: "Please choose a valid birth year." };

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  if (authError || !authData?.claims?.sub) redirect("/auth/login");

  const { error } = await supabase.rpc("create_family_with_child", {
    p_display_name: familyName,
    p_child_nickname: nickname,
    p_birth_year: birthYear,
    p_birth_month: birthMonth,
  });

  if (error) return { error: error.message };
  redirect("/today");
}
