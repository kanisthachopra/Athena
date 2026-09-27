import { SignUpForm } from "@/components/sign-up-form";
import Link from "next/link";

export const metadata = { title: "Create an account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const requestedNext = (await searchParams).next ?? "/onboarding";
  const nextPath = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/onboarding";
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-cream p-6 md:p-10">
      <div className="absolute -left-24 bottom-10 size-72 rounded-full bg-coral/15 blur-3xl" />
      <div className="absolute -right-24 top-10 size-72 rounded-full bg-sage/25 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-bold text-[#f7f3e9]">M</span><span className="font-serif text-2xl font-semibold">MIRA</span></Link>
        <SignUpForm nextPath={nextPath} />
      </div>
    </main>
  );
}
