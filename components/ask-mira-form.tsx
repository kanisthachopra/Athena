"use client";

import { askMira, type AskState } from "@/app/ask/actions";
import { ArrowRight, LoaderCircle, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useActionState, useRef } from "react";

const initialState: AskState = { error: null, answer: null };

const starters = [
  "How can I follow their interest without taking over?",
  "What can I notice during repeated play?",
  "How can we make today’s opportunity easier?",
];

export function AskMiraForm() {
  const [state, action, pending] = useActionState(askMira, initialState);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_.72fr]">
      <section className="rounded-[1.5rem] border border-[#bfd9d8] bg-paper p-6 sm:p-8">
        <p className="eyebrow"><MessageCircle size={15} /> Ask your learning copilot</p>
        <h2 className="mt-3 font-serif text-3xl">Start with the moment in front of you.</h2>
        <p className="mt-3 max-w-2xl leading-7 text-ink/60">Ask about play, participation, language, routines, or adapting an opportunity. MIRA answers; it never changes your plan without asking.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {starters.map((starter) => (
            <button
              key={starter}
              type="button"
              className="rounded-full bg-[#e2efe9] px-3.5 py-2 text-left text-xs font-semibold text-[#386357] transition hover:bg-[#d4e8df]"
              onClick={() => { if (inputRef.current) { inputRef.current.value = starter; inputRef.current.focus(); } }}
            >
              {starter}
            </button>
          ))}
        </div>

        <form action={action} className="mt-6">
          <label htmlFor="question" className="mb-2 block text-sm font-semibold">What are you wondering?</label>
          <textarea ref={inputRef} id="question" name="question" className="mira-input min-h-36 resize-y" maxLength={600} required placeholder="For example: They keep repeating the same hiding game. Should I introduce something new?" />
          {state.error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
          <button className="button-primary mt-4" disabled={pending}>
            {pending ? <><LoaderCircle className="animate-spin" size={17} /> Thinking carefully…</> : <>Ask MIRA <ArrowRight size={17} /></>}
          </button>
          <p className="mt-3 text-xs leading-5 text-ink/45">Your question, the child&apos;s age in months, and today&apos;s opportunity title are sent to Nebius. Names, journal history, and family contact details are not included.</p>
        </form>
      </section>

      <aside className="space-y-5">
        {state.answer ? (
          <article className="rounded-[1.5rem] border border-[#d4c8e5] bg-[#eee7f5] p-6 sm:p-7" aria-live="polite">
            <p className="eyebrow text-[#6d5688]"><Sparkles size={14} /> A thoughtful response</p>
            <p className="mt-4 whitespace-pre-line leading-7 text-ink/75">{state.answer.answer}</p>
            <div className="mt-5 border-t border-black/10 pt-5">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-ink/45">You could try</p>
              <ul className="mt-3 space-y-3">
                {state.answer.tryNext.map((item) => <li key={item} className="flex gap-3 text-sm leading-6"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#6d5688]" />{item}</li>)}
              </ul>
            </div>
            <p className="mt-5 rounded-xl bg-white/50 p-3 text-xs leading-5 text-ink/55">{state.answer.boundary}</p>
          </article>
        ) : (
          <div className="rounded-[1.5rem] bg-[#e2efe9] p-6 sm:p-7">
            <ShieldCheck className="text-[#386357]" size={22} />
            <h3 className="mt-5 font-serif text-2xl">What Ask can—and cannot—do</h3>
            <p className="mt-3 text-sm leading-6 text-ink/60">It can help you interpret a moment, adapt an invitation, or find gentler wording. It cannot diagnose development, assess ability, or silently change stored family information.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
