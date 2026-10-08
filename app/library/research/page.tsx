import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { requireFamilyContext } from "@/lib/family-context";
import { catalog, validateCatalog } from "@/lib/research-content";
import rejectedBatch from "@/content/research/archive/batch-1-rejected.json";
import review from "@/content/research/archive/batch-1-review.json";
import checkpoint from "@/content/research/review-checkpoint.json";
import { buildResearchReviewPackage } from "@/lib/research-review";
import { ActivityReviewCollection } from "@/components/activity-review-collection";

export const metadata = { title: "Research behind the library" };
export default async function ResearchPage() {
  const { family, membership } = await requireFamilyContext();
  validateCatalog();
  const reviewPackage = buildResearchReviewPackage(checkpoint);
  return <main className="min-h-screen">
    <AppHeader familyName={family?.display_name ?? "Your family"} />
    <div className="workspace-page research-page">
      <Link href="/library" className="button-ghost">Back to Library</Link>
      <h1 className="workspace-heading mt-7">Where the ideas come from</h1>
      <p className="workspace-description">Follow an idea from its research source to a reusable interaction, then see what happened when AI tried to turn it into an activity.</p>
      <div className="spatial-notice"><div><strong>Research workspace—not a ready-to-use collection</strong>
        <p className="mt-2 text-sm leading-7">{catalog.scope} No source organisation endorses MIRA or these drafts.</p>
      </div></div>
      <nav className="research-jumps" aria-label="Research sections">
        {membership.role === "owner" && <a className="button-ghost" href="#activity-review">Review complete activities</a>}
        <a className="button-ghost" href="#primitives">Explore the patterns</a>
        <a className="button-ghost" href="#sources">Read the sources</a>
        <a className="button-ghost" href="#review">See what is missing</a>
      </nav>
      {membership.role === "owner" && <ActivityReviewCollection />}
      <section id="primitives" className="research-section">
        <h2>Primitives and activity stacks</h2>
        <p className="workspace-description">A primitive is a reusable interaction, not a lesson or a developmental target. This map has {catalog.primitives.length} draft primitives. Current compilation has records for {checkpoint.stacks.length}; {reviewPackage.pendingCompilation.length} remain pending. A generated draft is not a reviewed activity. None can be added to Today or Week.</p>
        {membership.role === "owner" && <details className="research-provenance my-5"><summary>Download the original foundation research</summary><p className="leading-7">These files contain the original eight primitives, short drafts and source records—not the complete activity candidates above. Neither file contains family data.</p><div className="mt-4 flex flex-wrap gap-3"><a className="button-ghost" href="/library/research/export?format=markdown" download>Foundation worksheet</a><a className="button-ghost" href="/library/research/export" download>Foundation records (JSON)</a></div></details>}
        {catalog.primitives.map(primitive => {
          const stack = rejectedBatch.stacks.find(s => s.primitiveId === primitive.id);
          const finding = review.findings[primitive.id as keyof typeof review.findings];
          const packageItem = reviewPackage.primitives.find(p => p.primitive.id === primitive.id);
          const current = packageItem?.generation;
          return <details className="research-primitive" key={primitive.id}>
            <summary><ChevronDown aria-hidden="true" className="research-disclosure-icon" /><span className="research-primitive-title">{primitive.name}</span><span className="text-sm text-muted-foreground">Draft pattern · needs review</span></summary>
            <div className="research-body">
              <p>{primitive.mechanism}</p><h3>Evidence connection</h3>
              {catalog.claims.filter(c => primitive.claimIds.includes(c.id)).map(claim => <div className="research-claim" key={claim.id}>
                <p>{claim.text}</p><p className="text-sm text-muted-foreground">{claim.scope}. Does not establish: {claim.notSupported}</p>
                <div className="research-citations">{claim.sourceIds.map(id => <a key={id} href={`#${id}`}>{catalog.sources.find(s => s.id === id)?.publisher}</a>)}</div>
              </div>)}
              <h3>Fixed drafting constraints</h3>
              <ul>{primitive.constraints.map(rule => <li key={rule}>{rule}</li>)}</ul>
              <p><strong>Materials:</strong> {primitive.materials.join("; ")}</p>
              <p><strong>Applicability still unresolved:</strong> {primitive.readiness}</p>
              <h3>Current drafting issues</h3><p>{packageItem?.preflight.finding}</p><p className="text-sm text-muted-foreground">AI-assisted defect inspection, not an independent safety or content review. Publication remains blocked.</p>
              {membership.role === "owner" && current && <details className="research-provenance"><summary>Inspect current drafts for review</summary><p><strong>Unpublished. Do not use as activity instructions.</strong> Local contract: {current.status === "unreviewed_ai_draft" ? "passed structure checks only" : "rejected"}. Independent review is still required.</p>{current.drafts.map((draft,index)=><article className="research-claim" key={index}><h4>{draft.title}</h4><p>{draft.invitation}</p><p><strong>Adult wording:</strong> {draft.caregiverWords}</p><p><strong>Optional noticing:</strong> {draft.observation}</p></article>)}<p>Generated {current.generatedAt} with {current.model}. {current.promptTokens} input tokens; {current.completionTokens} output tokens. No family data sent.</p></details>}
              {finding && <><h3>Earlier rejected batch</h3><p>{finding}</p></>}
              {membership.role === "owner" && stack ? <details className="research-provenance">
                <summary>Inspect rejected drafts and generation record</summary>
                <p><strong>Rejected output. Do not use these as activity instructions.</strong> Preserved for audit, not presented as personalised advice.</p>
                <div className="research-drafts">{stack.drafts.map((draft, index) => <article key={index}>
                  <h4>{draft.title}</h4><p>{draft.invitation}</p><p><strong>Generated wording:</strong> {draft.caregiverWords}</p><p><strong>Generated noticing:</strong> {draft.observation}</p>
                </article>)}</div>
                <p>Model: {stack.model}</p><p>Generated: {stack.generatedAt}</p>
                <p>Tokens: {stack.promptTokens} input / {stack.completionTokens} output</p>
                <p>Compiler: {rejectedBatch.compilerVersion}</p><p className="break-all">Prompt fingerprint: {stack.promptHash}</p>
                <p>No family data was sent. Rejection was recorded separately from the model output.</p>
              </details> : <p>Rejected output is available to the owner for development review.</p>}
            </div>
          </details>;
        })}
      </section>
      <section id="sources" className="research-section">
        <h2>Source register</h2>
        <p className="workspace-description">Checked {catalog.checkedAt}. Source access and appraisal depth are recorded separately. Broad guidance does not validate an individual activity.</p>
        {catalog.sources.map(source => <article id={source.id} className="research-source" key={source.id}>
          <h3><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ExternalLink aria-hidden="true" className="inline h-4 w-4" /><span className="sr-only"> (opens in a new tab)</span></a></h3>
          <p className="text-sm text-muted-foreground">{source.publisher} · {source.year} · {source.type}</p>
          <p>{source.summary}</p><p><strong>Limits:</strong> {source.limit}</p>
          <details><summary>Access and reuse record</summary><p>{source.access}</p><p>Locator: {source.location}</p><p>{source.rights}</p></details>
        </article>)}
      </section>
      <section id="review" className="research-section">
        <h2>Before a draft becomes an activity</h2>
        <ol className="research-review">
          <li>Appraise the full sources and each claim, including contradictory or missing evidence.</li>
          <li>Review developmental applicability, materials, supervision, hazards and stop guidance.</li>
          <li>Check wording, accessibility, cultural fit and content rights.</li>
          <li>Publish a reviewed template version through an editorial process—not a parent’s approval click.</li>
          <li>Only then allow bounded personalisation and the normal family eligibility checks.</li>
        </ol>
        <p className="workspace-description">An independent reviewer has not yet been arranged. Source access varies, full appraisal is incomplete, and no draft has been approved for publication. A passing schema test is not a safety review. Existing family plans are untouched.</p>
      </section>
    </div>
  </main>;
}
