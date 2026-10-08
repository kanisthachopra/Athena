// Editorial command only. Outputs checkpoint JSON; never publishes or accesses family data.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { selectResearchBatch, loadResearchBatch } from "./research-batches.mjs";
const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  new Function("require", "exports", js)(id => id === "server-only" ? {} : dependencies[id] ?? require(id), exports);
  return exports;
}
try {
  const batch = selectResearchBatch(process.argv.slice(2));
  const argv = batch.args;
  if (argv.some(arg => !["--live", "--stream"].includes(arg) && !arg.startsWith("--limit=") && !arg.startsWith("--resume="))) throw new Error("Unknown option");
  const { core, integrity } = loadResearchBatch(batch);
  const { catalog } = core;
  const compiler = load("../lib/research-compiler.ts", { "@/lib/research-content": core, "@/lib/research-bundle": integrity });
  const maxCalls = Number(argv.find(arg => arg.startsWith("--limit="))?.slice(8) ?? "1");
  if (!Number.isInteger(maxCalls) || maxCalls < 1 || maxCalls > catalog.primitives.length) throw new Error("Invalid limit");
  const resume = argv.find(arg => arg.startsWith("--resume="))?.slice(9);
  const previous = resume ? JSON.parse(readFileSync(resume, "utf8")) : undefined;
  core.validateCatalog();
  if (previous !== undefined) integrity.validateResearchBundle(previous, { allowPartial: true });
  if (!argv.includes("--live")) {
    console.log(JSON.stringify({ mode: "dry-run", batch: batch.name, primitives: catalog.primitives.length, maxCalls, maximumProviderAttempts: maxCalls * 2, resumedStacks: previous?.stacks.length ?? 0, familyDataSent: false, publishes: false }));
  } else {
    process.loadEnvFile(".env.local");
    const provider = load("../lib/ai/nebius.ts");
    const streaming = argv.includes("--stream");
    let emitted = false;
    const result = await compiler.compileResearchCheckpoint({
      generate: provider.createStructuredCompletion, previous, maxCalls,
      onCheckpoint: streaming ? async checkpoint => { console.log(JSON.stringify(checkpoint)); emitted = true; } : undefined,
    });
    if (!streaming || !emitted) console.log(JSON.stringify(result, null, 2));
    if (result.failures.length) process.exitCode = 1;
  }
} catch {
  console.error(JSON.stringify({ status: "blocked", message: "Invalid options, configuration or stale checkpoint. No publication or family changes performed." }));
  process.exitCode = 1;
}
