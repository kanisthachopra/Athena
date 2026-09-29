import { AppHeader } from "@/components/app-header";
import { AskMiraForm } from "@/components/ask-mira-form";
import { requireFamilyContext } from "@/lib/family-context";

export const metadata = { title: "Ask" };

export default async function AskPage() {
  const { family, activeChild } = await requireFamilyContext();

  return (
    <main className="min-h-screen bg-cream pb-28 text-ink sm:pb-0">
      <AppHeader familyName={family?.display_name ?? "Your family"} />
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-10 lg:py-14">
        <p className="text-sm font-semibold text-[#386357]">A quiet place to think together</p>
        <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-tight sm:text-5xl">Ask about {activeChild.nickname}&apos;s real day—not an abstract milestone.</h1>
        <div className="journal-rule mt-8 pt-8">
          <AskMiraForm />
        </div>
      </div>
    </main>
  );
}
