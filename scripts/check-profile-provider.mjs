// Optional live smoke check: node --env-file=.env.local scripts/check-profile-provider.mjs
// Uses a fictional note and prints no credentials or stored family data.
import { readFileSync } from "node:fs";
import ts from "typescript";

function moduleUrl(file, replacements = {}) {
  let source = readFileSync(new URL(file, import.meta.url), "utf8").replace('import "server-only";', "");
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}
const provider = moduleUrl("../lib/ai/nebius.ts");
const contract = moduleUrl("../lib/profile-proposal.ts");
const extractor = moduleUrl("../lib/ai/profile-extractor.ts", { "@/lib/ai/nebius": provider, "@/lib/profile-proposal": contract,
  ...(process.argv.includes("--inspect") ? { "parseProfileSuggestions(completion.content, rawNote)": "completion.content" } : {}),
});
const { extractProfile } = await import(extractor);
try {
  const result = await extractProfile("We have 10 minutes on weekdays and 20 minutes on weekends. I speak Hindi. I hope our child grows with Mandarin too. We prefer spontaneous play and everyday routines. Curiosity and kindness matter to us.");
  console.log(JSON.stringify({ suggestions: result.suggestions, completionTokens: result.completionTokens, latencyMs: result.latencyMs }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
