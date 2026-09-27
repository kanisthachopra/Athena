import Link from "next/link";
import { ArrowRight, BookOpen, Check, Heart, Languages, Sparkles } from "lucide-react";

const principles = [
  { icon: Heart, title: "Built around your child", copy: "Plans respond to their age, interests, rhythms, and the things you notice together.", tone: "coral" },
  { icon: BookOpen, title: "Learning in real life", copy: "Simple, purposeful activities that fit into the home you already have.", tone: "sage" },
  { icon: Languages, title: "Your family, your languages", copy: "Make space for heritage and additional languages without turning home into school.", tone: "blue" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream text-ink">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="MIRA home">
          <span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-bold text-[#f7f3e9]">M</span>
          <span className="font-serif text-2xl font-semibold tracking-tight">MIRA</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-4">
          <Link className="button-ghost whitespace-nowrap px-2 sm:px-4" href="/auth/login">Log in</Link>
          <Link className="button-primary whitespace-nowrap px-4 sm:px-5" href="/auth/sign-up"><span className="sm:hidden">Start</span><span className="hidden sm:inline">Start your family plan</span></Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-14 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-10 lg:pb-32 lg:pt-20">
        <div className="relative z-10 max-w-2xl">
          <div className="eyebrow mb-6"><Sparkles size={14} /> A calmer way to guide learning</div>
          <h1 className="text-balance font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-7xl lg:text-[5.4rem]">
            Childhood is already full of learning.
            <span className="mt-2 block text-coral">Let&apos;s notice it.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-ink/70 sm:text-xl">
            MIRA helps your family turn everyday moments into a thoughtful, flexible learning journey—without worksheets, overwhelm, or more screen time for your child.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link className="button-primary button-large group" href="/auth/sign-up">
              Create your free plan <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} />
            </Link>
            <span className="flex items-center gap-2 px-2 text-sm text-ink/60"><Check size={16} className="text-sage-dark" /> Start with one child</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px] lg:ml-auto">
          <div className="absolute -left-16 top-12 size-56 rounded-full bg-coral/15 blur-3xl" />
          <div className="absolute -right-10 bottom-2 size-60 rounded-full bg-sage/25 blur-3xl" />
          <div className="relative rotate-[1.5deg] rounded-[2.25rem] border border-ink/10 bg-paper p-4 shadow-[0_35px_100px_rgba(50,55,48,.14)]">
            <div className="rounded-[1.65rem] bg-[#f1e5d2] p-7 sm:p-9">
              <div className="mb-10 flex items-center justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-ink/50">Today with Maya</p><p className="mt-1 font-serif text-3xl font-semibold">A little wonder</p></div>
                <div className="grid size-12 place-items-center rounded-full bg-coral text-2xl">☀</div>
              </div>
              <div className="rounded-[1.5rem] bg-paper p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3"><span className="rounded-full bg-sage/40 px-3 py-1 text-xs font-semibold text-sage-dark">10–15 min</span><span className="text-xs text-ink/50">Everyday maths</span></div>
                <h2 className="font-serif text-2xl font-semibold">The kitchen sorting game</h2>
                <p className="mt-3 leading-6 text-ink/60">Invite Maya to group a few safe kitchen objects. Follow the pattern she notices first.</p>
                <div className="mt-6 border-t border-ink/10 pt-5 text-sm text-ink/60">You&apos;ll need: bowls, spoons, and a curious helper</div>
              </div>
              <p className="mt-5 text-center text-xs text-ink/50">One invitation is enough. Follow her lead.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-ink/10 bg-paper/70">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <div className="max-w-2xl"><p className="eyebrow mb-5">The MIRA approach</p><h2 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">A plan that bends with family life.</h2></div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, copy, tone }) => (
              <article key={title} className="soft-card">
                <div className={`icon-orb icon-orb-${tone}`}><Icon size={21} /></div>
                <h3 className="mt-8 font-serif text-2xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-ink/60">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-ink/50 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <p>© 2026 MIRA. Thoughtful learning, made for real families.</p><p>Parent-first · Privacy-minded · Child-led</p>
      </footer>
    </main>
  );
}
