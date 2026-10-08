// Software fixtures only. Never imported into Supabase or the application.
export function evidenceFixture(templateId='11111111-1111-4111-8111-111111111111') {
  const id='22222222-2222-4222-8222-222222222222';
  return [{link:{template_id:templateId,claim_id:id},claim:{id,claim_key:'synthetic-only',claim_text:'Synthetic mechanism only',source_title:'Synthetic source',source_url:'https://example.org/study',source_organisation:'Synthetic publisher',evidence_type:'expert_consensus',checked_on:'2026-09-01',review_due_on:'2027-01-01',status:'approved',notes:'Synthetic scope note. Not a real review.',applicability:'Fictional software example only.',not_supported:'Does not establish suitability, safety or educational outcomes.'}}];
}
