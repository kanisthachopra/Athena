import { ChevronDown } from "lucide-react";
import { listActivityReviewPackets } from "@/lib/activity-review-packets";

// The parent server page authorizes owner-only rendering. Export authorization is
// independently enforced in the route; knowing a link never grants access.
export function ActivityReviewCollection() {
  let packets: ReturnType<typeof listActivityReviewPackets>;
  try {
    packets = listActivityReviewPackets();
  } catch {
    return <section id="activity-review" className="research-section scroll-mt-28">
      <h2>Complete activities for review</h2>
      <p className="workspace-description">The review files could not be verified against their source records. No draft has been approved. Reload this page to try again; if this continues, the source records need to be checked.</p>
      {/* Native GET submission re-checks provenance even at the same URL/hash. */}
      <form action="/library/research#activity-review" method="get">
        <button type="submit" className="button-ghost">Reload review materials</button>
      </form>
    </section>;
  }
  return <section id="activity-review" className="research-section scroll-mt-28">
    <h2>Complete activities for review</h2>
    <p className="workspace-description">Choose from {packets.length} drafts to download full instructions, source records and a blank review form. These are unpublished review materials, not activities to try with a child. The age ranges are proposals, not approved coverage.</p>
    {packets.map(packet => {
      const url = `/library/research/activities/export?activity=${packet.slug}`;
      return <details key={packet.slug} className="research-primitive">
        <summary>
          <ChevronDown aria-hidden="true" className="research-disclosure-icon" />
          <span className="research-primitive-title min-w-0 flex flex-col gap-2 sm:flex-row sm:justify-between sm:gap-4">
            <span className="break-words">{packet.title}</span>
            <span className="text-sm text-muted-foreground">Proposed {packet.minimumMonths}–{packet.maximumMonths} months</span>
          </span>
        </summary>
        <div className="research-body">
          <p>{packet.summary}</p>
          <p><strong>Underlying interaction:</strong> {packet.primitiveName}</p>
          <p><strong>Source trail:</strong> {packet.sourcePublishers.join("; ")}. Source links support the stated general rationale or material guidance—not proof that this activity is safe or effective.</p>
          <div className="my-5 flex flex-wrap gap-3" role="group" aria-label={`${packet.title} review downloads`}>
            <a className="button-primary" href={`${url}&format=markdown`} download aria-label={`Download worksheet for ${packet.title}`}>Download worksheet</a>
            <a className="button-ghost" href={`${url}&format=json`} download aria-label={`Download exact records for ${packet.title}`}>Exact records (JSON)</a>
            <a className="button-ghost" href={`${url}&format=response`} download aria-label={`Download blank review form for ${packet.title}`}>Blank review form</a>
          </div>
          <p className="text-sm text-muted-foreground">The Markdown worksheet includes the complete activity and its source batch. The JSON files preserve exact versions and unanswered review fields. No family data is included. Keep completed reviewer records private; this page does not accept or publish them.</p>
          <details className="research-provenance">
            <summary>Exact activity version</summary>
            <p className="break-all">{packet.candidateFingerprint}</p>
            <p>Any edit requires a fresh review of the changed version.</p>
          </details>
        </div>
      </details>;
    })}
    <p className="mt-6 max-w-prose text-sm leading-7 text-muted-foreground">Six focus on communication and shared attention; one explores mark-making. This is not yet a balanced library for ages 0–6. Independent review and a separate editor’s publication decision are still needed.</p>
  </section>;
}
