import { AcceptInviteForm } from "@/components/accept-invite-form";
import { createClient } from "@/lib/supabase/server";
import { Clock3, Eye, HeartHandshake, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Join a family" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const validToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const signedIn = Boolean(authData?.claims?.sub);
  const { data } = validToken && signedIn
    ? await supabase.rpc("preview_family_invitation", { p_token: token })
    : { data: null };
  const invitation = data?.[0] as { family_name: string; invited_email: string; role: "caregiver" | "viewer"; expires_at: string } | undefined;

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cream p-6">
    <div className="absolute -left-24 top-10 size-72 rounded-full bg-sage/25 blur-3xl" /><div className="absolute -right-24 bottom-10 size-72 rounded-full bg-coral/15 blur-3xl" />
    <section className="soft-card relative w-full max-w-xl">
      <Link href="/" className="mb-8 flex w-fit items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-bold text-[#f7f3e9]">M</span><span className="font-serif text-2xl font-semibold">MIRA</span></Link>
      {!signedIn ? <><p className="eyebrow"><HeartHandshake size={15} /> Family invitation</p><h1 className="mt-3 font-serif text-4xl font-semibold">A family would like to learn with you</h1><p className="mt-4 leading-7 text-ink/55">Log in or create your account with the invited email address. MIRA will bring you back here afterward.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link className="button-primary" href={`/auth/login?next=${encodeURIComponent(`/join?token=${token}`)}`}>Log in to continue</Link><Link className="button-ghost" href={`/auth/sign-up?next=${encodeURIComponent(`/join?token=${token}`)}`}>Create an account</Link></div></>
      : invitation ? <><p className="eyebrow"><ShieldCheck size={15} /> Verified invitation</p><h1 className="mt-3 font-serif text-4xl font-semibold">Join {invitation.family_name}</h1><p className="mt-4 leading-7 text-ink/55">You are joining as a <strong className="text-ink">{invitation.role}</strong> using {invitation.invited_email}.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-sage/15 p-4"><div className="flex items-center gap-2 font-semibold">{invitation.role === "viewer" ? <Eye size={17} /> : <HeartHandshake size={17} />} {invitation.role === "viewer" ? "View-only access" : "Caregiver access"}</div><p className="mt-1 text-sm text-ink/55">{invitation.role === "viewer" ? "See plans and insights without changing them." : "Plan activities and add observations together."}</p></div><div className="rounded-2xl bg-coral/10 p-4"><div className="flex items-center gap-2 font-semibold"><Clock3 size={17} /> Seven-day link</div><p className="mt-1 text-sm text-ink/55">The owner can revoke this invitation until it is accepted.</p></div></div><AcceptInviteForm token={token} /></>
      : <><p className="eyebrow"><ShieldCheck size={15} /> Family invitation</p><h1 className="mt-3 font-serif text-4xl font-semibold">This invitation is not available</h1><p className="mt-4 leading-7 text-ink/55">It may have expired, been revoked, already been used, or belong to a different email address.</p><Link className="button-primary mt-7" href="/today">Return to MIRA</Link></>}
    </section>
  </main>;
}
