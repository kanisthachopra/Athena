import { AppHeader } from "@/components/app-header";
import { LearningProfileForm } from "@/components/learning-profile-form";
import { requireFamilyContext } from "@/lib/family-context";

export const metadata = { title: "Family learning profile" };

type CaregiverProfile = {
  display_name: string;
  relationship: string | null;
  caregiver_languages: { language_code: string }[] | null;
};

export default async function SetupPage() {
  const { supabase, membership, family, activeChild: child } = await requireFamilyContext();
  const [preferenceResult, aspirationResult, languageResult, caregiverResult] = await Promise.all([
    supabase.from("family_preferences").select("screen_policy,structure_level,weekday_minutes,weekend_minutes,prefer_embedded_learning").eq("family_id", membership.family_id).maybeSingle(),
    supabase.from("aspirations").select("title").eq("child_id", child.id).order("created_at"),
    supabase.from("child_language_goals").select("language_code").eq("child_id", child.id).order("created_at"),
    supabase.from("caregivers").select("display_name,relationship,caregiver_languages(language_code)").eq("family_id", membership.family_id).order("created_at").limit(1).maybeSingle(),
  ]);
  if (preferenceResult.error) throw new Error(preferenceResult.error.message);
  if (aspirationResult.error) throw new Error(aspirationResult.error.message);
  if (languageResult.error) throw new Error(languageResult.error.message);
  if (caregiverResult.error) throw new Error(caregiverResult.error.message);

  const preference = preferenceResult.data;
  const caregiver = caregiverResult.data as unknown as CaregiverProfile | null;
  const initial = {
    ...preference,
    aspirations: (aspirationResult.data ?? []).map((item) => item.title),
    languageGoals: (languageResult.data ?? []).map((item) => item.language_code),
    caregiverName: caregiver?.display_name ?? "",
    relationship: caregiver?.relationship ?? "",
    caregiverLanguages: (caregiver?.caregiver_languages ?? []).map((item) => item.language_code),
  };

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-4xl px-5 py-10 lg:px-10 lg:py-14">
        <p className="eyebrow">Family learning profile</p>
        <h1 className="mt-3 max-w-2xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Shape a week that feels like your family.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-ink/60">A few grounded choices help MIRA select suitable activities before any personalisation happens.</p>
        <div className="mt-10">
          {membership.role === "viewer" ? (
            <section className="soft-card">
              <p className="eyebrow">View-only family profile</p>
              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <div><dt className="text-xs font-bold uppercase tracking-[.12em] text-ink/40">Screen approach</dt><dd className="mt-2 capitalize text-ink/70">{preference?.screen_policy?.replaceAll("_", " ") ?? "Not set"}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-[.12em] text-ink/40">Weekly rhythm</dt><dd className="mt-2 capitalize text-ink/70">{preference?.structure_level ?? "Not set"}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-[.12em] text-ink/40">Weekday time</dt><dd className="mt-2 text-ink/70">{preference?.weekday_minutes ?? "—"} minutes</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-[.12em] text-ink/40">Weekend time</dt><dd className="mt-2 text-ink/70">{preference?.weekend_minutes ?? "—"} minutes</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-[.12em] text-ink/40">Hopes for {child.nickname}</dt><dd className="mt-2 text-ink/70">{initial.aspirations.join(", ") || "Not set"}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-[.12em] text-ink/40">Language goals</dt><dd className="mt-2 text-ink/70">{initial.languageGoals.join(", ") || "Not set"}</dd></div>
              </dl>
              <p className="mt-6 rounded-xl bg-sage/15 p-4 text-sm leading-6 text-[#52634e]">Viewer access keeps this profile read-only. An owner or caregiver can update it.</p>
            </section>
          ) : (
            <LearningProfileForm childName={child.nickname} initial={initial} configured={Boolean(preference)} />
          )}
        </div>
      </div>
    </main>
  );
}
