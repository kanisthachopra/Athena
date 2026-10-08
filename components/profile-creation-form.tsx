"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { addChild, switchChild } from "@/app/family/actions";
import { createFamilyAndChild } from "@/app/onboarding/actions";
import { birthMonths } from "@/lib/child-profile";
import { creationFailure, emptyCreationState, type CreationState } from "@/lib/profile-creation";

export type ProfileCreationProps = { requestId: string; today: string } & (
  { mode: "family"; userId: string } | { mode: "child"; familyId: string }
);

export function ProfileCreationForm(props: ProfileCreationProps) {
  // A server revalidation must not replace the identity of an unfinished save.
  const [requestId] = useState(props.requestId);
  const [familyName, setFamilyName] = useState("");
  const [nickname, setNickname] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [state, action, pending] = useActionState<CreationState, FormData>(async (previous, data) => {
    try { return await (props.mode === "family" ? createFamilyAndChild(previous, data) : addChild(previous, data)); }
    catch { return creationFailure(undefined); }
  }, emptyCreationState);
  const currentYear = Number(props.today.slice(0,4));
  const currentMonth = Number(props.today.slice(5,7));

  if (state.createdId) return <div className="mt-6 space-y-4">
    <p role="status" className="font-semibold">{props.mode === "family" ? "Your family details are saved." : "The child’s profile is saved."}</p>
    {props.mode === "family" ? <a href="/today" className="button-primary">Continue to MIRA</a> : <>
      <form action={switchChild}><input type="hidden" name="childId" value={state.createdId} /><input type="hidden" name="returnTo" value="/setup" /><button className="button-primary" type="submit">Continue to learning preferences</button></form>
      <a className="button-ghost" href={`/family/child/${state.createdId}`}>View saved profile</a>
    </>}
  </div>;

  return <form action={action} className="mt-6 space-y-5" aria-busy={pending} onReset={event=>event.preventDefault()}>
    <input type="hidden" name="requestId" value={requestId} />
    {props.mode === "family" ? <input type="hidden" name="userId" value={props.userId} /> : <input type="hidden" name="familyId" value={props.familyId} />}
    <fieldset disabled={pending} className="min-w-0 space-y-5">
      <legend className="sr-only">{props.mode === "family" ? "Create your family" : "Add a child"}</legend>
      {props.mode === "family" && <label className="block"><span className="mb-2 block text-sm font-semibold">What should we call your family?</span><input className="mira-input" name="familyName" maxLength={80} value={familyName} onChange={event=>setFamilyName(event.target.value)} dir="auto" required /></label>}
      <label className="block"><span className="mb-2 block text-sm font-semibold">First name or nickname</span><input className="mira-input" name="nickname" maxLength={60} value={nickname} onChange={event=>setNickname(event.target.value)} dir="auto" autoComplete="off" required /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="mb-2 block text-sm font-semibold">Birth month</span><select className="mira-input" name="birthMonth" value={month} onChange={event=>setMonth(event.target.value)} aria-describedby="creation-age-help" required><option value="" disabled>Choose month</option>{birthMonths.map((label,index)=><option key={label} value={index+1} disabled={Number(year)===currentYear && index+1>currentMonth}>{label}</option>)}</select></label>
        <label><span className="mb-2 block text-sm font-semibold">Birth year</span><select className="mira-input" name="birthYear" value={year} onChange={event=>setYear(event.target.value)} aria-describedby="creation-age-help" required><option value="" disabled>Choose year</option>{Array.from({length:19},(_,index)=>currentYear-index).map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      </div>
      <p id="creation-age-help" className="max-w-prose text-sm leading-6 text-muted-foreground">A nickname and birth month/year are enough. MIRA is being built for children from birth until their seventh birthday; activities still need review for the ages they cover.</p>
      {props.mode === "family" && <p className="text-sm leading-6 text-muted-foreground">For now, dates use UTC. You can choose your family’s time zone in Settings after setup. Optional AI starts off.</p>}
      <button className="button-primary gap-2" type="submit">{pending ? <><LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" size={17} />Saving…</> : state.checkSaved ? "Retry same save" : props.mode === "family" ? "Create family" : "Add child"}</button>
    </fieldset>
    {state.error && <p role="alert" className="max-w-prose text-sm leading-6 text-destructive">{state.error}</p>}
    {state.checkSaved && <a href="/family" target="_blank" rel="noopener noreferrer" className="button-ghost">Check saved family (new tab)</a>}
  </form>;
}
