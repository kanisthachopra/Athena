import { createClient } from "@/lib/supabase/server";
import { DiscoveryError, searchResources, extractResource } from "@/lib/athena/tavily";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  // This staged endpoint stays off until the operator enables it explicitly.
  if (process.env.ATHENA_DISCOVERY_ENABLED !== "true") return reply({ error: "Discovery is not enabled." }, 503);
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Request origin is not allowed." }, 403);
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getClaims();
    if (error || !data?.claims?.sub) return reply({ error: "Sign in to search resources." }, 401);
    const member = await client.from("family_members").select("role").eq("user_id", data.claims.sub).maybeSingle();
    if (member.error) return reply({ error: "Access could not be checked." }, 503);
    if (!member.data || !["owner", "caregiver"].includes(member.data.role)) return reply({ error: "Caregiver access is required." }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "JSON is required." }, 415);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Request is empty." }, 400);
    const decoder = new TextDecoder();
    let raw = "", size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 4096) return reply({ error: "Request is too large." }, 413);
        raw += decoder.decode(part.value, { stream: true });
      }
      raw += decoder.decode();
    } finally { await reader.cancel().catch(() => {}); }
    let body;
    try { body = JSON.parse(raw); } catch { return reply({ error: "Invalid JSON." }, 400); }
    // Explicit per-request disclosure acknowledgment; never fetch stored child context.
    if (!body || body.shareWithTavily !== true) return reply({ error: "Confirm sending this query or public URL to Tavily." }, 400);
    if (body.action === "search" && typeof body.query === "string") return reply(await searchResources(body.query));
    if (body.action === "extract" && typeof body.url === "string") return reply(await extractResource(body.url));
    return reply({ error: "Choose search or extract with valid input." }, 400);
  } catch (error) {
    if (error instanceof DiscoveryError) return reply({ error: error.message, code: error.code }, error.code === "invalid_input" ? 400 : error.code === "limit" ? 429 : 503);
    return reply({ error: "Discovery could not complete. Your plan has not changed." }, 503);
  }
}
