import { AppHeader } from "@/components/app-header";
import { MotionPreference } from "@/components/motion-preference";
import { requireFamilyContext } from "@/lib/family-context";
import Link from "next/link";
import { AiPreferencesForm } from "@/components/ai-preferences-form";
import { AI_OFF, type AiPreferences } from "@/lib/ai-preferences";
import { loadFamilyCalendar } from "@/lib/family-calendar";
import { FamilyCalendarForm } from "@/components/family-calendar-form";
export const metadata = { title: "Settings" };
export default async function SettingsPage() {
 const { supabase, family, membership, activeChild } = await requireFamilyContext();
 const calendar = await loadFamilyCalendar(supabase, membership.family_id).catch(() => null);
 const zones = [...new Set(["UTC", "Asia/Kolkata", ...(calendar?.timeZone ? [calendar.timeZone] : []), ...Intl.supportedValuesOf("timeZone")])].sort();
 const { data: aiPreferences, error: aiError } = await supabase.from("family_ai_preferences").select("guide_enabled,profile_enabled,journal_enabled,policy_version,revision").eq("family_id", membership.family_id).maybeSingle();
 return <main className="min-h-screen"><AppHeader familyName={family?.display_name ?? "Your family"} /><div className="workspace-page max-w-4xl"><h1 className="workspace-heading">Settings</h1><p className="workspace-description">Your account, display preferences and family data.</p>
 <section className="settings-row"><h2>Display</h2><MotionPreference control /></section>
 <section id="family-calendar" className="settings-row scroll-mt-28"><h2>Family calendar</h2>{calendar ? <FamilyCalendarForm key={membership.family_id} familyId={membership.family_id} initial={calendar} zones={zones} canEdit={membership.role === "owner"} /> : <div className="mt-4"><p role="alert">Your family calendar could not be loaded. Saved dates are unchanged.</p><a href="/settings#family-calendar" className="button-ghost mt-3">Reload Settings</a></div>}</section>
 <section className="settings-row"><h2>Account access</h2><p>Your family role is <strong>{membership.role}</strong>. Family owners manage invitations and access.</p><div className="spatial-actions"><Link className="button-ghost" href="/auth/forgot-password">Reset password</Link><Link className="button-ghost" href="/family">Manage family access</Link></div></section>
 <section className="settings-row"><h2>Your family’s information</h2><p>Review the preferences MIRA uses. You can edit your family profile, manage children and remove individual observations from Insights.</p><div className="spatial-actions"><Link href="/memory" className="button-ghost">What MIRA understands</Link><Link href="/family" className="button-ghost">Manage profiles</Link><a href={`/family/export?child=${activeChild.id}`} className="button-ghost">Export {activeChild.nickname}’s data</a></div></section>
 <section id="ai-controls" className="settings-row scroll-mt-8"><h2>AI choices</h2>{aiError ? <div className="mt-4"><p role="alert" className="leading-7">MIRA could not load your AI settings. New AI requests are blocked when permission cannot be verified. Your saved plans and direct observations remain available.</p><a href="/settings" className="button-ghost mt-3">Reload Settings</a></div> : <AiPreferencesForm familyId={membership.family_id} initial={(aiPreferences as AiPreferences | null) ?? AI_OFF} canEdit={membership.role === "owner"} />}<Link href="/help" className="button-ghost mt-4">Read help</Link></section>
 </div></main>;
}
