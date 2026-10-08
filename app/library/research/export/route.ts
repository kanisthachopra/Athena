import { requireFamilyContext } from "@/lib/family-context";
import { buildResearchReviewPackage, renderResearchReviewWorksheet } from "@/lib/research-review";
import checkpoint from "@/content/research/review-checkpoint.json";
import { createReviewSubmission } from "@/lib/research-review-intake";
export async function GET(request: Request) {
  const { membership } = await requireFamilyContext();
  const headers = { "Cache-Control": "private, no-store" };
  if (membership.role !== "owner") return Response.json({ error: "Only the owner can export the editorial review package." }, { status: 403, headers });
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "markdown" && format !== "response") return Response.json({ error: "Choose JSON, Markdown or the review response form." }, { status: 400, headers });
  try {
    const review = buildResearchReviewPackage(checkpoint);
    if (format === "response") return new Response(JSON.stringify(createReviewSubmission(review), null, 2), { headers: {
      ...headers, "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'attachment; filename="mira-editorial-response.json"',
    } });
    if (format === "markdown") return new Response(renderResearchReviewWorksheet(review), { headers: {
      ...headers, "Content-Type": "text/markdown; charset=utf-8", "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'attachment; filename="mira-activity-review-worksheet.md"',
    } });
    return new Response(JSON.stringify(review, null, 2), { headers: {
      ...headers, "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mira-activity-review-package.json"',
    } });
  } catch {
    return Response.json({ error: "The review package needs a provenance check. No partial file was created." }, { status: 503, headers });
  }
}
