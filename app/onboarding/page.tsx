import { ProfileCreationForm } from "@/components/profile-creation-form";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { Leaf } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Create your family" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  if (authError) throw new Error("Your session could not be checked. Please try again.");
  if (!authData?.claims?.sub) redirect("/auth/login");

  const { data: membership, error: membershipError } = await supabase.from("family_members").select("family_id").eq("user_id", authData.claims.sub).maybeSingle();
  if (membershipError) throw new Error("Your family access could not be loaded. Nothing has been created. Please try again.");
  if (membership) redirect("/today");

  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:py-14">
      <Link href="/" className="mx-auto flex w-fit items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-bold text-[#fcfafd]">M</span><span className="font-serif text-2xl font-semibold">MIRA</span></Link>
      <section className="mx-auto mt-10 max-w-xl rounded-[2rem] border border-black/5 bg-paper p-7 shadow-[0_25px_80px_rgba(55,62,53,.1)] sm:p-11">
        <div className="grid size-12 place-items-center rounded-2xl bg-[#e7dceb] text-[#63486b]"><Leaf size={22} /></div>
        <p className="eyebrow mt-7">Step 1 of your journey</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Let&apos;s meet your family.</h1>
        <p className="mt-4 leading-7 text-ink/60">We&apos;ll begin with just enough to create a safe, private space. You can shape the learning plan together later.</p>
        <ProfileCreationForm key={authData.claims.sub} mode="family" userId={authData.claims.sub} requestId={randomUUID()} today={new Date().toISOString().slice(0,10)} />
      </section>
    </main>
  );
}
