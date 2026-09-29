"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function LoginForm({
  nextPath = "/today",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { nextPath?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setTimeout(() => setIsSlow(true), 4_000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setIsSlow(false);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.session) throw new Error("MIRA could not establish a session. Please try again.");
      window.location.assign(nextPath);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      setError(
        /invalid login credentials/i.test(message)
          ? "The email or password is incorrect. Check both and try again."
          : /fetch|network|timeout|aborted/i.test(message)
            ? "MIRA could not reach the sign-in service. Check your connection, then try again."
            : message,
      );
    } finally {
      setIsSlow(false);
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="rounded-[1.75rem] border-black/5 bg-paper shadow-[0_25px_80px_rgba(55,62,53,.1)]">
        <CardHeader>
          <CardTitle className="font-serif text-3xl">Welcome back</CardTitle>
          <CardDescription>
            Come back to your family&apos;s learning space.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} aria-busy={isLoading}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p>}
              {isSlow && !error && <p role="status" className="rounded-xl bg-[#e2efe9] px-4 py-3 text-sm leading-6 text-[#386357]">The sign-in service is taking longer than usual. MIRA will stop waiting automatically if it cannot connect.</p>}
              <Button type="submit" className="h-12 w-full rounded-2xl bg-ink hover:bg-[#414b42]" disabled={isLoading}>
                {isLoading ? <><LoaderCircle className="animate-spin" size={17} /> Signing in…</> : "Log in"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href={`/auth/sign-up?next=${encodeURIComponent(nextPath)}`}
                className="underline underline-offset-4"
              >
                Create an account
              </Link>
            </div>
            <div className="mt-3 text-center text-sm">
              <Link href="/auth/sign-up-success" className="text-ink/60 underline underline-offset-4">
                Confirmation link expired?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
