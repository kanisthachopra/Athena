export type CreationState = { error: string | null; createdId: string | null; checkSaved: boolean };
export const emptyCreationState: CreationState = { error: null, createdId: null, checkSaved: false };
export function isCreationId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function creationFailure(message: string | undefined): CreationState {
  let error = "The save could not be confirmed. Retry with the same details, or open Family to check what was saved.";
  let checkSaved = true;
  if (message?.includes("MIRA_FUTURE_BIRTH_MONTH")) { error = "The birth month is in the future. Check the month and year."; checkSaved = false; }
  else if (message?.includes("MIRA_INVALID_BIRTH_CONTEXT")) { error = "Check the birth month and year, then try again."; checkSaved = false; }
  else if (message?.includes("MIRA_INVALID_PROFILE_NAMES")) { error = "Enter a family name up to 80 characters and a nickname up to 60 characters."; checkSaved = false; }
  else if (message?.includes("MIRA_FAMILY_ALREADY_EXISTS")) error = "This account already has a family. Open Family to continue; nothing new was created.";
  else if (message?.includes("MIRA_CREATION_REQUEST_CHANGED")) error = "An earlier version of this form was already saved. Open Family to check it before making changes.";
  else if (message?.includes("MIRA_CREATION_REMOVED")) error = "That saved profile was removed. This retry has not recreated it. Open Family to continue.";
  return { error, createdId: null, checkSaved };
}
