import { AppHeader } from "@/components/app-header";
import { AddChildForm } from "@/components/add-child-form";
import { FamilyInviteForm } from "@/components/family-invite-form";
import { FamilyNameForm } from "@/components/family-name-form";
import { requireFamilyContext } from "@/lib/family-context";
import { Archive, Baby, Check, Clock3, Mail, Pencil, Settings2, ShieldCheck, Trash2, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { removeFamilyMember, restoreChildProfile, revokeFamilyInvitation, switchChild } from "./actions";

export const metadata = { title: "Family" };

export default async function FamilyPage() {
  const { supabase, userId, family, children, archivedChildren, activeChild, membership } = await requireFamilyContext();
  const { data: memberData } = await supabase.rpc("list_family_members", { p_family_id: membership.family_id });
  const members = (memberData ?? []) as { user_id: string; email: string; role: "owner" | "caregiver" | "viewer"; joined_at: string }[];
  const { data: invitationData } = membership.role === "owner"
    ? await supabase.from("family_invitations").select("id,invited_email,role,created_at,expires_at").eq("family_id", membership.family_id).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })
    : { data: [] };
  const invitations = (invitationData ?? []) as { id: string; invited_email: string; role: "caregiver" | "viewer"; created_at: string; expires_at: string }[];
  return <main className="min-h-screen bg-cream pb-24 text-ink sm:pb-0">
    <AppHeader familyName={family?.display_name ?? "Your family"} />
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-10 lg:py-14">
      <p className="eyebrow"><Users size={15} /> Family workspace</p>
      <div className="mt-3 flex flex-col gap-5"><div className="min-w-0"><h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Who is learning today?</h1><p className="mt-3 text-ink/55">Switching children updates Today, plans, the library, and insights together.</p></div><Link href="/setup" className="button-ghost gap-2 self-start"><Settings2 size={17} /> Learning preferences</Link></div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {children.map((child) => {
          const active = child.id === activeChild.id;
          const birthDate = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(child.birth_year, child.birth_month - 1, 1));
          return <article key={child.id} className={`rounded-[1.75rem] border p-6 ${active ? "border-[#829378] bg-[#eef3ea]" : "border-black/5 bg-paper"}`}><div className="flex items-start justify-between gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-[#dce4d6] text-[#52634e]"><Baby size={21} /></div>{active && <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#52634e]"><Check size={13} /> Active</span>}</div><h2 className="mt-5 font-serif text-2xl font-semibold">{child.nickname}</h2><p className="mt-1 text-sm text-ink/45">Born {birthDate}</p><div className="mt-5 flex flex-wrap gap-2">{!active && <form action={switchChild}><input type="hidden" name="childId" value={child.id} /><input type="hidden" name="returnTo" value="/today" /><button className="button-primary" type="submit">Switch to {child.nickname}</button></form>}<Link href={`/family/child/${child.id}`} className="button-ghost gap-2"><Pencil size={15} /> Manage profile</Link></div></article>;
        })}
      </section>

      {membership.role !== "viewer" && <section className="profile-section mt-8"><p className="eyebrow">Add another child</p><h2 className="mt-3 font-serif text-3xl font-semibold">Create a separate learning journey</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">Each child gets their own aspirations, plans, feedback, and insights. A nickname is enough.</p><AddChildForm /></section>}

      {membership.role === "owner" && <section className="profile-section mt-8"><p className="eyebrow"><Settings2 size={15} /> Family details</p><h2 className="mt-3 font-serif text-3xl font-semibold">How MIRA names your space</h2><p className="mt-2 text-sm leading-6 text-ink/55">This name appears in the navigation and is shared with family members.</p><FamilyNameForm initialName={family?.display_name ?? "Your family"} /></section>}

      {membership.role === "owner" && archivedChildren.length > 0 && <section className="profile-section mt-8"><p className="eyebrow"><Archive size={15} /> Archived profiles</p><h2 className="mt-3 font-serif text-3xl font-semibold">Learning journeys kept safely</h2><p className="mt-2 text-sm leading-6 text-ink/55">Archived profiles stay out of daily planning without losing their history.</p><div className="mt-6 space-y-3">{archivedChildren.map((child) => <div key={child.id} className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{child.nickname}</p><p className="mt-1 text-xs text-ink/45">Archived {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(child.archived_at!))}</p></div><div className="flex flex-wrap gap-2"><Link href={`/family/child/${child.id}`} className="button-ghost">View record</Link><form action={restoreChildProfile}><input type="hidden" name="childId" value={child.id} /><button className="button-primary" type="submit">Restore</button></form></div></div>)}</div></section>}

      <section className="profile-section mt-8">
        <p className="eyebrow"><ShieldCheck size={15} /> Family access</p>
        <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="font-serif text-3xl font-semibold">The people learning together</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">Caregivers can plan and record observations. Viewers can follow the journey without making changes.</p></div><span className="w-fit rounded-full bg-sage/15 px-3 py-1.5 text-xs font-semibold capitalize text-[#52634e]">Your access: {membership.role}</span></div>
        <div className="mt-6 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white/70 px-5">
          {members.map((member) => <div key={member.user_id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage/15 text-[#52634e]"><UserRound size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.email}{member.user_id === userId && " · You"}</p><p className="mt-0.5 text-xs capitalize text-ink/45">{member.role} · Joined {new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(member.joined_at))}</p></div></div>{membership.role === "owner" && member.user_id !== userId && member.role !== "owner" && <form action={removeFamilyMember}><input type="hidden" name="memberId" value={member.user_id} /><button className="button-ghost text-red-700" type="submit"><Trash2 size={15} /> Remove</button></form>}</div>)}
        </div>

        {membership.role === "owner" && <div className="mt-8 border-t border-black/5 pt-7"><p className="flex items-center gap-2 text-sm font-semibold"><Mail size={17} /> Invite someone you trust</p><p className="mt-2 text-sm leading-6 text-ink/50">Create an email-specific link, then send it using your usual messaging app. The recipient must sign in with that exact email.</p><FamilyInviteForm />
          {invitations.length > 0 && <div className="mt-7"><h3 className="text-sm font-semibold">Pending invitations</h3><div className="mt-3 space-y-3">{invitations.map((invitation) => <div key={invitation.id} className="flex flex-col gap-3 rounded-2xl bg-black/[.025] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{invitation.invited_email}</p><p className="mt-1 flex items-center gap-1.5 text-xs capitalize text-ink/45"><Clock3 size={13} /> {invitation.role} · Expires {new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(invitation.expires_at))}</p></div><form action={revokeFamilyInvitation}><input type="hidden" name="invitationId" value={invitation.id} /><button className="button-ghost text-red-700" type="submit">Revoke</button></form></div>)}</div></div>}
        </div>}
      </section>
    </div>
  </main>;
}
