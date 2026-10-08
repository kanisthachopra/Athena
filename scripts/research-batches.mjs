// Explicit local batch selection, never a user-supplied import path.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
export function loadResearchModule(path, dependencies = {}) {
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Function("require", "exports", js)(id => id === "server-only" ? {} : dependencies[id] ?? require(id), exports);
  return exports;
}
export const readResearchJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
export function selectResearchBatch(argv) {
  const selectors = argv.filter(arg => arg.startsWith("--batch="));
  if (selectors.length > 1) throw new Error("Duplicate batch selection");
  const name = selectors[0]?.slice(8) ?? "foundation";
  if (!["foundation", "play-expansion"].includes(name)) throw new Error("Unknown batch");
  const directory = name === "foundation" ? "../content/research/" : "../content/research/expansion/";
  return { name, directory, args: argv.filter(arg => !arg.startsWith("--batch=")) };
}
export function loadResearchBatch(batch) {
  const baseline = loadResearchModule("../lib/research-content.ts", { "@/content/research/catalog.json": readResearchJson("../content/research/catalog.json") });
  const core = batch.name === "foundation" ? baseline : loadResearchModule("../lib/research-expansion-content.ts", {
    "@/lib/research-content": baseline,
    "@/content/research/expansion/catalog.json": readResearchJson(`${batch.directory}catalog.json`),
  });
  core.validateCatalog();
  const integrity = loadResearchModule("../lib/research-bundle.ts", { "@/lib/research-content": core });
  return { core, integrity };
}
