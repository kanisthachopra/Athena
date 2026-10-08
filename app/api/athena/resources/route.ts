import { authorizeResourceRequest, readLimitedBody, resourceReply, ResourceRequestError } from "@/lib/athena/request";
import { DiscoveryError, extractResource, searchResources, sourceUrl } from "@/lib/athena/tavily";
import { explainResource } from "@/lib/athena/resource-guide";
import { AiPermissionError } from "@/lib/ai/permission";
import { GuideBudgetError } from "@/lib/ai/guide-budget";
import { ageBandLabel } from "@/lib/athena/resource-context";
import { resources } from "@/lib/athena/resource-catalog";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let access: Awaited<ReturnType<typeof authorizeResourceRequest>> | undefined;
  try {
    access = await authorizeResourceRequest(request);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ResourceRequestError("JSON is required.", 415);
    let body;
    try { body = JSON.parse(new TextDecoder().decode(await readLimitedBody(request, 6000))); }
    catch (error) { if (error instanceof ResourceRequestError) throw error; throw new ResourceRequestError("Please check your message."); }
    if (!body || body.shareWithTavily !== true) throw new ResourceRequestError("Confirm sending this search or public link to Tavily.");
    if (body.action === "search") {
      if (typeof body.query !== "string" || !body.query.trim() || body.query.length > 280 || !["language", "movement", "discovery", "connection", "creative"].includes(body.domain) || !Number.isInteger(body.ageMonths) || body.ageMonths < 0 || body.ageMonths > 72 || typeof body.language !== "string" || body.language.length > 30) throw new ResourceRequestError("Choose an age and a short resource request.");
      const ageBand = ageBandLabel(body.ageMonths);
      if (!ageBand) throw new ResourceRequestError("Choose a supported age band.");
      const query = `Free parent resources child age band ${ageBand} ${body.domain} ${body.language} India: ${body.query}`.slice(0, 400);
      await access.beforeRequest();
      const result = await searchResources(query);
      await access.verify();
      await access.finish("succeeded", { model: "tavily/basic", promptTokens: 0, completionTokens: 0, latencyMs: 0, usageKnown: false });
      return resourceReply(result);
    }
    if (body.action === "explain" && body.shareWithNebius === true && sourceUrl(body.url) && typeof body.question === "string" && body.question.length <= 1200) {
      await access.beforeRequest();
      const source = await extractResource(body.url);
      if (!source.content) throw new ResourceRequestError("I couldn’t read this source. Open the original resource; I won’t guess its contents.", 422);
      const known = resources.find(r => sourceUrl(r.url) === source.url);
      const result = await explainResource(source.content, body.question || "What can a parent take away from this resource?", access.beforeRequest, { ageBand: ageBandLabel(body.ageMonths), resourceNote: known?.ageNote, audience: known?.audience });
      await access.verify();
      await access.finish("succeeded", result.completion);
      return resourceReply({ ...result.explanation, sourceUrl: source.url, extractedAt: source.checkedAt, partial: source.truncated || source.content.length > 18000 });
    }
    throw new ResourceRequestError("Choose a resource and confirm source explanation first.");
  } catch (error) {
    await access?.finish("failed", undefined, "provider").catch(() => {});
    const message = error instanceof ResourceRequestError || error instanceof DiscoveryError || error instanceof AiPermissionError || error instanceof GuideBudgetError ? error.message : "I couldn’t produce a grounded explanation. You can still open the original resource or try again.";
    return resourceReply({ error: message }, error instanceof ResourceRequestError ? error.status : error instanceof AiPermissionError ? 403 : 503);
  }
}
