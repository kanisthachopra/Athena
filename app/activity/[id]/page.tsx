import { AppHeader } from "@/components/app-header";
import { FeedbackForm } from "@/components/feedback-form";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Clock3, Eye, Heart, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { skipActivity } from "../actions";

type Activity = {
  id: string;
  status: string;
  personalized_title: string;
  personalized_instructions: string;
  activity_templates: {
    domain: string;
    duration_minutes: number;
    conversation_prompt: string;
    look_for: string;
    why_it_matters: string;
    safety_note: string;
    materials: string[];
  } | null;
};

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");
  const { data: membership } = await supabase.from("family_members").select("family_id").limit(1).maybeSingle();
  if (!membership) redirect("/onboarding");
  const [{ data: family }, { data }] = await Promise.all([
    supabase.from("families").select("display_name").eq("id", membership.family_id).single(),
    supabase.from("activity_instances").select("id,status,personalized_title,personalized_instructions,activity_templates(domain,duration_minutes,conversation_prompt,look_for,why_it_matters,safety_note,materials)").eq("id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const activity = data as unknown as Activity;
  const template = activity.activity_templates;

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-5xl px-5 py-10 lg:px-10 lg:py-14">
        <Link href="/week" className="button-ghost -ml-4 gap-2"><ArrowLeft size={17} /> Back to the week</Link>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
          <article className="overflow-hidden rounded-[2rem] border border-black/5 bg-paper shadow-[0_20px_60px_rgba(55,62,53,.08)]">
            <div className="bg-[#e8dcc6] p-7 sm:p-10"><div className="flex items-center gap-3"><span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold capitalize text-[#52634e]">{template?.domain.replace("_", " ")}</span><span className="flex items-center gap-1 text-xs text-ink/50"><Clock3 size={13} /> {template?.duration_minutes} minutes</span></div><h1 className="mt-7 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{activity.personalized_title}</h1></div>
            <div className="space-y-8 p-7 sm:p-10">
              <section><p className="eyebrow">How to begin</p><p className="mt-3 text-lg leading-8 text-ink/65">{activity.personalized_instructions}</p></section>
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f3eee3] p-5"><MessageCircle size={19} className="text-[#a9503b]" /><p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-ink/40">Try saying</p><p className="mt-2 font-serif text-lg italic">{template?.conversation_prompt}</p></div>
                <div className="rounded-2xl bg-[#eef3ea] p-5"><Eye size={19} className="text-[#52634e]" /><p className="mt-4 text-xs font-bold uppercase tracking-[.14em] text-ink/40">Look for</p><p className="mt-2 leading-6 text-ink/65">{template?.look_for}</p></div>
              </section>
              <section><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/40">You&apos;ll need</p><p className="mt-2 text-ink/65">{template?.materials.join(", ") || "Nothing special"}</p></section>
              <p className="flex items-start gap-2 border-t border-black/5 pt-6 text-sm leading-6 text-ink/50"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#52634e]" />{template?.safety_note}</p>
            </div>
          </article>
          <aside className="space-y-5">
            <div className="soft-card"><Heart size={20} className="text-[#a9503b]" /><p className="eyebrow mt-5">Why it matters</p><p className="mt-3 leading-7 text-ink/60">{template?.why_it_matters}</p></div>
            <div className="soft-card"><h2 className="font-serif text-2xl font-semibold">What happened?</h2><p className="mt-2 text-sm leading-6 text-ink/50">Quick feedback helps the next plan fit better. No judgement, no scores.</p><div className="mt-6">{activity.status === "completed" ? <p className="rounded-xl bg-[#eef3ea] p-4 text-sm font-semibold text-[#52634e]">Feedback saved for this activity.</p> : activity.status === "skipped" ? <p className="rounded-xl bg-[#f3eee3] p-4 text-sm font-semibold text-[#80613f]">Skipped without penalty. Family life comes first.</p> : <FeedbackForm instanceId={activity.id} />}</div></div>
            {activity.status === "planned" && <div className="rounded-[1.75rem] border border-black/5 bg-paper p-6"><p className="text-sm leading-6 text-ink/50">Not the right fit today?</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/library?replace=${activity.id}`} className="button-ghost gap-2"><RefreshCw size={16} /> Choose another</Link><form action={skipActivity}><input type="hidden" name="instanceId" value={activity.id} /><button type="submit" className="button-ghost text-ink/50">Skip without penalty</button></form></div></div>}
          </aside>
        </div>
      </div>
    </main>
  );
}
