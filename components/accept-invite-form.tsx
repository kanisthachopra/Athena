"use client";

import { acceptInvitation, type AcceptInviteState } from "@/app/join/actions";
import { UserPlus } from "lucide-react";
import { useActionState } from "react";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AcceptInviteState, FormData>(acceptInvitation, { error: null });
  return <form action={formAction} className="mt-7">
    <input type="hidden" name="token" value={token} />
    <button className="button-primary button-large w-full" type="submit" disabled={pending}><UserPlus size={18} />{pending ? "Joining…" : "Join this family"}</button>
    {state.error && <p className="mt-3 text-sm text-red-600" role="alert">{state.error}</p>}
  </form>;
}
