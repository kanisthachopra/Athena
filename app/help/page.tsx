import { AppHeader } from "@/components/app-header";
import { requireFamilyContext } from "@/lib/family-context";
import Link from "next/link";
export const metadata = { title: "Help" };
const questions = [
 ["Can we use MIRA without AI?", "Yes. Saved plans, the library and direct observations work without AI. The family owner can turn Guide, profile suggestions and journal suggestions on or off separately in Settings. Off stops new requests for that feature, including retries. It does not recall information already sent to the provider."],
 ["Do we have to finish the plan?", "No. Activities are optional. Repeating, stopping, choosing something else or leaving a day open are all valid. An unrecorded experience does not mean it did not happen."],
 ["What happens when I move an activity?", "Week shows the destination before saving. If another planned item is there, the two items swap. Tried or skipped days cannot be rearranged. Undo uses a check against the saved week; refresh if another caregiver has changed it."],
 ["Does Guide change my plan?", "No. The current Guide answers questions without changing plans or profiles. Each question is answered separately; previous messages are not sent as conversation context."],
 ["Can I correct what MIRA knows?", "Use What MIRA understands to review the stored profile, then edit learning preferences or child details. Profile suggestions are not facts: review them before copying them into the form and saving."],
 ["Is the activity library professionally reviewed?", "The current library includes prototype content. An activity’s review status is shown on its detail page. Availability in the app is not a claim of expert review, scientific validation or suitability for every child."],
 ["How do I prepare without keeping the screen open?", "Open an activity and read its materials, adult role and safety notes first. You do not need a timer, camera or continuous interaction with MIRA during the experience."],
 ["Why did a confirmation email not arrive?", "Check spam, check the address and request a new link from the confirmation page. Email delivery also depends on the project’s SMTP setup. Do not recreate your family or database to fix an email problem."],
];
export default async function HelpPage() {
 const { family } = await requireFamilyContext();
 return <main className="min-h-screen"><AppHeader familyName={family?.display_name ?? "Your family"} /><div className="workspace-page max-w-4xl"><h1 className="workspace-heading">Help with MIRA</h1><p className="workspace-description">How planning, observations and your information work.</p>{questions.map(([question,answer])=><details key={question} className="settings-row"><summary className="cursor-pointer py-2 text-lg">{question}</summary><p className="mt-4">{answer}</p></details>)}<div className="spatial-actions"><Link href="/settings" className="button-ghost">Settings and data controls</Link><Link href="/week" className="button-primary">Return to your week</Link></div></div></main>;
}
