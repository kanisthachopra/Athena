import { SignUpForm } from "@/components/sign-up-form";
import { AuthShell } from "@/components/auth-shell";
export const metadata = { title: "Create an account" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
 const requestedNext = (await searchParams).next ?? "/onboarding";
 const nextPath = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/onboarding";
 return <AuthShell><SignUpForm nextPath={nextPath} /></AuthShell>;
}
