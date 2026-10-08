import assert from "node:assert/strict";
import { assertPermissionDenied, assertNoRowsOrPermissionDenied } from "./pilot-test-assertions.mjs";
assertPermissionDenied({ error: { code: "42501" }, status: 403 });
assertPermissionDenied({ error: { code: "P0001", message: "Caregiver access required" } }, "Caregiver access required");
assertNoRowsOrPermissionDenied({ data: [], error: null });
for (const result of [
  { error: { message: "fetch failed" }, status: 0 },
  { error: { code: "PGRST202" }, status: 404 },
  { error: { code: "P0001", message: "Invalid date" }, status: 400 },
  { error: { message: "upstream failure" }, status: 500 },
  { data: [{ id: "exposed" }], error: null },
]) assert.throws(() => assertNoRowsOrPermissionDenied(result));
console.log("Permission-test assertions pass: explicit denial or empty rows accepted; network/schema/server failures cannot become false security passes.");
