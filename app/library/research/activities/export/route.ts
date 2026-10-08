import { requireFamilyContext } from "@/lib/family-context";
import { exportActivityReviewPacket, getActivityReviewPacket, hasActivityReviewPacket } from "@/lib/activity-review-packets";

export async function GET(request: Request) {
  const { membership } = await requireFamilyContext();
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (membership.role !== "owner") return Response.json({ error: "Only the owner can download draft activity review materials." }, { status: 403, headers });
  const params = new URL(request.url).searchParams;
  const slug = params.get("activity") ?? "";
  const format = params.get("format") ?? "json";
  if (params.getAll("activity").length !== 1 || params.getAll("format").length > 1
    || !["json", "markdown", "response"].includes(format)) return Response.json({ error: "Choose an activity and a JSON, Markdown or blank response download." }, { status: 400, headers });
  if (!hasActivityReviewPacket(slug)) return Response.json({ error: "This draft is not in the review collection. Return to Research and choose an available activity." }, { status: 404, headers });
  try {
    const packet = getActivityReviewPacket(slug)!;
    const body = exportActivityReviewPacket(packet, format as "json" | "markdown" | "response");
    const suffix = format === "markdown" ? "worksheet.md" : format === "response" ? "response.json" : "packet.json";
    return new Response(body, { headers: {
      ...headers,
      "Content-Type": format === "markdown" ? "text/markdown; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mira-${packet.slug}-${suffix}"`,
    } });
  } catch {
    return Response.json({ error: "This activity's review materials need a provenance check. No partial file was created. Return to Research or try again after the records are corrected." }, { status: 503, headers });
  }
}
