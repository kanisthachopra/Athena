import { authorizeResourceRequest, resourceReply, ResourceRequestError } from "@/lib/athena/request";
import { AiPermissionError } from "@/lib/ai/permission";

// Check account readiness before asking for microphone access. No provider call or reservation.
export async function POST(request: Request) {
  try {
    await authorizeResourceRequest(request);
    return resourceReply({ ready: true });
  } catch (error) {
    return resourceReply({ error: error instanceof ResourceRequestError || error instanceof AiPermissionError ? error.message : "Your guide settings could not be checked. Please try again." }, error instanceof ResourceRequestError ? error.status : error instanceof AiPermissionError ? 403 : 503);
  }
}
