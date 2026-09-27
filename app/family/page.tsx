import { AppHeader } from "@/components/app-header";
import { AddChildForm } from "@/components/add-child-form";
import { requireFamilyContext } from "@/lib/family-context";
import { Baby, Check, Settings2, Users } from "lucide-react";
import Link from "next/link";
import { switchChild } from "./actions";

export const metadata = { title: "Family" };

export default async function FamilyPage() {
  const { family, children, activeChild, membership } = await requireFamilyContext();
  return <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
    <AppHeader familyName={family?.display_name ?? "Your family"} />
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-10 lg:py-14">
      <p className="eyebrow"><Users size={15} /> Family workspace</p>
      <div className="mt-3 flex flex-col gap-5"><div className="min-w-0"><h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Who is learning today?</h1><p className="mt-3 text-ink/55">Switching children updates Today, plans, the library, and insights together.</p></div><Link href="/setup" className="button-ghost gap-2 self-start"><Settings2 size={17} /> Learning preferences</Link></div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {children.map((child) => {
          const active = child.id === activeChild.id;
          const birthDate = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(child.birth_year, child.birth_month - 1, 1));
          return <article key={child.id} className={`rounded-[1.75rem] border p-6 ${active ? "border-[#829378] bg-[#eef3ea]" : "border-black/5 bg-paper"}`}><div className="flex items-start justify-between gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-[#dce4d6] text-[#52634e]"><Baby size={21} /></div>{active && <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#52634e]"><Check size={13} /> Active</span>}</div><h2 className="mt-5 font-serif text-2xl font-semibold">{child.nickname}</h2><p className="mt-1 text-sm text-ink/45">Born {birthDate}</p>{!active && <form action={switchChild} className="mt-5"><input type="hidden" name="childId" value={child.id} /><input type="hidden" name="returnTo" value="/today" /><button className="button-primary" type="submit">Switch to {child.nickname}</button></form>}</article>;
        })}
      </section>

      {membership.role !== "viewer" && <section className="profile-section mt-8"><p className="eyebrow">Add another child</p><h2 className="mt-3 font-serif text-3xl font-semibold">Create a separate learning journey</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">Each child gets their own aspirations, plans, feedback, and insights. A nickname is enough.</p><AddChildForm /></section>}
    </div>
  </main>;
}
