"use client";
import { askMira, type AskState } from "@/app/ask/actions";
import { ArrowUp, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import Link from "next/link";
import { SourceRecords } from "@/components/source-records";
const starters = ["We have less time this week.", "They keep choosing the same activity.", "How can I follow their interest without taking over?"];
type Exchange = { question: string; answer: NonNullable<AskState["answer"]> };
export function AskMiraForm({ availability = "enabled" }: { availability?: "enabled" | "off" | "unavailable" }) {
 const enabled = availability === "enabled";
 const [question,setQuestion] = useState("");
 const [exchanges,setExchanges] = useState<Exchange[]>([]);
 const [pending,setPending] = useState(false);
 const [error,setError] = useState("");
 const [submitted,setSubmitted] = useState("");
 const input = useRef<HTMLTextAreaElement>(null);
 async function submit(event: React.FormEvent) {
  event.preventDefault(); if(pending || !enabled) return;
  const original = question.trim(); setSubmitted(original); setPending(true); setError("");
  const data = new FormData(); data.set("question",original);
  try {
   const result = await askMira({ error:null, answer:null },data);
   if(result.answer) {
    setExchanges(previous => [...previous,{question:original,answer:result.answer!}]);
    setQuestion("");
   } else setError(result.error ?? "Guide could not answer. Your question is still here.");
  } catch { setError("The connection was interrupted. Your question is still here; try again when you’re ready."); }
  finally { setPending(false); requestAnimationFrame(()=>input.current?.focus({preventScroll:true})); }
 }
 return <div className="guide-thread">
  {!enabled && <section className="settings-row mb-8" aria-label="Guide availability"><h2 className="text-xl">{availability === "off" ? "Guide is off for your family" : "Guide’s settings could not be checked"}</h2><p className="mt-3 leading-7">{availability === "off" ? "The family owner can enable Guide in Settings after reviewing what is shared with Nebius. Your saved plans and direct observations work without AI." : "No question can be sent until MIRA can check your family’s AI choices. Reload this page when the connection is back."}</p><div className="spatial-actions"><Link href="/settings#ai-controls" className="button-ghost">Review AI settings</Link>{availability === "unavailable" && <button type="button" className="button-ghost" onClick={()=>window.location.reload()}>Reload Guide</button>}</div></section>}
  {!exchanges.length && <><h2 className="text-2xl">What’s on your mind?</h2><p className="workspace-description mt-3">Ask about the reviewed ideas available for your family. Guide can explain or compare them, with links to the preparation and source records. It will say when it has no material to answer from.</p><div className="guide-options">{starters.map(starter => <button type="button" key={starter} disabled={pending} onClick={()=>{setQuestion(starter);input.current?.focus();}}>{starter}</button>)}</div></>}
  <div aria-label="Guide responses">{exchanges.map((exchange,index)=><section key={index} className="mb-10">
   <h2 className="sr-only">Question {index+1}</h2><div className="guide-question">{exchange.question}</div><p className="guide-answer">{exchange.answer.answer}</p>
   {exchange.answer.activities.length>0 && <nav className="spatial-actions" aria-label="Referenced activity preparation">{exchange.answer.activities.map(item=><Link className="button-ghost" key={item.id} href={`/library/${item.id}`}>{item.title} · Read preparation</Link>)}</nav>}
   {exchange.answer.tryNext.length>0 && <div className="mt-6 border-t pt-5"><h3 className="text-base font-semibold">Options to consider</h3><ul className="mt-3 list-disc space-y-3 pl-5">{exchange.answer.tryNext.map((item,i)=><li key={i} className="leading-7">{item}</li>)}</ul></div>}
   <p className="mt-5 text-sm leading-6 text-muted-foreground">{exchange.answer.boundary}</p>
   {exchange.answer.sources.length>0 && <details className="mt-5 border-t pt-3"><summary className="cursor-pointer py-2">Sources behind this response</summary><SourceRecords claims={exchange.answer.sources} /></details>}
  </section>)}</div>
  {pending && <div role="status"><div className="guide-question">{submitted}</div><p className="flex items-center gap-2 text-muted-foreground"><LoaderCircle size={16} className="animate-spin" />Guide is working on your question…</p></div>}
  <form onSubmit={submit} className="guide-composer" aria-busy={pending}><label htmlFor="guide-question" className="mb-3 block text-sm font-semibold">Your question</label><textarea ref={input} id="guide-question" className="mira-input resize-y" value={question} onChange={event=>setQuestion(event.target.value)} minLength={8} maxLength={600} required readOnly={pending} placeholder="Tell Guide what happened…" />
   {error && <p role="alert" className="my-3 text-sm text-destructive">{error}</p>}
   <div className="flex flex-wrap items-center justify-between gap-3 pt-4"><span className="text-sm text-muted-foreground">{question.length}/600</span><button className="button-primary" disabled={!enabled || pending || question.trim().length<8}>{pending ? "Waiting…" : "Send to Guide"}<ArrowUp size={16} aria-hidden="true" /></button></div>
  </form>
  <p className="mt-4 text-sm leading-6 text-muted-foreground">Each question is answered separately. These responses stay on this page until you leave; earlier messages are not sent as context. Your plan is not changed.</p>
  <details className="mt-4 text-sm text-muted-foreground"><summary className="cursor-pointer py-2">What is shared with AI?</summary><p className="mt-2 leading-6">Your question, approximate age range, eligible library entries and their linked source records are sent to Nebius. Names, journal history and contact details are not added automatically. Avoid including personal details in your question. If no reviewed context is available, your question is not sent. Guide cannot diagnose development or assess ability.</p></details>
 </div>;
}
