import { AppHeader } from "@/components/app-header";
import { requireFamilyContext } from "@/lib/family-context";
import { ArrowRight, BookOpen, Check, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { replaceActivity } from "./actions";

type Template = {
  id: string;
  title: string;
  domain: string;
  duration_minutes: number;
  summary: string;
  why_it_matters: string;
  safety_note: string;
  materials: string[];
  embedded_learning: boolean;
};

type Child = { id: string; nickname: string; birth_year: number; birth_month: number };
const domainNames: Record<string, string> = { language: "Language", movement: "Movement", sensory: "Sensory", maths: "Early maths", creative: "Creative", life_skills: "Life skills", nature: "Nature" };

function ageInMonths(child: Child) {
  const now = new Date();
  return Math.max(0, (now.getFullYear() - child.birth_year) * 12 + now.getMonth() + 1 - child.birth_month);
}

export const metadata = { title: "Activity library" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ domain?: string; replace?: string }> }) {
  const { domain, replace } = await searchParams;
  const { supabase, family, activeChild } = await requireFamilyContext();
  const child = activeChild as Child;
  const months = ageInMonths(child);

  let query = supabase.from("activity_templates").select("id,title,domain,duration_minutes,summary,why_it_matters,safety_note,materials,embedded_learning").lte("min_age_months", months).gte("max_age_months", months).eq("reviewed", true).order("domain").order("title");
  if (domain && domainNames[domain]) query = query.eq("domain", domain);
  const [{ data }, { data: replacementTarget }] = await Promise.all([
    query,
    replace ? supabase.from("activity_instances").select("id,plan_id,personalized_title,status").eq("id", replace).eq("child_id", child.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const replacementMode = replacementTarget?.status === "planned" ? replacementTarget : null;
  let templates = (data ?? []) as Template[];
  if (replacementMode) {
    const { data: plannedTemplates } = await supabase.from("activity_instances").select("template_id").eq("plan_id", replacementMode.plan_id);
    const usedTemplateIds = new Set((plannedTemplates ?? []).map((item) => item.template_id));
    templates = templates.filter((template) => !usedTemplateIds.has(template.id));
  }

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
        <p className="eyebrow"><BookOpen size={15} /> Reviewed activity library</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Ideas that fit {child.nickname} now.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-ink/55">Every invitation is age-filtered, screen-light, and reviewed for a clear purpose and safety note.</p>

        {replacementMode && <div className="mt-7 flex flex-col justify-between gap-4 rounded-2xl bg-[#e8dcc6] p-5 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">Choosing a replacement for</p><p className="mt-1 font-serif text-xl font-semibold">{replacementMode.personalized_title}</p></div><Link href="/week" className="button-ghost">Cancel</Link></div>}

        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filter activities by domain">
          <Link href={replace ? `/library?replace=${replace}` : "/library"} className={`rounded-full px-4 py-2 text-sm font-semibold ${!domain ? "bg-ink text-white" : "bg-paper text-ink/60"}`}>All</Link>
          {Object.entries(domainNames).map(([value, label]) => <Link key={value} href={`/library?${new URLSearchParams({ ...(replace ? { replace } : {}), domain: value })}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${domain === value ? "bg-ink text-white" : "bg-paper text-ink/60 hover:bg-[#ece6d8]"}`}>{label}</Link>)}
        </nav>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => <article key={template.id} className="flex flex-col rounded-[1.75rem] border border-black/5 bg-paper p-6 shadow-[0_14px_40px_rgba(55,62,53,.05)]">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8efe3] px-2.5 py-1 text-xs font-semibold text-[#52634e]">{domainNames[template.domain] ?? template.domain}</span><span className="flex items-center gap-1 text-xs text-ink/40"><Clock3 size={13} /> {template.duration_minutes} min</span>{template.embedded_learning && <span className="flex items-center gap-1 text-xs font-semibold text-[#80613f]"><Check size={13} /> Everyday moment</span>}</div>
            <h2 className="mt-5 font-serif text-2xl font-semibold">{template.title}</h2><p className="mt-3 leading-7 text-ink/60">{template.summary}</p>
            <div className="mt-5 rounded-xl bg-[#f3eee3] p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-ink/40">Why it matters</p><p className="mt-2 text-sm leading-6 text-ink/60">{template.why_it_matters}</p></div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink/45"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#52634e]" />{template.safety_note}</p>
            <p className="mt-3 text-xs text-ink/40">Materials: {template.materials.join(", ") || "Nothing special"}</p>
            {replacementMode && <form action={replaceActivity} className="mt-auto pt-6"><input type="hidden" name="instanceId" value={replacementMode.id} /><input type="hidden" name="templateId" value={template.id} /><button className="button-primary w-full" type="submit"><RefreshCw size={16} /> Use this instead <ArrowRight size={16} /></button></form>}
          </article>)}
        </section>
        {templates.length === 0 && <div className="mt-8 rounded-2xl bg-paper p-6 text-sm leading-6 text-ink/55">No unused alternatives match this filter. Try another learning area or return to the full library.</div>}
      </div>
    </main>
  );
}
