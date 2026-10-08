import { AppHeader } from "@/components/app-header";
import { AskMiraForm } from "@/components/ask-mira-form";
import { requireFamilyContext } from "@/lib/family-context";
import { isAiAllowed } from "@/lib/ai-preferences";
export const metadata = { title: "Guide" };
export default async function GuidePage() {
 const { family, membership, supabase } = await requireFamilyContext();
 const { data, error } = await supabase.from("family_ai_preferences").select("guide_enabled,profile_enabled,journal_enabled,policy_version,revision").eq("family_id", membership.family_id).maybeSingle();
 const availability = error ? "unavailable" : isAiAllowed(data, "guide") ? "enabled" : "off";
 return <main className="min-h-screen bg-cream text-ink"><AppHeader familyName={family?.display_name ?? "Your family"} /><div className="workspace-page"><h1 className="workspace-heading">Guide</h1><p className="workspace-description">A little help thinking it through.</p><AskMiraForm availability={availability} /></div></main>;
}
