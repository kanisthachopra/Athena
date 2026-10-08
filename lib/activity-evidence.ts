import { publicSourceUrl, type GuideClaim } from "@/lib/guide-grounding";

/** Parse stored evidence without substituting today's mutable source rows. */
export function parseActivityEvidence(value: unknown, templateId: string): GuideClaim[] | null {
  if (!Array.isArray(value) || !value.length || value.length > 40) return null;
  const claims: GuideClaim[] = [];
  const day = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
    && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || !entry.link || !entry.claim) return null;
    const c = entry.claim, link = entry.link;
    if (typeof c.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id)
      || link.template_id !== templateId || link.claim_id !== c.id || claims.some(claim => claim.id === c.id)
      || c.status !== "approved" || !day(c.checked_on) || !day(c.review_due_on) || c.review_due_on < c.checked_on) return null;
    const limits = { claim_text: 1600, source_title: 300, source_organisation: 200, applicability: 1600, not_supported: 1600 };
    if (Object.entries(limits).some(([key,max]) => typeof c[key] !== "string" || !c[key].trim() || c[key].length > max)
      || (c.notes !== null && c.notes !== undefined && (typeof c.notes !== "string" || c.notes.length > 1200))
      || !["guideline", "systematic_review", "research_review", "expert_consensus", "practice_explanation", "implementation_package", "framework", "professional_position", "policy_statement"].includes(c.evidence_type)) return null;
    const url = publicSourceUrl(c.source_url);
    if (!url) return null;
    claims.push({ id: c.id, text: c.claim_text, title: c.source_title, url, organisation: c.source_organisation,
      checkedOn: c.checked_on, reviewDueOn: c.review_due_on, editorialNotes: c.notes ?? "",
      applicability: c.applicability, notSupported: c.not_supported, evidenceType: c.evidence_type });
  }
  return claims;
}
