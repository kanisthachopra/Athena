import "server-only";
import { createClient } from "@/lib/supabase/server";
import { familyAiAuthorizer } from "@/lib/ai/permission";
import { guideRequestBudget } from "@/lib/ai/guide-budget";

export class ResourceRequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
export const resourceReply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function authorizeResourceRequest(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new ResourceRequestError("Request origin is not allowed.", 403);
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims?.sub) throw new ResourceRequestError("Sign in to use voice and live resource help.", 401);
  const member = await client.from("family_members").select("role,family_id").eq("user_id", data.claims.sub).maybeSingle();
  if (member.error) throw new ResourceRequestError("Your caregiver access could not be checked. Please try again.", 503);
  if (!member.data || !["owner", "caregiver"].includes(member.data.role)) throw new ResourceRequestError("Set up your caregiver account to use the live guide.", 403);
  const familyId = member.data.family_id;
  const authorize = familyAiAuthorizer(client, familyId, "guide");
  await authorize();
  const budget = guideRequestBudget(client, familyId);
  const verify = async () => {
    const latest = await client.from("family_members").select("role,family_id").eq("user_id", data.claims.sub).maybeSingle();
    if (latest.error || latest.data?.family_id !== familyId || !["owner", "caregiver"].includes(latest.data?.role ?? "")) throw new ResourceRequestError("Your caregiver access changed. Please reload before trying again.", 403);
    await authorize();
  };
  return {
    async beforeRequest() { await verify(); await budget.beforeRequest(); },
    verify,
    finish: budget.finish,
  };
}

export async function readLimitedBody(request: Request, limit: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) throw new ResourceRequestError("The request is empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > limit) throw new ResourceRequestError("This recording or message is too large. Please make it shorter.", 413);
      chunks.push(item.value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
