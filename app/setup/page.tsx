import { AppHeader } from "@/components/app-header";
import { LearningProfileForm } from "@/components/learning-profile-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Family learning profile" };

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");
  const { data: membership } = await supabase.from("family_members").select("family_id").limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");
  const [{ data: family }, { data: child }, { data: preference }] = await Promise.all([
    supabase.from("families").select("display_name").eq("id", membership.family_id).single(),
    supabase.from("children").select("nickname").eq("family_id", membership.family_id).limit(1).single(),
    supabase.from("family_preferences").select("screen_policy,structure_level,weekday_minutes,weekend_minutes,prefer_embedded_learning").eq("family_id", membership.family_id).maybeSingle(),
  ]);

  return (
    <main className="min-h-screen bg-cream text-ink">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-4xl px-5 py-10 lg:px-10 lg:py-14">
        <p className="eyebrow">Family learning profile</p>
        <h1 className="mt-3 max-w-2xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Shape a week that feels like your family.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-ink/60">A few grounded choices help MIRA select suitable activities before any personalisation happens.</p>
        <div className="mt-10"><LearningProfileForm childName={child?.nickname ?? "your child"} initial={preference} /></div>
      </div>
    </main>
  );
}
