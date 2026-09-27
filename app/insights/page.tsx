import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";
import { BarChart3, Heart, History, Repeat2, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type Observation = {
  id: string;
  engagement: "low" | "medium" | "high";
  challenge_level: "easy" | "just_right" | "stretch";
  repeated: boolean;
  parent_note: string | null;
  created_at: string;
  activity_instances: {
    personalized_title: string;
    activity_templates: { domain: string } | null;
  } | null;
};

const domainNames: Record<string, string> = { language: "Language", movement: "Movement", sensory: "Sensory", maths: "Early maths", creative: "Creative", life_skills: "Life skills", nature: "Nature" };

export const metadata = { title: "Insights" };

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");
  const { data: membership } = await supabase.from("family_members").select("family_id").limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");

  const [{ data: family }, { data: child }] = await Promise.all([
    supabase.from("families").select("display_name").eq("id", membership.family_id).single(),
    supabase.from("children").select("id,nickname").eq("family_id", membership.family_id).limit(1).maybeSingle(),
  ]);
  if (!child) redirect("/onboarding");

  const { data } = await supabase
    .from("observations")
    .select("id,engagement,challenge_level,repeated,parent_note,created_at,activity_instances(personalized_title,activity_templates(domain))")
    .eq("child_id", child.id)
    .order("created_at", { ascending: false });
  const observations = (data ?? []) as unknown as Observation[];

  const highEngagement = observations.filter((item) => item.engagement === "high").length;
  const repeated = observations.filter((item) => item.repeated).length;
  const domainScores = observations.reduce<Record<string, number>>((scores, item) => {
    const domain = item.activity_instances?.activity_templates?.domain;
    if (domain) scores[domain] = (scores[domain] ?? 0) + (item.engagement === "high" ? 3 : item.engagement === "medium" ? 1 : -1) + (item.repeated ? 2 : 0);
    return scores;
  }, {});
  const strongestSignal = Object.entries(domainScores).sort((a, b) => b[1] - a[1])[0];
  const strongestDomain = strongestSignal && strongestSignal[1] > 0 ? strongestSignal[0] : undefined;

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-10 lg:py-14">
        <p className="eyebrow"><BarChart3 size={15} /> Learning, noticed</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Small signals from {child.nickname}&apos;s days.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-ink/55">These are caregiver observations, not grades or developmental assessments. MIRA uses them gently to shape variety and relevance.</p>

        {observations.length === 0 ? (
          <section className="mt-10 rounded-[2rem] border border-black/5 bg-paper p-8 shadow-[0_20px_60px_rgba(55,62,53,.06)] sm:p-10">
            <Sparkles size={24} className="text-[#a9503b]" /><h2 className="mt-6 font-serif text-3xl font-semibold">The story starts with one observation.</h2><p className="mt-3 max-w-xl leading-7 text-ink/60">After trying an activity, share what held attention and how the challenge felt. Patterns will appear here without turning childhood into a scorecard.</p><Link href="/today" className="button-primary mt-7">See today&apos;s invitation</Link>
          </section>
        ) : (
          <>
            <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="soft-card"><History size={20} className="text-[#52634e]" /><p className="mt-5 text-3xl font-semibold">{observations.length}</p><p className="mt-1 text-sm text-ink/50">activities noticed</p></div>
              <div className="soft-card"><Heart size={20} className="text-[#a9503b]" /><p className="mt-5 text-3xl font-semibold">{highEngagement}</p><p className="mt-1 text-sm text-ink/50">high-interest moments</p></div>
              <div className="soft-card"><Repeat2 size={20} className="text-[#4e696c]" /><p className="mt-5 text-3xl font-semibold">{repeated}</p><p className="mt-1 text-sm text-ink/50">chose to repeat</p></div>
              <div className="soft-card"><Sparkles size={20} className="text-[#80613f]" /><p className="mt-5 font-serif text-xl font-semibold">{strongestDomain ? domainNames[strongestDomain] ?? strongestDomain : "Still emerging"}</p><p className="mt-1 text-sm text-ink/50">strongest current signal</p></div>
            </section>

            <section className="mt-8 rounded-[2rem] border border-black/5 bg-paper p-7 shadow-[0_20px_60px_rgba(55,62,53,.06)] sm:p-9">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Observation journal</p><h2 className="mt-3 font-serif text-3xl font-semibold">What you have noticed</h2></div><Link href="/week" className="button-ghost">View the plan</Link></div>
              <div className="mt-7 divide-y divide-black/5">
                {observations.map((item) => {
                  const domain = item.activity_instances?.activity_templates?.domain;
                  return <article key={item.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8efe3] px-2.5 py-1 text-xs font-semibold text-[#52634e]">{domain ? domainNames[domain] ?? domain : "Activity"}</span><span className="text-xs text-ink/40">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(item.created_at))}</span></div><h3 className="mt-3 font-serif text-xl font-semibold">{item.activity_instances?.personalized_title}</h3>{item.parent_note && <p className="mt-2 text-sm leading-6 text-ink/60">“{item.parent_note}”</p>}</div><div className="text-sm text-ink/50 sm:text-right"><p className="capitalize">{item.engagement} engagement</p><p className="mt-1">{item.challenge_level === "just_right" ? "Challenge felt just right" : item.challenge_level === "easy" ? "Challenge felt easy" : "A stretching challenge"}</p>{item.repeated && <p className="mt-1 font-semibold text-[#52634e]">Repeated by choice</p>}</div></article>;
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
