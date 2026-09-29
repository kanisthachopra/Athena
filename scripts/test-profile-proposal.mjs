import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/profile-proposal.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { parseProfileSuggestions } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const note = "We have zero minutes on weekdays. I speak Hindi. We hope to introduce Mandarin.";
const valid = { suggestions: [
  { field: "weekdayMinutes", value: "0", evidence: "zero minutes on weekdays" },
  { field: "caregiverLanguages", value: "Hindi", evidence: "I speak Hindi" },
  { field: "languageGoals", value: "Mandarin", evidence: "We hope to introduce Mandarin" },
] };
assert.deepEqual(parseProfileSuggestions(valid, note), valid.suggestions);
assert.deepEqual(parseProfileSuggestions({ suggestions: [] }, note), []);
for (const row of [
  { field: "weekdayMinutes", value: "181", evidence: "zero minutes on weekdays" },
  { field: "weekdayMinutes", value: "-1", evidence: "zero minutes on weekdays" },
  { field: "screenPolicy", value: "unlimited", evidence: "I speak Hindi" },
  { field: "diagnosis", value: "anything", evidence: "I speak Hindi" },
  { field: "__proto__", value: "anything", evidence: "I speak Hindi" },
  { field: "languageGoals", value: "English", evidence: "Invented quote" },
  { field: "languageGoals", value: "Hindi,,Mandarin", evidence: "I speak Hindi" },
]) assert.throws(() => parseProfileSuggestions({ suggestions: [row] }, note));
assert.throws(() => parseProfileSuggestions({ suggestions: [valid.suggestions[0], valid.suggestions[0]] }, note));
assert.throws(() => parseProfileSuggestions(null, note));
console.log("Profile proposal checks passed: zero time, language roles, evidence, enums, bounds, duplicate fields, malformed output.");
