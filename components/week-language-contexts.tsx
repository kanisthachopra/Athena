import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { LanguageOpportunities } from "@/lib/language-opportunities";

export function WeekLanguageContexts({ context, readOnly }: { context: LanguageOpportunities; readOnly: boolean }) {
  return <section className="mb-7 border-b pb-5" aria-labelledby="week-languages-title">
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
      <h2 id="week-languages-title" className="text-xl font-semibold">Languages in everyday life</h2>
      <Link href="/family#family-languages-title" className="button-ghost">{readOnly ? "View in Family" : "Edit in Family"}</Link>
    </div>
    {context.status === "unavailable" ? <p role="status" className="language-note mt-2">Language details could not be loaded. Your week is still available. Open Family to try again.</p>
      : context.opportunities.length ? <>
        <p className="language-note mt-2">Your current Family notes, separate from this saved week. These are not activity recommendations or extra lessons.</p>
        <details className="mt-2">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-primary">See reported people and routines ({context.opportunities.length} {context.opportunities.length === 1 ? "language" : "languages"})</summary>
          <div className="language-list">
            {context.opportunities.map(language => <details name="week-language-contexts" key={language.goalId} className="language-row">
              <summary><span className="language-row-name" dir="auto">{language.language}</span><span className="language-row-state">{language.state === "maintenance" ? "Maintaining" : "Active"}</span><ChevronDown size={18} className="language-chevron" aria-hidden="true" /></summary>
              <div className="language-row-body">
                {language.variety && <p className="language-note mb-4 whitespace-pre-wrap break-words" dir="auto">{language.variety}</p>}
                <ul className="space-y-5" aria-label="People and moments you reported">
                  {language.people.map((person,index) => <li key={index} className="min-w-0">
                    <p className="whitespace-pre-wrap break-words font-semibold" dir="auto">{person.name}</p>
                    <p className="language-note">{person.contact === "regular" ? "Regular contact reported" : "Occasional contact reported"}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">{person.moments.map((moment,momentIndex) => <li key={momentIndex} className="whitespace-pre-wrap break-words" dir="auto">{moment}</li>)}</ul>
                  </li>)}
                </ul>
              </div>
            </details>)}
          </div>
        </details>
      </> : <p className="language-note mt-2">{context.hasSavedLanguages ? "No active or maintained language has both a reported comfortable speaker and an everyday context yet. Future and paused languages stay in Family; nothing has been added to your week." : "No language details yet. You can describe people and everyday moments in Family, or leave this for later."}</p>}
  </section>;
}
