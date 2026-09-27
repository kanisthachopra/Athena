import { MailCheck } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Check your email" };

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-6 text-ink">
      <section className="w-full max-w-md rounded-[2rem] border border-black/5 bg-paper p-9 text-center shadow-[0_25px_80px_rgba(55,62,53,.1)]">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#dce4d6] text-[#52634e]"><MailCheck size={25} /></div>
        <h1 className="mt-7 font-serif text-3xl font-semibold">Check your inbox</h1>
        <p className="mt-4 leading-7 text-ink/60">We sent you a confirmation link. Once you confirm your email, we&apos;ll introduce MIRA to your family.</p>
        <Link href="/auth/login" className="button-primary mt-8 w-full">Back to log in</Link>
      </section>
    </main>
  );
}
