// Local-only diagnostics. Never prints values, lengths, addresses or passwords.
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const keys = ["MIRA_TEST_OWNER_EMAIL", "MIRA_TEST_OWNER_PASSWORD", "MIRA_TEST_OTHER_EMAIL", "MIRA_TEST_OTHER_PASSWORD"];
try {
  const testText = readFileSync(".env.test.local", "utf8");
  const base = parseEnv(readFileSync(".env.local", "utf8"));
  const test = parseEnv(testText);
  for (const key of keys) {
    const lines = testText.split(/\r?\n/).filter(line => new RegExp(`^\\s*${key}\\s*=`).test(line));
    const raw = lines[0]?.slice(lines[0].indexOf("=") + 1).trim() ?? "";
    const quoted = raw.startsWith('"') || raw.startsWith("'");
    console.log(JSON.stringify({ key, present: Boolean(test[key]), occurrences: lines.length,
      unquotedHash: !quoted && raw.includes("#"), smartQuoteAtStart: /^[“”‘’]/.test(raw),
      shadowedByBase: Object.hasOwn(base, key), shadowedByProcess: Object.hasOwn(process.env, key),
      emailHasOuterWhitespace: key.endsWith("EMAIL") && test[key] !== test[key]?.trim(),
    }));
  }
  console.log(JSON.stringify({ distinctAccounts: test.MIRA_TEST_OWNER_EMAIL?.toLowerCase() !== test.MIRA_TEST_OTHER_EMAIL?.toLowerCase() }));
} catch {
  console.error("Could not parse local test configuration. Values were not printed.");
  process.exitCode = 1;
}
