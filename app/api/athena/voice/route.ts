import { authorizeResourceRequest, readLimitedBody, resourceReply, ResourceRequestError } from "@/lib/athena/request";
import { audioTypes, transcribeAudio, VoiceError } from "@/lib/athena/deepgram";
import { AiPermissionError } from "@/lib/ai/permission";
import { GuideBudgetError } from "@/lib/ai/guide-budget";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let access: Awaited<ReturnType<typeof authorizeResourceRequest>> | undefined;
  try {
    access = await authorizeResourceRequest(request);
    if (request.headers.get("x-athena-voice-consent") !== "deepgram-v1") throw new ResourceRequestError("Please confirm voice transcription before recording.");
    const contentType = request.headers.get("content-type") || "";
    if (!audioTypes.includes(contentType.split(";")[0])) throw new ResourceRequestError("This recording format isn’t supported. Please type instead.", 415);
    const audio = await readLimitedBody(request, 3_000_000);
    if (audio.byteLength < 100) throw new ResourceRequestError("Please record a short message.");
    await access.beforeRequest();
    const result = await transcribeAudio(audio, contentType);
    await access.verify();
    await access.finish("succeeded", { model: "deepgram/nova-3", promptTokens: 0, completionTokens: 0, latencyMs: 0, usageKnown: false });
    return resourceReply(result);
  } catch (error) {
    await access?.finish("failed", undefined, "provider").catch(() => {});
    const message = error instanceof ResourceRequestError || error instanceof VoiceError || error instanceof AiPermissionError || error instanceof GuideBudgetError ? error.message : "Voice could not complete. Your message has not been sent as a search.";
    return resourceReply({ error: message }, error instanceof ResourceRequestError ? error.status : error instanceof AiPermissionError ? 403 : error instanceof VoiceError && error.code === "no_speech" ? 422 : 503);
  }
}
