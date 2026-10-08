import { AppHeader } from "@/components/app-header";
import { FamilyUnderstandingView } from "@/components/family-understanding";
import { requireFamilyContext } from "@/lib/family-context";
import { parseFamilyUnderstanding } from "@/lib/family-understanding";

export const metadata = { title: "What MIRA understands" };
export default async function MemoryPage() {
  const { supabase, family, activeChild, membership } = await requireFamilyContext();
  let understanding = null;
  try {
    const result = await supabase.rpc("get_family_understanding", { p_child_id: activeChild.id });
    if (!result.error) understanding = parseFamilyUnderstanding(result.data, activeChild.id, membership.family_id);
  } catch { /* Do not disclose private errors or turn a failed read into defaults. */ }
  return <main className="min-h-screen">
    <AppHeader familyName={family?.display_name ?? "Your family"} />
    <div className="workspace-page">
      <h1 className="workspace-heading">What MIRA understands</h1>
      <p className="workspace-description">Your family’s saved choices for <bdi>{activeChild.nickname}</bdi>. Check what fits, what needs correcting, and what is still unknown.</p>
      <FamilyUnderstandingView value={understanding} childId={activeChild.id} readOnly={membership.role === "viewer"} owner={membership.role === "owner"} />
    </div>
  </main>;
}
