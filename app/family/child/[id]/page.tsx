import { archiveChildProfile, restoreChildProfile } from "@/app/family/actions";
import { AppHeader } from "@/components/app-header";
import { ChildProfileForm } from "@/components/child-profile-form";
import { requireFamilyContext } from "@/lib/family-context";
import { loadFamilyCalendar, calendarLabel } from "@/lib/family-calendar";
import { birthMonthLabel } from "@/lib/child-profile";
import { Archive, ArrowLeft, Download, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Child profile" };

export default async function ChildProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, family, membership, children, archivedChildren } = await requireFamilyContext();
  const child = [...children, ...archivedChildren].find((item) => item.id === id);
  if (!child) notFound();
  const archived = Boolean(child.archived_at);
  const birthDate = birthMonthLabel(child.birth_year, child.birth_month);
  const canEdit = membership.role !== "viewer" && !archived;
  const calendar = canEdit ? await loadFamilyCalendar(supabase, membership.family_id).catch(() => null) : null;

  return <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
    <AppHeader familyName={family?.display_name ?? "Your family"} />
    <div className="mx-auto max-w-4xl px-5 py-10 lg:px-10 lg:py-14">
      <Link href="/family" className="button-ghost -ml-4 gap-2"><ArrowLeft size={17} /> Back to family</Link>
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="min-w-0"><h1 className="font-serif text-4xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-5xl"><bdi>{child.nickname}</bdi></h1><p className="mt-3 text-ink/70">Born {birthDate}{archived ? " · Archived profile" : ""}</p></div><a className="button-ghost shrink-0 gap-2 self-start sm:self-auto" href={`/family/export?child=${child.id}`}><Download size={17} /> Download learning record</a></div>

      <section id="profile-details" className="profile-section mt-10 scroll-mt-28">
        <h2 className="font-serif text-3xl font-semibold">Profile details</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">A nickname is enough; no legal name or exact birthday is required. Age is one part of checking an activity, alongside its review and your family’s circumstances.</p>
        {!canEdit ? <dl className="mt-7 grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-ink/70">Name in MIRA</dt><dd className="mt-2 text-lg font-semibold">{child.nickname}</dd></div><div><dt className="text-sm text-ink/70">Birth month</dt><dd className="mt-2 text-lg font-semibold">{birthDate}</dd></div></dl> : calendar ? <><ChildProfileForm key={child.id} child={child} today={calendar.today} /><p className="mt-5 text-sm text-ink/70">{calendarLabel(calendar)} · <Link className="underline underline-offset-4" href="/settings#family-calendar">Settings</Link></p></> : <p className="mt-6 text-sm leading-6" role="alert">Your family’s calendar could not be loaded, so profile editing is temporarily unavailable. Your saved details are unchanged. <a className="underline underline-offset-4" href={`/family/child/${child.id}`}>Reload profile</a></p>}
      </section>

      {membership.role === "owner" && <section className="mt-8 rounded-xl border border-black/5 bg-paper p-7">
        {archived ? <><h2 className="mt-3 font-serif text-2xl font-semibold">Restore this learning journey</h2><p className="mt-2 text-sm leading-6 text-ink/55">Restoring makes the child available in Today, Week, Library, and Insights again. Nothing was deleted.</p><form action={restoreChildProfile} className="mt-5"><input type="hidden" name="childId" value={child.id} /><button className="button-primary" type="submit"><RotateCcw size={16} /> Restore profile</button></form></>
        : <><h2 className="mt-3 font-serif text-2xl font-semibold">Archive this learning journey</h2><p className="mt-2 text-sm leading-6 text-ink/55">Archiving hides the profile from everyday planning while preserving plans, activities, and observations. You can restore it later.</p>{children.length > 1 ? <form action={archiveChildProfile} className="mt-5"><input type="hidden" name="childId" value={child.id} /><button className="button-ghost gap-2 bg-black/[.035] text-red-700" type="submit"><Archive size={16} /> Archive profile</button></form> : <p className="mt-5 rounded-xl bg-[#f1eaf3] p-4 text-sm text-[#795d49]">A family must keep at least one active child profile, so this profile cannot be archived yet.</p>}</>}
      </section>}
    </div>
  </main>;
}
