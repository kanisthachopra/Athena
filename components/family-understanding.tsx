import Link from "next/link";
import { directionHorizons, directionLabels } from "@/lib/learning-directions";
import { planningLanguageLabel, summarizeLanguageEnvironment } from "@/lib/language-planning";
import { understandingDate, type FamilyUnderstanding } from "@/lib/family-understanding";

const screens: Record<string, string> = { minimal_child_screen: "Minimal child screen time", selective: "Selective, purposeful use", no_preference: "No strong preference" };
const structures: Record<string, string> = { light: "Light and spontaneous", balanced: "A balanced rhythm", structured: "More predictable structure" };
const states = { active: "In use now", maintenance: "Keeping it going", future: "For later", paused: "Paused" };
const roles = { family: "Family language", heritage: "Heritage language", community: "Community language", additional: "Additional language", future: "A future hope" };
const comforts = { comfortable: "Comfortable using it", learning: "Learning it", not_comfortable: "Not comfortable using it" };
const contacts = { regular: "Regularly", occasional: "Occasionally", unavailable: "Not available now" };

export function FamilyUnderstandingView({ value, childId, readOnly, owner }: { value: FamilyUnderstanding | null; childId: string; readOnly: boolean; owner: boolean }) {
  if (!value) return <section className="settings-row mt-8" aria-labelledby="understanding-unavailable">
    <h2 id="understanding-unavailable">Your saved summary could not be loaded</h2>
    <p role="alert">No choices have been replaced. Reload to see the saved summary, or open Family to review your choices there.</p>
    <div className="spatial-actions"><form action="/memory" method="get"><button type="submit" className="button-primary">Reload summary</button></form><Link href="/family" className="button-ghost">Open Family</Link></div>
  </section>;
  const { profile, directions, calendar } = value;
  const prefs = profile.initial;
  const record = (instant: string | null, label = "Last saved") => instant ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{label} <time dateTime={instant}>{understandingDate(instant, calendar.timeZone)}</time>.</p> : null;
  return <>
    <div className="spatial-actions"><Link href={`/family/child/${childId}`} className="button-ghost">Review child details</Link><a href="#planning-use" className="button-ghost">How these choices are used</a></div>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Saved times use {calendar.timeZone?.replaceAll("_", " ") ?? "UTC (no family time zone chosen)"}.{readOnly && " Your access is read-only; an owner or caregiver can correct family choices."}</p>
    <div className="spatial-board mt-8">
      <section className="spatial-day min-w-0" aria-labelledby="saved-preferences">
        <h2 id="saved-preferences" className="spatial-day-heading">Saved family preferences</h2>
        {!profile.configured ? <p className="leading-7">Learning preferences have not been saved yet. No capacity or screen preference has been assumed here.</p> : <dl className="space-y-5">
          <div><dt className="text-sm text-muted-foreground">Additional time on a weekday</dt><dd className="mt-1">{prefs.weekday_minutes} minutes</dd></div>
          <div><dt className="text-sm text-muted-foreground">Additional time on a weekend day</dt><dd className="mt-1">{prefs.weekend_minutes} minutes</dd></div>
          <div><dt className="text-sm text-muted-foreground">Screen preference</dt><dd className="mt-1">{screens[prefs.screen_policy!]}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Preferred rhythm</dt><dd className="mt-1">{structures[prefs.structure_level!]}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Learning in everyday life</dt><dd className="mt-1">{prefs.prefer_embedded_learning ? "Preferred" : "Not marked as a preference"}</dd></div>
        </dl>}
        {record(value.preferencesUpdatedAt)}
        <Link href="/setup" className="button-ghost mt-4">{readOnly ? "Review learning preferences" : "Correct learning preferences"}</Link>
      </section>
      <section className="spatial-day min-w-0" aria-labelledby="saved-hopes">
        <h2 id="saved-hopes" className="spatial-day-heading">Your hopes and directions</h2>
        {directions.hopes.length ? <ul className="divide-y divide-border">{directions.hopes.map(hope => {
          const dates = value.hopeDates.find(row => row.id === hope.id)!;
          return <li key={hope.id} className="py-4 first:pt-0">
            <p className="break-words font-semibold" dir="auto">{hope.title}</p>
            <p className="mt-2 text-sm leading-6">{hope.direction ? directionHorizons[hope.direction.horizon] : "No planning link"}</p>
            {hope.direction && <p className="mt-1 break-words leading-7">{directionLabels(hope.direction).join(" · ") || "No opportunities chosen."}</p>}
            {record(dates.directionUpdatedAt ?? dates.createdAt, dates.directionUpdatedAt ? "Planning link last changed" : "Hope added")}
          </li>;
        })}</ul> : <p className="leading-7">No hopes saved yet. MIRA has not guessed them from your child’s name or age.</p>}
        <Link href="/family#family-directions" className="button-ghost mt-4">{readOnly ? "Review directions" : "Correct hopes and directions"}</Link>
      </section>
    </div>

    <section className="settings-row mt-8" aria-labelledby="saved-languages">
      <h2 id="saved-languages">Languages, people and everyday moments</h2>
      <p>These are your family’s reports, not measures of fluency or time spent. Open a language to review its details.</p>
      {value.languages.length ? <div className="mt-5 divide-y divide-border">{value.languages.map(goal => {
        const env = goal.environment;
        return <details key={goal.id} className="py-4">
          <summary className="min-h-11 cursor-pointer rounded-md py-2 leading-7"><span className="break-words font-semibold"><bdi>{planningLanguageLabel(goal.language)}</bdi></span><span className="ml-3 text-sm text-muted-foreground">{env?.state ? states[env.state] : env ? "Timing not chosen" : "Not described yet"}</span></summary>
          <div className="mt-4 max-w-prose space-y-4 pl-2 leading-7">
            {!env ? <p>The language is saved, but its people, goals and routines have not been described.</p> : <>
              <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Place in your family</dt><dd>{env.role ? roles[env.role] : "Not provided"}</dd></div><div><dt className="text-sm text-muted-foreground">Variety or dialect</dt><dd className="break-words" dir="auto">{env.variety ?? "Not provided"}</dd></div></dl>
              <div><h3 className="font-semibold">Speaking and understanding</h3><p className="whitespace-pre-wrap break-words" dir="auto">{env.oralGoal ?? "No goal provided."}</p></div>
              <div><h3 className="font-semibold">Reading and writing</h3><p className="whitespace-pre-wrap break-words" dir="auto">{env.literacyGoal ?? "No goal provided."}</p></div>
              <div><h3 className="font-semibold">People and moments you reported</h3>{env.support === null ? <p>Speaker support has not been described.</p> : !env.support.length ? <p>No person identified right now.</p> : <ul className="mt-2 space-y-4">{env.support.map((person, index) => <li key={index}>
                <p className="break-words font-semibold" dir="auto">{person.label}</p>
                <p className="text-sm text-muted-foreground">{person.comfort ? comforts[person.comfort] : "Comfort not provided"} · {person.contact ? contacts[person.contact] : "Availability not provided"}</p>
                {person.contexts.length ? <ul className="mt-1 list-disc space-y-1 pl-5">{person.contexts.map((context, i) => <li className="whitespace-pre-wrap break-words" dir="auto" key={i}>{context}</li>)}</ul> : <p>No everyday moments described.</p>}
              </li>)}</ul>}</div>
              <p className="text-sm text-muted-foreground">{summarizeLanguageEnvironment(env).explanation}</p>
            </>}
            {record(goal.updatedAt ?? goal.createdAt, goal.updatedAt ? "Language context last saved" : "Language added")}
          </div>
        </details>;
      })}</div> : <p className="mt-4">No languages saved. None have been inferred from your family’s identity.</p>}
      <Link href="/family#family-languages" className="button-ghost mt-4">{readOnly ? "Review language context" : "Correct language context"}</Link>
      <details className="mt-6 border-t border-border pt-4"><summary className="min-h-11 cursor-pointer rounded-md py-2 font-semibold">People in the family profile</summary>
        <p className="mt-3">Caregiver profiles describe people in family life. They do not grant an app login or access.</p>
        {value.people.length ? <ul className="mt-4 space-y-3">{value.people.map(person => <li key={person.id}><p className="break-words" dir="auto">{person.name}{person.relationship ? ` · ${person.relationship}` : ""}</p>{record(person.createdAt, "Profile added")}</li>)}</ul> : <p className="mt-3">No caregiver profiles saved. This does not mean your child has no caregivers.</p>}
        {value.people.length > 1 && <p className="mt-3">Learning preferences currently edits the first caregiver shown above. Other saved caregiver profiles stay unchanged.</p>}
        <Link href="/setup" className="button-ghost mt-4">{readOnly ? "Review caregiver profile" : value.people.length > 1 ? "Correct first caregiver profile" : "Correct caregiver profile"}</Link>
      </details>
    </section>

    <section id="planning-use" className="settings-row scroll-mt-28" aria-labelledby="planning-use-title">
      <h2 id="planning-use-title">What affects a new week</h2>
      <p>This describes the current planner, not a judgment about your child. Changing a preference does not rewrite a saved week.</p>
      <dl className="mt-6 space-y-5 max-w-prose leading-7">
        <div><dt className="font-semibold">Eligibility comes first</dt><dd className="mt-1">Reviewed activity versions must fit age, that day’s available time, screen preference and the required materials, setting and supervision answers. Unknown required context blocks an option.</dd></div>
        <div><dt className="font-semibold">Current directions help choose</dt><dd className="mt-1">Among eligible options, variety comes before matching your For now directions. For later, Paused and unlinked hopes do not influence selection.</dd></div>
        <div><dt className="font-semibold">Reported repetition stays specific</dt><dd className="mt-1">A recent activity report of both high engagement and repetition can favour that same saved activity version. It does not become a lasting interest or an ability label.</dd></div>
        <div><dt className="font-semibold">Some choices are kept for context</dt><dd className="mt-1">Preferred rhythm and the everyday-learning preference are saved, but do not yet change the planner’s mix. Language people and routines appear separately in Week; they do not automatically create lessons.</dd></div>
      </dl>
      <div className="spatial-actions"><Link href="/library/context" className="button-ghost">Review activity context</Link><Link href="/week" className="button-ghost">Review saved week</Link></div>
      <details className="mt-5"><summary className="min-h-11 cursor-pointer rounded-md py-2 font-semibold">Dates and shared family calendar</summary>
        <p className="mt-3">{calendar.timeZone ? <>Your family chose <bdi>{calendar.timeZone.replaceAll("_", " ")}</bdi>.</> : "No family time zone has been chosen. MIRA uses UTC, not an assumed location."} Activity dates already in a plan do not move when it changes.</p>
        {record(calendar.updatedAt, "Calendar last saved")}{record(value.childUpdatedAt, "Child profile last saved")}
        <Link href="/settings" className="button-ghost mt-4">{owner ? "Review calendar settings" : "Review Settings"}</Link>
      </details>
    </section>

    <section className="settings-row" aria-labelledby="understanding-observations">
      <h2 id="understanding-observations">Observations are separate</h2>
      <p>Your original everyday notes and activity feedback live in Insights. A missing note does not mean something did not happen. Everyday notes do not currently affect activity ranking.</p>
      <Link href="/insights" className="button-ghost mt-4">{readOnly ? "Read original observations" : "Review and correct observations"}</Link>
      <details className="mt-5"><summary className="min-h-11 cursor-pointer rounded-md py-2 font-semibold">AI and the limits of this summary</summary>
        <p className="mt-3">This page is built from saved fields without an AI call. It does not infer skills, diagnoses or lasting preferences. A separate, correctable AI-memory system is not yet implemented; Guide does not read your journal history.</p>
        <p className="mt-3">The full family learning agreement still needs purpose, help, challenge and protected-routine choices. They have not been invented here. MIRA’s own rules—no forced participation, no ranking children, and room to stop—apply regardless of family preferences.</p>
        <Link href="/settings" className="button-ghost mt-4">Review AI and data settings</Link>
      </details>
    </section>
  </>;
}
