import type { GuideClaim } from "@/lib/guide-grounding";

export function SourceRecords({ claims }: { claims: GuideClaim[] }) {
  return <div className="space-y-6 py-4">{claims.map(source => <section key={source.id} className="min-w-0 break-words">
    <h3 className="font-semibold"><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{source.title}</a></h3>
    <p className="mt-1 text-sm text-muted-foreground">{source.organisation} · Source check: {source.checkedOn} · Review due: {source.reviewDueOn}</p>
    <p className="mt-3 leading-7">{source.text}</p>
    <p className="mt-3 leading-7"><strong>Where this applies:</strong> {source.applicability}</p>
    <p className="mt-2 leading-7"><strong>What this does not establish:</strong> {source.notSupported}</p>
    {source.editorialNotes && <p className="mt-2 text-sm leading-6 text-muted-foreground">Source note: {source.editorialNotes}</p>}
  </section>)}</div>;
}
