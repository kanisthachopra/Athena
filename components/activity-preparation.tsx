import { contentStatus, domainNames } from "@/lib/library-view";
import { SourceRecords } from "@/components/source-records";
import type { GuideClaim } from "@/lib/guide-grounding";
import type { SavedFamilyContext } from "@/lib/activity-context";
import { parsePublicationContext } from "@/lib/activity-publication-context";

export type PreparationTemplate = {
  domain: string; duration_minutes: number; setup_minutes: number; cleanup_level: string;
  materials: string[]; parent_preparation: string; adult_role: string; conversation_prompt: string;
  look_for: string; observation_prompts: string[]; support_ladder: string[]; child_choices: string;
  make_easier: string; extend_activity: string; stop_signals: string; avoid_prompt: string;
  safety_note: string; supervision_level: string; hazards: string[]; why_it_matters: string;
  source_note: string; review_status: string; content_version: number;
  activity_template_capabilities: { core_capabilities: { name: string } | null }[];
  activity_template_tracks: { enrichment_tracks: { name: string } | null }[];
  sourceClaims?: GuideClaim[] | null;
  familyContext?: SavedFamilyContext | null;
  publication_context?: unknown;
};

/** The caller explicitly identifies a current Library entry or saved content. */
export function ActivityPreparation({ title, summary, instructions, template: t, selectionReason, savedVersion = false }: {
  title: string; summary?: string; instructions: string; template: PreparationTemplate; selectionReason?: string; savedVersion?: boolean;
}) {
  const publication = parsePublicationContext(t.publication_context);
  return <article className="preparation">
    <header className="preparation-heading">
      <h1 className="workspace-heading">{title}</h1>
      {summary && <p className="workspace-description">{summary}</p>}
      <div className="preparation-meta"><span>{domainNames[t.domain] ?? t.domain.replaceAll("_", " ")}</span><span>About {t.duration_minutes} min</span><span>{t.setup_minutes} min preparation</span><span>{t.cleanup_level} cleanup</span></div>
      <p className="content-status">{savedVersion ? "Status when selected: " : ""}{contentStatus(t.review_status)}</p>
      {publication && <p className="text-sm text-muted-foreground">Instruction language: {publication.language_variety}. This is not a language-learning target.</p>}
    </header>
    <div className="preparation-start">
      <section><h2>Gather what you need</h2><ul>{(t.materials.length ? t.materials : ["Nothing special"]).map((material, i) => <li key={i}>{material}</li>)}</ul>{t.parent_preparation && <p>{t.parent_preparation}</p>}</section>
      <section className="preparation-safety"><h2>Before you begin</h2><p><strong className="capitalize">{t.supervision_level.replaceAll("_", " ")} supervision.</strong> {t.safety_note}</p>{t.hazards.length > 0 && <p><strong>Hazards to consider:</strong> {t.hazards.map(h => h.replaceAll("-", " ")).join(", ")}</p>}{t.stop_signals && <p><strong>Stop when:</strong> {t.stop_signals}</p>}</section>
    </div>
    {publication && <section><h2>Who this invitation is for</h2><p>{publication.readiness}</p><p><strong>When not to offer it:</strong> {publication.exclusions}</p></section>}
    <section className="preparation-opening"><h2>Start here</h2><p className="preparation-instructions">{instructions}</p><h3>Your part</h3><p>{t.adult_role}</p>{t.conversation_prompt && <blockquote><span>You could say</span><p>{t.conversation_prompt}</p></blockquote>}<p>{t.child_choices}</p>{t.avoid_prompt && <p><strong>Avoid:</strong> {t.avoid_prompt}</p>}<p className="preparation-aside">You can put the screen away. There is nothing to time or complete here.</p></section>
    <div className="preparation-details">
      {publication && <details><summary>Opportunities in this activity</summary><div className="preparation-detail-body"><p>These describe what the activity offers, not what your child must demonstrate.</p><ul>{[...publication.associations.capabilities, ...publication.associations.tracks].map(item => <li key={item.code}><strong>{item.code.replaceAll("_", " ")}:</strong> {item.rationale}</li>)}</ul></div></details>}
      {savedVersion && t.familyContext && <details><summary>Family context when this was selected</summary><div className="preparation-detail-body">
        <p>These are the answers saved with this selection for {t.familyContext.valid_from} through {t.familyContext.valid_until}, not a new check of today’s conditions. They describe what a caregiver reported, not a safety certification.</p>
        <ul>{t.familyContext.contract.checks.map(check => <li key={check.id}><span>{check.statement}</span> <strong>{t.familyContext?.answers[check.id] === true ? "Yes" : t.familyContext?.answers[check.id] === false ? "No" : "Not sure"}</strong></li>)}</ul>
      </div></details>}
      <details><summary>{savedVersion ? "Sources saved with this activity" : "Sources and their limits"}</summary><div className="preparation-detail-body">
        <p>{savedVersion ? "These are the claim records saved at selection, not today’s edited source notes. A saved record can be out of date; check the activity’s current-use notice before offering it again." : "These claims were linked to this reviewed version. General guidance does not prove a particular activity will produce an outcome for your child."}</p>
        {t.sourceClaims?.length ? <SourceRecords claims={t.sourceClaims} /> : <p>No versioned claim records are available for this entry. MIRA has not filled that gap with today’s source text.</p>}
      </div></details>
      <details><summary>Adjust to the moment</summary><div className="preparation-detail-body"><section><h3>Make it easier</h3><p>{t.make_easier}</p></section><section><h3>If interest continues</h3><p>{t.extend_activity}</p></section>{t.support_ladder.length > 0 && <section><h3>Ways to help</h3><p>Choose the help that fits. These are options, not steps your child must work through.</p><ul>{t.support_ladder.map((step, i) => <li key={i}>{step}</li>)}</ul></section>}</div></details>
      <details><summary>Something you might notice</summary><div className="preparation-detail-body"><p>No need to test, prompt a response, or record anything.</p><ul>{(t.observation_prompts.length ? t.observation_prompts : [t.look_for]).filter(Boolean).map((prompt, i) => <li key={i}>{prompt}</li>)}</ul></div></details>
      <details><summary>Purpose and content source</summary><div className="preparation-detail-body">{selectionReason && <section><h3>Why this was selected</h3><p>{selectionReason}</p></section>}<section><h3>Intended purpose</h3><p>{t.why_it_matters}</p></section><p>{[...t.activity_template_capabilities.map(x => x.core_capabilities?.name), ...t.activity_template_tracks.map(x => x.enrichment_tracks?.name)].filter(Boolean).join(" · ")}</p><p>These describe the opportunity, not your child’s ability.</p><section><h3>{savedVersion ? "Saved template" : "Current template"} · version {t.content_version}</h3><p>{savedVersion ? "Status when selected: " : ""}{contentStatus(t.review_status)}</p><p>{t.source_note || "No source note has been recorded."}</p><p>A content status is not a clinical validation or a guarantee of suitability.</p></section></div></details>
    </div>
  </article>;
}
