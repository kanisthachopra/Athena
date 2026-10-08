import assert from "node:assert/strict";

// A timeout, missing RPC or server error is not evidence of authorization denial.
export function assertPermissionDenied(result, expectedMessage) {
  assert.ok(result.error, "Expected an explicit permission denial");
  const error = result.error;
  assert.ok(
    error.code === "42501" || result.status === 401 || result.status === 403 ||
    (error.code === "P0001" && error.message === expectedMessage),
    "Request failed for a reason other than verified permission denial",
  );
}

export function assertNoRowsOrPermissionDenied(result) {
  if (result.error) assertPermissionDenied(result);
  else assert.deepEqual(result.data, [], "Expected no visible rows");
}
