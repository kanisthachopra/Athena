import { AppHeader } from "@/components/app-header";
import { requireFamilyContext } from "@/lib/family-context";
import { savedActivityContent } from "@/lib/activity-content";
import { loadFamilyCalendar, calendarLabel, shortCalendarDate } from "@/lib/family-calendar";
import Link from "next/link";
type Opportunity = { id:string; template_id:string|null; content_snapshot?:unknown; status:string; personalized_title:string; personalized_instructions:string; selection_reason:string; opportunity_type:string; estimated_parent_minutes:number };
export const metadata = { title:"Today" };
export default async function TodayPage() {
 const {supabase,membership,family,activeChild:child}=await requireFamilyContext();
 const calendar = await loadFamilyCalendar(supabase, membership.family_id);
 const date = calendar.today;
 const {data:preference,error:preferenceError}=await supabase.from("family_preferences").select("family_id").eq("family_id",membership.family_id).maybeSingle();
 if(preferenceError) throw new Error("Your family preferences could not be loaded.");
 const {data,error}=await supabase.from("activity_instances").select("*").eq("child_id",child.id).eq("scheduled_date",date).maybeSingle();
 if(error) throw new Error("Today's plan could not be loaded.");
 const opportunity=data as unknown as Opportunity|null;
 const content=opportunity ? savedActivityContent(opportunity.content_snapshot,opportunity.template_id) : null;
 const template=content?.template;
 const useCheck=opportunity?.status==="planned" && template ? await supabase.rpc("get_activity_use_check",{p_instance_id:opportunity.id}) : null;
 const eligible=Boolean(useCheck && !useCheck.error && useCheck.data===null);
 return <main className="min-h-screen"><AppHeader familyName={family?.display_name??"Your family"} /><div className="workspace-page">
  <div className="workspace-toolbar mt-0"><div><h1 className="workspace-heading">Today with {child.nickname}</h1><p className="workspace-description">Choose what fits today. Leave the rest.</p></div><Link href="/week" className="button-ghost">See your week</Link></div>
  <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
   <section className="spatial-day"><h2 className="spatial-day-heading">Available today<span>{shortCalendarDate(date)}</span></h2>
    {!preference && !opportunity ? <div className="spatial-item"><h3>Start with your family</h3><p>Share your hopes, languages and available time before creating a plan.</p>{membership.role!=="viewer" && <Link href="/setup" className="button-primary mt-5">Set up learning preferences</Link>}</div>
    : opportunity?.opportunity_type==="open" ? <div className="spatial-empty"><h3 className="mb-3 text-2xl text-foreground">An open day</h3><p>{opportunity.personalized_instructions}</p></div>
    : opportunity ? <article className="spatial-item"><div className="spatial-meta"><span>{opportunity.status==="completed"?"Tried":opportunity.status==="skipped"?"Not offered":eligible?"Optional experience":"Saved record"}</span>{template && <span>{template.duration_minutes} min · {opportunity.estimated_parent_minutes} min setup</span>}</div><h3>{opportunity.personalized_title}</h3>{template && <p>{template.summary}</p>}{!eligible && opportunity.status==="planned" && <p className="mt-4">{content?.state==="legacy" ? "The original template version was not saved. This record is not a currently verified recommendation." : "This activity is not currently cleared to offer. Open the saved record for details, or choose another idea."}</p>}{eligible && template && <p className="mt-4"><strong>Bring:</strong> {template.materials.join(", ") || "See the preparation notes"}</p>}<details className="mt-3"><summary>Why this was selected</summary><p className="mt-2">{opportunity.selection_reason}</p></details><div className="spatial-actions"><Link href={`/activity/${opportunity.id}`} className="button-primary">{eligible ? "Read preparation" : "View saved record"}</Link>{membership.role!=="viewer" && opportunity.status==="planned" && <Link href={`/library?replace=${opportunity.id}`} className="button-ghost">Choose something else</Link>}</div>{eligible && template && <p className="mt-5 border-t pt-4"><strong>Before you begin:</strong> {template.safety_note}</p>}</article>
    : <div className="spatial-empty"><h3 className="mb-3 text-2xl text-foreground">Nothing planned</h3><p>Ordinary routines, rest and play do not need to become assignments.</p><Link href="/week" className="button-ghost mt-4">Browse your week</Link></div>}
    {eligible && template?.look_for && <div className="mt-6 border-t pt-5"><h3 className="text-base font-semibold">If you feel like noticing</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{template.look_for}</p><p className="mt-2 text-sm text-muted-foreground">No need to test or record a response.</p></div>}
    <p className="mt-5 text-sm leading-6 text-muted-foreground"><Link href="/settings#family-calendar" className="underline underline-offset-4">{calendarLabel(calendar)}</Link></p>
   </section>
   <aside><section className="settings-row pt-0"><h2>Something happened naturally?</h2><p>You can keep a note without adding an activity to the plan.</p><Link href="/insights#notice-a-moment" className="button-ghost mt-4">Notice a moment</Link></section><section className="settings-row"><h2>Make room for your day</h2><p>Move an experience, choose another, or stop when your child wants to stop.</p><div className="spatial-actions"><Link href="/week" className="button-ghost">Adjust the week</Link><Link href="/guide" className="button-ghost">Talk it through</Link></div></section><Link href="/memory" className="button-ghost mt-5">What MIRA understands</Link></aside>
  </div>
 </div></main>;
}
