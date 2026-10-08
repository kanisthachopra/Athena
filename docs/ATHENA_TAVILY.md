# Athena Tavily integration

The owner authorized application search/extraction on 7 October 2026. Uses direct REST from `lib/athena/tavily.ts`, not a CLI subprocess or the developer's OAuth session. Credentials remain server-only.

## Configuration

Put `TAVILY_API_KEY` in ignored `.env.local` and the eventual host's secret settings. The CLI OAuth login is separate and did not expose an application API key. For explicitly limited development verification, `TAVILY_ALLOW_KEYLESS=true` uses Tavily's documented capped Search/Extract access; it is not an unlimited production plan and never silently overrides a bad API key.

The staged POST route `/api/athena/discovery` requires `ATHENA_DISCOVERY_ENABLED=true`, same-origin requests, signed-in owner/caregiver membership and explicit `shareWithTavily:true` on each request. It is off by default. Before public enablement, connect the disclosure UI and durable per-family usage controls; the route's validation and fixed request sizes do not constitute a distributed rate limiter. No live deployment or existing plan change was made.

Search JSON: `{ "action": "search", "query": "public educational search terms", "shareWithTavily": true }`.
Extract JSON: `{ "action": "extract", "url": "https://public-source.example/page", "shareWithTavily": true }`.

The caller must explain that the submitted query/URL goes to Tavily and should not include private family details. The integration reads no stored child profile or reflections. Discovered resources return `unverified_discovery` and `access:unknown`; extraction returns `extracted_unreviewed` or `unavailable`. Truncated text is marked. Extraction does not establish completeness, licensing, age suitability or free access. Provider content must be treated as untrusted data and displayed as text, not executable HTML.

## Verification

`node scripts/test-athena-discovery.mjs` tests validation, deduplication, source binding, provider failures, endpoint enablement, origin, authentication, role, input size and disclosure. The route is tested with mocked identity/provider dependencies.

`node --env-file=.env.local scripts/test-athena-discovery.mjs --live` tests the actual application provider against public material using an application key. `node scripts/test-athena-discovery.mjs --live --keyless` explicitly tests keyless access. On 7 October the latter passed with five search results and extracted UNICEF source text. It submitted no private family data. This verifies the application provider, not a signed-in browser round trip or the complete future town UI.

Docs: [Search](https://docs.tavily.com/documentation/api-reference/endpoint/search), [Extract](https://docs.tavily.com/documentation/api-reference/endpoint/extract), [setup and keyless access](https://tavily.com/agent-setup/SKILL.md).
