import { OnboardingForm } from "@/components/onboarding-form";
import { createClient } from "@/lib/supabase/server";
import { Leaf } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Create your family" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  if (!authData?.claims?.sub) redirect("/auth/login");

  const { data: membership } = await supabase.from("family_members").select("family_id").limit(1).maybeSingle();
  if (membership) redirect("/today");

  return (
    <main className="min-h-screen bg-cream px-5 py-8 text-ink sm:py-14">
      <Link href="/" className="mx-auto flex w-fit items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-bold text-[#f7f3e9]">M</span><span className="font-serif text-2xl font-semibold">MIRA</span></Link>
      <section className="mx-auto mt-10 max-w-xl rounded-[2rem] border border-black/5 bg-paper p-7 shadow-[0_25px_80px_rgba(55,62,53,.1)] sm:p-11">
        <div className="grid size-12 place-items-center rounded-2xl bg-[#dce4d6] text-[#52634e]"><Leaf size={22} /></div>
        <p className="eyebrow mt-7">Step 1 of your journey</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Let&apos;s meet your family.</h1>
        <p className="mt-4 leading-7 text-ink/60">We&apos;ll begin with just enough to create a safe, private space. You can shape the learning plan together later.</p>
        <OnboardingForm />
      </section>
    </main>
  );
}
