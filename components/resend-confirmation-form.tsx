"use client";

import { createClient } from "@/lib/supabase/client";
import { LoaderCircle, Send } from "lucide-react";
import { FormEvent, useState } from "react";

export function ResendConfirmationForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);

    const { error: resendError } = await createClient().auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
      },
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setStatus("A fresh confirmation email has been sent. Please use the newest link only.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={resend} className="mt-7 space-y-4 text-left">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Email address</span>
        <input
          className="mira-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {status && <p role="status" className="rounded-xl bg-[#f1eaf3] px-4 py-3 text-sm text-[#63486b]">{status}</p>}
      <button className="button-primary w-full" type="submit" disabled={busy}>
        {busy ? <><LoaderCircle className="animate-spin" size={17} /> Sending…</> : <><Send size={17} /> Send a new link</>}
      </button>
    </form>
  );
}
