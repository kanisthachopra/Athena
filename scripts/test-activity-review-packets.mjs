import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const cache = new Map();
function load(relative, overrides = {}) {
  const filename = resolve(root, relative);
  const exports = {};
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  new Function("require", "exports", code)(id => {
    if (id === "server-only") return {};
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (!id.startsWith("@/")) return require(id);
    if (!cache.has(id)) cache.set(id, id.endsWith(".json")
      ? JSON.parse(readFileSync(resolve(root, id.slice(2)), "utf8"))
      : load(`${id.slice(2)}.ts`));
    return cache.get(id);
  }, exports);
  return exports;
}
const packets = load("lib/activity-review-packets.ts");
const integrity = cache.get("@/lib/research-bundle");
const releases = cache.get("@/lib/activity-release");
const collection = packets.listActivityReviewPackets();
assert.equal(collection.length, 7);
assert.equal(new Set(collection.map(item => item.slug)).size, 7);
for (const item of collection) {
  const packet = packets.getActivityReviewPacket(item.slug);
  assert.equal(item.candidateFingerprint, integrity.fingerprint(packet.candidate));
  assert.equal(packet.packageFingerprint, packet.candidate.origin.packageFingerprint);
  assert.equal(item.minimumMonths, packet.candidate.template.min_age_months);
  assert.equal(item.maximumMonths, packet.candidate.template.max_age_months);
  const expectedResponse = JSON.parse(readFileSync(resolve(root, `docs/activity-review/${item.slug}.response.json`), "utf8"));
  const response = JSON.parse(packets.exportActivityReviewPacket(packet, "response"));
  assert.deepEqual(response, expectedResponse, "Existing exact-version blank response must not drift");
  assert.equal(releases.assessActivityReleaseReview(packet.candidate, response, packet.review).publicationAllowed, false);
  assert.equal(releases.assessActivityReleaseReview(packet.candidate, response, packet.review).state, "blocked");
  const json = JSON.parse(packets.exportActivityReviewPacket(packet, "json"));
  assert.equal(json.schedulable, false); assert.equal(json.publicationAllowed, false);
  assert.deepEqual(json.candidate, packet.candidate); assert.deepEqual(json.sourcePackage, packet.review);
  assert.equal(json.packageFingerprint, integrity.fingerprint(json.sourcePackage));
  assert.equal(json.sourcePackage.primitives.every(p => p.reviewer.name === null && p.decision === null), true);
  const worksheet = packets.exportActivityReviewPacket(packet, "markdown");
  assert.ok(worksheet.startsWith(readFileSync(resolve(root, `docs/activity-review/${item.slug}.md`), "utf8")));
  assert.ok(worksheet.includes(item.candidateFingerprint));
  assert.match(worksheet, /Unpublished\. Not instructions for families to try/);
  for (const source of packet.sources) assert.ok(worksheet.includes(source.url));
}
const mark = packets.getActivityReviewPacket("marks-of-their-own");
assert.equal(mark.packageFingerprint, "6dc5489c98fc951a80a34d8c31feeae0b34598bd5cff7e54ea793d28dedab0c6");
assert.equal(mark.candidateFingerprint, "2a9e0e0d8530f77fce0051dcf60188a9d69e387e97a5b3c4b21e28c1416836ab");
assert.ok(mark.sources.some(source => source.publisher.includes("American Academy")));
for (const invalid of ["", "__proto__", "constructor", "../../.env.local", "/marks-of-their-own", "marks-of-their-own.json", "unknown"]) {
  assert.equal(packets.hasActivityReviewPacket(invalid), false);
  assert.equal(packets.getActivityReviewPacket(invalid), null);
}
// Changing a source, prompt identity or preflight must not create a new apparently
// valid package under the old candidate's fingerprint.
const review = cache.get("@/lib/research-review");
const expansion = cache.get("@/lib/research-expansion-content");
const checkpoint = cache.get("@/content/research/expansion/review-checkpoint.json");
const preflight = cache.get("@/content/research/expansion/preflight-review.json");
assert.throws(() => review.buildResearchReviewPackage(checkpoint));
assert.throws(() => integrity.validateResearchBundle(cache.get("@/content/research/review-checkpoint.json"), {}, expansion));
assert.throws(() => review.buildResearchReviewPackage(checkpoint, { catalog: expansion.catalog,
  preflight: { ...preflight, checkpointHash: "stale" },
  validateResearchBundle: (input, options) => integrity.validateResearchBundle(input, options, expansion),
}));
const changedReview = structuredClone(mark.review);
changedReview.sources[0].summary += " Changed.";
assert.ok(releases.assessActivityReleaseCandidate(mark.candidate, changedReview).issues.length);

