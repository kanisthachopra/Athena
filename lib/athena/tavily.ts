import "server-only";

export class DiscoveryError extends Error {
  constructor(readonly code: "invalid_input" | "not_configured" | "unavailable" | "limit" | "invalid_response") {
    super(code === "not_configured" ? "Resource search is not configured." : code === "invalid_input" ? "Check the search or source URL." : code === "limit" ? "Resource search has reached its current allowance. Try again later." : "Resource search is unavailable. Your plan has not changed.");
  }
}

// No local URL fetching: only the fixed Tavily API receives requests.
export function sourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.includes(".")
      || /^\[|^[\d.]+$/.test(url.hostname) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DiscoveryError("invalid_response");
  return value as RecordValue;
}

async function request(endpoint: "search" | "extract", body: RecordValue) {
  const key = process.env.TAVILY_API_KEY?.trim();
  const keyless = process.env.TAVILY_ALLOW_KEYLESS === "true";
  if (!key && !keyless) throw new DiscoveryError("not_configured");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;
  else headers["X-Tavily-Access-Mode"] = "keyless";
  try {
    const response = await fetch(`https://api.tavily.com/${endpoint}`, {
      method: "POST", headers, body: JSON.stringify(body), cache: "no-store",
      redirect: "error", signal: AbortSignal.timeout(25_000),
    });
    if ([429, 432, 433].includes(response.status)) throw new DiscoveryError("limit");
    if (!response.ok) throw new DiscoveryError("unavailable");
    // Bound the decoded response, including chunked responses.
    if (!response.body) throw new DiscoveryError("invalid_response");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "", bytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 2_000_000) throw new DiscoveryError("invalid_response");
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    } finally { await reader.cancel().catch(() => {}); }
    return record(JSON.parse(text));
  } catch (error) {
    if (error instanceof DiscoveryError) throw error;
    throw new DiscoveryError("unavailable");
  }
}

export async function searchResources(query: string) {
  if (typeof query !== "string" || !query.trim() || query.length > 400) throw new DiscoveryError("invalid_input");
  const data = await request("search", {
    query: query.trim(), topic: "general", search_depth: "basic", max_results: 5,
    auto_parameters: false, include_answer: false, include_raw_content: false,
    include_images: false, include_usage: true, safe_search: true,
  });
  if (!Array.isArray(data.results)) throw new DiscoveryError("invalid_response");
  const seen = new Set<string>();
  const results = data.results.slice(0, 5).flatMap(value => {
    const row = record(value), url = sourceUrl(row.url);
    if (!url || seen.has(url) || typeof row.title !== "string" || typeof row.content !== "string") return [];
    seen.add(url);
    return [{ url, title: row.title.slice(0, 300), snippet: row.content.slice(0, 2000),
      status: "unverified_discovery" as const, access: "unknown" as const }];
  });
  return { results, provider: "tavily" as const, checkedAt: new Date().toISOString() };
}

export async function extractResource(value: string) {
  const url = sourceUrl(value);
  if (!url) throw new DiscoveryError("invalid_input");
  const data = await request("extract", {
    urls: [url], extract_depth: "basic", format: "text", include_images: false, include_usage: true,
  });
  if (!Array.isArray(data.results)) throw new DiscoveryError("invalid_response");
  // Bind content to the requested source; unrecognized redirects are not silently trusted.
  const item = data.results.map(record).find(row => sourceUrl(row.url) === url);
  if (!item || typeof item.raw_content !== "string" || !item.raw_content.trim()) {
    return { url, status: "unavailable" as const, content: null, provider: "tavily" as const };
  }
  return { url, status: "extracted_unreviewed" as const, content: item.raw_content.slice(0, 30_000),
    truncated: item.raw_content.length > 30_000, provider: "tavily" as const, checkedAt: new Date().toISOString() };
}
