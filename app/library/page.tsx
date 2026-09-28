import { replaceActivity } from "@/app/library/actions";
import { AppHeader } from "@/components/app-header";
import { SaveActivityForm } from "@/components/save-activity-form";
import { requireFamilyContext } from "@/lib/family-context";
import { ArrowRight, BookOpen, Check, Clock3, Heart, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

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
  setup_minutes: number;
};

type Child = { id: string; nickname: string; birth_year: number; birth_month: number };
const domainNames: Record<string, string> = { language: "Language", movement: "Movement", sensory: "Sensory", maths: "Early maths", creative: "Creative", life_skills: "Life skills", nature: "Nature" };

function ageInMonths(child: Child) {
  const now = new Date();
  return Math.max(0, (now.getFullYear() - child.birth_year) * 12 + now.getMonth() + 1 - child.birth_month);
}

function libraryUrl({ replace, domain, saved }: { replace?: string; domain?: string; saved?: boolean }) {
  const query = new URLSearchParams();
  if (replace) query.set("replace", replace);
  if (domain) query.set("domain", domain);
  if (saved) query.set("saved", "1");
  return query.size ? `/library?${query}` : "/library";
}

export const metadata = { title: "Activity library" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ domain?: string; replace?: string; saved?: string }> }) {
  const { domain, replace, saved } = await searchParams;
  const savedOnly = saved === "1";
  const { supabase, family, activeChild, membership } = await requireFamilyContext();
  const child = activeChild as Child;
  const months = ageInMonths(child);
  const { data: preference } = await supabase.from("family_preferences").select("screen_policy,weekday_minutes,weekend_minutes").eq("family_id", membership.family_id).maybeSingle();
  const timeCeiling = Math.max(preference?.weekday_minutes ?? 15, preference?.weekend_minutes ?? 15);

  let query = supabase.from("activity_templates").select("id,title,domain,duration_minutes,summary,why_it_matters,safety_note,materials,embedded_learning,setup_minutes").lte("min_age_months", months).gte("max_age_months", months).lte("duration_minutes", timeCeiling).eq("reviewed", true).neq("review_status", "retired").order("domain").order("title");
  if (preference?.screen_policy !== "no_preference") query = query.neq("screen_requirement", "required");
  if (domain && domainNames[domain]) query = query.eq("domain", domain);
  const [{ data }, { data: replacementTarget }, { data: savedRows }] = await Promise.all([
    query,
    replace && membership.role !== "viewer" ? supabase.from("activity_instances").select("id,plan_id,personalized_title,status").eq("id", replace).eq("child_id", child.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("saved_activities").select("template_id").eq("child_id", child.id),
  ]);
  const savedIds = new Set((savedRows ?? []).map((item) => item.template_id));
  const replacementMode = replacementTarget?.status === "planned" ? replacementTarget : null;
  let templates = (data ?? []) as Template[];
  if (savedOnly) templates = templates.filter((template) => savedIds.has(template.id));
  if (replacementMode) {
    const { data: plannedTemplates } = await supabase.from("activity_instances").select("template_id").eq("plan_id", replacementMode.plan_id);
    const usedTemplateIds = new Set((plannedTemplates ?? []).map((item) => item.template_id));
    templates = templates.filter((template) => !usedTemplateIds.has(template.id));
  }
  const returnTo = libraryUrl({ replace, domain: domainNames[domain ?? ""] ? domain : undefined, saved: savedOnly });

  return (
    <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
        <p className="eyebrow"><BookOpen size={15} /> Activity ideas</p>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Ideas that fit {child.nickname} now.</h1><p className="mt-4 max-w-2xl leading-7 text-ink/55">Age-, time-, and screen-eligible options for the moments when you want another idea. This is a support shelf, not the centre of MIRA.</p></div>{savedIds.size > 0 && <Link href={libraryUrl({ replace, saved: true })} className="button-ghost gap-2"><Heart size={16} fill="currentColor" className="text-[#a9503b]" /> {savedIds.size} saved</Link>}</div>

        {replacementMode && <div className="mt-7 flex flex-col justify-between gap-4 rounded-2xl bg-[#e8dcc6] p-5 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">Choosing a replacement for</p><p className="mt-1 font-serif text-xl font-semibold">{replacementMode.personalized_title}</p></div><Link href="/week" className="button-ghost">Cancel</Link></div>}

        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filter activities">
          <Link href={libraryUrl({ replace })} className={`rounded-full px-4 py-2 text-sm font-semibold ${!domain && !savedOnly ? "bg-ink text-white" : "bg-paper text-ink/60"}`}>All</Link>
          <Link href={libraryUrl({ replace, saved: true })} className={`rounded-full px-4 py-2 text-sm font-semibold ${savedOnly ? "bg-ink text-white" : "bg-paper text-ink/60 hover:bg-[#ece6d8]"}`}><Heart className="mr-1 inline" size={14} /> Saved</Link>
          {Object.entries(domainNames).map(([value, label]) => <Link key={value} href={libraryUrl({ replace, domain: value, saved: savedOnly })} className={`rounded-full px-4 py-2 text-sm font-semibold ${domain === value ? "bg-ink text-white" : "bg-paper text-ink/60 hover:bg-[#ece6d8]"}`}>{label}</Link>)}
        </nav>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => <article key={template.id} className="flex flex-col rounded-[1.75rem] border border-black/5 bg-paper p-6 shadow-[0_14px_40px_rgba(55,62,53,.05)]">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8efe3] px-2.5 py-1 text-xs font-semibold text-[#52634e]">{domainNames[template.domain] ?? template.domain}</span><span className="flex items-center gap-1 text-xs text-ink/40"><Clock3 size={13} /> {template.duration_minutes} min · {template.setup_minutes} min setup</span>{template.embedded_learning && <span className="flex items-center gap-1 text-xs font-semibold text-[#80613f]"><Check size={13} /> Everyday moment</span>}</div>
            <Link href={`/library/${template.id}`} className="group"><h2 className="mt-5 font-serif text-2xl font-semibold group-hover:underline">{template.title}</h2></Link><p className="mt-3 leading-7 text-ink/60">{template.summary}</p>
            <div className="mt-5 rounded-xl bg-[#f3eee3] p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-ink/40">Why it matters</p><p className="mt-2 text-sm leading-6 text-ink/60">{template.why_it_matters}</p></div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink/45"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#52634e]" />{template.safety_note}</p>
            <p className="mt-3 text-xs text-ink/40">Materials: {template.materials.join(", ") || "Nothing special"}</p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-6"><Link href={`/library/${template.id}`} className="button-ghost px-3">Open guide <ArrowRight size={15} /></Link>{membership.role !== "viewer" && <SaveActivityForm templateId={template.id} saved={savedIds.has(template.id)} returnTo={returnTo} />}</div>
            {replacementMode && <form action={replaceActivity} className="mt-3"><input type="hidden" name="instanceId" value={replacementMode.id} /><input type="hidden" name="templateId" value={template.id} /><button className="button-primary w-full" type="submit"><RefreshCw size={16} /> Use this instead <ArrowRight size={16} /></button></form>}
          </article>)}
        </section>
        {templates.length === 0 && <div className="mt-8 rounded-2xl bg-paper p-6 text-sm leading-6 text-ink/55">{savedOnly ? `No saved ideas match this view yet. Save activities for ${child.nickname}, then return here whenever you need inspiration.` : "No unused alternatives match this filter. Try another learning area or return to the full library."}</div>}
      </div>
    </main>
  );
}
