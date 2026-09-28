import { AppHeader } from "@/components/app-header";
import { SaveActivityForm } from "@/components/save-activity-form";
import { requireFamilyContext } from "@/lib/family-context";
import { ArrowLeft, Clock3, Eye, Heart, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Template = {
  id: string;
  title: string;
  domain: string;
  duration_minutes: number;
  summary: string;
  instructions: string;
  conversation_prompt: string;
  look_for: string;
  why_it_matters: string;
  safety_note: string;
  materials: string[];
};

function ageInMonths(child: { birth_year: number; birth_month: number }) {
  const now = new Date();
  return Math.max(0, (now.getFullYear() - child.birth_year) * 12 + now.getMonth() + 1 - child.birth_month);
}

export default async function LibraryActivityPage({ params }: PageProps<"/library/[id]">) {
  const { id } = await params;
  const { supabase, membership, family, activeChild } = await requireFamilyContext();
  const months = ageInMonths(activeChild);
  const [{ data }, { data: savedRow }] = await Promise.all([
    supabase.from("activity_templates").select("id,title,domain,duration_minutes,summary,instructions,conversation_prompt,look_for,why_it_matters,safety_note,materials").eq("id", id).eq("reviewed", true).lte("min_age_months", months).gte("max_age_months", months).maybeSingle(),
    supabase.from("saved_activities").select("template_id").eq("child_id", activeChild.id).eq("template_id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const activity = data as Template;

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-5xl px-5 py-10 lg:px-10 lg:py-14">
        <Link href="/library" className="button-ghost -ml-4 gap-2"><ArrowLeft size={17} /> Back to the library</Link>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
          <article className="overflow-hidden rounded-[2rem] border border-black/5 bg-paper shadow-[0_20px_60px_rgba(55,62,53,.08)]">
            <div className="bg-[#e8dcc6] p-7 sm:p-10"><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold capitalize text-[#52634e]">{activity.domain.replace("_", " ")}</span><span className="flex items-center gap-1 text-xs text-ink/50"><Clock3 size={13} /> {activity.duration_minutes} minutes</span></div><h1 className="mt-7 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{activity.title}</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-ink/65">{activity.summary}</p></div>
            <div className="space-y-8 p-7 sm:p-10">
              <section><p className="eyebrow">How to begin</p><p className="mt-3 text-lg leading-8 text-ink/65">{activity.instructions}</p></section>
              <section className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-[#f3eee3] p-5"><MessageCircle size={19} className="text-[#a9503b]" /><p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-ink/40">Try saying</p><p className="mt-2 font-serif text-lg italic">{activity.conversation_prompt}</p></div><div className="rounded-2xl bg-[#eef3ea] p-5"><Eye size={19} className="text-[#52634e]" /><p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-ink/40">Look for</p><p className="mt-2 leading-6 text-ink/65">{activity.look_for}</p></div></section>
              <section><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">You&apos;ll need</p><p className="mt-2 text-ink/65">{activity.materials.join(", ") || "Nothing special"}</p></section>
              <p className="flex items-start gap-2 border-t border-black/5 pt-6 text-sm leading-6 text-ink/50"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#52634e]" />{activity.safety_note}</p>
            </div>
          </article>
          <aside className="space-y-5"><div className="soft-card"><Heart size={20} className="text-[#a9503b]" /><p className="eyebrow mt-5">Why it matters</p><p className="mt-3 leading-7 text-ink/60">{activity.why_it_matters}</p></div>{membership.role !== "viewer" && <div className="soft-card"><h2 className="font-serif text-2xl font-semibold">Keep this idea</h2><p className="mt-2 text-sm leading-6 text-ink/50">Save it to {activeChild.nickname}&apos;s library for an easy return later.</p><div className="mt-5"><SaveActivityForm templateId={activity.id} saved={Boolean(savedRow)} returnTo={`/library/${activity.id}`} /></div></div>}</aside>
        </div>
      </div>
    </main>
  );
}
