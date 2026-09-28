import { archiveChildProfile, restoreChildProfile } from "@/app/family/actions";
import { AppHeader } from "@/components/app-header";
import { ChildProfileForm } from "@/components/child-profile-form";
import { requireFamilyContext } from "@/lib/family-context";
import { Archive, ArrowLeft, Baby, Download, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Child profile" };

export default async function ChildProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { family, membership, children, archivedChildren } = await requireFamilyContext();
  const child = [...children, ...archivedChildren].find((item) => item.id === id);
  if (!child) notFound();
  const archived = Boolean(child.archived_at);
  const birthDate = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(child.birth_year, child.birth_month - 1, 1));

  return <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
    <AppHeader familyName={family?.display_name ?? "Your family"} />
    <div className="mx-auto max-w-4xl px-5 py-10 lg:px-10 lg:py-14">
      <Link href="/family" className="button-ghost -ml-4 gap-2"><ArrowLeft size={17} /> Back to family</Link>
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow"><Baby size={15} /> {archived ? "Archived profile" : "Child profile"}</p><h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{child.nickname}</h1><p className="mt-3 text-ink/55">Born {birthDate}</p></div><a className="button-ghost gap-2 self-start sm:self-auto" href={`/family/export?child=${child.id}`}><Download size={17} /> Download learning record</a></div>

      <section className="profile-section mt-10">
        <h2 className="font-serif text-3xl font-semibold">Profile details</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">MIRA uses age only to keep activities suitable. A nickname is enough; no legal name or exact birthday is required.</p>
        {membership.role === "viewer" || archived ? <dl className="mt-7 grid gap-5 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-[.12em] text-ink/40">Name in MIRA</dt><dd className="mt-2 text-lg font-semibold">{child.nickname}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[.12em] text-ink/40">Birth month</dt><dd className="mt-2 text-lg font-semibold">{birthDate}</dd></div></dl> : <ChildProfileForm child={child} />}
      </section>

      {membership.role === "owner" && <section className="mt-8 rounded-[1.75rem] border border-black/5 bg-paper p-7">
        <p className="eyebrow"><ShieldCheck size={15} /> Data control</p>
        {archived ? <><h2 className="mt-3 font-serif text-2xl font-semibold">Restore this learning journey</h2><p className="mt-2 text-sm leading-6 text-ink/55">Restoring makes the child available in Today, Week, Library, and Insights again. Nothing was deleted.</p><form action={restoreChildProfile} className="mt-5"><input type="hidden" name="childId" value={child.id} /><button className="button-primary" type="submit"><RotateCcw size={16} /> Restore profile</button></form></>
        : <><h2 className="mt-3 font-serif text-2xl font-semibold">Archive this learning journey</h2><p className="mt-2 text-sm leading-6 text-ink/55">Archiving hides the profile from everyday planning while preserving plans, activities, and observations. You can restore it later.</p>{children.length > 1 ? <form action={archiveChildProfile} className="mt-5"><input type="hidden" name="childId" value={child.id} /><button className="button-ghost gap-2 bg-black/[.035] text-red-700" type="submit"><Archive size={16} /> Archive profile</button></form> : <p className="mt-5 rounded-xl bg-[#f3eee3] p-4 text-sm text-[#80613f]">A family must keep at least one active child profile, so this profile cannot be archived yet.</p>}</>}
      </section>}
    </div>
  </main>;
}
