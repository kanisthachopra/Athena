"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { addFamilyLanguage, saveLanguageEnvironment, type LanguageAddState, type LanguageSaveState } from "@/app/family/languages/actions";
import { emptyLanguageEnvironment, hasPlanningLanguage, parseLanguageEnvironment, planningLanguages, planningLanguageLabel, summarizeLanguageEnvironment, type LanguageEnvironment } from "@/lib/language-planning";

export type FamilyLanguageGoal = { id: string; language_code: string; environment: unknown; environment_revision: number };
type Caregiver = { id: string; display_name: string };
const roles = { family: "Family language", heritage: "Heritage language", community: "Community language", additional: "Additional language", future: "A future hope" };
const states = { active: "In use now", maintenance: "Keeping it going", future: "For later", paused: "Paused" };
const comforts = { comfortable: "Comfortable using it", learning: "Learning it", not_comfortable: "Not comfortable using it" };
const contacts = { regular: "Regularly", occasional: "Occasionally", unavailable: "Not available now" };

function Choice({ id, label, value, options, onChange }: { id: string; label: string; value: string | null; options: Record<string, string>; onChange: (value: string | null) => void }) {
  return <label className="language-field" htmlFor={id}>{label}<select id={id} className="mira-input" value={value ?? ""} onChange={event => onChange(event.target.value || null)}><option value="">Not sure / not specified</option>{Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function FieldIssue({ id, message }: { id: string; message?: string }) {
  return message ? <span id={id} className="language-note font-semibold">{message}</span> : null;
}

function SavedDetails({ environment }: { environment: LanguageEnvironment | null }) {
  if (!environment) return <p>No language details saved.</p>;
  return <div className="language-saved-details"><dl>
    <dt>Place in your family</dt><dd>{environment.role ? roles[environment.role] : "Not specified"}</dd>
    <dt>For now</dt><dd>{environment.state ? states[environment.state] : "Not specified"}</dd>
    <dt>Variety or dialect</dt><dd dir="auto">{environment.variety ?? "Not specified"}</dd>
    <dt>Speaking and understanding</dt><dd dir="auto">{environment.oralGoal ?? "No goal recorded"}</dd>
    <dt>Reading and writing</dt><dd dir="auto">{environment.literacyGoal ?? "No goal recorded"}</dd>
  </dl><h4>People and moments</h4>{environment.support === null ? <p>Support not yet described.</p> : !environment.support.length ? <p>No support identified right now.</p> : <ul>{environment.support.map((person, index) => <li key={index}><strong dir="auto">{person.label}</strong><p>{person.comfort ? comforts[person.comfort] : "Comfort not specified"} · {person.contact ? contacts[person.contact] : "Contact not specified"}</p>{person.contexts.length ? <ul>{person.contexts.map((context, i) => <li key={i} dir="auto">{context}</li>)}</ul> : <p>No moments recorded.</p>}</li>)}</ul>}</div>;
}

function LanguageEditor({ goal, childId, caregivers, readOnly }: { goal: FamilyLanguageGoal; childId: string; caregivers: Caregiver[]; readOnly: boolean }) {
  const parsed = goal.environment === null ? null : parseLanguageEnvironment(goal.environment);
  const [draft, setDraft] = useState<LanguageEnvironment>(() => parsed ?? emptyLanguageEnvironment());
  const [revision, setRevision] = useState(goal.environment_revision);
  const [people, setPeople] = useState<NonNullable<LanguageEnvironment["support"]>>(() => parsed?.support ?? []);
  const [frozen, setFrozen] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState(false);
  const [message, setMessage] = useState<LanguageSaveState>({ status: "idle" });
  const retryPayload = useRef<FormData | null>(null);
  const router = useRouter();
  const [, action, pending] = useActionState(async (previous: LanguageSaveState, formData: FormData): Promise<LanguageSaveState> => {
    const payload = retryPayload.current ?? formData;
    retryPayload.current = payload;
    let result: LanguageSaveState;
    try { result = await saveLanguageEnvironment(previous, payload); }
    catch { result = { status: "error", message: "We could not confirm the save. Your draft is still here; retry the same save when your connection is back." }; }
    if (result.status === "saved" && result.revision !== undefined) {
      setRevision(result.revision);
      if (payload.get("operation") === "clear") { setDraft(emptyLanguageEnvironment()); setPeople([]); }
      retryPayload.current = null; setFrozen(false); setNeedsReview(false); setClearConfirmation(false);
    } else if (result.status === "invalid") {
      retryPayload.current = null; setFrozen(false);
    } else if (result.status === "stale") {
      retryPayload.current = null; setFrozen(false); setNeedsReview(true); router.refresh();
    } else setFrozen(true);
    setMessage(result);
    return result;
  }, { status: "idle" });

  if (goal.environment !== null && !parsed) return <p role="alert">These saved language details could not be read. They have not been replaced. Reload Family before trying again.</p>;
  if (readOnly) return <><SavedDetails environment={parsed} /><p className="language-note">Your access is read-only.</p></>;
  const environment: LanguageEnvironment = { ...draft, support: draft.support === null ? null : draft.support.length === 0 ? [] : people.map(person => ({ ...person, contexts: person.contexts.filter(context => context.trim()) })) };
  const id = goal.id;
  const errors = message.fieldErrors ?? {};
  const fieldA11y = (field: string) => ({ "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `${id}-${field}-error` : undefined });
  const fieldIssue = (field: string) => <FieldIssue id={`${id}-${field}-error`} message={errors[field]} />;
  const update = <K extends keyof LanguageEnvironment>(field: K, value: LanguageEnvironment[K]) => { setDraft(current => ({ ...current, [field]: value })); setMessage({ status: "idle" }); };
  const updatePerson = (index: number, patch: Partial<NonNullable<LanguageEnvironment["support"]>[number]>) => { setPeople(current => current.map((person, i) => i === index ? { ...person, ...patch } : person)); setMessage({ status: "idle" }); };
  const addPerson = () => {
    const next = [...people, { caregiverId: null, label: "", comfort: null, contact: null, contexts: [] }];
    setPeople(next); update("support", next);
  };
  const removePerson = (index: number) => {
    const next = people.filter((_, i) => i !== index); setPeople(next);
    update("support", next.length ? next : null);
  };
  return <form action={action} className="language-editor">
    <input type="hidden" name="childId" value={childId} /><input type="hidden" name="goalId" value={id} />
    <input type="hidden" name="revision" value={revision} /><input type="hidden" name="environment" value={JSON.stringify(environment)} />
    <input type="hidden" name="operation" value={clearConfirmation ? "clear" : "save"} />
    <fieldset disabled={pending || frozen || needsReview || clearConfirmation}>
      <legend className="sr-only">Details for {planningLanguageLabel(goal.language_code)}</legend>
      <div className="language-pair"><Choice id={`${id}-role`} label="Place in your family" value={draft.role} options={roles} onChange={value => update("role", value as LanguageEnvironment["role"])} /><Choice id={`${id}-state`} label="For now" value={draft.state} options={states} onChange={value => update("state", value as LanguageEnvironment["state"])} /></div>
      <label className="language-field" htmlFor={`${id}-variety`}>Variety or dialect <span className="language-note">Optional · up to 100 characters</span><input id={`${id}-variety`} className="mira-input" dir="auto" maxLength={200} {...fieldA11y("variety")} value={draft.variety ?? ""} onChange={event => update("variety", event.target.value || null)} />{fieldIssue("variety")}</label>
      <div className="language-pair"><label className="language-field" htmlFor={`${id}-oral`}>Speaking and understanding <span className="language-note">What would you like to make possible? Optional · up to 400 characters.</span><textarea id={`${id}-oral`} className="mira-input" dir="auto" rows={3} maxLength={800} {...fieldA11y("oralGoal")} value={draft.oralGoal ?? ""} onChange={event => update("oralGoal", event.target.value || null)} />{fieldIssue("oralGoal")}</label><label className="language-field" htmlFor={`${id}-literacy`}>Reading and writing <span className="language-note">A separate hope, if you have one. Optional · up to 400 characters.</span><textarea id={`${id}-literacy`} className="mira-input" dir="auto" rows={3} maxLength={800} {...fieldA11y("literacyGoal")} value={draft.literacyGoal ?? ""} onChange={event => update("literacyGoal", event.target.value || null)} />{fieldIssue("literacyGoal")}</label></div>
      <h4 className="language-subheading">People and everyday moments</h4>
      <label className="language-field" htmlFor={`${id}-support`}>Who can use this language with your child?<select id={`${id}-support`} className="mira-input" value={draft.support === null ? "unknown" : draft.support.length === 0 ? "none" : "people"} onChange={event => {
        if (event.target.value === "unknown") update("support", null);
        else if (event.target.value === "none") update("support", []);
        else if (people.length) update("support", people); else addPerson();
      }}><option value="unknown">I haven&apos;t described this yet</option><option value="none">No one identified right now</option><option value="people">Add people and their moments</option></select></label>
      {draft.support !== null && draft.support.length === 0 && <p className="language-note">You can keep this hope for later, learn alongside your child, or look for support. No daily task will be added.</p>}
      {draft.support !== null && draft.support.length > 0 && <div>{people.map((person, index) => <fieldset key={index} className="language-person"><legend>Person {index + 1}</legend>
        <div className="language-pair"><label className="language-field" htmlFor={`${id}-${index}-person`}>Link a caregiver <span className="language-note">Optional; this does not invite them.</span><select className="mira-input" id={`${id}-${index}-person`} {...fieldA11y(`support.${index}.caregiverId`)} value={person.caregiverId ?? ""} onChange={event => updatePerson(index, { caregiverId: event.target.value || null })}><option value="">Someone else / no link</option>{caregivers.map(caregiver => <option key={caregiver.id} value={caregiver.id}>{caregiver.display_name}</option>)}</select>{fieldIssue(`support.${index}.caregiverId`)}</label><label className="language-field" htmlFor={`${id}-${index}-name`}>How you refer to them <span className="language-note">Up to 100 characters</span><input id={`${id}-${index}-name`} className="mira-input" dir="auto" required maxLength={200} {...fieldA11y(`support.${index}.label`)} value={person.label} onChange={event => updatePerson(index, { label: event.target.value })} />{fieldIssue(`support.${index}.label`)}</label></div>
        <div className="language-pair"><Choice id={`${id}-${index}-comfort`} label="Their comfort with this language" value={person.comfort} options={comforts} onChange={value => updatePerson(index, { comfort: value as typeof person.comfort })} /><Choice id={`${id}-${index}-contact`} label="Time with your child" value={person.contact} options={contacts} onChange={value => updatePerson(index, { contact: value as typeof person.contact })} /></div>
        <label className="language-field" htmlFor={`${id}-${index}-contexts`}>Moments when it fits <span className="language-note">Up to eight lines, 120 characters each. Optional.</span><textarea id={`${id}-${index}-contexts`} className="mira-input" dir="auto" rows={3} maxLength={2000} {...fieldA11y(`support.${index}.contexts`)} value={person.contexts.join("\n")} onChange={event => updatePerson(index, { contexts: event.target.value.split("\n") })} />{fieldIssue(`support.${index}.contexts`)}</label>
        <button type="button" className="button-ghost" onClick={() => removePerson(index)}><Trash2 size={16} aria-hidden="true" /> Remove this person from the draft</button>
      </fieldset>)}<button type="button" className="button-ghost" disabled={people.length >= 12} onClick={addPerson}><Plus size={16} aria-hidden="true" /> Add another person</button></div>}
    </fieldset>
    <p className="language-note language-boundary">These details describe your family. Saving does not add lessons, change existing plans or send them to AI.</p>
    {message.message && <p role={message.status === "saved" ? "status" : "alert"} className="language-save-message">{message.message}</p>}
    {needsReview && <div className="language-conflict"><h4>Your draft is still above</h4><p>Compare it with the saved details below. Nothing here will overwrite them automatically.</p><details><summary>Saved details · revision {goal.environment_revision}</summary><SavedDetails environment={parsed} /></details><div className="language-actions"><button type="button" className="button-ghost" onClick={() => router.refresh()}>Check saved details again</button><button type="button" className="button-primary" disabled={goal.environment_revision === revision} onClick={() => { setDraft(parsed ?? emptyLanguageEnvironment()); setPeople(parsed?.support ?? []); setRevision(goal.environment_revision); setNeedsReview(false); setClearConfirmation(false); setMessage({ status: "idle" }); }}>Discard draft and use saved details</button></div></div>}
    {clearConfirmation && !frozen && !needsReview && <p className="language-save-message">Clear this language&apos;s saved people, moments and goals? The language itself stays in your list. This cannot be undone here.</p>}
    {!needsReview && <div className="language-actions"><button type="submit" className="button-primary" disabled={pending} formNoValidate={frozen || clearConfirmation}>{pending ? "Saving…" : frozen ? "Retry the same save" : clearConfirmation ? "Clear saved details" : "Save language details"}</button>
      {frozen ? <button type="button" className="button-ghost" disabled={pending} onClick={() => { retryPayload.current = null; setFrozen(false); setClearConfirmation(false); setMessage({ status: "idle" }); }}>Edit this draft</button> : clearConfirmation ? <button type="button" className="button-ghost" disabled={pending} onClick={() => setClearConfirmation(false)}>Keep details</button> : goal.environment !== null && <button type="button" className="button-ghost" disabled={pending} onClick={() => setClearConfirmation(true)}>Clear saved details…</button>}
    </div>}
  </form>;
}

function AddLanguage({ childId, existing }: { childId: string; existing: string[] }) {
  const [choice, setChoice] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [frozen, setFrozen] = useState(false);
  const retryPayload = useRef<FormData | null>(null);
  const router = useRouter();
  const [result, action, pending] = useActionState(async (previous: LanguageAddState, formData: FormData): Promise<LanguageAddState> => {
    let response: LanguageAddState;
    try {
      if (!retryPayload.current) {
        formData.set("requestId", crypto.randomUUID());
        retryPayload.current = formData;
      }
      response = await addFamilyLanguage(previous, retryPayload.current);
    } catch { response = { status: "error", message: "We could not confirm the addition. Your choice is still here; retry when your connection returns." }; }
    if (response.status === "saved") {
      const code = String(retryPayload.current?.get("languageCode") ?? "");
      setAdded(current => [...current, code]);
      setChoice(""); setFrozen(false); retryPayload.current = null;
      router.refresh();
    } else setFrozen(true);
    return response;
  }, { status: "idle" });
  const listed = [...existing, ...added];
  return <form action={action} className="language-add">
    <input type="hidden" name="childId" value={childId} />
    <div className="language-add-controls">
      <label className="language-field" htmlFor={`${childId}-add-language`}>Add a language
        <select className="mira-input" id={`${childId}-add-language`} name="languageCode" required value={choice} disabled={pending || frozen} onChange={event => setChoice(event.target.value)}>
          <option value="">Choose a language</option>
          {[...planningLanguages].sort((a, b) => a[1].localeCompare(b[1], "en")).map(([code, label]) => <option key={code} value={code} disabled={hasPlanningLanguage(listed, code)}>{label}{hasPlanningLanguage(listed, code) ? " · already listed" : ""}</option>)}
        </select>
      </label>
      <button type="submit" className="button-primary" disabled={pending || (!frozen && !choice)} formNoValidate={frozen}>{pending ? "Adding…" : frozen ? "Retry adding this language" : "Add language"}</button>
    </div>
    <p className="language-note">For now or for later. Adding a language does not add lessons. A variety or dialect can go in its details.</p>
    {result.message && <p role={result.status === "saved" ? "status" : "alert"} className="language-save-message">{result.message}</p>}
    {frozen && <button type="button" className="button-ghost" disabled={pending} onClick={() => { retryPayload.current = null; setFrozen(false); router.refresh(); }}>Check the list and choose again</button>}
  </form>;
}

export function FamilyLanguageContexts({ childId, childName, goals, caregivers, readOnly, unavailable }: { childId: string; childName: string; goals: FamilyLanguageGoal[]; caregivers: Caregiver[]; readOnly: boolean; unavailable: boolean }) {
  return <section id="family-languages" className="profile-section language-section mt-8 scroll-mt-28" aria-labelledby="family-languages-title">
    <h2 id="family-languages-title" className="font-serif text-3xl font-semibold">Languages around {childName}</h2>
    <p className="language-intro">Who uses each language, and when? Open one to describe what fits your family. Unanswered details can stay unknown.</p>
    {unavailable ? <p role="alert">Language details could not be loaded. Reload Family to try again; nothing has been changed.</p> : goals.length ? <div className="language-list">{goals.map(goal => {
      const parsed = parseLanguageEnvironment(goal.environment);
      const status = parsed?.state ? states[parsed.state] : goal.environment === null ? "Not yet described" : parsed ? "Not specified for now" : "Needs attention";
      return <details name="family-language-contexts" key={goal.id} className="language-row"><summary><span className="language-row-name" dir="auto">{planningLanguageLabel(goal.language_code)}</span><span className="language-row-state">{status}</span><ChevronDown size={18} className="language-chevron" aria-hidden="true" /></summary><div className="language-row-body">{parsed && <p className="language-note">{summarizeLanguageEnvironment(parsed).explanation}</p>}<LanguageEditor goal={goal} childId={childId} caregivers={caregivers} readOnly={readOnly} /></div></details>;
    })}</div> : <p className="language-empty">{readOnly ? "No language goals yet. Your access is read-only." : "No language goals yet. Add one below, or leave this for later."}</p>}
    {!readOnly && !unavailable && <AddLanguage childId={childId} existing={goals.map(goal => goal.language_code)} />}
  </section>;
}