let role = "viewer", authorized = true, broken = false, reads = 0;
const familyContext = { requireFamilyContext: async () => {
  if (!authorized) throw new Error("Sign in required");
  return { membership: { role }, family: { display_name: "Synthetic review family" } };
} };
const route = load("app/library/research/activities/export/route.ts", {
  "@/lib/family-context": familyContext,
  "@/lib/activity-review-packets": { ...packets, getActivityReviewPacket: slug => {
    reads++; if (broken) throw new Error("Private diagnostic must not escape");
    return packets.getActivityReviewPacket(slug);
  } },
});
const request = query => new Request(`https://mira.test/library/research/activities/export?${query}`);
for (const deniedRole of ["viewer", "caregiver"]) {
  role = deniedRole;
  for (const format of ["json", "markdown", "response"]) {
    const response = await route.GET(request(`activity=marks-of-their-own&format=${format}`));
    assert.equal(response.status, 403); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
}
assert.equal(reads, 0);
authorized = false;
await assert.rejects(() => route.GET(request("activity=marks-of-their-own")), /Sign in required/);
assert.equal(reads, 0);
authorized = true; role = "owner";
for (const item of collection) for (const format of ["json", "markdown", "response"]) {
  const response = await route.GET(request(`activity=${item.slug}&format=${format}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(response.headers.get("Content-Disposition"), /^attachment; filename="mira-[a-z-]+\.(json|md)"$/);
  assert.equal(await response.text(), packets.exportActivityReviewPacket(packets.getActivityReviewPacket(item.slug), format));
}
for (const [query, status] of [["", 400], ["activity=unknown", 404], ["activity=..%2F..%2F.env.local", 404],
  ["activity=marks-of-their-own&format=html", 400], ["activity=marks-of-their-own&activity=answer-their-sound", 400],
  ["activity=marks-of-their-own&format=json&format=response", 400]]) assert.equal((await route.GET(request(query))).status, status);
broken = true;
const failed = await route.GET(request("activity=marks-of-their-own"));
assert.equal(failed.status, 503); assert.equal(failed.headers.get("Cache-Control"), "private, no-store");
assert.ok(!(await failed.text()).includes("Private diagnostic"));

const ui = load("components/activity-review-collection.tsx", { "@/lib/activity-review-packets": packets });
const html = renderToStaticMarkup(React.createElement(ui.ActivityReviewCollection));
for (const item of collection) assert.ok(html.includes(`activity=${item.slug}`));
assert.equal((html.match(/ download=""/g) ?? []).length, 21);
assert.match(html, /age ranges are proposals/); assert.match(html, /not yet a balanced library/);
assert.ok(!html.includes("<form"));
const failedUI = load("components/activity-review-collection.tsx", { "@/lib/activity-review-packets": { listActivityReviewPackets: () => { throw new Error("private"); } } });
const failedHTML = renderToStaticMarkup(React.createElement(failedUI.ActivityReviewCollection));
assert.match(failedHTML, /Reload review materials/); assert.ok(!failedHTML.includes("download=")); assert.ok(!failedHTML.includes("private"));
assert.match(failedHTML, /<form action="\/library\/research#activity-review" method="get">/);
assert.match(failedHTML, /<button type="submit"/);
const hostileUI = load("components/activity-review-collection.tsx", { "@/lib/activity-review-packets": { listActivityReviewPackets: () => [{ ...collection[0], title: "<script>test</script>" }] } });
assert.ok(!renderToStaticMarkup(React.createElement(hostileUI.ActivityReviewCollection)).includes("<script>test"));
const page = load("app/library/research/page.tsx", {
  "@/lib/family-context": familyContext,
  "@/components/app-header": { AppHeader: () => null },
  "@/components/activity-review-collection": ui,
  "next/link": ({ children, ...props }) => React.createElement("a", props, children),
});
for (const deniedRole of ["viewer", "caregiver"]) {
  role = deniedRole;
  const deniedHTML = renderToStaticMarkup(await page.default());
  assert.ok(!deniedHTML.includes("Complete activities for review"));
  assert.ok(!deniedHTML.includes("activities/export"));
}
role = "owner";
assert.ok(renderToStaticMarkup(await page.default()).includes("Complete activities for review"));
console.log("Seven complete review packets match existing exact-version artifacts; both batches, supplementary sources, pending review, export authorization, safe failures and owner-only UI pass. No network, AI or family writes.");
